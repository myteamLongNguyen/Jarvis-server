import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { TenantEntity } from '../../entities/tenant.entity';
import {
  CreateTenantRequest,
  UpdateTenantRequest,
  TenantQueryDto,
  TenantResponse,
} from '../../dto/tenant.dto';
import { StandardPaginatedResponse } from '../../dto/standard';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenantRepo: Repository<TenantEntity>,
  ) {}

  async create(req: CreateTenantRequest, ownerId: string): Promise<TenantResponse> {
    const entity = this.tenantRepo.create({ ...req, ownerId });
    const saved = await this.tenantRepo.save(entity);
    return this.toResponse(saved);
  }

  async findAll(
    query: TenantQueryDto,
    ownerId: string,
  ): Promise<StandardPaginatedResponse<TenantResponse>> {
    const { offset = 0, limit = 20, entityType, search } = query;
    const [items, total] = await this.tenantRepo.findAndCount({
      where: {
        ownerId,
        ...(entityType ? { entityType } : {}),
        ...(search ? { name: ILike(`%${search}%`) } : {}),
      },
      skip: offset,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { offset, limit, total, items: items.map((item) => this.toResponse(item)) };
  }

  async findOne(id: string, ownerId: string): Promise<TenantResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    return this.toResponse(entity);
  }

  async update(id: string, req: UpdateTenantRequest, ownerId: string): Promise<TenantResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    Object.assign(entity, req);
    const saved = await this.tenantRepo.save(entity);
    return this.toResponse(saved);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    await this.findEntityOrFail(id, ownerId);
    await this.tenantRepo.softDelete({ id, ownerId });
  }

  private async findEntityOrFail(id: string, ownerId: string): Promise<TenantEntity> {
    const entity = await this.tenantRepo.findOne({ where: { id, ownerId } });
    if (!entity) {
      throw new NotFoundException(`Tenant ${id} not found`);
    }
    return entity;
  }

  private toResponse(entity: TenantEntity): TenantResponse {
    const { id, ownerId, name, entityType, abn, contactName, email, phone, notes, createdAt, updatedAt } = entity;
    return { id, ownerId, name, entityType, abn, contactName, email, phone, notes, createdAt, updatedAt };
  }
}
