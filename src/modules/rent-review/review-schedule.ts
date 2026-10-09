import { LeaseEntity, RentReviewMechanism } from '../../entities/lease.entity';

/**
 * A commercial lease normally carries two kinds of review: a small increase on
 * every anniversary (usually a fixed percentage, sometimes CPI), and a full
 * market review at the end of the term. Entering those one at a time is the
 * tedious part, so this works the whole schedule out from the lease itself.
 *
 * Nothing here is saved. The caller shows the proposal, and only what the user
 * confirms is written.
 */
export interface ProposedReview {
  reviewDate: string;
  reviewType: RentReviewMechanism;
  oldRentAnnual: number;
  newRentAnnual: number;
  percentChange: number;
  /** False when the lease does not say by how much the rent moves. */
  amountKnown: boolean;
  notes: string;
}

const round = (value: number) => Math.round(value * 100) / 100;

const addYears = (iso: string, years: number): string => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  // Day 29-31 can land on a month that is short of it; clamping to the last day
  // of that month is what a lease anniversary means in practice.
  const target = new Date(Date.UTC(y + years, m - 1, 1));
  const lastDay = new Date(Date.UTC(y + years, m, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
};

export function buildReviewSchedule(lease: LeaseEntity): ProposedReview[] {
  const { commencementDate, expiryDate, baseRentAnnual, rentReviewMechanism, rentReviewValue } = lease;
  if (!commencementDate || !expiryDate || !baseRentAnnual) {
    return [];
  }

  const start = commencementDate.slice(0, 10);
  const expiry = expiryDate.slice(0, 10);

  // A percentage only means anything for a percentage-based review. CPI and
  // market reviews happen on schedule but the amount is not knowable in advance.
  const isFixedPercent = rentReviewMechanism === RentReviewMechanism.FIXED_PERCENT;
  const percent = isFixedPercent && rentReviewValue ? Number(rentReviewValue) : 0;

  const proposals: ProposedReview[] = [];
  let currentRent = Number(baseRentAnnual);

  for (let year = 1; ; year += 1) {
    const reviewDate = addYears(start, year);
    // The anniversary that falls on or after expiry is the end of the term, not
    // an annual review; the market review below covers it.
    if (reviewDate >= expiry) break;
    // A runaway loop would be worse than an incomplete schedule.
    if (year > 50) break;

    const newRent = percent ? round(currentRent * (1 + percent / 100)) : currentRent;
    proposals.push({
      reviewDate,
      reviewType: rentReviewMechanism ?? RentReviewMechanism.FIXED_PERCENT,
      oldRentAnnual: round(currentRent),
      newRentAnnual: newRent,
      percentChange: percent,
      amountKnown: Boolean(percent),
      notes: percent
        ? `Year ${year} review: ${percent}% increase under the lease.`
        : `Year ${year} review. The lease does not fix the increase (${rentReviewMechanism ?? 'mechanism not recorded'}), so the new rent needs to be entered once it is agreed.`,
    });
    currentRent = newRent;
  }

  proposals.push({
    reviewDate: expiry,
    reviewType: RentReviewMechanism.MARKET,
    oldRentAnnual: round(currentRent),
    // A market review's outcome is unknown until it is negotiated, so the new
    // rent starts equal to the old one rather than inventing a movement.
    newRentAnnual: round(currentRent),
    percentChange: 0,
    amountKnown: false,
    notes: 'Market review at the end of the term. Enter the agreed rent once it is settled.',
  });

  return proposals;
}
