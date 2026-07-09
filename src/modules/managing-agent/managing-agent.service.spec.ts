import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ManagingAgentService } from './managing-agent.service';
import { ManagingAgentEntity } from '../../entities/managing-agent.entity';

describe('ManagingAgentService', () => {
  let service: ManagingAgentService;
  const ownerId = 'owner-1';

  const mockRepo = {
    create: jest.fn((data) => data),
    save: jest.fn((data) => Promise.resolve({ id: 'agent-1', ...data })),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManagingAgentService,
        { provide: getRepositoryToken(ManagingAgentEntity), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<ManagingAgentService>(ManagingAgentService);
  });

  it('should create a managing agent scoped to the owner', async () => {
    const result = await service.create({ name: 'Nichols Crowder' }, ownerId);

    expect(mockRepo.create).toHaveBeenCalledWith({ name: 'Nichols Crowder', ownerId });
    expect(result.name).toBe('Nichols Crowder');
    expect(result.ownerId).toBe(ownerId);
  });

  it('should list managing agents for the owner', async () => {
    mockRepo.findAndCount.mockResolvedValue([
      [{ id: 'agent-1', ownerId, name: 'Nichols Crowder', createdAt: new Date(), updatedAt: new Date() }],
      1,
    ]);

    const result = await service.findAll({ offset: 0, limit: 20 }, ownerId);

    expect(result.total).toBe(1);
    expect(result.items[0].name).toBe('Nichols Crowder');
  });
});
