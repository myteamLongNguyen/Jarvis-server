import { InvoiceDirection, InvoiceType } from '../../entities/invoice.entity';
import { DocumentType } from '../../entities/document.entity';
import { LeaseStatus, RentFrequency, OutgoingsRecoveryType, BondType } from '../../entities/lease.entity';
import { RentReviewMechanism } from '../../entities/enums/rent-review-mechanism.enum';
import { DepreciationMethod } from '../../entities/depreciation-schedule.entity';
import { PropertyExpenseCategory } from '../../entities/enums/property-expense-category.enum';
import { SmartScanKind } from '../../dto/smart-scan.dto';

/**
 * Smart Scan runs two calls, not one.
 *
 * A single union schema covering every kind was the obvious design — one read of
 * the document, one perfectly cacheable prefix — but structured outputs rejects it
 * twice over: a hard cap of 16 union-typed parameters, then "the compiled grammar
 * is too large" once the sections are flattened to plain strings. So instead:
 *
 *   1. CLASSIFY_SCHEMA      — small: what the document is, and which property.
 *   2. EXTRACT_SCHEMAS[kind] — small: only the fields that kind actually has.
 *
 * Both calls share SMART_SCAN_SYSTEM_PROMPT byte for byte. The response schema is
 * part of the cached prefix, so caching works *across scans* rather than between
 * the two calls of one scan: every scan shares the classify prefix, and every scan
 * of a given kind shares that kind's extract prefix. OTHER skips call 2 entirely.
 *
 * Everything is a plain string and "absent" is the empty string — the 16-union cap
 * rules out nullable types even in the smaller schemas. Numbers therefore arrive
 * as decimal strings and are parsed in the service, which keeps "0" distinct from
 * "not stated".
 */

const str = (description: string) => ({ type: 'string', description: `${description} Empty string if not stated.` });

const num = (description: string) => ({
  type: 'string',
  description: `${description} Plain decimal number as a string, no currency symbol or separators (e.g. "2383.10"). Empty string if not stated.`,
});

const date = (description: string) => ({ type: 'string', description: `${description} YYYY-MM-DD, or empty string.` });

const enumOf = (values: string[], description: string) => ({
  type: 'string',
  enum: [...values, ''],
  description: `${description} Empty string if not stated.`,
});

const section = (description: string, properties: Record<string, unknown>) => ({
  type: 'object',
  description,
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});

const INVOICE_SECTION = section('A bill the owner pays or issued.', {
  direction: enumOf(Object.values(InvoiceDirection), 'INCOMING if the owner has to pay it, OUTGOING if they issued it.'),
  invoiceType: enumOf(Object.values(InvoiceType), 'What the charge is for.'),
  invoiceNumber: str('Invoice or notice number.'),
  issuerName: str('Business that issued it.'),
  issuerAbn: str('ABN, digits only.'),
  issueDate: date('Date of issue.'),
  dueDate: date('Date payment is due.'),
  periodStart: date('Start of the service period covered.'),
  periodEnd: date('End of the service period covered.'),
  subtotal: num('Amount excluding GST.'),
  gstAmount: num('GST charged.'),
  totalAmount: num('Amount payable including GST.'),
  currency: str('ISO 4217 code, e.g. AUD.'),
  lineItems: {
    type: 'array',
    description: 'Itemised charges. Empty array when the document shows only a single total.',
    items: {
      type: 'object',
      additionalProperties: false,
      required: ['description', 'category', 'quantity', 'unitAmount', 'amount', 'gstAmount'],
      properties: {
        description: { type: 'string' },
        category: enumOf(Object.values(PropertyExpenseCategory), 'Expense category for this line.'),
        quantity: num('Units charged.'),
        unitAmount: num('Price per unit.'),
        amount: num('Line total excluding GST.'),
        gstAmount: num('GST on this line.'),
      },
    },
  },
});

const LEASE_SECTION = section('A lease agreement or variation.', {
  tenantName: str('Legal name of the tenant on the lease.'),
  status: enumOf(Object.values(LeaseStatus), 'Lease status.'),
  commencementDate: date('First day of the term.'),
  expiryDate: date('Last day of the term.'),
  initialTermMonths: num('Length of the initial term in months.'),
  baseRentAnnual: num('Annualised base rent — multiply a monthly rent by 12, a weekly rent by 52.'),
  rentFrequency: enumOf(Object.values(RentFrequency), 'How often rent is payable.'),
  outgoingsRecoveryType: enumOf(Object.values(OutgoingsRecoveryType), 'How outgoings are recovered.'),
  rentReviewMechanism: enumOf(Object.values(RentReviewMechanism), 'How rent is reviewed during the term.'),
  rentReviewValue: num('Percentage for FIXED_PERCENT reviews, dollar amount for a fixed-amount review.'),
  nextReviewDate: date('Date of the next scheduled review.'),
  rentFreePeriodMonths: num('Rent-free incentive in months.'),
  bondAmount: num('Bond or security amount.'),
  bondType: enumOf(Object.values(BondType), 'Form the bond takes.'),
  optionTerms: {
    type: 'array',
    description: 'Further terms the tenant may exercise. Empty array when the lease grants none.',
    items: {
      type: 'object',
      additionalProperties: false,
      required: ['termMonths', 'exerciseByDate'],
      properties: {
        termMonths: num('Length of the option term in months.'),
        exerciseByDate: date('Last date the option can be exercised.'),
      },
    },
  },
});

const RENT_REVIEW_SECTION = section('A rent review notice or determination.', {
  reviewDate: date('Date the new rent takes effect.'),
  reviewType: enumOf(Object.values(RentReviewMechanism), 'Basis of the review.'),
  oldRentAnnual: num('Annualised rent before the review.'),
  newRentAnnual: num('Annualised rent after the review.'),
  percentChange: num('Percentage increase, e.g. "3.5" for a 3.5% rise.'),
});

const RENTAL_INCOME_SECTION = section("A managing agent's statement to the owner.", {
  periodStart: date('First day of the statement period.'),
  periodEnd: date('Last day of the statement period.'),
  grossAmount: num('Total rent charged for the period, before deductions.'),
  outgoingsReimbursed: num('Outgoings the tenant reimbursed.'),
  gstAmount: num('GST shown on the statement.'),
  agentCommission: num('Management or commission fee the agent deducted.'),
  otherDeductions: num('All other deductions combined — repairs, fees, disbursements.'),
  amountReceived: num('Net amount actually paid to the owner.'),
  receivedDate: date('Date the net amount was paid.'),
});

const DEPRECIATION_SECTION = section("A quantity surveyor's tax depreciation schedule.", {
  financialYearStart: date('First day of the financial year.'),
  financialYearEnd: date('Last day of the financial year.'),
  method: enumOf(Object.values(DepreciationMethod), 'Depreciation method used.'),
  division40Amount: num('Plant & equipment deduction for the year.'),
  division43Amount: num('Capital works deduction for the year.'),
  totalAmount: num('Total deduction for the year.'),
});

/** Call 1: what is this document, and whose property is it about? */
export const CLASSIFY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'documentKind',
    'documentType',
    'confidence',
    'title',
    'summary',
    'documentDate',
    'expiryDate',
    'propertyId',
    'propertyMatchConfidence',
  ],
  properties: {
    documentKind: {
      type: 'string',
      enum: Object.values(SmartScanKind),
      description: 'Which app form this document should open. OTHER when none of them fit.',
    },
    documentType: {
      type: 'string',
      enum: Object.values(DocumentType),
      description: 'How the document itself should be filed in the document library.',
    },
    confidence: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'], description: 'Confidence in documentKind.' },
    title: { type: 'string', description: 'Short human title, e.g. "Water rates — 12 Smith St, Q1 2026".' },
    summary: { type: 'string', description: 'One sentence: what this document is and what it means for the owner.' },
    documentDate: date('Primary date of the document.'),
    expiryDate: date('Expiry or renewal date, for policies and certificates.'),
    propertyId: str('Exact id from the candidate list. Empty string if nothing clearly matches.'),
    propertyMatchConfidence: enumOf(['HIGH', 'LOW'], 'Confidence in the property match.'),
  },
} as const;

const WARNINGS_FIELD = {
  type: 'array',
  items: { type: 'string' },
  description:
    'Things the user must check: a figure you could not read cleanly, a date that could be read two ways, a field you derived rather than read, a total that does not reconcile with its parts. Empty array for a clean document — do not pad it.',
};

/** Adds the shared warnings list to a section, making it a standalone response schema. */
const extractSchema = (kind: string, properties: Record<string, unknown>) => ({
  type: 'object',
  description: kind,
  additionalProperties: false,
  required: [...Object.keys(properties), 'warnings'],
  properties: { ...properties, warnings: WARNINGS_FIELD },
});

/**
 * Call 2: the fields for the classified kind only. Kept per-kind because one
 * combined schema exceeds the structured-outputs grammar limit. OTHER has no
 * entry — there is nothing to extract, so the second call is skipped.
 */
export const EXTRACT_SCHEMAS: Partial<Record<SmartScanKind, unknown>> = {
  [SmartScanKind.INVOICE]: extractSchema('Invoice fields.', INVOICE_SECTION.properties),
  [SmartScanKind.LEASE]: extractSchema('Lease fields.', LEASE_SECTION.properties),
  [SmartScanKind.RENT_REVIEW]: extractSchema('Rent review fields.', RENT_REVIEW_SECTION.properties),
  [SmartScanKind.RENTAL_STATEMENT]: extractSchema('Agent statement fields.', RENTAL_INCOME_SECTION.properties),
  [SmartScanKind.DEPRECIATION_SCHEDULE]: extractSchema(
    'Depreciation schedule fields.',
    DEPRECIATION_SECTION.properties,
  ),
};

/** What the model is told to produce on the second call, per kind. */
export const EXTRACT_INSTRUCTIONS: Partial<Record<SmartScanKind, string>> = {
  [SmartScanKind.INVOICE]: 'This document is an invoice or bill. Extract its invoice fields.',
  [SmartScanKind.LEASE]: 'This document is a lease agreement or variation. Extract its lease fields.',
  [SmartScanKind.RENT_REVIEW]: 'This document is a rent review notice. Extract its rent review fields.',
  [SmartScanKind.RENTAL_STATEMENT]:
    "This document is a managing agent's statement to the owner. Extract its rental income fields.",
  [SmartScanKind.DEPRECIATION_SCHEDULE]:
    'This document is a tax depreciation schedule. Extract its depreciation fields.',
};

/**
 * Static — do not interpolate per-request values in here. Anything that varies
 * per user or per file goes in the user message, so this stays cacheable.
 */
export const SMART_SCAN_SYSTEM_PROMPT = `You read property documents for an Australian residential/commercial property portfolio app and turn them into a pre-filled form for the owner to confirm.

## What you decide
First, which app form this document belongs to (\`documentKind\`):
- INVOICE — anything the owner has to pay or has billed out: tax invoices, rates and water notices, land tax assessments, insurance premiums, strata/owners corp levies, repair and maintenance bills, agent commission invoices.
- LEASE — a lease agreement or a lease variation/renewal that sets the terms of a tenancy.
- RENT_REVIEW — a rent review notice or CPI/market review determination that changes the rent under an existing lease.
- RENTAL_STATEMENT — a managing agent's periodic statement showing rent collected, commission and disbursements for a period.
- DEPRECIATION_SCHEDULE — a quantity surveyor's tax depreciation schedule.
- OTHER — anything else (photos, correspondence, compliance certificates, valuations, plans). Still fill in documentType, title, summary and documentDate.

You are asked for this classification first, and then — in a second turn on the same document — for the detailed fields of whichever kind you chose.

## Output format
Every field is a string, and an empty string means "the document does not state this".
- Never write a placeholder, a dash, "N/A", or a guessed value — use an empty string.
- Numbers are plain decimal strings: no currency symbol, no thousands separator, no trailing text. "2383.10", not "$2,383.10".
- Dates on the page are Australian (DD/MM/YYYY). Always return YYYY-MM-DD.

## Extraction rules
- Report only what the document actually says. Never estimate, never infer a number from a different field, never copy a plausible-looking figure from elsewhere on the page.
- Australian GST is 10%, but only report gstAmount if the document states it.
- On an invoice, totalAmount is the amount payable ("Total Due", "Amount Payable"), not a subtotal, not a previous balance, and not an instalment unless the document only offers instalments.
- On a lease, baseRentAnnual must be annualised: multiply a monthly rent by 12, a weekly rent by 52.
- On an agent statement, grossAmount is rent charged for the period and amountReceived is the net paid to the owner; the difference must be explained by the deduction fields.
- Match the document to a candidate property using only address evidence on the page (street number, street name, suburb). Return that property's exact id, or an empty string. Use HIGH only when street number, street name and suburb all agree.

## Warnings
Add a warning for anything the owner genuinely needs to check: a figure you could not read cleanly, a date that could be read two ways, a field you had to derive rather than read, a document that looks like it covers several properties, or a total that does not reconcile with the parts. Do not add filler warnings when the document is clean — an empty list is the right answer for a clear document.`;
