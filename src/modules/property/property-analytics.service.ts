import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PropertyService } from './property.service';
import { PortfolioAnalyticsService } from '../portfolio/portfolio-analytics.service';
import { LeaseEntity, LeaseStatus } from '../../entities/lease.entity';
import { RentReviewEntity, RentReviewStatus } from '../../entities/rent-review.entity';
import { RentalIncomeEntity } from '../../entities/rental-income.entity';
import { PropertyExpenseEntity } from '../../entities/property-expense.entity';
import { MaintenanceRecordEntity } from '../../entities/maintenance-record.entity';
import { InvoiceEntity, InvoiceStatus } from '../../entities/invoice.entity';
import { PropertySummaryResponse, ReturnResponse } from '../../dto/portfolio.dto';
import { StandardPaginatedResponse } from '../../dto/standard';
import { InvoiceQueryDto, InvoiceResponse } from '../../dto/invoice.dto';
import { financialYearStartOf } from '../../core/utils';

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class PropertyAnalyticsService {
  constructor(
    private readonly propertyService: PropertyService,
    private readonly portfolioAnalyticsService: PortfolioAnalyticsService,
    @InjectRepository(LeaseEntity)
    private readonly leaseRepo: Repository<LeaseEntity>,
    @InjectRepository(RentReviewEntity)
    private readonly rentReviewRepo: Repository<RentReviewEntity>,
    @InjectRepository(RentalIncomeEntity)
    private readonly rentalIncomeRepo: Repository<RentalIncomeEntity>,
    @InjectRepository(PropertyExpenseEntity)
    private readonly propertyExpenseRepo: Repository<PropertyExpenseEntity>,
    @InjectRepository(MaintenanceRecordEntity)
    private readonly maintenanceRecordRepo: Repository<MaintenanceRecordEntity>,
    @InjectRepository(InvoiceEntity)
    private readonly invoiceRepo: Repository<InvoiceEntity>,
  ) {}

  async getSummary(propertyId: string, ownerId: string): Promise<PropertySummaryResponse> {
    const property = await this.propertyService.findOne(propertyId, ownerId);
    const asOfDate = new Date();
    const windowStart = financialYearStartOf(asOfDate);

    const activeLeases = await this.leaseRepo.count({
      where: { propertyId, ownerId, status: LeaseStatus.ACTIVE },
    });

    const currentAnnualRentRow = await this.leaseRepo
      .createQueryBuilder('lease')
      .select('COALESCE(SUM(lease.base_rent_annual), 0)', 'total')
      .where('lease.owner_id = :ownerId', { ownerId })
      .andWhere('lease.property_id = :propertyId', { propertyId })
      .andWhere('lease.status = :status', { status: LeaseStatus.ACTIVE })
      .getRawOne<{ total: string }>();

    const { gross, net } = await this.portfolioAnalyticsService.getNetIncome(
      propertyId,
      ownerId,
      windowStart,
      asOfDate,
    );

    const ytdMaintenanceRow = await this.maintenanceRecordRepo
      .createQueryBuilder('record')
      .select('COALESCE(SUM(record.cost + record.gst_amount), 0)', 'total')
      .where('record.owner_id = :ownerId', { ownerId })
      .andWhere('record.property_id = :propertyId', { propertyId })
      .andWhere('record.service_date >= :from', { from: toDateStr(windowStart) })
      .getRawOne<{ total: string }>();

    const lastValuation = await this.portfolioAnalyticsService.getLatestValuationAmount(propertyId, ownerId);
    const returns = await this.portfolioAnalyticsService.calculateReturn(propertyId, ownerId);

    const unpaidInvoicesRow = await this.invoiceRepo
      .createQueryBuilder('invoice')
      .select('COALESCE(SUM(invoice.total_amount - COALESCE(invoice.paid_amount, 0)), 0)', 'total')
      .where('invoice.owner_id = :ownerId', { ownerId })
      .andWhere('invoice.property_id = :propertyId', { propertyId })
      .andWhere('invoice.status IN (:...statuses)', {
        statuses: [InvoiceStatus.APPROVED, InvoiceStatus.OVERDUE],
      })
      .getRawOne<{ total: string }>();

    const nextRentReview = await this.rentReviewRepo
      .createQueryBuilder('review')
      .innerJoin('review.lease', 'lease')
      .where('review.owner_id = :ownerId', { ownerId })
      .andWhere('lease.property_id = :propertyId', { propertyId })
      .andWhere('review.status = :status', { status: RentReviewStatus.SCHEDULED })
      .orderBy('review.review_date', 'ASC')
      .getOne();

    const expiringLeases = await this.leaseRepo
      .createQueryBuilder('lease')
      .where('lease.owner_id = :ownerId', { ownerId })
      .andWhere('lease.property_id = :propertyId', { propertyId })
      .andWhere('lease.status = :status', { status: LeaseStatus.ACTIVE })
      .andWhere("lease.expiry_date <= (CURRENT_DATE + INTERVAL '90 days')")
      .getCount();

    return {
      property,
      activeLeases,
      currentAnnualRent: parseFloat(currentAnnualRentRow?.total ?? '0'),
      ytdGrossIncome: gross,
      ytdNetIncome: net,
      ytdMaintenance: parseFloat(ytdMaintenanceRow?.total ?? '0'),
      lastValuation: lastValuation ?? undefined,
      yieldOnCost: returns.netYieldOnCost,
      yieldOnValuation: returns.netYieldOnCurrentValuation,
      unpaidInvoicesTotal: parseFloat(unpaidInvoicesRow?.total ?? '0'),
      nextRentReview: nextRentReview?.reviewDate,
      expiringLeases,
    };
  }

  async getReturn(propertyId: string, ownerId: string, asOf?: string): Promise<ReturnResponse> {
    return this.portfolioAnalyticsService.calculateReturn(propertyId, ownerId, asOf);
  }

  async getIncomeTimeSeries(
    propertyId: string,
    ownerId: string,
    from?: string,
    to?: string,
    groupBy: 'month' | 'quarter' | 'year' = 'month',
  ) {
    const bucket = groupBy === 'quarter' ? 'quarter' : groupBy === 'year' ? 'year' : 'month';
    const qb = this.rentalIncomeRepo
      .createQueryBuilder('income')
      .select(`date_trunc('${bucket}', income.period_start)`, 'period')
      .addSelect('COALESCE(SUM(income.gross_amount), 0)', 'grossAmount')
      .addSelect('COALESCE(SUM(income.net_amount), 0)', 'netAmount')
      .where('income.owner_id = :ownerId', { ownerId })
      .andWhere('income.property_id = :propertyId', { propertyId });

    if (from) qb.andWhere('income.period_start >= :from', { from });
    if (to) qb.andWhere('income.period_end <= :to', { to });

    const rows = await qb.groupBy('period').orderBy('period', 'ASC').getRawMany<{
      period: Date;
      grossAmount: string;
      netAmount: string;
    }>();

    return rows.map((row) => ({
      period: row.period,
      grossAmount: parseFloat(row.grossAmount),
      netAmount: parseFloat(row.netAmount),
    }));
  }

  async getExpensesGrouped(
    propertyId: string,
    ownerId: string,
    from?: string,
    to?: string,
    groupBy: 'month' | 'category' = 'month',
  ) {
    const qb = this.propertyExpenseRepo
      .createQueryBuilder('expense')
      .where('expense.owner_id = :ownerId', { ownerId })
      .andWhere('expense.property_id = :propertyId', { propertyId });

    if (from) qb.andWhere('expense.expense_date >= :from', { from });
    if (to) qb.andWhere('expense.expense_date <= :to', { to });

    if (groupBy === 'category') {
      qb.select('expense.category', 'group').addSelect('COALESCE(SUM(expense.amount), 0)', 'amount');
      qb.groupBy('expense.category').orderBy('expense.category', 'ASC');
    } else {
      qb.select("date_trunc('month', expense.expense_date)", 'group').addSelect(
        'COALESCE(SUM(expense.amount), 0)',
        'amount',
      );
      qb.groupBy('group').orderBy('group', 'ASC');
    }

    const rows = await qb.getRawMany<{ group: string | Date; amount: string }>();
    return rows.map((row) => ({ group: row.group, amount: parseFloat(row.amount) }));
  }

  async getMaintenance(propertyId: string, ownerId: string, from?: string, to?: string) {
    const qb = this.maintenanceRecordRepo
      .createQueryBuilder('record')
      .where('record.owner_id = :ownerId', { ownerId })
      .andWhere('record.property_id = :propertyId', { propertyId });

    if (from) qb.andWhere('record.service_date >= :from', { from });
    if (to) qb.andWhere('record.service_date <= :to', { to });

    const items = await qb.orderBy('record.service_date', 'DESC').getMany();

    const totalSpend = items.reduce((sum, item) => sum + item.cost + item.gstAmount, 0);
    const byCategory = Object.values(
      items.reduce(
        (acc, item) => {
          acc[item.category] = acc[item.category] || { category: item.category, total: 0 };
          acc[item.category].total += item.cost + item.gstAmount;
          return acc;
        },
        {} as Record<string, { category: string; total: number }>,
      ),
    );

    return { items, totalSpend, byCategory };
  }

  async getInvoices(
    propertyId: string,
    ownerId: string,
    query: InvoiceQueryDto,
  ): Promise<StandardPaginatedResponse<InvoiceResponse>> {
    const { offset = 0, limit = 20, status, from, to } = query;
    const qb = this.invoiceRepo
      .createQueryBuilder('invoice')
      .where('invoice.owner_id = :ownerId', { ownerId })
      .andWhere('invoice.property_id = :propertyId', { propertyId });

    if (status) qb.andWhere('invoice.status = :status', { status });
    if (from) qb.andWhere('invoice.issue_date >= :from', { from });
    if (to) qb.andWhere('invoice.issue_date <= :to', { to });

    const [items, total] = await qb
      .orderBy('invoice.issue_date', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return {
      offset,
      limit,
      total,
      items: items as unknown as InvoiceResponse[],
    };
  }
}
