import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DepreciationScheduleEntity } from '../../entities/depreciation-schedule.entity';
import {
  CreateDepreciationScheduleRequest,
  UpdateDepreciationScheduleRequest,
  DepreciationScheduleQueryDto,
  DepreciationScheduleResponse,
} from '../../dto/depreciation-schedule.dto';
import { StandardPaginatedResponse } from '../../dto/standard';

@Injectable()
export class DepreciationScheduleService {
  constructor(
    @InjectRepository(DepreciationScheduleEntity)
    private readonly depreciationScheduleRepo: Repository<DepreciationScheduleEntity>,
  ) {}

  async create(req: CreateDepreciationScheduleRequest, ownerId: string): Promise<DepreciationScheduleResponse> {
    const entity = this.depreciationScheduleRepo.create({ ...req, ownerId });
    const saved = await this.depreciationScheduleRepo.save(entity);
    return this.toResponse(saved);
  }

  async findAll(
    query: DepreciationScheduleQueryDto,
    ownerId: string,
  ): Promise<StandardPaginatedResponse<DepreciationScheduleResponse>> {
    const { offset = 0, limit = 20, propertyId, method } = query;
    const [items, total] = await this.depreciationScheduleRepo.findAndCount({
      where: {
        ownerId,
        ...(propertyId ? { propertyId } : {}),
        ...(method ? { method } : {}),
      },
      skip: offset,
      take: limit,
      order: { financialYearStart: 'DESC' },
    });

    return { offset, limit, total, items: items.map((item) => this.toResponse(item)) };
  }

  async findOne(id: string, ownerId: string): Promise<DepreciationScheduleResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    return this.toResponse(entity);
  }

  async update(id: string, req: UpdateDepreciationScheduleRequest, ownerId: string): Promise<DepreciationScheduleResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    Object.assign(entity, req);
    const saved = await this.depreciationScheduleRepo.save(entity);
    return this.toResponse(saved);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    await this.findEntityOrFail(id, ownerId);
    await this.depreciationScheduleRepo.softDelete({ id, ownerId });
  }

  private async findEntityOrFail(id: string, ownerId: string): Promise<DepreciationScheduleEntity> {
    const entity = await this.depreciationScheduleRepo.findOne({ where: { id, ownerId } });
    if (!entity) {
      throw new NotFoundException(`Depreciation schedule ${id} not found`);
    }
    return entity;
  }

  private toResponse(entity: DepreciationScheduleEntity): DepreciationScheduleResponse {
    const {
      id,
      ownerId,
      propertyId,
      financialYearStart,
      financialYearEnd,
      method,
      division40Amount,
      division43Amount,
      totalAmount,
      sourceDocumentId,
      notes,
      createdAt,
      updatedAt,
    } = entity;

    return {
      id,
      ownerId,
      propertyId,
      financialYearStart,
      financialYearEnd,
      method,
      division40Amount,
      division43Amount,
      totalAmount,
      sourceDocumentId,
      notes,
      createdAt,
      updatedAt,
    };
  }
}
