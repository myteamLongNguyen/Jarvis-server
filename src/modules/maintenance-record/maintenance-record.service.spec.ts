import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MaintenanceRecordService } from './maintenance-record.service';
import { MaintenanceRecordEntity, MaintenanceCategory } from '../../entities/maintenance-record.entity';

describe('MaintenanceRecordService', () => {
  let service: MaintenanceRecordService;
  const ownerId = 'owner-1';

  const mockRepo = {
    create: jest.fn((data) => data),
    save: jest.fn((data) => Promise.resolve({ id: 'record-1', ...data })),
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceRecordService,
        { provide: getRepositoryToken(MaintenanceRecordEntity), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<MaintenanceRecordService>(MaintenanceRecordService);
  });

  it('should create a maintenance record scoped to the owner', async () => {
    const result = await service.create(
      {
        propertyId: 'property-1',
        serviceDate: '2026-02-01',
        category: MaintenanceCategory.HVAC,
        vendor: 'CoolAir Pty Ltd',
        description: 'Annual HVAC service',
        cost: 450,
      },
      ownerId,
    );

    expect(result.propertyId).toBe('property-1');
    expect(result.vendor).toBe('CoolAir Pty Ltd');
  });
});
