import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PropertyExpenseService } from './property-expense.service';
import { PropertyExpenseEntity } from '../../entities/property-expense.entity';
import { PropertyExpenseCategory } from '../../entities/enums/property-expense-category.enum';

describe('PropertyExpenseService', () => {
  let service: PropertyExpenseService;
  const ownerId = 'owner-1';

  const mockRepo = {
    create: jest.fn((data) => data),
    save: jest.fn((data) => Promise.resolve({ id: 'expense-1', ...data })),
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertyExpenseService,
        { provide: getRepositoryToken(PropertyExpenseEntity), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<PropertyExpenseService>(PropertyExpenseService);
  });

  it('should create a property expense scoped to the owner', async () => {
    const result = await service.create(
      {
        propertyId: 'property-1',
        expenseDate: '2026-01-15',
        category: PropertyExpenseCategory.RATES,
        description: 'Q1 rates notice',
        amount: 1200,
      },
      ownerId,
    );

    expect(result.propertyId).toBe('property-1');
    expect(result.ownerId).toBe(ownerId);
  });
});
