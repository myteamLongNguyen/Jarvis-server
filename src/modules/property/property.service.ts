import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { PropertyEntity } from '../../entities/property.entity';
import {
  CreatePropertyRequest,
  UpdatePropertyRequest,
  PropertyQueryDto,
  PropertyResponse,
} from '../../dto/property.dto';
import { StandardPaginatedResponse } from '../../dto/standard';

@Injectable()
export class PropertyService {
  constructor(
    @InjectRepository(PropertyEntity)
    private readonly propertyRepo: Repository<PropertyEntity>,
  ) {}

  async create(req: CreatePropertyRequest, ownerId: string): Promise<PropertyResponse> {
    const entity = this.propertyRepo.create({ ...req, ownerId });
    const saved = await this.propertyRepo.save(entity);
    return this.toResponse(saved);
  }

  async findAll(
    query: PropertyQueryDto,
    ownerId: string,
  ): Promise<StandardPaginatedResponse<PropertyResponse>> {
    const { offset = 0, limit = 20, status, propertyType, category, search } = query;
    const [items, total] = await this.propertyRepo.findAndCount({
      where: {
        ownerId,
        ...(status ? { status } : {}),
        ...(propertyType ? { propertyType } : {}),
        ...(category ? { category } : {}),
        ...(search ? { name: ILike(`%${search}%`) } : {}),
      },
      skip: offset,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { offset, limit, total, items: items.map((item) => this.toResponse(item)) };
  }

  async findOne(id: string, ownerId: string): Promise<PropertyResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    return this.toResponse(entity);
  }

  async findEntityOrFail(id: string, ownerId: string): Promise<PropertyEntity> {
    const entity = await this.propertyRepo.findOne({ where: { id, ownerId } });
    if (!entity) {
      throw new NotFoundException(`Property ${id} not found`);
    }
    return entity;
  }

  async update(id: string, req: UpdatePropertyRequest, ownerId: string): Promise<PropertyResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    Object.assign(entity, req);
    const saved = await this.propertyRepo.save(entity);
    return this.toResponse(saved);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    await this.findEntityOrFail(id, ownerId);
    await this.propertyRepo.softDelete({ id, ownerId });
  }

  private toResponse(entity: PropertyEntity): PropertyResponse {
    const {
      id,
      ownerId,
      name,
      addressLine1,
      addressLine2,
      suburb,
      state,
      postcode,
      country,
      propertyType,
      status,
      category,
      purchaseDate,
      purchasePrice,
      purchaseCosts,
      purchaseCurrency,
      landAreaSqm,
      buildingAreaSqm,
      ownedByEntityId,
      managingAgentId,
      notes,
      createdAt,
      updatedAt,
    } = entity;

    return {
      id,
      ownerId,
      name,
      addressLine1,
      addressLine2,
      suburb,
      state,
      postcode,
      country,
      propertyType,
      status,
      category,
      purchaseDate,
      purchasePrice,
      purchaseCosts,
      purchaseCurrency,
      landAreaSqm,
      buildingAreaSqm,
      ownedByEntityId,
      managingAgentId,
      notes,
      createdAt,
      updatedAt,
    };
  }
}
