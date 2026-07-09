import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PropertyOwningEntity } from '../../entities/property-owning-entity.entity';
import {
  CreateOwningEntityRequest,
  UpdateOwningEntityRequest,
  OwningEntityQueryDto,
  OwningEntityResponse,
} from '../../dto/property-owning-entity.dto';
import { StandardPaginatedResponse } from '../../dto/standard';

@Injectable()
export class OwningEntityService {
  constructor(
    @InjectRepository(PropertyOwningEntity)
    private readonly owningEntityRepo: Repository<PropertyOwningEntity>,
  ) {}

  async create(req: CreateOwningEntityRequest, ownerId: string): Promise<OwningEntityResponse> {
    const entity = this.owningEntityRepo.create({ ...req, ownerId });
    const saved = await this.owningEntityRepo.save(entity);
    return this.toResponse(saved);
  }

  async findAll(
    query: OwningEntityQueryDto,
    ownerId: string,
  ): Promise<StandardPaginatedResponse<OwningEntityResponse>> {
    const { offset = 0, limit = 20, entityType } = query;
    const [items, total] = await this.owningEntityRepo.findAndCount({
      where: { ownerId, ...(entityType ? { entityType } : {}) },
      skip: offset,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { offset, limit, total, items: items.map((item) => this.toResponse(item)) };
  }

  async findOne(id: string, ownerId: string): Promise<OwningEntityResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    return this.toResponse(entity);
  }

  async update(
    id: string,
    req: UpdateOwningEntityRequest,
    ownerId: string,
  ): Promise<OwningEntityResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    Object.assign(entity, req);
    const saved = await this.owningEntityRepo.save(entity);
    return this.toResponse(saved);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    await this.findEntityOrFail(id, ownerId);
    await this.owningEntityRepo.softDelete({ id, ownerId });
  }

  private async findEntityOrFail(id: string, ownerId: string): Promise<PropertyOwningEntity> {
    const entity = await this.owningEntityRepo.findOne({ where: { id, ownerId } });
    if (!entity) {
      throw new NotFoundException(`Owning entity ${id} not found`);
    }
    return entity;
  }

  private toResponse(entity: PropertyOwningEntity): OwningEntityResponse {
    const { id, ownerId, legalName, entityType, abn, acn, notes, createdAt, updatedAt } = entity;
    return { id, ownerId, legalName, entityType, abn, acn, notes, createdAt, updatedAt };
  }
}
