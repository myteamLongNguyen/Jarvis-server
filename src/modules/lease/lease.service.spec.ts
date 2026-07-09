import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LeaseService } from './lease.service';
import {
  LeaseEntity,
  RentFrequency,
  OutgoingsRecoveryType,
  RentReviewMechanism,
  BondType,
} from '../../entities/lease.entity';

describe('LeaseService', () => {
  let service: LeaseService;
  const ownerId = 'owner-1';

  const mockRepo = {
    create: jest.fn((data) => data),
    save: jest.fn((data) => Promise.resolve({ id: 'lease-1', ...data })),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [LeaseService, { provide: getRepositoryToken(LeaseEntity), useValue: mockRepo }],
    }).compile();

    service = module.get<LeaseService>(LeaseService);
  });

  it('should create a lease scoped to the owner', async () => {
    const result = await service.create(
      {
        propertyId: 'property-1',
        tenantId: 'tenant-1',
        commencementDate: '2024-01-01',
        expiryDate: '2029-01-01',
        initialTermMonths: 60,
        baseRentAnnual: 120000,
        rentFrequency: RentFrequency.MONTHLY,
        outgoingsRecoveryType: OutgoingsRecoveryType.NET,
        rentReviewMechanism: RentReviewMechanism.CPI,
        bondAmount: 30000,
        bondType: BondType.BANK_GUARANTEE,
      },
      ownerId,
    );

    expect(result.propertyId).toBe('property-1');
    expect(result.ownerId).toBe(ownerId);
  });
});
