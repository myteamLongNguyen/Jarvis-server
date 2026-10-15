import { InvoiceEntity, InvoiceStatus, InvoiceType } from '../../entities/invoice.entity';
import { DuplicateCandidate, DuplicateRule, matchDuplicates, normaliseInvoiceNumber } from './duplicate-match';

/**
 * The cases are taken from Andrew Carr's own corpus, because the rules were
 * drawn from it: the pair that must match and the pair that must not both
 * occur there, and a change that breaks either one is a regression against
 * real data rather than an invented example.
 */
function invoice(fields: Partial<InvoiceEntity>): InvoiceEntity {
  return {
    id: 'existing-1',
    ownerId: 'owner-1',
    propertyId: 'property-1',
    invoiceType: InvoiceType.MAINTENANCE,
    issuerName: 'Supplier',
    issueDate: '2026-08-13',
    totalAmount: 100,
    status: InvoiceStatus.PAID,
    ...fields,
  } as InvoiceEntity;
}

function candidate(fields: Partial<DuplicateCandidate>): DuplicateCandidate {
  return {
    propertyId: 'property-1',
    invoiceType: InvoiceType.MAINTENANCE,
    issuerName: 'Supplier',
    issueDate: '2026-08-13',
    totalAmount: 100,
    ...fields,
  };
}

describe('matchDuplicates', () => {
  it('catches the same invoice number from the same supplier', () => {
    // The one real duplicate in the corpus: Record Automatic Doors 169113,
    // $632.50, filed twice from two identical copies of the PDF.
    const matches = matchDuplicates(
      candidate({ issuerName: 'Record Automatic Doors Pty Ltd', invoiceNumber: '169113', totalAmount: 632.5 }),
      [invoice({ issuerName: 'Record Automatic Doors Pty Ltd', invoiceNumber: '169113', totalAmount: 632.5 })],
    );

    expect(matches).toHaveLength(1);
    expect(matches[0].rule).toBe(DuplicateRule.SAME_INVOICE_NUMBER);
  });

  it('leaves two strata levies for one quarter alone', () => {
    // Lot 17, Q4 2026: same issuer, property and period, $453.55 and $77.20.
    // Two separate levies, and dropping either one loses a real bill.
    const existing = invoice({
      invoiceType: InvoiceType.OWNERS_CORP,
      issuerName: 'Phase Strata Title Management',
      issueDate: '2026-09-03',
      periodStart: '2026-10-01',
      periodEnd: '2026-12-31',
      totalAmount: 453.55,
    });

    const matches = matchDuplicates(
      candidate({
        invoiceType: InvoiceType.OWNERS_CORP,
        issuerName: 'Phase Strata Title Management',
        issueDate: '2026-09-03',
        periodStart: '2026-10-01',
        periodEnd: '2026-12-31',
        totalAmount: 77.2,
      }),
      [existing],
    );

    expect(matches).toEqual([]);
  });

  it('catches a periodic bill repeated for the same period and amount', () => {
    const matches = matchDuplicates(
      candidate({
        invoiceType: InvoiceType.OWNERS_CORP,
        periodStart: '2026-10-01',
        periodEnd: '2026-12-31',
        totalAmount: 453.55,
      }),
      [
        invoice({
          invoiceType: InvoiceType.OWNERS_CORP,
          periodStart: '2026-10-01',
          periodEnd: '2026-12-31',
          totalAmount: 453.55,
        }),
      ],
    );

    expect(matches[0]?.rule).toBe(DuplicateRule.SAME_PERIOD_AND_AMOUNT);
  });

  it('leaves consecutive months of the same utility bill alone', () => {
    const matches = matchDuplicates(
      candidate({
        invoiceType: InvoiceType.UTILITIES,
        issuerName: 'OVO Energy',
        periodStart: '2026-08-02',
        periodEnd: '2026-09-01',
        totalAmount: 240,
      }),
      [
        invoice({
          invoiceType: InvoiceType.UTILITIES,
          issuerName: 'OVO Energy',
          periodStart: '2026-07-02',
          periodEnd: '2026-08-01',
          totalAmount: 240,
        }),
      ],
    );

    expect(matches).toEqual([]);
  });

  it('reads a supplier name the same with or without its company suffix', () => {
    const matches = matchDuplicates(
      candidate({ issuerName: 'Record Automatic Doors', invoiceNumber: 'INV-169113' }),
      [invoice({ issuerName: 'Record Automatic Doors Pty Ltd', invoiceNumber: '169113' })],
    );

    expect(matches[0]?.rule).toBe(DuplicateRule.SAME_INVOICE_NUMBER);
  });

  it('does not match two businesses whose ABNs disagree', () => {
    const matches = matchDuplicates(
      candidate({ issuerName: 'Smith Plumbing', issuerAbn: '11 111 111 111', invoiceNumber: '42' }),
      [invoice({ issuerName: 'Smith Plumbing', issuerAbn: '22 222 222 222', invoiceNumber: '42' })],
    );

    expect(matches).toEqual([]);
  });

  it('reports the same file whatever the fields say', () => {
    const existing = invoice({ id: 'twin', issuerName: 'Someone Else', totalAmount: 999 });

    const matches = matchDuplicates(candidate({ checksum: 'abc' }), [existing], new Set(['twin']));

    expect(matches[0]?.rule).toBe(DuplicateRule.SAME_FILE);
  });

  it('puts the strongest rule first when several fire', () => {
    const twin = invoice({ id: 'twin', invoiceNumber: '169113' });
    const sameNumber = invoice({ id: 'other', invoiceNumber: '169113' });

    const matches = matchDuplicates(
      candidate({ invoiceNumber: '169113', checksum: 'abc' }),
      [sameNumber, twin],
      new Set(['twin']),
    );

    expect(matches.map((match) => match.rule)).toEqual([
      DuplicateRule.SAME_FILE,
      DuplicateRule.SAME_INVOICE_NUMBER,
    ]);
  });

  it('treats a one-off bill on a different day as a different bill', () => {
    const matches = matchDuplicates(candidate({ issueDate: '2026-08-14' }), [invoice({ issueDate: '2026-08-13' })]);

    expect(matches).toEqual([]);
  });
});

describe('normaliseInvoiceNumber', () => {
  const cases: [string, string][] = [
    ['INV-169113', '169113'],
    ['Invoice No. 169113', '169113'],
    ['invoice 169113', '169113'],
    ['169113', '169113'],
    ['00123', '123'],
    // Letters that only look like a label stay put, or two series collide.
    ['NOVA-123', 'NOVA123'],
    ['A-100', 'A100'],
  ];

  it.each(cases)('reads %s as %s', (input, expected) => {
    expect(normaliseInvoiceNumber(input)).toBe(expected);
  });

  it('keeps a number that is all zeros', () => {
    expect(normaliseInvoiceNumber('000')).toBe('0');
  });
});
