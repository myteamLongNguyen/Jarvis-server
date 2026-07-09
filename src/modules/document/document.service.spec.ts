import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DocumentService } from './document.service';
import { DocumentEntity, DocumentType } from '../../entities/document.entity';

describe('DocumentService', () => {
  let service: DocumentService;
  const ownerId = 'owner-1';

  const mockRepo = {
    create: jest.fn((data) => data),
    save: jest.fn((data) => Promise.resolve({ id: 'document-1', ...data })),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentService,
        { provide: getRepositoryToken(DocumentEntity), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<DocumentService>(DocumentService);
  });

  it('should create a document scoped to the owner', async () => {
    const result = await service.create(
      {
        documentType: DocumentType.RATES_NOTICE,
        title: 'Q1 Rates Notice',
        documentDate: '2026-01-15',
        googleDriveFileId: 'drive-file-1',
      },
      ownerId,
    );

    expect(result.title).toBe('Q1 Rates Notice');
    expect(result.ownerId).toBe(ownerId);
  });
});
