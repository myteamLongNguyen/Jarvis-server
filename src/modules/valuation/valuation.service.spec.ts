import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ValuationService } from './valuation.service';
import { ValuationEntity, ValuationType } from '../../entities/valuation.entity';

describe('ValuationService', () => {
  let service: ValuationService;
  const ownerId = 'owner-1';

  const mockRepo = {
    create: jest.fn((data) => data),
    save: jest.fn((data) => Promise.resolve({ id: 'valuation-1', ...data })),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValuationService,
        { provide: getRepositoryToken(ValuationEntity), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<ValuationService>(ValuationService);
  });

  it('should create a valuation scoped to the owner', async () => {
    const result = await service.create(
      {
        propertyId: 'property-1',
        valuationDate: '2026-01-01',
        valuationAmount: 1200000,
        valuationType: ValuationType.BANK,
      },
      ownerId,
    );

    expect(result.propertyId).toBe('property-1');
    expect(result.valuationAmount).toBe(1200000);
  });
});
