import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ValuationEntity } from '../../entities/valuation.entity';
import {
  CreateValuationRequest,
  UpdateValuationRequest,
  ValuationQueryDto,
  ValuationResponse,
} from '../../dto/valuation.dto';
import { StandardPaginatedResponse } from '../../dto/standard';

@Injectable()
export class ValuationService {
  constructor(
    @InjectRepository(ValuationEntity)
    private readonly valuationRepo: Repository<ValuationEntity>,
  ) {}

  async create(req: CreateValuationRequest, ownerId: string): Promise<ValuationResponse> {
    const entity = this.valuationRepo.create({ ...req, ownerId });
    const saved = await this.valuationRepo.save(entity);
    return this.toResponse(saved);
  }

  async findAll(
    query: ValuationQueryDto,
    ownerId: string,
  ): Promise<StandardPaginatedResponse<ValuationResponse>> {
    const { offset = 0, limit = 20, propertyId, valuationType } = query;
    const [items, total] = await this.valuationRepo.findAndCount({
      where: {
        ownerId,
        ...(propertyId ? { propertyId } : {}),
        ...(valuationType ? { valuationType } : {}),
      },
      skip: offset,
      take: limit,
      order: { valuationDate: 'DESC' },
    });

    return { offset, limit, total, items: items.map((item) => this.toResponse(item)) };
  }

  async findOne(id: string, ownerId: string): Promise<ValuationResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    return this.toResponse(entity);
  }

  async update(id: string, req: UpdateValuationRequest, ownerId: string): Promise<ValuationResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    Object.assign(entity, req);
    const saved = await this.valuationRepo.save(entity);
    return this.toResponse(saved);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    await this.findEntityOrFail(id, ownerId);
    await this.valuationRepo.softDelete({ id, ownerId });
  }

  private async findEntityOrFail(id: string, ownerId: string): Promise<ValuationEntity> {
    const entity = await this.valuationRepo.findOne({ where: { id, ownerId } });
    if (!entity) {
      throw new NotFoundException(`Valuation ${id} not found`);
    }
    return entity;
  }

  private toResponse(entity: ValuationEntity): ValuationResponse {
    const {
      id,
      ownerId,
      propertyId,
      valuationDate,
      valuationAmount,
      valuationType,
      valuer,
      purpose,
      sourceDocumentId,
      notes,
      createdAt,
      updatedAt,
    } = entity;

    return {
      id,
      ownerId,
      propertyId,
      valuationDate,
      valuationAmount,
      valuationType,
      valuer,
      purpose,
      sourceDocumentId,
      notes,
      createdAt,
      updatedAt,
    };
  }
}
