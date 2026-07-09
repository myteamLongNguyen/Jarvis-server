import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PropertyStatementService } from './property-statement.service';
import { PropertyStatementEntity } from '../../entities/property-statement.entity';

describe('PropertyStatementService', () => {
  let service: PropertyStatementService;
  const ownerId = 'owner-1';

  const mockRepo = {
    create: jest.fn((data) => data),
    save: jest.fn((data) => Promise.resolve({ id: 'statement-1', ...data })),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertyStatementService,
        { provide: getRepositoryToken(PropertyStatementEntity), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<PropertyStatementService>(PropertyStatementService);
  });

  it('should create a property statement scoped to the owner', async () => {
    const result = await service.create(
      {
        propertyId: 'property-1',
        managingAgentId: 'agent-1',
        statementDate: '2026-01-31',
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
        grossIncome: 10000,
        totalExpenses: 2000,
        netToOwner: 8000,
        openingBalance: 0,
        closingBalance: 8000,
      },
      ownerId,
    );

    expect(result.propertyId).toBe('property-1');
    expect(result.ownerId).toBe(ownerId);
  });
});
