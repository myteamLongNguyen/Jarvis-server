import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RentReviewService } from './rent-review.service';
import { RentReviewEntity } from '../../entities/rent-review.entity';
import { RentReviewMechanism } from '../../entities/enums/rent-review-mechanism.enum';

describe('RentReviewService', () => {
  let service: RentReviewService;
  const ownerId = 'owner-1';

  const mockRepo = {
    create: jest.fn((data) => data),
    save: jest.fn((data) => Promise.resolve({ id: 'review-1', ...data })),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RentReviewService,
        { provide: getRepositoryToken(RentReviewEntity), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<RentReviewService>(RentReviewService);
  });

  it('should create a rent review scoped to the owner', async () => {
    const result = await service.create(
      {
        leaseId: 'lease-1',
        reviewDate: '2026-01-01',
        reviewType: RentReviewMechanism.CPI,
        oldRentAnnual: 100000,
        newRentAnnual: 103500,
        percentChange: 3.5,
      },
      ownerId,
    );

    expect(result.leaseId).toBe('lease-1');
    expect(result.ownerId).toBe(ownerId);
  });
});
