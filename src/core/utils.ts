import { ValueTransformer } from 'typeorm';

/**
 * pg returns `numeric` columns as strings to avoid float precision loss.
 * Money columns should read/write as JS numbers, so every money column uses this.
 */
export const moneyTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value === null || value === undefined ? value : parseFloat(value)),
};

/**
 * Australian financial year: 1 July -> 30 June. A date in Jan-Jun belongs to the FY
 * that started 1 July of the *previous* calendar year; a date in Jul-Dec belongs to
 * the FY starting 1 July of that same calendar year.
 *
 * Deliberately UTC-based (matches how `date` columns round-trip through pg) - do not
 * swap for local-time Date math or FY boundaries will shift by a day near midnight.
 */
export function financialYearStartOf(date: Date): Date {
  const year = date.getUTCMonth() >= 6 ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
  return new Date(Date.UTC(year, 6, 1)); // 1 July
}

export function financialYearEndOf(date: Date): Date {
  const start = financialYearStartOf(date);
  return new Date(Date.UTC(start.getUTCFullYear() + 1, 5, 30)); // 30 June, following year
}

/** e.g. "FY2025-26" for any date between 1 Jul 2025 and 30 Jun 2026 inclusive. */
export function financialYearLabel(date: Date): string {
  const start = financialYearStartOf(date);
  const startYear = start.getUTCFullYear();
  const endYearShort = String(startYear + 1).slice(-2);
  return `FY${startYear}-${endYearShort}`;
}

/**
 * Parses a "2025-2026" style FY query param (start-year and end-year, both 4
 * digits) into its start/end dates. Falls back to the current Australian
 * financial year (relative to `now`) when `fy` is missing or doesn't match the
 * expected shape.
 */
export function parseFinancialYearParam(fy: string | undefined, now: Date = new Date()): { start: Date; end: Date } {
  const match = fy?.match(/^(\d{4})-(\d{4})$/);
  if (!match) {
    const start = financialYearStartOf(now);
    return { start, end: financialYearEndOf(now) };
  }
  const startYear = parseInt(match[1], 10);
  const start = new Date(Date.UTC(startYear, 6, 1));
  return { start, end: financialYearEndOf(start) };
}
