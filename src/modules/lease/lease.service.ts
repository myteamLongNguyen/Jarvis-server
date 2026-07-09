import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaseEntity } from '../../entities/lease.entity';
import { CreateLeaseRequest, UpdateLeaseRequest, LeaseQueryDto, LeaseResponse } from '../../dto/lease.dto';
import { StandardPaginatedResponse } from '../../dto/standard';

@Injectable()
export class LeaseService {
  constructor(
    @InjectRepository(LeaseEntity)
    private readonly leaseRepo: Repository<LeaseEntity>,
  ) {}

  async create(req: CreateLeaseRequest, ownerId: string): Promise<LeaseResponse> {
    const entity = this.leaseRepo.create({ ...req, ownerId });
    const saved = await this.leaseRepo.save(entity);
    return this.toResponse(saved);
  }

  async findAll(query: LeaseQueryDto, ownerId: string): Promise<StandardPaginatedResponse<LeaseResponse>> {
    const { offset = 0, limit = 20, propertyId, status } = query;
    const [items, total] = await this.leaseRepo.findAndCount({
      where: {
        ownerId,
        ...(propertyId ? { propertyId } : {}),
        ...(status ? { status } : {}),
      },
      skip: offset,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { offset, limit, total, items: items.map((item) => this.toResponse(item)) };
  }

  async findOne(id: string, ownerId: string): Promise<LeaseResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    return this.toResponse(entity);
  }

  async update(id: string, req: UpdateLeaseRequest, ownerId: string): Promise<LeaseResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    Object.assign(entity, req);
    const saved = await this.leaseRepo.save(entity);
    return this.toResponse(saved);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    await this.findEntityOrFail(id, ownerId);
    await this.leaseRepo.softDelete({ id, ownerId });
  }

  private async findEntityOrFail(id: string, ownerId: string): Promise<LeaseEntity> {
    const entity = await this.leaseRepo.findOne({ where: { id, ownerId } });
    if (!entity) {
      throw new NotFoundException(`Lease ${id} not found`);
    }
    return entity;
  }

  private toResponse(entity: LeaseEntity): LeaseResponse {
    const {
      id,
      ownerId,
      propertyId,
      tenantId,
      status,
      commencementDate,
      expiryDate,
      initialTermMonths,
      optionTerms,
      baseRentAnnual,
      rentFrequency,
      outgoingsRecoveryType,
      rentReviewMechanism,
      rentReviewValue,
      nextReviewDate,
      rentFreePeriodMonths,
      bondAmount,
      bondType,
      notes,
      createdAt,
      updatedAt,
    } = entity;

    return {
      id,
      ownerId,
      propertyId,
      tenantId,
      status,
      commencementDate,
      expiryDate,
      initialTermMonths,
      optionTerms,
      baseRentAnnual,
      rentFrequency,
      outgoingsRecoveryType,
      rentReviewMechanism,
      rentReviewValue,
      nextReviewDate,
      rentFreePeriodMonths,
      bondAmount,
      bondType,
      notes,
      createdAt,
      updatedAt,
    };
  }
}
