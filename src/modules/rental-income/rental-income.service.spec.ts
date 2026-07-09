import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RentalIncomeService } from './rental-income.service';
import { RentalIncomeEntity } from '../../entities/rental-income.entity';

describe('RentalIncomeService', () => {
  let service: RentalIncomeService;
  const ownerId = 'owner-1';

  const mockRepo = {
    create: jest.fn((data) => data),
    save: jest.fn((data) => Promise.resolve({ id: 'income-1', ...data })),
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RentalIncomeService,
        { provide: getRepositoryToken(RentalIncomeEntity), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<RentalIncomeService>(RentalIncomeService);
  });

  it('should compute netAmount server-side rather than trusting the client', async () => {
    const result = await service.create(
      {
        propertyId: 'property-1',
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
        grossAmount: 10000,
        agentCommission: 500,
        otherDeductions: 200,
      },
      ownerId,
    );

    expect(result.netAmount).toBe(10000 - 500 - 200);
  });
});
