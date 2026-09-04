import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { LeaseEntity, LeaseStatus, RentFrequency } from '../../entities/lease.entity';
import { RentReviewEntity, RentReviewStatus } from '../../entities/rent-review.entity';
import { DocumentEntity, DocumentType } from '../../entities/document.entity';
import { RentalIncomeEntity, RentalIncomeStatus } from '../../entities/rental-income.entity';
import { PropertyEntity } from '../../entities/property.entity';
import { ReminderCategory, ReminderItem, ReminderSeverity, ReminderSummaryResponse } from '../../dto/reminder.dto';

const DEFAULT_WINDOW_DAYS = 60;
const COMPLIANCE_DOCUMENT_TYPES = [DocumentType.INSURANCE_POLICY, DocumentType.COMPLIANCE_CERT];
const OPEN_LEASE_STATUSES = [LeaseStatus.ACTIVE, LeaseStatus.HOLDOVER];

// Some seed/import flows (see seed-carr-group-real.ts) write commencementDate '1900-01-01' /
// expiryDate '1900-01-02' / initialTermMonths 0 as a dummy sentinel purely to satisfy this table's
// NOT-NULL columns, for properties where no real lease agreement was ever supplied. None of that is
// a real date, so it must never be surfaced as an "expired lease" reminder.
const SENTINEL_LEASE_COMMENCEMENT_DATE = '1900-01-01';
function isSentinelLease(lease: LeaseEntity): boolean {
  return lease.commencementDate === SENTINEL_LEASE_COMMENCEMENT_DATE && lease.initialTermMonths === 0;
}
const UNPAID_RENTAL_INCOME_STATUSES = [
  RentalIncomeStatus.EXPECTED,
  RentalIncomeStatus.INVOICED,
  RentalIncomeStatus.OVERDUE,
];

// How far back to bother reconstructing a lease's expected rent periods. Leases that predate this
// system by years shouldn't dump years of "missing" backlog into the feed — cap it to a recent window.
const MISSING_PERIOD_LOOKBACK_DAYS = 365;
const MAX_MISSING_PERIODS_PER_LEASE = 6;

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

function frequencyMonths(frequency: RentFrequency): number {
  switch (frequency) {
    case RentFrequency.MONTHLY:
      return 1;
    case RentFrequency.QUARTERLY:
      return 3;
    case RentFrequency.ANNUALLY:
      return 12;
  }
}

/** Splits a lease's term into completed rent periods (by rentFrequency) up to `asOf`, capped to a recent lookback window. */
function generateCompletedPeriods(lease: LeaseEntity, asOf: Date): { start: string; end: string }[] {
  const stepMonths = frequencyMonths(lease.rentFrequency);
  const leaseEnd = new Date(`${lease.expiryDate}T00:00:00Z`);
  const cutoff = leaseEnd < asOf ? leaseEnd : asOf;
  const earliestRelevant = addDays(asOf, -MISSING_PERIOD_LOOKBACK_DAYS);

  const periods: { start: string; end: string }[] = [];
  let cursor = new Date(`${lease.commencementDate}T00:00:00Z`);

  while (cursor < cutoff) {
    const periodEndExclusive = addMonths(cursor, stepMonths);
    const periodEnd = addDays(periodEndExclusive, -1);
    if (periodEnd >= cutoff) break; // in-progress period, not due yet

    if (periodEnd >= earliestRelevant) {
      periods.push({ start: toDateStr(cursor), end: toDateStr(periodEnd) });
    }
    cursor = periodEndExclusive;
  }

  return periods;
}

@Injectable()
export class ReminderService {
  constructor(
    @InjectRepository(LeaseEntity)
    private readonly leaseRepo: Repository<LeaseEntity>,
    @InjectRepository(RentReviewEntity)
    private readonly rentReviewRepo: Repository<RentReviewEntity>,
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
    @InjectRepository(RentalIncomeEntity)
    private readonly rentalIncomeRepo: Repository<RentalIncomeEntity>,
    @InjectRepository(PropertyEntity)
    private readonly propertyRepo: Repository<PropertyEntity>,
  ) {}

  async getReminders(ownerId: string, windowDays: number = DEFAULT_WINDOW_DAYS): Promise<ReminderSummaryResponse> {
    const asOf = new Date();
    const asOfStr = toDateStr(asOf);
    const horizonStr = toDateStr(addDays(asOf, windowDays));

    const properties = await this.propertyRepo.find({ where: { ownerId } });
    const propertyNameById = new Map(properties.map((p) => [p.id, p.name]));

    const [leaseItems, rentReviewItems, complianceItems, unpaidRentalItems] = await Promise.all([
      this.getLeaseExpiries(ownerId, asOfStr, horizonStr, propertyNameById),
      this.getRentReviews(ownerId, asOfStr, horizonStr, propertyNameById),
      this.getComplianceRenewals(ownerId, asOfStr, horizonStr, propertyNameById),
      this.getUnpaidRental(ownerId, asOf, asOfStr, propertyNameById),
    ]);

    const items = [...leaseItems, ...rentReviewItems, ...complianceItems, ...unpaidRentalItems].sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === ReminderSeverity.OVERDUE ? -1 : 1;
      return (a.dueDate ?? '').localeCompare(b.dueDate ?? '');
    });

    const overdueTotal = items.filter((i) => i.severity === ReminderSeverity.OVERDUE).length;

    return {
      asOf: asOfStr,
      windowDays,
      counts: {
        leaseExpiries: leaseItems.length,
        rentReviews: rentReviewItems.length,
        complianceRenewals: complianceItems.length,
        unpaidRental: unpaidRentalItems.length,
        overdueTotal,
      },
      items,
    };
  }

  private async getLeaseExpiries(
    ownerId: string,
    asOfStr: string,
    horizonStr: string,
    propertyNameById: Map<string, string>,
  ): Promise<ReminderItem[]> {
    const leases = await this.leaseRepo.find({
      where: { ownerId, status: In(OPEN_LEASE_STATUSES) },
      relations: ['tenant'],
    });

    return leases
      .filter((lease) => !isSentinelLease(lease) && lease.expiryDate <= horizonStr)
      .map((lease) => {
        const overdue = lease.expiryDate < asOfStr;
        return {
          id: `lease-expiry:${lease.id}`,
          category: ReminderCategory.LEASE_EXPIRY,
          severity: overdue ? ReminderSeverity.OVERDUE : ReminderSeverity.DUE_SOON,
          title: overdue ? 'Lease expired' : 'Lease expiring soon',
          detail: `${lease.tenant?.name ?? 'Tenant'} at ${propertyNameById.get(lease.propertyId) ?? 'property'} — ${lease.status === LeaseStatus.HOLDOVER ? 'currently on holdover, ' : ''}expiry ${lease.expiryDate}`,
          dueDate: lease.expiryDate,
          propertyId: lease.propertyId,
          propertyName: propertyNameById.get(lease.propertyId),
          entityId: lease.id,
        };
      });
  }

  private async getRentReviews(
    ownerId: string,
    asOfStr: string,
    horizonStr: string,
    propertyNameById: Map<string, string>,
  ): Promise<ReminderItem[]> {
    const items: ReminderItem[] = [];
    const seenLeaseDates = new Set<string>();

    // Explicitly scheduled reviews are the primary source of truth.
    const scheduledReviews = await this.rentReviewRepo.find({
      where: { ownerId, status: RentReviewStatus.SCHEDULED },
      relations: ['lease', 'lease.tenant'],
    });
    for (const review of scheduledReviews) {
      if (review.reviewDate > horizonStr) continue;
      const overdue = review.reviewDate < asOfStr;
      const lease = review.lease;
      seenLeaseDates.add(`${review.leaseId}:${review.reviewDate}`);
      items.push({
        id: `rent-review:${review.id}`,
        category: ReminderCategory.RENT_REVIEW,
        severity: overdue ? ReminderSeverity.OVERDUE : ReminderSeverity.DUE_SOON,
        title: overdue ? 'Rent review overdue' : 'Rent review due soon',
        detail: `${lease?.tenant?.name ?? 'Tenant'} at ${propertyNameById.get(lease?.propertyId ?? '') ?? 'property'} — ${review.reviewType} review, current rent ${lease?.baseRentAnnual ?? review.oldRentAnnual}/yr`,
        dueDate: review.reviewDate,
        propertyId: lease?.propertyId,
        propertyName: propertyNameById.get(lease?.propertyId ?? ''),
        entityId: review.leaseId,
      });
    }

    // Fall back to the lease's own nextReviewDate for leases that don't already have a
    // matching scheduled review row on file.
    const leases = await this.leaseRepo.find({
      where: { ownerId, status: In(OPEN_LEASE_STATUSES) },
      relations: ['tenant'],
    });
    for (const lease of leases) {
      if (isSentinelLease(lease)) continue;
      if (!lease.nextReviewDate || lease.nextReviewDate > horizonStr) continue;
      if (seenLeaseDates.has(`${lease.id}:${lease.nextReviewDate}`)) continue;

      const overdue = lease.nextReviewDate < asOfStr;
      items.push({
        id: `rent-review:lease:${lease.id}`,
        category: ReminderCategory.RENT_REVIEW,
        severity: overdue ? ReminderSeverity.OVERDUE : ReminderSeverity.DUE_SOON,
        title: overdue ? 'Rent review overdue' : 'Rent review due soon',
        detail: `${lease.tenant?.name ?? 'Tenant'} at ${propertyNameById.get(lease.propertyId) ?? 'property'} — ${lease.rentReviewMechanism} review, current rent ${lease.baseRentAnnual}/yr`,
        dueDate: lease.nextReviewDate,
        propertyId: lease.propertyId,
        propertyName: propertyNameById.get(lease.propertyId),
        entityId: lease.id,
      });
    }

    return items;
  }

  private async getComplianceRenewals(
    ownerId: string,
    asOfStr: string,
    horizonStr: string,
    propertyNameById: Map<string, string>,
  ): Promise<ReminderItem[]> {
    const docs = await this.documentRepo.find({
      where: { ownerId, documentType: In(COMPLIANCE_DOCUMENT_TYPES) },
    });

    // Where several documents of the same type are on file for a property (e.g. a renewed
    // policy replacing an old one), only the one expiring latest matters.
    const latestByKey = new Map<string, DocumentEntity>();
    for (const doc of docs) {
      if (!doc.expiryDate) continue;
      const key = `${doc.propertyId ?? 'unassigned'}:${doc.documentType}`;
      const current = latestByKey.get(key);
      if (!current || doc.expiryDate > current.expiryDate) {
        latestByKey.set(key, doc);
      }
    }

    const items: ReminderItem[] = [];
    for (const doc of latestByKey.values()) {
      if (doc.expiryDate > horizonStr) continue;
      const overdue = doc.expiryDate < asOfStr;
      const label = doc.documentType === DocumentType.INSURANCE_POLICY ? 'Insurance' : 'Compliance certificate';
      items.push({
        id: `compliance:${doc.id}`,
        category: ReminderCategory.COMPLIANCE_RENEWAL,
        severity: overdue ? ReminderSeverity.OVERDUE : ReminderSeverity.DUE_SOON,
        title: overdue ? `${label} expired` : `${label} renewal due soon`,
        detail: `${doc.title}${doc.propertyId ? ` — ${propertyNameById.get(doc.propertyId) ?? 'property'}` : ''}, expires ${doc.expiryDate}`,
        dueDate: doc.expiryDate,
        propertyId: doc.propertyId,
        propertyName: doc.propertyId ? propertyNameById.get(doc.propertyId) : undefined,
        entityId: doc.id,
      });
    }
    return items;
  }

  private async getUnpaidRental(
    ownerId: string,
    asOf: Date,
    asOfStr: string,
    propertyNameById: Map<string, string>,
  ): Promise<ReminderItem[]> {
    const items: ReminderItem[] = [];

    // 1. Rental income rows that exist but were never confirmed received, for a period
    // that has already ended.
    const overdueIncomes = await this.rentalIncomeRepo.find({
      where: { ownerId, status: In(UNPAID_RENTAL_INCOME_STATUSES) },
    });
    for (const income of overdueIncomes) {
      if (income.periodEnd >= asOfStr) continue;
      items.push({
        id: `unpaid-rental:income:${income.id}`,
        category: ReminderCategory.UNPAID_RENTAL,
        severity: ReminderSeverity.OVERDUE,
        title: 'Rent not confirmed received',
        detail: `${propertyNameById.get(income.propertyId) ?? 'Property'} — period ${income.periodStart} to ${income.periodEnd}, net ${income.netAmount} still unconfirmed`,
        dueDate: income.periodEnd,
        propertyId: income.propertyId,
        propertyName: propertyNameById.get(income.propertyId),
        entityId: income.id,
        amount: income.netAmount,
      });
    }

    // 2. Periods that lapsed with no rental income record at all — likely a kept-up lease
    // that nobody invoiced/logged.
    const leases = await this.leaseRepo.find({
      where: { ownerId, status: In(OPEN_LEASE_STATUSES) },
      relations: ['tenant'],
    });
    const incomesByLease = await this.rentalIncomeRepo.find({
      where: { ownerId, leaseId: In(leases.length ? leases.map((l) => l.id) : ['00000000-0000-0000-0000-000000000000']) },
    });
    const periodStartsByLease = new Map<string, Set<string>>();
    for (const income of incomesByLease) {
      if (!income.leaseId) continue;
      if (!periodStartsByLease.has(income.leaseId)) periodStartsByLease.set(income.leaseId, new Set());
      periodStartsByLease.get(income.leaseId)!.add(income.periodStart);
    }

    for (const lease of leases) {
      if (isSentinelLease(lease)) continue;
      const recordedStarts = periodStartsByLease.get(lease.id) ?? new Set<string>();
      const missing = generateCompletedPeriods(lease, asOf).filter((p) => !recordedStarts.has(p.start));
      const shown = missing.slice(-MAX_MISSING_PERIODS_PER_LEASE);
      const hiddenCount = missing.length - shown.length;

      for (const period of shown) {
        const isEarliestShown = period === shown[0];
        items.push({
          id: `unpaid-rental:missing:${lease.id}:${period.start}`,
          category: ReminderCategory.UNPAID_RENTAL,
          severity: ReminderSeverity.OVERDUE,
          title: 'Rent period never recorded',
          // The "+N earlier" count is also carried as a structured field (hiddenEarlierCount)
          // below — don't rely on parsing it back out of this sentence.
          detail: `${lease.tenant?.name ?? 'Tenant'} at ${propertyNameById.get(lease.propertyId) ?? 'property'} — no rental income logged for ${period.start} to ${period.end}${hiddenCount > 0 && isEarliestShown ? ` (+${hiddenCount} earlier period${hiddenCount === 1 ? '' : 's'} also missing)` : ''}`,
          dueDate: period.end,
          propertyId: lease.propertyId,
          propertyName: propertyNameById.get(lease.propertyId),
          entityId: lease.id,
          hiddenEarlierCount: hiddenCount > 0 && isEarliestShown ? hiddenCount : undefined,
        });
      }
    }

    return items;
  }
}
