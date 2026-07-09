import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RentReviewEntity } from '../../entities/rent-review.entity';
import {
  CreateRentReviewRequest,
  UpdateRentReviewRequest,
  RentReviewQueryDto,
  RentReviewResponse,
} from '../../dto/rent-review.dto';
import { StandardPaginatedResponse } from '../../dto/standard';

@Injectable()
export class RentReviewService {
  constructor(
    @InjectRepository(RentReviewEntity)
    private readonly rentReviewRepo: Repository<RentReviewEntity>,
  ) {}

  async create(req: CreateRentReviewRequest, ownerId: string): Promise<RentReviewResponse> {
    const entity = this.rentReviewRepo.create({ ...req, ownerId });
    const saved = await this.rentReviewRepo.save(entity);
    return this.toResponse(saved);
  }

  async findAll(
    query: RentReviewQueryDto,
    ownerId: string,
  ): Promise<StandardPaginatedResponse<RentReviewResponse>> {
    const { offset = 0, limit = 20, leaseId, status } = query;
    const [items, total] = await this.rentReviewRepo.findAndCount({
      where: {
        ownerId,
        ...(leaseId ? { leaseId } : {}),
        ...(status ? { status } : {}),
      },
      skip: offset,
      take: limit,
      order: { reviewDate: 'ASC' },
    });

    return { offset, limit, total, items: items.map((item) => this.toResponse(item)) };
  }

  async findOne(id: string, ownerId: string): Promise<RentReviewResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    return this.toResponse(entity);
  }

  async update(id: string, req: UpdateRentReviewRequest, ownerId: string): Promise<RentReviewResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    Object.assign(entity, req);
    const saved = await this.rentReviewRepo.save(entity);
    return this.toResponse(saved);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    await this.findEntityOrFail(id, ownerId);
    await this.rentReviewRepo.softDelete({ id, ownerId });
  }

  private async findEntityOrFail(id: string, ownerId: string): Promise<RentReviewEntity> {
    const entity = await this.rentReviewRepo.findOne({ where: { id, ownerId } });
    if (!entity) {
      throw new NotFoundException(`Rent review ${id} not found`);
    }
    return entity;
  }

  private toResponse(entity: RentReviewEntity): RentReviewResponse {
    const {
      id,
      ownerId,
      leaseId,
      reviewDate,
      reviewType,
      oldRentAnnual,
      newRentAnnual,
      percentChange,
      status,
      notes,
      sourceDocumentId,
      createdAt,
      updatedAt,
    } = entity;

    return {
      id,
      ownerId,
      leaseId,
      reviewDate,
      reviewType,
      oldRentAnnual,
      newRentAnnual,
      percentChange,
      status,
      notes,
      sourceDocumentId,
      createdAt,
      updatedAt,
    };
  }
}
