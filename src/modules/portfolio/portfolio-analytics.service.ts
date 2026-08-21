import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PropertyEntity, PropertyStatus, PropertyCategory } from '../../entities/property.entity';
import { RentalIncomeEntity } from '../../entities/rental-income.entity';
import { PropertyExpenseEntity } from '../../entities/property-expense.entity';
import { MaintenanceRecordEntity } from '../../entities/maintenance-record.entity';
import { ValuationEntity } from '../../entities/valuation.entity';
import { InvoiceEntity, InvoiceStatus } from '../../entities/invoice.entity';
import { DepreciationScheduleEntity, DepreciationMethod } from '../../entities/depreciation-schedule.entity';
import {
  ReturnResponse,
  PortfolioSummaryResponse,
  PropertyRankingItem,
  FinancialYearReportResponse,
} from '../../dto/portfolio.dto';
import { financialYearStartOf, financialYearLabel } from '../../core/utils';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysInWindow(from: Date, to: Date): number {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / MS_PER_DAY) + 1);
}

function annualise(periodValue: number, from: Date, to: Date): number {
  return periodValue * (365 / daysInWindow(from, to));
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
    @InjectRepository(DepreciationScheduleEntity)
    private readonly depreciationScheduleRepo: Repository<DepreciationScheduleEntity>,
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

  /** Most recent valuation on or before `asOf` - used for a report's opening/closing valuation, unlike getLatestValuationAmount which ignores date. */
  async getValuationAsOf(propertyId: string, ownerId: string, asOf: Date): Promise<number | undefined> {
    const valuation = await this.valuationRepo
      .createQueryBuilder('valuation')
      .where('valuation.owner_id = :ownerId', { ownerId })
      .andWhere('valuation.property_id = :propertyId', { propertyId })
      .andWhere('valuation.valuation_date <= :asOf', { asOf: toDateStr(asOf) })
      .orderBy('valuation.valuation_date', 'DESC')
      .getOne();
    return valuation?.valuationAmount;
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
    const windowStart = financialYearStartOf(asOfDate);

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
    const windowStart = financialYearStartOf(asOfDate);

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
    const fromDate = from ? new Date(from) : financialYearStartOf(new Date());
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
    const fromDate = from ? new Date(from) : financialYearStartOf(new Date());
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

  /** Accountant-facing report bounded to a single Australian financial year (1 Jul - 30 Jun). */
  async getFinancialYearReport(
    ownerId: string,
    fyStart: Date,
    fyEnd: Date,
    includePersonal = false,
  ): Promise<FinancialYearReportResponse> {
    const properties = await this.propertyRepo.find({
      where: { ownerId, ...(includePersonal ? {} : { category: PropertyCategory.INVESTMENT }) },
      order: { name: 'ASC' },
    });

    const totals = {
      grossIncome: 0,
      netIncome: 0,
      expensesTotal: 0,
      depreciationDiminishingValue: 0,
      depreciationPrimeCost: 0,
    };

    const lines = [];
    for (const property of properties) {
      const [{ gross, net: rentalNet }, expensesTotal, depreciationRows, openingValuation, closingValuation] = await Promise.all([
        this.sumRentalIncome(property.id, ownerId, fyStart, fyEnd),
        this.sumPropertyExpenses(property.id, ownerId, fyStart, fyEnd),
        this.depreciationScheduleRepo.find({
          where: {
            ownerId,
            propertyId: property.id,
            financialYearStart: toDateStr(fyStart),
            financialYearEnd: toDateStr(fyEnd),
          },
        }),
        this.getValuationAsOf(property.id, ownerId, new Date(fyStart.getTime() - MS_PER_DAY)),
        this.getValuationAsOf(property.id, ownerId, fyEnd),
      ]);

      const depreciationDiminishingValue = depreciationRows
        .filter((row) => row.method === DepreciationMethod.DIMINISHING_VALUE)
        .reduce((sum, row) => sum + row.totalAmount, 0);
      const depreciationPrimeCost = depreciationRows
        .filter((row) => row.method === DepreciationMethod.PRIME_COST)
        .reduce((sum, row) => sum + row.totalAmount, 0);

      const netIncome = rentalNet - expensesTotal;

      lines.push({
        propertyId: property.id,
        propertyName: property.name,
        grossIncome: gross,
        netIncome,
        expensesTotal,
        depreciationDiminishingValue: depreciationDiminishingValue || undefined,
        depreciationPrimeCost: depreciationPrimeCost || undefined,
        openingValuation,
        closingValuation,
      });

      totals.grossIncome += gross;
      totals.netIncome += netIncome;
      totals.expensesTotal += expensesTotal;
      totals.depreciationDiminishingValue += depreciationDiminishingValue;
      totals.depreciationPrimeCost += depreciationPrimeCost;
    }

    return {
      financialYearLabel: financialYearLabel(fyStart),
      periodStart: toDateStr(fyStart),
      periodEnd: toDateStr(fyEnd),
      properties: lines,
      totals,
    };
  }
}
