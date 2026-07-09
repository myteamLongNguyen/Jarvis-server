import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentEntity } from '../../entities/document.entity';
import {
  CreateDocumentRequest,
  UpdateDocumentRequest,
  DocumentQueryDto,
  DocumentResponse,
} from '../../dto/document.dto';
import { StandardPaginatedResponse } from '../../dto/standard';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
  ) {}

  async create(req: CreateDocumentRequest, ownerId: string): Promise<DocumentResponse> {
    const entity = this.documentRepo.create({ ...req, ownerId });
    const saved = await this.documentRepo.save(entity);
    return this.toResponse(saved);
  }

  async findAll(
    query: DocumentQueryDto,
    ownerId: string,
  ): Promise<StandardPaginatedResponse<DocumentResponse>> {
    const { offset = 0, limit = 20, propertyId, documentType, classificationStatus } = query;
    const [items, total] = await this.documentRepo.findAndCount({
      where: {
        ownerId,
        ...(propertyId ? { propertyId } : {}),
        ...(documentType ? { documentType } : {}),
        ...(classificationStatus ? { classificationStatus } : {}),
      },
      skip: offset,
      take: limit,
      order: { documentDate: 'DESC' },
    });

    return { offset, limit, total, items: items.map((item) => this.toResponse(item)) };
  }

  async findOne(id: string, ownerId: string): Promise<DocumentResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    return this.toResponse(entity);
  }

  async update(id: string, req: UpdateDocumentRequest, ownerId: string): Promise<DocumentResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    Object.assign(entity, req);
    const saved = await this.documentRepo.save(entity);
    return this.toResponse(saved);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    await this.findEntityOrFail(id, ownerId);
    await this.documentRepo.softDelete({ id, ownerId });
  }

  private async findEntityOrFail(id: string, ownerId: string): Promise<DocumentEntity> {
    const entity = await this.documentRepo.findOne({ where: { id, ownerId } });
    if (!entity) {
      throw new NotFoundException(`Document ${id} not found`);
    }
    return entity;
  }

  private toResponse(entity: DocumentEntity): DocumentResponse {
    const {
      id,
      ownerId,
      propertyId,
      documentType,
      title,
      description,
      documentDate,
      googleDriveFileId,
      googleDriveFolderPath,
      mimeType,
      fileSizeBytes,
      checksumSha256,
      ingestionStatus,
      classificationStatus,
      ingestedAt,
      classifiedAt,
      createdAt,
      updatedAt,
    } = entity;

    return {
      id,
      ownerId,
      propertyId,
      documentType,
      title,
      description,
      documentDate,
      googleDriveFileId,
      googleDriveFolderPath,
      mimeType,
      fileSizeBytes,
      checksumSha256,
      ingestionStatus,
      classificationStatus,
      ingestedAt,
      classifiedAt,
      createdAt,
      updatedAt,
    };
  }
}
