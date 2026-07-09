import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PortfolioAnalyticsService } from './portfolio-analytics.service';
import { PropertyEntity } from '../../entities/property.entity';
import { RentalIncomeEntity } from '../../entities/rental-income.entity';
import { PropertyExpenseEntity } from '../../entities/property-expense.entity';
import { MaintenanceRecordEntity } from '../../entities/maintenance-record.entity';
import { ValuationEntity } from '../../entities/valuation.entity';
import { InvoiceEntity } from '../../entities/invoice.entity';

function mockQueryBuilder(rawOne: any = {}, rawMany: any[] = []) {
  const qb: any = {};
  const chain = [
    'select',
    'addSelect',
    'where',
    'andWhere',
    'setParameter',
    'groupBy',
    'addGroupBy',
    'orderBy',
    'innerJoin',
  ];
  chain.forEach((method) => (qb[method] = jest.fn(() => qb)));
  qb.getRawOne = jest.fn().mockResolvedValue(rawOne);
  qb.getRawMany = jest.fn().mockResolvedValue(rawMany);
  return qb;
}

describe('PortfolioAnalyticsService', () => {
  let service: PortfolioAnalyticsService;
  const ownerId = 'owner-1';

  const propertyRepo = { findOne: jest.fn(), find: jest.fn() };
  const rentalIncomeRepo = { createQueryBuilder: jest.fn() };
  const propertyExpenseRepo = { createQueryBuilder: jest.fn() };
  const maintenanceRecordRepo = { createQueryBuilder: jest.fn() };
  const valuationRepo = { findOne: jest.fn() };
  const invoiceRepo = { createQueryBuilder: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioAnalyticsService,
        { provide: getRepositoryToken(PropertyEntity), useValue: propertyRepo },
        { provide: getRepositoryToken(RentalIncomeEntity), useValue: rentalIncomeRepo },
        { provide: getRepositoryToken(PropertyExpenseEntity), useValue: propertyExpenseRepo },
        { provide: getRepositoryToken(MaintenanceRecordEntity), useValue: maintenanceRecordRepo },
        { provide: getRepositoryToken(ValuationEntity), useValue: valuationRepo },
        { provide: getRepositoryToken(InvoiceEntity), useValue: invoiceRepo },
      ],
    }).compile();

    service = module.get<PortfolioAnalyticsService>(PortfolioAnalyticsService);
  });

  it('calculates net yield on cost using rental income minus property expenses, annualised', async () => {
    propertyRepo.findOne.mockResolvedValue({
      id: 'prop-1',
      purchasePrice: 900000,
      purchaseCosts: 100000,
      purchaseDate: '2020-01-01',
    });
    valuationRepo.findOne.mockResolvedValue({ valuationAmount: 1200000 });

    rentalIncomeRepo.createQueryBuilder.mockReturnValue(
      mockQueryBuilder({ gross: '100000', net: '80000' }),
    );
    propertyExpenseRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder({ total: '10000' }));

    const asOf = '2026-07-01';
    const result = await service.calculateReturn('prop-1', ownerId, asOf);

    // window = 2026-01-01..2026-07-01 (182 days), net = 80000 - 10000 = 70000
    const daysInWindow = 182;
    const annualisedNet = 70000 * (365 / daysInWindow);
    const costBase = 1000000;

    expect(result.netYieldOnCost).toBeCloseTo(annualisedNet / costBase, 5);
    expect(result.grossYieldOnCurrentValuation).toBeGreaterThan(0);
    expect(result.cashOnCashReturn).toBe(result.netYieldOnCost);
  });

  it('falls back to cost base as valuation when no valuation exists yet', async () => {
    propertyRepo.findOne.mockResolvedValue({
      id: 'prop-2',
      purchasePrice: 500000,
      purchaseCosts: 20000,
      purchaseDate: '2022-01-01',
    });
    valuationRepo.findOne.mockResolvedValue(null);
    rentalIncomeRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder({ gross: '0', net: '0' }));
    propertyExpenseRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder({ total: '0' }));

    const result = await service.calculateReturn('prop-2', ownerId, '2026-01-01');

    // no valuation and no income => valuation falls back to cost base, so yields and total return are 0
    expect(result.netYieldOnCurrentValuation).toBe(0);
    expect(result.totalReturnSincePurchase).toBe(0);
  });
});
