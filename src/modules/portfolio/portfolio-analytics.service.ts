import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PropertyEntity, PropertyStatus, PropertyCategory } from '../../entities/property.entity';
import { RentalIncomeEntity } from '../../entities/rental-income.entity';
import { PropertyExpenseEntity } from '../../entities/property-expense.entity';
import { MaintenanceRecordEntity } from '../../entities/maintenance-record.entity';
import { ValuationEntity } from '../../entities/valuation.entity';
import { InvoiceEntity, InvoiceStatus } from '../../entities/invoice.entity';
import { ReturnResponse, PortfolioSummaryResponse, PropertyRankingItem } from '../../dto/portfolio.dto';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysInWindow(from: Date, to: Date): number {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / MS_PER_DAY) + 1);
}

function annualise(periodValue: number, from: Date, to: Date): number {
  return periodValue * (365 / daysInWindow(from, to));
}

function yearStartOf(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
}

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class PortfolioAnalyticsService {
  constructor(
    @InjectRepository(PropertyEntity)
    private readonly propertyRepo: Repository<PropertyEntity>,
    @InjectRepository(RentalIncomeEntity)
    private readonly rentalIncomeRepo: Repository<RentalIncomeEntity>,
    @InjectRepository(PropertyExpenseEntity)
    private readonly propertyExpenseRepo: Repository<PropertyExpenseEntity>,
    @InjectRepository(MaintenanceRecordEntity)
    private readonly maintenanceRecordRepo: Repository<MaintenanceRecordEntity>,
    @InjectRepository(ValuationEntity)
    private readonly valuationRepo: Repository<ValuationEntity>,
    @InjectRepository(InvoiceEntity)
    private readonly invoiceRepo: Repository<InvoiceEntity>,
  ) {}

  /** Gross/net rental income for a property in a window. Net here is the agent-statement net (before general property expenses). */
  async sumRentalIncome(
    propertyId: string,
    ownerId: string,
    from: Date,
    to: Date,
  ): Promise<{ gross: number; net: number }> {
    const row = await this.rentalIncomeRepo
      .createQueryBuilder('income')
      .select('COALESCE(SUM(income.gross_amount), 0)', 'gross')
      .addSelect('COALESCE(SUM(income.net_amount), 0)', 'net')
      .where('income.owner_id = :ownerId', { ownerId })
      .andWhere('income.property_id = :propertyId', { propertyId })
      .andWhere('income.period_start <= :to', { to: toDateStr(to) })
      .andWhere('income.period_end >= :from', { from: toDateStr(from) })
      .getRawOne<{ gross: string; net: string }>();

    return { gross: parseFloat(row?.gross ?? '0'), net: parseFloat(row?.net ?? '0') };
  }

  async sumPropertyExpenses(propertyId: string, ownerId: string, from: Date, to: Date): Promise<number> {
    const row = await this.propertyExpenseRepo
      .createQueryBuilder('expense')
      .select('COALESCE(SUM(expense.amount), 0)', 'total')
      .where('expense.owner_id = :ownerId', { ownerId })
      .andWhere('expense.property_id = :propertyId', { propertyId })
      .andWhere('expense.expense_date BETWEEN :from AND :to', { from: toDateStr(from), to: toDateStr(to) })
      .getRawOne<{ total: string }>();

    return parseFloat(row?.total ?? '0');
  }

  /** Net income after all expenses: agent-statement net income minus every recorded property expense in the window. */
  async getNetIncome(propertyId: string, ownerId: string, from: Date, to: Date): Promise<{ gross: number; net: number }> {
    const [{ gross, net: rentalNet }, expenses] = await Promise.all([
      this.sumRentalIncome(propertyId, ownerId, from, to),
      this.sumPropertyExpenses(propertyId, ownerId, from, to),
    ]);

    return { gross, net: rentalNet - expenses };
  }

  async sumNetIncomeSince(propertyId: string, ownerId: string, since: Date): Promise<number> {
    const now = new Date();
    const rentalNetRow = await this.rentalIncomeRepo
      .createQueryBuilder('income')
      .select('COALESCE(SUM(income.net_amount), 0)', 'net')
      .where('income.owner_id = :ownerId', { ownerId })
      .andWhere('income.property_id = :propertyId', { propertyId })
      .andWhere('income.period_start >= :since', { since: toDateStr(since) })
      .getRawOne<{ net: string }>();

    const expenses = await this.sumPropertyExpenses(propertyId, ownerId, since, now);

    return parseFloat(rentalNetRow?.net ?? '0') - expenses;
  }

  async getLatestValuationAmount(propertyId: string, ownerId: string): Promise<number | null> {
    const valuation = await this.valuationRepo.findOne({
      where: { propertyId, ownerId },
      order: { valuationDate: 'DESC' },
    });
    return valuation ? valuation.valuationAmount : null;
  }

  async calculateReturn(
    propertyId: string,
    ownerId: string,
    asOf?: string,
  ): Promise<ReturnResponse> {
    const property = await this.propertyRepo.findOne({ where: { id: propertyId, ownerId } });
    if (!property) {
      throw new NotFoundException(`Property ${propertyId} not found`);
    }

    const asOfDate = asOf ? new Date(asOf) : new Date();
    const windowStart = yearStartOf(asOfDate);

    const { gross, net } = await this.getNetIncome(propertyId, ownerId, windowStart, asOfDate);
    const annualisedGrossIncome = annualise(gross, windowStart, asOfDate);
    const annualisedNetIncome = annualise(net, windowStart, asOfDate);

    const costBase = property.purchasePrice + property.purchaseCosts;
    const latestValuation = (await this.getLatestValuationAmount(propertyId, ownerId)) ?? costBase;

    const grossYieldOnCost = costBase > 0 ? annualisedGrossIncome / costBase : 0;
    const netYieldOnCost = costBase > 0 ? annualisedNetIncome / costBase : 0;
    const grossYieldOnCurrentValuation = latestValuation > 0 ? annualisedGrossIncome / latestValuation : 0;
    const netYieldOnCurrentValuation = latestValuation > 0 ? annualisedNetIncome / latestValuation : 0;
    const capitalGrowth = latestValuation - costBase;
    const totalNetIncomeSincePurchase = await this.sumNetIncomeSince(
      propertyId,
      ownerId,
      new Date(property.purchaseDate),
    );
    const totalReturnSincePurchase = capitalGrowth + totalNetIncomeSincePurchase;

    return {
      grossYieldOnCost,
      netYieldOnCost,
      grossYieldOnCurrentValuation,
      netYieldOnCurrentValuation,
      cashOnCashReturn: netYieldOnCost,
      totalReturnSincePurchase,
    };
  }

  async getPortfolioSummary(ownerId: string, includePersonal = false): Promise<PortfolioSummaryResponse> {
    const properties = await this.propertyRepo.find({
      where: {
        ownerId,
        status: PropertyStatus.ACTIVE,
        ...(includePersonal ? {} : { category: PropertyCategory.INVESTMENT }),
      },
    });

    const asOfDate = new Date();
    const windowStart = yearStartOf(asOfDate);

    let portfolioValue = 0;
    let totalCostBase = 0;
    let ytdGrossIncome = 0;
    let ytdNetIncome = 0;
    let annualisedNetIncomeTotal = 0;

    for (const property of properties) {
      const costBase = property.purchasePrice + property.purchaseCosts;
      const latestValuation = (await this.getLatestValuationAmount(property.id, ownerId)) ?? costBase;
      const { gross, net } = await this.getNetIncome(property.id, ownerId, windowStart, asOfDate);

      portfolioValue += latestValuation;
      totalCostBase += costBase;
      ytdGrossIncome += gross;
      ytdNetIncome += net;
      annualisedNetIncomeTotal += annualise(net, windowStart, asOfDate);
    }

    const ytdMaintenanceRow = await this.maintenanceRecordRepo
      .createQueryBuilder('record')
      .select('COALESCE(SUM(record.cost + record.gst_amount), 0)', 'total')
      .where('record.owner_id = :ownerId', { ownerId })
      .andWhere('record.service_date >= :from', { from: toDateStr(windowStart) })
      .getRawOne<{ total: string }>();

    const unpaidInvoicesRow = await this.invoiceRepo
      .createQueryBuilder('invoice')
      .select('COALESCE(SUM(invoice.total_amount - COALESCE(invoice.paid_amount, 0)), 0)', 'total')
      .addSelect('COUNT(*) FILTER (WHERE invoice.status = :overdue)', 'overdueCount')
      .where('invoice.owner_id = :ownerId', { ownerId })
      .andWhere('invoice.status IN (:...statuses)', {
        statuses: [InvoiceStatus.APPROVED, InvoiceStatus.OVERDUE],
      })
      .setParameter('overdue', InvoiceStatus.OVERDUE)
      .getRawOne<{ total: string; overdueCount: string }>();

    return {
      propertyCount: properties.length,
      portfolioValue,
      ytdGrossIncome,
      ytdNetIncome,
      ytdMaintenance: parseFloat(ytdMaintenanceRow?.total ?? '0'),
      blendedYieldOnCost: totalCostBase > 0 ? annualisedNetIncomeTotal / totalCostBase : 0,
      blendedYieldOnValuation: portfolioValue > 0 ? annualisedNetIncomeTotal / portfolioValue : 0,
      unpaidInvoicesTotal: parseFloat(unpaidInvoicesRow?.total ?? '0'),
      overdueInvoicesCount: parseInt(unpaidInvoicesRow?.overdueCount ?? '0', 10),
    };
  }

  async getIncomeByProperty(
    ownerId: string,
    from?: string,
    to?: string,
    includePersonal = false,
  ): Promise<PropertyRankingItem[]> {
    const fromDate = from ? new Date(from) : yearStartOf(new Date());
    const toDate = to ? new Date(to) : new Date();

    const properties = await this.propertyRepo.find({
      where: { ownerId, ...(includePersonal ? {} : { category: PropertyCategory.INVESTMENT }) },
    });
    const results: PropertyRankingItem[] = [];
    for (const property of properties) {
      const { net } = await this.getNetIncome(property.id, ownerId, fromDate, toDate);
      results.push({ propertyId: property.id, propertyName: property.name, value: net });
    }

    return results.sort((a, b) => b.value - a.value);
  }

  async getReturnByProperty(ownerId: string, asOf?: string, includePersonal = false): Promise<PropertyRankingItem[]> {
    const properties = await this.propertyRepo.find({
      where: {
        ownerId,
        status: PropertyStatus.ACTIVE,
        ...(includePersonal ? {} : { category: PropertyCategory.INVESTMENT }),
      },
    });

    const results: PropertyRankingItem[] = [];
    for (const property of properties) {
      const returns = await this.calculateReturn(property.id, ownerId, asOf);
      results.push({ propertyId: property.id, propertyName: property.name, value: returns.netYieldOnCost });
    }

    return results.sort((a, b) => b.value - a.value);
  }

  async getMaintenanceByProperty(
    ownerId: string,
    from?: string,
    to?: string,
    includePersonal = false,
  ): Promise<PropertyRankingItem[]> {
    const fromDate = from ? new Date(from) : yearStartOf(new Date());
    const toDate = to ? new Date(to) : new Date();

    const qb = this.maintenanceRecordRepo
      .createQueryBuilder('record')
      .innerJoin('record.property', 'property')
      .select('property.id', 'propertyId')
      .addSelect('property.name', 'propertyName')
      .addSelect('COALESCE(SUM(record.cost + record.gst_amount), 0)', 'value')
      .where('record.owner_id = :ownerId', { ownerId })
      .andWhere('record.service_date BETWEEN :from AND :to', {
        from: toDateStr(fromDate),
        to: toDateStr(toDate),
      });

    if (!includePersonal) {
      qb.andWhere('property.category = :category', { category: PropertyCategory.INVESTMENT });
    }

    const rows = await qb
      .groupBy('property.id')
      .addGroupBy('property.name')
      .orderBy('value', 'DESC')
      .getRawMany<{ propertyId: string; propertyName: string; value: string }>();

    return rows.map((row) => ({
      propertyId: row.propertyId,
      propertyName: row.propertyName,
      value: parseFloat(row.value),
    }));
  }
}
