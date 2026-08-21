import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');
import { PropertyEntity } from '../../entities/property.entity';
import { InvoiceScanResponse } from '../../dto/invoice.dto';

// Common address-word stopwords we don't want to score on (too generic to be
// a useful match signal on their own).
const ADDRESS_STOPWORDS = new Set([
  'ST', 'STREET', 'RD', 'ROAD', 'AVE', 'AVENUE', 'HWY', 'HIGHWAY', 'DR', 'DRIVE',
  'CT', 'COURT', 'PL', 'PLACE', 'LN', 'LANE', 'PDE', 'PARADE', 'CRES', 'CRESCENT',
  'BLVD', 'BOULEVARD', 'UNIT', 'SUITE', 'LEVEL', 'FLOOR', 'THE',
]);

const LABELED_DATE_RE =
  /(?:INVOICE\s*DATE|DATE\s*OF\s*ISSUE|DATE\s*ISSUED|ISSUE\s*DATE|TAX\s*INVOICE\s*DATE)[:\s]*([0-3]?\d[\/\-.][01]?\d[\/\-.]\d{2,4}|\d{4}-\d{2}-\d{2})/i;
const GENERIC_DATE_RE = /\b(\d{4}-\d{2}-\d{2})\b|\b([0-3]?\d[\/\-.][01]?\d[\/\-.]\d{2,4})\b/;
const TOTAL_RE = /TOTAL(?:\s*(?:DUE|AMOUNT|PAYABLE|INC(?:L)?\.?\s*GST)?)?\D{0,12}\$?\s?([\d,]+\.\d{2})/gi;

@Injectable()
export class InvoiceScanService {
  private readonly logger = new Logger(InvoiceScanService.name);

  constructor(
    @InjectRepository(PropertyEntity)
    private readonly propertyRepo: Repository<PropertyEntity>,
  ) {}

  async scan(file: Express.Multer.File, ownerId: string): Promise<InvoiceScanResponse> {
    const text = await this.extractText(file);
    const haystack = `${file.originalname}\n${text}`.toUpperCase();

    const properties = await this.propertyRepo.find({ where: { ownerId } });
    const propertyMatch = this.matchProperty(haystack, properties);
    const issueDate = this.extractDate(haystack);
    const totalAmount = this.extractTotal(haystack);

    return {
      propertyId: propertyMatch?.property.id,
      propertyName: propertyMatch?.property.name,
      propertyMatchConfidence: propertyMatch?.confidence,
      issueDate,
      totalAmount,
    };
  }

  private async extractText(file: Express.Multer.File): Promise<string> {
    if (file.mimetype !== 'application/pdf') {
      return '';
    }
    try {
      const parsed = await pdfParse(file.buffer);
      return parsed.text ?? '';
    } catch (err) {
      // A malformed/scanned-image-only PDF shouldn't break the scan — we just
      // fall back to filename-only matching.
      this.logger.warn(`Failed to extract text from ${file.originalname}: ${(err as Error).message}`);
      return '';
    }
  }

  private matchProperty(
    haystack: string,
    properties: PropertyEntity[],
  ): { property: PropertyEntity; confidence: 'HIGH' | 'LOW' } | undefined {
    let best: { property: PropertyEntity; score: number } | undefined;
    let bestIsUnique = true;

    for (const property of properties) {
      const score = this.scoreProperty(haystack, property);
      if (score === 0) continue;
      if (!best || score > best.score) {
        best = { property, score };
        bestIsUnique = true;
      } else if (score === best.score) {
        bestIsUnique = false;
      }
    }

    if (!best || !bestIsUnique) {
      return undefined;
    }
    return { property: best.property, confidence: best.score >= 2 ? 'HIGH' : 'LOW' };
  }

  private scoreProperty(haystack: string, property: PropertyEntity): number {
    let score = 0;

    const streetNumberMatch = property.addressLine1.match(/^\d+/);
    if (streetNumberMatch && this.containsToken(haystack, streetNumberMatch[0])) {
      score += 1;
    }

    const streetWords = property.addressLine1
      .replace(/^\d+/, '')
      .toUpperCase()
      .split(/[^A-Z0-9]+/)
      .filter((w) => w.length > 2 && !ADDRESS_STOPWORDS.has(w));
    for (const word of streetWords) {
      if (haystack.includes(word)) {
        score += 1;
      }
    }

    if (property.suburb && property.suburb.length > 2 && haystack.includes(property.suburb.toUpperCase())) {
      score += 1;
    }

    return score;
  }

  private containsToken(haystack: string, token: string): boolean {
    return new RegExp(`(^|[^A-Z0-9])${token}([^A-Z0-9]|$)`).test(haystack);
  }

  private extractDate(haystack: string): string | undefined {
    const labeled = haystack.match(LABELED_DATE_RE);
    const raw = labeled?.[1] ?? haystack.match(GENERIC_DATE_RE)?.[0];
    if (!raw) return undefined;
    return this.normalizeDate(raw);
  }

  private normalizeDate(raw: string): string | undefined {
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }
    const parts = raw.split(/[\/\-.]/).map((p) => p.trim());
    if (parts.length !== 3) return undefined;
    // Australian convention: DD/MM/YYYY.
    let [day, month, year] = parts;
    if (year.length === 2) {
      year = `20${year}`;
    }
    const d = Number(day);
    const m = Number(month);
    const y = Number(year);
    if (!d || !m || !y || m > 12 || d > 31) return undefined;
    return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  private extractTotal(haystack: string): number | undefined {
    let match: RegExpExecArray | null;
    let last: number | undefined;
    TOTAL_RE.lastIndex = 0;
    while ((match = TOTAL_RE.exec(haystack)) !== null) {
      const value = Number(match[1].replace(/,/g, ''));
      if (!Number.isNaN(value)) {
        last = value;
      }
    }
    return last;
  }
}
