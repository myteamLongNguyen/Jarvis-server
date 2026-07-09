import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PropertyStatementEntity } from '../../entities/property-statement.entity';
import {
  CreatePropertyStatementRequest,
  UpdatePropertyStatementRequest,
  PropertyStatementQueryDto,
  PropertyStatementResponse,
} from '../../dto/property-statement.dto';
import { StandardPaginatedResponse } from '../../dto/standard';

@Injectable()
export class PropertyStatementService {
  constructor(
    @InjectRepository(PropertyStatementEntity)
    private readonly propertyStatementRepo: Repository<PropertyStatementEntity>,
  ) {}

  async create(
    req: CreatePropertyStatementRequest,
    ownerId: string,
  ): Promise<PropertyStatementResponse> {
    const entity = this.propertyStatementRepo.create({ ...req, ownerId });
    const saved = await this.propertyStatementRepo.save(entity);
    return this.toResponse(saved);
  }

  async findAll(
    query: PropertyStatementQueryDto,
    ownerId: string,
  ): Promise<StandardPaginatedResponse<PropertyStatementResponse>> {
    const { offset = 0, limit = 20, propertyId } = query;
    const [items, total] = await this.propertyStatementRepo.findAndCount({
      where: { ownerId, ...(propertyId ? { propertyId } : {}) },
      skip: offset,
      take: limit,
      order: { statementDate: 'DESC' },
    });

    return { offset, limit, total, items: items.map((item) => this.toResponse(item)) };
  }

  async findOne(id: string, ownerId: string): Promise<PropertyStatementResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    return this.toResponse(entity);
  }

  async update(
    id: string,
    req: UpdatePropertyStatementRequest,
    ownerId: string,
  ): Promise<PropertyStatementResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    Object.assign(entity, req);
    const saved = await this.propertyStatementRepo.save(entity);
    return this.toResponse(saved);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    await this.findEntityOrFail(id, ownerId);
    await this.propertyStatementRepo.softDelete({ id, ownerId });
  }

  private async findEntityOrFail(id: string, ownerId: string): Promise<PropertyStatementEntity> {
    const entity = await this.propertyStatementRepo.findOne({ where: { id, ownerId } });
    if (!entity) {
      throw new NotFoundException(`Property statement ${id} not found`);
    }
    return entity;
  }

  private toResponse(entity: PropertyStatementEntity): PropertyStatementResponse {
    const {
      id,
      ownerId,
      propertyId,
      managingAgentId,
      statementDate,
      periodStart,
      periodEnd,
      grossIncome,
      totalExpenses,
      netToOwner,
      openingBalance,
      closingBalance,
      sourceInvoiceId,
      sourceDocumentId,
      notes,
      createdAt,
      updatedAt,
    } = entity;

    return {
      id,
      ownerId,
      propertyId,
      managingAgentId,
      statementDate,
      periodStart,
      periodEnd,
      grossIncome,
      totalExpenses,
      netToOwner,
      openingBalance,
      closingBalance,
      sourceInvoiceId,
      sourceDocumentId,
      notes,
      createdAt,
      updatedAt,
    };
  }
}
