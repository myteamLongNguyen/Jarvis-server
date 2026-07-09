import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OwningEntityService } from './owning-entity.service';
import { PropertyOwningEntity, OwningEntityType } from '../../entities/property-owning-entity.entity';

describe('OwningEntityService', () => {
  let service: OwningEntityService;
  const ownerId = 'owner-1';

  const mockRepo = {
    create: jest.fn((data) => data),
    save: jest.fn((data) => Promise.resolve({ id: 'entity-1', ...data })),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OwningEntityService,
        { provide: getRepositoryToken(PropertyOwningEntity), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<OwningEntityService>(OwningEntityService);
  });

  it('should create an owning entity scoped to the owner', async () => {
    const result = await service.create(
      { legalName: 'Smith Family Trust', entityType: OwningEntityType.TRUST },
      ownerId,
    );

    expect(result.legalName).toBe('Smith Family Trust');
    expect(result.ownerId).toBe(ownerId);
  });
});
