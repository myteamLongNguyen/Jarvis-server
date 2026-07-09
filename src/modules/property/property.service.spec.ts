import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PropertyService } from './property.service';
import { PropertyEntity, PropertyType } from '../../entities/property.entity';

describe('PropertyService', () => {
  let service: PropertyService;
  const ownerId = 'owner-1';

  const mockRepo = {
    create: jest.fn((data) => data),
    save: jest.fn((data) => Promise.resolve({ id: 'property-1', ...data })),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertyService,
        { provide: getRepositoryToken(PropertyEntity), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<PropertyService>(PropertyService);
  });

  it('should create a property scoped to the owner', async () => {
    const result = await service.create(
      {
        name: '996 Nepean',
        addressLine1: '996 Nepean Hwy',
        suburb: 'Rosebud',
        state: 'VIC',
        postcode: '3939',
        propertyType: PropertyType.COMMERCIAL,
        purchaseDate: '2020-01-01',
        purchasePrice: 900000,
        purchaseCosts: 50000,
      },
      ownerId,
    );

    expect(result.name).toBe('996 Nepean');
    expect(result.ownerId).toBe(ownerId);
  });

  it('should list properties for the owner', async () => {
    mockRepo.findAndCount.mockResolvedValue([
      [{ id: 'property-1', ownerId, name: '996 Nepean', createdAt: new Date(), updatedAt: new Date() }],
      1,
    ]);

    const result = await service.findAll({ offset: 0, limit: 20 }, ownerId);

    expect(result.total).toBe(1);
    expect(result.items[0].name).toBe('996 Nepean');
  });
});
