import { InvoiceEntity, InvoiceType } from '../../entities/invoice.entity';

/**
 * What makes two invoices the same bill.
 *
 * Four rules, strongest first. They are ordered because a weaker rule can
 * contradict a stronger one: a supplier who re-exports a PDF produces a
 * different file for the same invoice number, and the number is right.
 *
 * The rules came out of Andrew Carr's own corpus. Three pairs of files in it
 * are byte-identical copies saved twice, which rule 1 catches outright. A
 * fourth pair looks like a copy from its name, `Lot_17_FeeNotice202610.pdf`
 * and the same name with "(1)" on the end, but the two files differ and hold
 * two separate strata levies for one quarter, $453.55 and $77.20. That pair is
 * why the amount is part of rules 3 and 4: without it they collapse into one
 * and a real bill goes missing.
 */
export enum DuplicateRule {
  /** Byte-for-byte the same file as one already filed. */
  SAME_FILE = 'SAME_FILE',
  /** Same supplier, same invoice number. */
  SAME_INVOICE_NUMBER = 'SAME_INVOICE_NUMBER',
  /** A recurring bill: same supplier, property, billing period and amount. */
  SAME_PERIOD_AND_AMOUNT = 'SAME_PERIOD_AND_AMOUNT',
  /** A one-off bill: same supplier, property, issue date and amount. */
  SAME_DATE_AND_AMOUNT = 'SAME_DATE_AND_AMOUNT',
}

export interface DuplicateCandidate {
  propertyId?: string;
  invoiceType: InvoiceType;
  invoiceNumber?: string;
  issuerName: string;
  issuerAbn?: string;
  issueDate: string;
  periodStart?: string;
  periodEnd?: string;
  totalAmount: number;
  /** Checksums of the file being filed, when it has one. */
  checksum?: string;
}

export interface DuplicateMatch {
  rule: DuplicateRule;
  invoice: InvoiceEntity;
  /** Plain words for the person looking at the warning. */
  reason: string;
}

/**
 * Bills that arrive on a cycle. Their identity is the period they cover: two
 * electricity bills from one retailer differ only by that, so leaving it out
 * would report February as a copy of January.
 */
const PERIODIC_TYPES = new Set<InvoiceType>([
  InvoiceType.UTILITIES,
  InvoiceType.RATES,
  InvoiceType.OWNERS_CORP,
  InvoiceType.LAND_TAX,
  InvoiceType.INSURANCE,
  InvoiceType.MANAGEMENT_FEE,
]);

const COMPANY_SUFFIXES = /\b(pty|ltd|limited|p\/l|inc|incorporated|llc|co|company|group|holdings)\b/g;

/**
 * The same supplier reaches us spelled several ways, because the name is read
 * off whatever the letterhead says: "Record Automatic Doors Pty Ltd" one month
 * and "Record Automatic Doors" the next.
 */
export function normaliseIssuer(name: string): string {
  return (name ?? '')
    .toLowerCase()
    .replace(/[.,'"()&]/g, ' ')
    .replace(COMPANY_SUFFIXES, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * `INV-169113`, `Invoice No. 169113` and `169113` are one number.
 *
 * The label is only stripped when a separator follows it, so a number that
 * merely starts with those letters, `NOVA-123`, keeps them. Leading zeros go
 * as well: no supplier issues both `00123` and `123`.
 */
export function normaliseInvoiceNumber(value?: string): string {
  const withoutLabel = (value ?? '')
    .toUpperCase()
    .trim()
    // Repeated, because the label often comes in two words: "Invoice No. 169113".
    .replace(/^(?:(?:TAX\s*INVOICE|INVOICE|INV|NUMBER|NUM|NO)[\s.:#\-/]+)+/, '');
  const compact = withoutLabel.replace(/[^A-Z0-9]/g, '');
  return compact.replace(/^0+(?=.)/, '');
}

const normaliseAbn = (value?: string): string => (value ?? '').replace(/\D/g, '');

/** Money compares to the cent. A dollar apart is a different bill, not a copy. */
const sameMoney = (a: number, b: number): boolean => Math.round(Number(a) * 100) === Math.round(Number(b) * 100);

const sameDay = (a?: string, b?: string): boolean =>
  Boolean(a) && Boolean(b) && String(a).slice(0, 10) === String(b).slice(0, 10);

/**
 * Two ABNs that disagree settle it: whatever the letterhead called them, these
 * are different businesses, and no rule resting on the name should fire. An
 * ABN missing on either side proves nothing either way.
 */
function abnContradicts(candidate: DuplicateCandidate, existing: InvoiceEntity): boolean {
  const left = normaliseAbn(candidate.issuerAbn);
  const right = normaliseAbn(existing.issuerAbn);
  return Boolean(left) && Boolean(right) && left !== right;
}

function sameIssuer(candidate: DuplicateCandidate, existing: InvoiceEntity): boolean {
  if (abnContradicts(candidate, existing)) return false;
  const left = normaliseAbn(candidate.issuerAbn);
  const right = normaliseAbn(existing.issuerAbn);
  if (left && right && left === right) return true;
  const name = normaliseIssuer(candidate.issuerName);
  return Boolean(name) && name === normaliseIssuer(existing.issuerName);
}

const money = (value: number) =>
  `$${Number(value).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * The strongest rule each existing invoice triggers, or nothing. `fileTwins`
 * are invoices whose source document is byte-identical to the file being
 * filed; the caller works those out, since only it can read the documents.
 */
export function matchDuplicates(
  candidate: DuplicateCandidate,
  existingInvoices: InvoiceEntity[],
  fileTwinInvoiceIds: Set<string> = new Set(),
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];
  const candidateNumber = normaliseInvoiceNumber(candidate.invoiceNumber);
  const periodic = PERIODIC_TYPES.has(candidate.invoiceType);

  for (const existing of existingInvoices) {
    if (fileTwinInvoiceIds.has(existing.id)) {
      matches.push({
        rule: DuplicateRule.SAME_FILE,
        invoice: existing,
        reason: 'This is the same file as the one already filed against this invoice.',
      });
      continue;
    }

    if (!sameIssuer(candidate, existing)) continue;

    const existingNumber = normaliseInvoiceNumber(existing.invoiceNumber);
    if (candidateNumber && existingNumber && candidateNumber === existingNumber) {
      matches.push({
        rule: DuplicateRule.SAME_INVOICE_NUMBER,
        invoice: existing,
        reason: `${existing.issuerName} already has invoice ${existing.invoiceNumber} on file.`,
      });
      continue;
    }

    // Past this point the invoice carries no number to go on, so identity has
    // to be rebuilt from the property, the time it covers and the amount.
    if (candidateNumber && existingNumber) continue;
    if (!candidate.propertyId || candidate.propertyId !== existing.propertyId) continue;
    if (!sameMoney(candidate.totalAmount, existing.totalAmount)) continue;

    if (periodic) {
      if (sameDay(candidate.periodStart, existing.periodStart) && sameDay(candidate.periodEnd, existing.periodEnd)) {
        matches.push({
          rule: DuplicateRule.SAME_PERIOD_AND_AMOUNT,
          invoice: existing,
          reason: `A ${money(existing.totalAmount)} bill from ${existing.issuerName} for the same period is already on file.`,
        });
      }
      continue;
    }

    if (sameDay(candidate.issueDate, existing.issueDate)) {
      matches.push({
        rule: DuplicateRule.SAME_DATE_AND_AMOUNT,
        invoice: existing,
        reason: `A ${money(existing.totalAmount)} bill from ${existing.issuerName} dated the same day is already on file.`,
      });
    }
  }

  const strength = [
    DuplicateRule.SAME_FILE,
    DuplicateRule.SAME_INVOICE_NUMBER,
    DuplicateRule.SAME_PERIOD_AND_AMOUNT,
    DuplicateRule.SAME_DATE_AND_AMOUNT,
  ];
  return matches.sort((a, b) => strength.indexOf(a.rule) - strength.indexOf(b.rule));
}
