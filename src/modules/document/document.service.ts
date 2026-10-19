import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { DocumentArea, DocumentEntity, StorageProvider } from '../../entities/document.entity';
import {
  CreateDocumentRequest,
  UpdateDocumentRequest,
  UploadDocumentRequest,
  DocumentQueryDto,
  DocumentResponse,
} from '../../dto/document.dto';
import { StandardPaginatedResponse } from '../../dto/standard';
import { SupabaseAdminService } from '../../core/supabase/supabase-admin.service';

const SIGNED_URL_TTL_SECONDS = 3600;

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
    private readonly supabaseAdmin: SupabaseAdminService,
  ) {}

  async create(req: CreateDocumentRequest, ownerId: string): Promise<DocumentResponse> {
    const entity = this.documentRepo.create({
      ...req,
      ownerId,
      storageProvider: StorageProvider.GOOGLE_DRIVE,
    });
    const saved = await this.documentRepo.save(entity);
    return this.toResponseWithUrl(saved);
  }

  async upload(
    file: Express.Multer.File,
    req: UploadDocumentRequest,
    ownerId: string,
  ): Promise<DocumentResponse> {
    const storagePath = `${ownerId}/${req.propertyId ?? 'unassigned'}/${uuidv4()}-${this.sanitizeFilename(file.originalname)}`;

    const { error } = await this.supabaseAdmin.client.storage
      .from(this.supabaseAdmin.bucket)
      .upload(storagePath, file.buffer, { contentType: file.mimetype });
    if (error) {
      throw new InternalServerErrorException(`Failed to upload file: ${error.message}`);
    }

    const entity = this.documentRepo.create({
      ...req,
      ownerId,
      storageProvider: StorageProvider.SUPABASE,
      storagePath,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      // Recorded so the same file filed twice can be recognised later. It is
      // the only duplicate signal that cannot be wrong.
      checksumSha256: createHash('sha256').update(file.buffer).digest('hex'),
    });
    const saved = await this.documentRepo.save(entity);
    return this.toResponseWithUrl(saved);
  }

  async findAll(
    query: DocumentQueryDto,
    ownerId: string,
  ): Promise<StandardPaginatedResponse<DocumentResponse>> {
    const { offset = 0, limit = 20, propertyId, documentType, classificationStatus, area } = query;
    const [items, total] = await this.documentRepo.findAndCount({
      where: {
        ownerId,
        // Defaulted rather than optional: a list with no area would mix the
        // boat's paperwork into the portfolio's.
        area: area ?? DocumentArea.PROPERTIES,
        ...(propertyId ? { propertyId } : {}),
        ...(documentType ? { documentType } : {}),
        ...(classificationStatus ? { classificationStatus } : {}),
      },
      skip: offset,
      take: limit,
      order: { documentDate: 'DESC' },
    });

    const responses = items.map((item) => this.toResponse(item));
    await this.attachUrls(items, responses);
    return { offset, limit, total, items: responses };
  }

  async findOne(id: string, ownerId: string): Promise<DocumentResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    return this.toResponseWithUrl(entity);
  }

  async update(id: string, req: UpdateDocumentRequest, ownerId: string): Promise<DocumentResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    Object.assign(entity, req);
    const saved = await this.documentRepo.save(entity);
    return this.toResponseWithUrl(saved);
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
      area,
      documentType,
      title,
      description,
      documentDate,
      expiryDate,
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
      area,
      documentType,
      title,
      description,
      documentDate,
      expiryDate,
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

  private async toResponseWithUrl(entity: DocumentEntity): Promise<DocumentResponse> {
    const response = this.toResponse(entity);
    await this.attachUrls([entity], [response]);
    return response;
  }

  private async attachUrls(entities: DocumentEntity[], responses: DocumentResponse[]): Promise<void> {
    const supabaseIndices: number[] = [];
    const paths: string[] = [];

    entities.forEach((entity, index) => {
      if (entity.storageProvider === StorageProvider.SUPABASE && entity.storagePath) {
        supabaseIndices.push(index);
        paths.push(entity.storagePath);
      } else if (entity.googleDriveFileId) {
        responses[index].url = `https://drive.google.com/file/d/${entity.googleDriveFileId}/view`;
      }
    });

    if (!paths.length) {
      return;
    }

    const { data, error } = await this.supabaseAdmin.client.storage
      .from(this.supabaseAdmin.bucket)
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

    if (error || !data) {
      return;
    }

    data.forEach((result, i) => {
      responses[supabaseIndices[i]].url = result.signedUrl ?? undefined;
    });
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  }
}
