import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantService } from './tenant.service';
import { TenantEntity, TenantEntityType } from '../../entities/tenant.entity';

describe('TenantService', () => {
  let service: TenantService;
  const ownerId = 'owner-1';

  const mockRepo = {
    create: jest.fn((data) => data),
    save: jest.fn((data) => Promise.resolve({ id: 'tenant-1', ...data })),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        { provide: getRepositoryToken(TenantEntity), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<TenantService>(TenantService);
  });

  it('should create a tenant scoped to the owner', async () => {
    const result = await service.create(
      { name: 'Acme Pty Ltd', entityType: TenantEntityType.COMPANY },
      ownerId,
    );

    expect(mockRepo.create).toHaveBeenCalledWith({
      name: 'Acme Pty Ltd',
      entityType: TenantEntityType.COMPANY,
      ownerId,
    });
    expect(result.name).toBe('Acme Pty Ltd');
  });

  it('should throw when the tenant does not belong to the owner', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing-id', ownerId)).rejects.toThrow();
  });
});
