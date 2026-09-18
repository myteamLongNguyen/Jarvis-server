import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Anthropic from '@anthropic-ai/sdk';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');
import config from '../../core/config';
import { PropertyEntity } from '../../entities/property.entity';
import {
  LeaseEntity,
  LeaseStatus,
  RentFrequency,
  OutgoingsRecoveryType,
  BondType,
} from '../../entities/lease.entity';
import { InvoiceDirection, InvoiceType } from '../../entities/invoice.entity';
import { RentReviewMechanism } from '../../entities/enums/rent-review-mechanism.enum';
import { DepreciationMethod } from '../../entities/depreciation-schedule.entity';
import { PropertyExpenseCategory } from '../../entities/enums/property-expense-category.enum';
import { DocumentType } from '../../entities/document.entity';
import {
  SmartScanForms,
  SmartScanKind,
  SmartScanMatch,
  SmartScanResponse,
  SmartScanSource,
} from '../../dto/smart-scan.dto';
import {
  CLASSIFY_SCHEMA,
  EXTRACT_INSTRUCTIONS,
  EXTRACT_SCHEMAS,
  SMART_SCAN_SYSTEM_PROMPT,
} from './smart-scan.schema';
import { ScanProgressBus } from './scan-progress.bus';

const PDF_MIME_TYPE = 'application/pdf';
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

// Below this, whatever pdf-parse returned is page furniture rather than a real
// text layer (a scan wrapped in a PDF), so the pages have to go up as pixels.
const MIN_USABLE_TEXT_CHARS = 300;

// A text layer costs roughly a tenth of what the same page costs as an image, so
// we can afford a generous slice. Past this the document is a bundle (a full lease
// annexure, a year of statements) and the fields we want are in the opening pages.
const MAX_TEXT_CHARS = 60_000;

// Classification only needs the letterhead, title and dates, which are at the top.
const MAX_CLASSIFY_CHARS = 6_000;

const MAX_RESPONSE_TOKENS = 8192;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** What the streaming endpoint reports as a scan progresses. */
export type SmartScanStreamEvent =
  | { type: 'reading'; source: SmartScanSource; characters?: number }
  | {
      type: 'classified';
      documentKind: SmartScanKind;
      confidence: 'HIGH' | 'MEDIUM' | 'LOW';
      title: string;
      propertyName?: string;
    }
  | { type: 'result'; result: SmartScanResponse };

/** Sums usage across the classify and extract calls into one figure for the client. */
class UsageTally {
  private inputTokens = 0;
  private outputTokens = 0;
  private cacheReadTokens = 0;

  add(usage: Anthropic.Usage): void {
    this.inputTokens += usage.input_tokens;
    this.outputTokens += usage.output_tokens;
    this.cacheReadTokens += usage.cache_read_input_tokens ?? 0;
  }

  toResponse() {
    return {
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      cacheReadTokens: this.cacheReadTokens,
    };
  }
}

@Injectable()
export class SmartScanService {
  private readonly logger = new Logger(SmartScanService.name);
  private readonly client: Anthropic;

  constructor(
    @InjectRepository(PropertyEntity)
    private readonly propertyRepo: Repository<PropertyEntity>,
    @InjectRepository(LeaseEntity)
    private readonly leaseRepo: Repository<LeaseEntity>,
    private readonly progressBus: ScanProgressBus,
  ) {
    this.client = new Anthropic({ apiKey: config.ai.anthropicApiKey });
  }

  /**
   * One-shot scan. Drains the streaming version, which is where the work lives.
   * When the caller passes the scanId the client is listening on, each stage is
   * republished to that progress channel as it lands.
   */
  async scan(file: Express.Multer.File, ownerId: string, scanId?: string): Promise<SmartScanResponse> {
    try {
      for await (const event of this.scanStream(file, ownerId)) {
        if (scanId) this.progressBus.publish(scanId, event);
        if (event.type === 'result') {
          return event.result;
        }
      }
    } finally {
      if (scanId) this.progressBus.finish(scanId);
    }
    throw new ServiceUnavailableException("Couldn't read that document — please try again.");
  }

  /**
   * The same scan, reporting each stage as it completes.
   *
   * A scan takes 20-40s, most of it in the second model call, so the client gets
   * the classification the moment call 1 lands — what the document is, and which
   * property it belongs to — and can show that while the fields are still being
   * pulled out. The stages are the real ones; nothing here is a timed animation.
   */
  async *scanStream(file: Express.Multer.File, ownerId: string): AsyncGenerator<SmartScanStreamEvent> {
    if (!config.ai.anthropicApiKey) {
      throw new ServiceUnavailableException('Smart Scan is not configured — ANTHROPIC_API_KEY is missing on the server.');
    }

    const documentBlock = await this.buildDocumentBlock(file);
    const properties = await this.propertyRepo.find({ where: { ownerId } });
    const usage = new UsageTally();

    yield {
      type: 'reading',
      source: documentBlock.source,
      // Only meaningful on the text path; the image path has nothing to count yet.
      characters: documentBlock.characters,
    };

    // Call 1 — what is this? Cheap: a small schema, and for a text-layer PDF only
    // the opening slice of the document, which is where the letterhead, title and
    // dates that decide the classification live.
    const classified = await this.ask(
      file,
      properties,
      documentBlock.classifyBlock,
      'Classify this document.',
      CLASSIFY_SCHEMA,
      usage,
    );

    const documentKind = this.enumValue(classified.documentKind, SmartScanKind) ?? SmartScanKind.OTHER;
    const match = await this.resolveMatch(classified, properties, documentKind, ownerId);

    yield {
      type: 'classified',
      documentKind,
      confidence: this.oneOf(classified.confidence, ['HIGH', 'MEDIUM', 'LOW'] as const) ?? 'LOW',
      title: this.text(classified.title) ?? 'Scanned document',
      propertyName: match.propertyName,
    };

    const extractSchema = EXTRACT_SCHEMAS[documentKind];
    const extractInstruction = EXTRACT_INSTRUCTIONS[documentKind];

    // Call 2 — the fields for that kind, over the whole document. Skipped for
    // OTHER, where the classification is already the entire answer.
    const extracted =
      extractSchema && extractInstruction
        ? await this.ask(file, properties, documentBlock.extractBlock, extractInstruction, extractSchema, usage)
        : {};

    yield {
      type: 'result',
      result: await this.toResponse(classified, extracted, documentKind, properties, documentBlock.source, usage, ownerId),
    };
  }

  /**
   * One structured-output call.
   *
   * Measured cache behaviour: the response schema is part of the cached prefix, so
   * the two calls in a scan cache separately — the classify prefix is shared by
   * every scan, and each extract prefix is shared by every scan of that kind. What
   * this does NOT do is carry the document across from call 1 to call 2; the
   * differing schema invalidates everything after it. That is why the PDF text path
   * matters so much: on the image path the pages are genuinely paid for twice.
   */
  private async ask(
    file: Express.Multer.File,
    properties: PropertyEntity[],
    documentBlock: Anthropic.ContentBlockParam,
    instruction: string,
    schema: unknown,
    usage: UsageTally,
  ): Promise<Record<string, unknown>> {
    let response: Anthropic.Message;
    try {
      response = await this.client.messages.create({
        model: config.ai.scanModel,
        max_tokens: MAX_RESPONSE_TOKENS,
        system: [{ type: 'text', text: SMART_SCAN_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        output_config: {
          effort: 'high',
          format: { type: 'json_schema', schema: schema as Record<string, unknown> },
        },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: `Candidate properties for this owner:\n${this.describeProperties(properties)}` },
              documentBlock,
              { type: 'text', text: `Filename: ${file.originalname}\n\n${instruction}` },
            ],
          },
        ],
      });
    } catch (err) {
      this.logger.error(`Smart Scan call failed for ${file.originalname}: ${(err as Error).message}`);
      throw new ServiceUnavailableException("Couldn't read that document just now — please try again.");
    }

    usage.add(response.usage);
    return this.parseResponse(response, file.originalname);
  }

  // --- input ----------------------------------------------------------------

  /**
   * Prefers the PDF's own text layer over sending page images: same content, an
   * order of magnitude fewer input tokens, and no OCR error on the amounts. Only
   * genuinely scanned pages and photos take the image path.
   *
   * Classification and extraction get different slices where we can afford to
   * differ: classifying only needs the opening pages, while extraction needs the
   * lot. For an image there is nothing to slice, so both calls send the same block
   * — and because it is identical and identically placed, the second call reads it
   * from the prompt cache.
   */
  private async buildDocumentBlock(file: Express.Multer.File): Promise<{
    classifyBlock: Anthropic.ContentBlockParam;
    extractBlock: Anthropic.ContentBlockParam;
    source: SmartScanSource;
    characters?: number;
  }> {
    if (file.mimetype === PDF_MIME_TYPE) {
      const text = await this.extractPdfText(file);
      if (text.length >= MIN_USABLE_TEXT_CHARS) {
        const wrap = (body: string): Anthropic.ContentBlockParam => ({
          type: 'text',
          text: `<document>\n${body}\n</document>`,
        });
        return {
          classifyBlock: wrap(text.slice(0, MAX_CLASSIFY_CHARS)),
          extractBlock: wrap(text.slice(0, MAX_TEXT_CHARS)),
          source: SmartScanSource.PDF_TEXT,
          characters: Math.min(text.length, MAX_TEXT_CHARS),
        };
      }
      const pdf: Anthropic.ContentBlockParam = {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: file.buffer.toString('base64') },
      };
      return { classifyBlock: pdf, extractBlock: pdf, source: SmartScanSource.DOCUMENT_IMAGE };
    }

    if (IMAGE_MIME_TYPES.has(file.mimetype)) {
      const image: Anthropic.ContentBlockParam = {
        type: 'image',
        source: {
          type: 'base64',
          media_type: file.mimetype as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: file.buffer.toString('base64'),
        },
      };
      return { classifyBlock: image, extractBlock: image, source: SmartScanSource.DOCUMENT_IMAGE };
    }

    throw new BadRequestException(`Smart Scan can read PDFs and photos, not ${file.mimetype || 'this file type'}.`);
  }

  private async extractPdfText(file: Express.Multer.File): Promise<string> {
    try {
      const parsed = await pdfParse(file.buffer);
      // pdf-parse leaves a lot of blank lines behind; they are pure token waste.
      return String(parsed.text ?? '')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    } catch (err) {
      this.logger.warn(`pdf-parse failed on ${file.originalname}, falling back to page images: ${(err as Error).message}`);
      return '';
    }
  }

  private describeProperties(properties: PropertyEntity[]): string {
    if (properties.length === 0) {
      return '(none — always return null for propertyId)';
    }
    return properties
      .map((p) => {
        const line2 = p.addressLine2 ? `, ${p.addressLine2}` : '';
        return `- id=${p.id} | ${p.name} | ${p.addressLine1}${line2}, ${p.suburb} ${p.state} ${p.postcode}`;
      })
      .join('\n');
  }

  // --- output ---------------------------------------------------------------

  private parseResponse(response: Anthropic.Message, filename: string): Record<string, unknown> {
    if (response.stop_reason === 'refusal') {
      this.logger.warn(`Smart Scan refused on ${filename}: ${response.stop_details?.explanation ?? 'no explanation'}`);
      throw new ServiceUnavailableException("Couldn't read that document — it was declined by the AI safety filter.");
    }

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      this.logger.warn(`Smart Scan returned unparseable JSON for ${filename}`);
      throw new ServiceUnavailableException("Couldn't read that document — please try again.");
    }
  }

  private async toResponse(
    classified: Record<string, unknown>,
    extracted: Record<string, unknown>,
    documentKind: SmartScanKind,
    properties: PropertyEntity[],
    source: SmartScanSource,
    usage: UsageTally,
    ownerId: string,
  ): Promise<SmartScanResponse> {
    const match = await this.resolveMatch(classified, properties, documentKind, ownerId);

    return {
      documentKind,
      documentType: this.enumValue(classified.documentType, DocumentType) ?? DocumentType.OTHER,
      confidence: this.oneOf(classified.confidence, ['HIGH', 'MEDIUM', 'LOW'] as const) ?? 'LOW',
      title: this.text(classified.title) ?? 'Scanned document',
      summary: this.text(classified.summary) ?? '',
      documentDate: this.date(classified.documentDate),
      expiryDate: this.date(classified.expiryDate),
      match,
      warnings: Array.isArray(extracted.warnings)
        ? extracted.warnings.filter((w): w is string => typeof w === 'string' && w.trim().length > 0)
        : [],
      // The kind decides which form gets prefilled, not the shape of what came
      // back — a stray field must never seed the wrong form.
      forms: this.buildForms(extracted, documentKind),
      source,
      usage: usage.toResponse(),
    };
  }

  private async resolveMatch(
    raw: Record<string, unknown>,
    properties: PropertyEntity[],
    documentKind: SmartScanKind,
    ownerId: string,
  ): Promise<SmartScanMatch> {
    // An id the model invented must never reach the client as a real property.
    const propertyId = this.text(raw.propertyId);
    const property = propertyId ? properties.find((p) => p.id === propertyId) : undefined;
    if (!property) {
      return {};
    }

    const match: SmartScanMatch = {
      propertyId: property.id,
      propertyName: property.name,
      propertyMatchConfidence: this.oneOf(raw.propertyMatchConfidence, ['HIGH', 'LOW'] as const) ?? 'LOW',
    };

    // A rent review has to be filed against a lease, so resolve one here rather
    // than making the user go and find it after the scan.
    if (documentKind === SmartScanKind.RENT_REVIEW) {
      const lease = await this.leaseRepo.findOne({
        where: { ownerId, propertyId: property.id, status: LeaseStatus.ACTIVE },
        order: { commencementDate: 'DESC' },
      });
      if (lease) {
        match.leaseId = lease.id;
        match.leaseLabel = `${property.name} — from ${lease.commencementDate}`;
      }
    }

    return match;
  }

  private buildForms(extracted: Record<string, unknown>, documentKind: SmartScanKind): SmartScanForms {
    switch (documentKind) {
      case SmartScanKind.INVOICE:
        return { invoice: this.invoiceForm(extracted) };
      case SmartScanKind.LEASE:
        return { lease: this.leaseForm(extracted) };
      case SmartScanKind.RENT_REVIEW:
        return { rentReview: this.rentReviewForm(extracted) };
      case SmartScanKind.RENTAL_STATEMENT:
        return { rentalIncome: this.rentalIncomeForm(extracted) };
      case SmartScanKind.DEPRECIATION_SCHEDULE:
        return { depreciationSchedule: this.depreciationForm(extracted) };
      default:
        return {};
    }
  }

  private invoiceForm(s: Record<string, unknown>): SmartScanForms['invoice'] {
    const lineItems = Array.isArray(s.lineItems)
      ? s.lineItems
          .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
          .map((item, index) => ({
            lineNumber: index + 1,
            description: this.text(item.description) ?? '',
            category: this.enumValue(item.category, PropertyExpenseCategory),
            quantity: this.money(item.quantity),
            unitAmount: this.money(item.unitAmount),
            amount: this.money(item.amount),
            gstAmount: this.money(item.gstAmount),
          }))
      : undefined;

    return {
      direction: this.enumValue(s.direction, InvoiceDirection),
      invoiceType: this.enumValue(s.invoiceType, InvoiceType),
      invoiceNumber: this.text(s.invoiceNumber),
      issuerName: this.text(s.issuerName),
      issuerAbn: this.text(s.issuerAbn)?.replace(/\s/g, ''),
      issueDate: this.date(s.issueDate),
      dueDate: this.date(s.dueDate),
      periodStart: this.date(s.periodStart),
      periodEnd: this.date(s.periodEnd),
      subtotal: this.money(s.subtotal),
      gstAmount: this.money(s.gstAmount),
      totalAmount: this.money(s.totalAmount),
      currency: this.text(s.currency),
      lineItems: lineItems?.length ? lineItems : undefined,
    };
  }

  private leaseForm(s: Record<string, unknown>): SmartScanForms['lease'] {
    const optionTerms = Array.isArray(s.optionTerms)
      ? s.optionTerms
          .filter((t): t is Record<string, unknown> => Boolean(t) && typeof t === 'object')
          .map((t) => ({ termMonths: this.money(t.termMonths) ?? 0, exerciseByDate: this.date(t.exerciseByDate) }))
          .filter((t) => t.termMonths > 0)
      : undefined;

    return {
      tenantName: this.text(s.tenantName),
      status: this.enumValue(s.status, LeaseStatus),
      commencementDate: this.date(s.commencementDate),
      expiryDate: this.date(s.expiryDate),
      initialTermMonths: this.money(s.initialTermMonths),
      baseRentAnnual: this.money(s.baseRentAnnual),
      rentFrequency: this.enumValue(s.rentFrequency, RentFrequency),
      outgoingsRecoveryType: this.enumValue(s.outgoingsRecoveryType, OutgoingsRecoveryType),
      rentReviewMechanism: this.enumValue(s.rentReviewMechanism, RentReviewMechanism),
      rentReviewValue: this.money(s.rentReviewValue),
      nextReviewDate: this.date(s.nextReviewDate),
      rentFreePeriodMonths: this.money(s.rentFreePeriodMonths),
      bondAmount: this.money(s.bondAmount),
      bondType: this.enumValue(s.bondType, BondType),
      optionTerms: optionTerms?.length ? optionTerms : undefined,
    };
  }

  private rentReviewForm(s: Record<string, unknown>): SmartScanForms['rentReview'] {
    return {
      reviewDate: this.date(s.reviewDate),
      reviewType: this.enumValue(s.reviewType, RentReviewMechanism),
      oldRentAnnual: this.money(s.oldRentAnnual),
      newRentAnnual: this.money(s.newRentAnnual),
      percentChange: this.money(s.percentChange),
    };
  }

  private rentalIncomeForm(s: Record<string, unknown>): SmartScanForms['rentalIncome'] {
    return {
      periodStart: this.date(s.periodStart),
      periodEnd: this.date(s.periodEnd),
      grossAmount: this.money(s.grossAmount),
      outgoingsReimbursed: this.money(s.outgoingsReimbursed),
      gstAmount: this.money(s.gstAmount),
      agentCommission: this.money(s.agentCommission),
      otherDeductions: this.money(s.otherDeductions),
      amountReceived: this.money(s.amountReceived),
      receivedDate: this.date(s.receivedDate),
    };
  }

  private depreciationForm(s: Record<string, unknown>): SmartScanForms['depreciationSchedule'] {
    return {
      financialYearStart: this.date(s.financialYearStart),
      financialYearEnd: this.date(s.financialYearEnd),
      method: this.enumValue(s.method, DepreciationMethod),
      division40Amount: this.money(s.division40Amount),
      division43Amount: this.money(s.division43Amount),
      totalAmount: this.money(s.totalAmount),
    };
  }

  // --- coercion -------------------------------------------------------------

  private text(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  /**
   * Amounts come back as decimal strings (the schema has no room for nullable
   * numbers — see smart-scan.schema.ts), so '' means 'not stated' and '0' is a
   * real zero. Anything the model dressed up with a symbol or separator is
   * stripped rather than rejected.
   */
  private money(value: unknown): number | undefined {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? Math.round(value * 100) / 100 : undefined;
    }
    const text = this.text(value);
    if (!text) return undefined;
    const parsed = Number(text.replace(/[$,\s]/g, ''));
    return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : undefined;
  }

  private date(value: unknown): string | undefined {
    const text = this.text(value);
    if (!text || !ISO_DATE_RE.test(text) || Number.isNaN(Date.parse(text))) {
      return undefined;
    }
    return text;
  }

  private oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
    const text = this.text(value);
    return text && (allowed as readonly string[]).includes(text) ? (text as T) : undefined;
  }

  private enumValue<T extends Record<string, string>>(value: unknown, target: T): T[keyof T] | undefined {
    const text = this.text(value);
    return text && Object.values(target).includes(text) ? (text as T[keyof T]) : undefined;
  }
}
