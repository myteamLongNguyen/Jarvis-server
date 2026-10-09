import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, LessThanOrEqual, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { RentalIncomeEntity, RentalIncomeStatus } from '../../entities/rental-income.entity';
import { PropertyEntity, PropertyCategory, PropertyStatus } from '../../entities/property.entity';
import { InvoiceEntity } from '../../entities/invoice.entity';
import { DocumentEntity, DocumentType } from '../../entities/document.entity';
import { LeaseEntity, LeaseStatus } from '../../entities/lease.entity';
import { RENT_ROLL_MISSING, RentRollResponse, RentRollRow, RentRollStatus } from '../../dto/rental-income.dto';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const round = (value: number) => Math.round(value * 100) / 100;

function sum<T>(items: T[], pick: (item: T) => number): number {
  return items.reduce((total, item) => total + (Number(pick(item)) || 0), 0);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from one date-only string to another, both ends counted. */
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS) + 1;
}

/**
 * Which records speak for a month, and at what value.
 *
 * An agent files more than one grain of statement: a run of monthly ones, a
 * quarterly roll-up, and an end-of-financial-year summary that restates the
 * whole twelve months. All three overlap the same month, and counting them
 * together reports the same rent two or three times over.
 *
 * So the finest grain wins. A record that sits entirely inside the month is
 * that month's rent and nothing longer is read beside it. Only where the month
 * has no record of its own does a longer one speak for it, apportioned by the
 * share of its period the month covers, and marked so the row can say the
 * figure was worked out rather than filed.
 */
function selectForMonth(
  overlapping: RentalIncomeEntity[],
  month: { start: string; end: string },
): { records: RentalIncomeEntity[]; apportioned: boolean } {
  const within = overlapping.filter(
    (record) => record.periodStart >= month.start && record.periodEnd <= month.end,
  );
  if (within.length > 0) {
    return { records: within, apportioned: false };
  }
  if (overlapping.length === 0) {
    return { records: [], apportioned: false };
  }

  const monthDays = daysBetween(month.start, month.end);
  const scaled = overlapping.map((record) => {
    const overlapFrom = record.periodStart > month.start ? record.periodStart : month.start;
    const overlapTo = record.periodEnd < month.end ? record.periodEnd : month.end;
    const share = daysBetween(overlapFrom, overlapTo) / Math.max(1, daysBetween(record.periodStart, record.periodEnd));

    // A shallow copy keeps the scaling out of the database; nothing here is saved.
    const copy = Object.assign(Object.create(Object.getPrototypeOf(record)), record) as RentalIncomeEntity;
    copy.grossAmount = round(Number(record.grossAmount ?? 0) * share);
    copy.netAmount = round(Number(record.netAmount ?? 0) * share);
    copy.agentCommission = round(Number(record.agentCommission ?? 0) * share);
    if (record.amountReceived !== null && record.amountReceived !== undefined) {
      copy.amountReceived = round(Number(record.amountReceived) * share);
    }
    copy.periodStart = overlapFrom;
    copy.periodEnd = overlapTo;
    return copy;
  });

  return { records: scaled, apportioned: monthDays > 0 };
}

/** First and last day of a YYYY-MM month, as date-only strings. */
function monthBounds(month: string): { start: string; end: string } {
  const [year, m] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, '0')}` };
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * The rent for one property in one month can arrive as several records, because
 * an agent that manages a property unit by unit sends one line per unit. The row
 * the user reads is the property, so those records collapse into one and the
 * worst status wins: a property is only settled for the month once every part of
 * it is.
 */
const STATUS_SEVERITY: Record<RentRollStatus, number> = {
  [RENT_ROLL_MISSING]: 5,
  [RentalIncomeStatus.OVERDUE]: 4,
  [RentalIncomeStatus.EXPECTED]: 3,
  [RentalIncomeStatus.INVOICED]: 2,
  [RentalIncomeStatus.WRITTEN_OFF]: 1,
  [RentalIncomeStatus.RECEIVED]: 0,
};

@Injectable()
export class RentRollService {
  constructor(
    @InjectRepository(RentalIncomeEntity)
    private readonly rentalIncomeRepo: Repository<RentalIncomeEntity>,
    @InjectRepository(PropertyEntity)
    private readonly propertyRepo: Repository<PropertyEntity>,
    @InjectRepository(InvoiceEntity)
    private readonly invoiceRepo: Repository<InvoiceEntity>,
    @InjectRepository(LeaseEntity)
    private readonly leaseRepo: Repository<LeaseEntity>,
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
  ) {}

  async getRentRoll(ownerId: string, month?: string, includePersonal = false): Promise<RentRollResponse> {
    const reportMonth = month && MONTH_RE.test(month) ? month : currentMonth();
    const { start, end } = monthBounds(reportMonth);

    const candidates = await this.propertyRepo.find({
      where: {
        ownerId,
        status: Not(In([PropertyStatus.SOLD, PropertyStatus.ARCHIVED])),
        ...(includePersonal ? {} : { category: PropertyCategory.INVESTMENT }),
      },
      order: { name: 'ASC' },
    });

    // A rent roll is only about properties that earn rent. Land held for
    // subdivision and the like would otherwise sit at the top of every month
    // reported as missing, and drown out the properties that really are.
    const rentEarning = await this.rentEarningPropertyIds(ownerId);
    const properties = candidates.filter((property) => rentEarning.has(property.id));
    if (properties.length === 0) {
      return this.empty(reportMonth, start, end);
    }

    const propertyIds = properties.map((property) => property.id);

    // Overlap rather than containment: an agent statement can run the 15th to
    // the 14th, and it still belongs to the month being looked at.
    const incomes = await this.rentalIncomeRepo.find({
      where: {
        ownerId,
        propertyId: In(propertyIds),
        periodStart: LessThanOrEqual(end),
        periodEnd: MoreThanOrEqual(start),
      },
    });

    const invoiceIds = [...new Set(incomes.map((income) => income.sourceInvoiceId).filter(Boolean))];
    const invoices = invoiceIds.length ? await this.invoiceRepo.find({ where: { ownerId, id: In(invoiceIds) } }) : [];
    const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]));

    const leases = await this.leaseRepo.find({
      where: { ownerId, propertyId: In(propertyIds), status: In([LeaseStatus.ACTIVE, LeaseStatus.HOLDOVER]) },
    });
    const leaseByProperty = new Map(leases.map((lease) => [lease.propertyId, lease]));

    // Records imported in bulk were never linked back to the file they came
    // from, so a statement filed for the month counts as paperwork too.
    // Otherwise every row would read as having none.
    const documents = await this.documentRepo.find({
      where: {
        ownerId,
        propertyId: In(propertyIds),
        documentType: In([DocumentType.PROPERTY_STATEMENT, DocumentType.INVOICE]),
        documentDate: Between(start, end),
      },
      order: { documentDate: 'DESC' },
    });
    const documentByProperty = new Map<string, DocumentEntity>();
    for (const document of documents) {
      if (!documentByProperty.has(document.propertyId)) documentByProperty.set(document.propertyId, document);
    }

    const byProperty = new Map<string, RentalIncomeEntity[]>();
    for (const income of incomes) {
      const existing = byProperty.get(income.propertyId);
      if (existing) existing.push(income);
      else byProperty.set(income.propertyId, [income]);
    }

    const rows = properties.map((property) =>
      this.buildRow(
        property,
        byProperty.get(property.id) ?? [],
        invoiceById,
        { start, end },
        leaseByProperty.get(property.id),
        documentByProperty.get(property.id),
      ),
    );

    return {
      month: reportMonth,
      periodStart: start,
      periodEnd: end,
      totals: {
        expected: round(sum(rows, (row) => row.netAmount)),
        received: round(sum(rows, (row) => row.amountReceived)),
        outstanding: round(sum(rows, (row) => row.outstanding)),
        propertiesTotal: rows.length,
        propertiesReceived: rows.filter((row) => row.status === RentalIncomeStatus.RECEIVED).length,
        propertiesMissing: rows.filter((row) => row.status === RENT_ROLL_MISSING).length,
      },
      rows,
    };
  }

  private buildRow(
    property: PropertyEntity,
    overlapping: RentalIncomeEntity[],
    invoiceById: Map<string, InvoiceEntity>,
    month: { start: string; end: string },
    lease?: LeaseEntity,
    document?: DocumentEntity,
  ): RentRollRow {
    const expectedFromLease = lease?.baseRentAnnual ? round(Number(lease.baseRentAnnual) / 12) : undefined;
    const { records, apportioned } = selectForMonth(overlapping, month);

    if (records.length === 0) {
      return {
        propertyId: property.id,
        propertyName: property.name,
        rentalIncomeId: null,
        status: RENT_ROLL_MISSING,
        grossAmount: 0,
        netAmount: 0,
        amountReceived: 0,
        outstanding: 0,
        agentCommission: 0,
        // A statement sitting on file for a month with no rent recorded is a
        // strong hint: the paperwork arrived and nobody entered it.
        hasDocument: Boolean(document),
        documentId: document?.id,
        recordCount: 0,
        apportioned: false,
        expectedFromLease,
      };
    }

    const status = records
      .map((record) => record.status as RentRollStatus)
      .reduce((worst, current) => (STATUS_SEVERITY[current] > STATUS_SEVERITY[worst] ? current : worst));

    const netAmount = round(sum(records, (record) => record.netAmount));
    const amountReceived = round(sum(records, (record) => this.receivedOf(record)));
    // Written off is settled, not owing, so it leaves nothing outstanding even
    // though no money arrived.
    const settled = round(
      sum(records, (record) =>
        record.status === RentalIncomeStatus.WRITTEN_OFF ? record.netAmount : this.receivedOf(record),
      ),
    );

    const invoice = records.map((record) => invoiceById.get(record.sourceInvoiceId)).find(Boolean);
    const latestReceipt = records
      .map((record) => record.receivedDate)
      .filter(Boolean)
      .sort()
      .pop();

    return {
      propertyId: property.id,
      propertyName: property.name,
      // Only a usable link target when the row is a single record. When a
      // property bills per unit the frontend opens the property instead.
      rentalIncomeId: records.length === 1 ? records[0].id : null,
      status,
      grossAmount: round(sum(records, (record) => record.grossAmount)),
      netAmount,
      amountReceived,
      outstanding: Math.max(0, round(netAmount - settled)),
      periodStart: records.map((record) => record.periodStart).sort()[0],
      periodEnd: records
        .map((record) => record.periodEnd)
        .sort()
        .pop(),
      receivedDate: latestReceipt,
      agentCommission: round(sum(records, (record) => record.agentCommission ?? 0)),
      hasDocument:
        records.some((record) => Boolean(record.sourceInvoiceId) || Boolean(record.sourceStatementId)) ||
        Boolean(document),
      invoiceId: invoice?.id,
      invoiceNumber: invoice?.invoiceNumber,
      documentId: document?.id,
      recordCount: records.length,
      apportioned,
      expectedFromLease,
    };
  }

  /**
   * Rent earning means one of two things: rent has been recorded against the
   * property at some point, or a lease is on file. The lease half matters for a
   * property let for the first time, which has no history yet but should start
   * showing up as soon as the rent is due.
   */
  private async rentEarningPropertyIds(ownerId: string): Promise<Set<string>> {
    const [withIncome, withLease] = await Promise.all([
      this.rentalIncomeRepo
        .createQueryBuilder('income')
        .select('DISTINCT income.property_id', 'propertyId')
        .where('income.owner_id = :ownerId', { ownerId })
        .getRawMany<{ propertyId: string }>(),
      this.leaseRepo
        .createQueryBuilder('lease')
        .select('DISTINCT lease.property_id', 'propertyId')
        .where('lease.owner_id = :ownerId', { ownerId })
        .andWhere('lease.status IN (:...statuses)', {
          statuses: [LeaseStatus.ACTIVE, LeaseStatus.HOLDOVER, LeaseStatus.DRAFT],
        })
        .getRawMany<{ propertyId: string }>(),
    ]);

    return new Set([...withIncome, ...withLease].map((row) => row.propertyId));
  }

  /**
   * A record marked received without an explicit figure means the whole net
   * amount landed; that is how the forms have always been filled in.
   */
  private receivedOf(record: RentalIncomeEntity): number {
    if (record.amountReceived !== null && record.amountReceived !== undefined) {
      return Number(record.amountReceived);
    }
    return record.status === RentalIncomeStatus.RECEIVED ? Number(record.netAmount) : 0;
  }

  private empty(month: string, start: string, end: string): RentRollResponse {
    return {
      month,
      periodStart: start,
      periodEnd: end,
      totals: {
        expected: 0,
        received: 0,
        outstanding: 0,
        propertiesTotal: 0,
        propertiesReceived: 0,
        propertiesMissing: 0,
      },
      rows: [],
    };
  }
}
