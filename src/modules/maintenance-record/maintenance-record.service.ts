import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceRecordEntity } from '../../entities/maintenance-record.entity';
import {
  CreateMaintenanceRecordRequest,
  UpdateMaintenanceRecordRequest,
  MaintenanceRecordQueryDto,
  MaintenanceRecordResponse,
} from '../../dto/maintenance-record.dto';
import { StandardPaginatedResponse } from '../../dto/standard';

@Injectable()
export class MaintenanceRecordService {
  constructor(
    @InjectRepository(MaintenanceRecordEntity)
    private readonly maintenanceRecordRepo: Repository<MaintenanceRecordEntity>,
  ) {}

  async create(
    req: CreateMaintenanceRecordRequest,
    ownerId: string,
  ): Promise<MaintenanceRecordResponse> {
    const entity = this.maintenanceRecordRepo.create({ ...req, ownerId });
    const saved = await this.maintenanceRecordRepo.save(entity);
    return this.toResponse(saved);
  }

  async findAll(
    query: MaintenanceRecordQueryDto,
    ownerId: string,
  ): Promise<StandardPaginatedResponse<MaintenanceRecordResponse>> {
    const { offset = 0, limit = 20, propertyId, category, from, to } = query;
    const qb = this.maintenanceRecordRepo
      .createQueryBuilder('record')
      .where('record.owner_id = :ownerId', { ownerId });

    if (propertyId) qb.andWhere('record.property_id = :propertyId', { propertyId });
    if (category) qb.andWhere('record.category = :category', { category });
    if (from) qb.andWhere('record.service_date >= :from', { from });
    if (to) qb.andWhere('record.service_date <= :to', { to });

    const [items, total] = await qb
      .orderBy('record.service_date', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { offset, limit, total, items: items.map((item) => this.toResponse(item)) };
  }

  async findOne(id: string, ownerId: string): Promise<MaintenanceRecordResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    return this.toResponse(entity);
  }

  async update(
    id: string,
    req: UpdateMaintenanceRecordRequest,
    ownerId: string,
  ): Promise<MaintenanceRecordResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    Object.assign(entity, req);
    const saved = await this.maintenanceRecordRepo.save(entity);
    return this.toResponse(saved);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    await this.findEntityOrFail(id, ownerId);
    await this.maintenanceRecordRepo.softDelete({ id, ownerId });
  }

  private async findEntityOrFail(id: string, ownerId: string): Promise<MaintenanceRecordEntity> {
    const entity = await this.maintenanceRecordRepo.findOne({ where: { id, ownerId } });
    if (!entity) {
      throw new NotFoundException(`Maintenance record ${id} not found`);
    }
    return entity;
  }

  private toResponse(entity: MaintenanceRecordEntity): MaintenanceRecordResponse {
    const {
      id,
      ownerId,
      propertyId,
      serviceDate,
      category,
      vendor,
      description,
      cost,
      gstAmount,
      currency,
      nextServiceDueDate,
      sourceInvoiceId,
      sourceExpenseId,
      sourceDocumentId,
      notes,
      createdAt,
      updatedAt,
    } = entity;

    return {
      id,
      ownerId,
      propertyId,
      serviceDate,
      category,
      vendor,
      description,
      cost,
      gstAmount,
      currency,
      nextServiceDueDate,
      sourceInvoiceId,
      sourceExpenseId,
      sourceDocumentId,
      notes,
      createdAt,
      updatedAt,
    };
  }
}
