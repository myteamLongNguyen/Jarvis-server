import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RentReviewEntity, RentReviewStatus } from '../../entities/rent-review.entity';
import { LeaseEntity } from '../../entities/lease.entity';
import { buildReviewSchedule, ProposedReview } from './review-schedule';
import {
  CreateRentReviewRequest,
  UpdateRentReviewRequest,
  RentReviewQueryDto,
  RentReviewResponse,
} from '../../dto/rent-review.dto';
import { StandardPaginatedResponse } from '../../dto/standard';

export type ScheduleProposal = ProposedReview & { alreadyRecorded: boolean };

@Injectable()
export class RentReviewService {
  constructor(
    @InjectRepository(RentReviewEntity)
    private readonly rentReviewRepo: Repository<RentReviewEntity>,
    @InjectRepository(LeaseEntity)
    private readonly leaseRepo: Repository<LeaseEntity>,
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

  /** The schedule a lease implies, with anything already recorded marked as such. Saves nothing. */
  async schedule(leaseId: string, ownerId: string): Promise<ScheduleProposal[]> {
    const lease = await this.leaseRepo.findOne({ where: { id: leaseId, ownerId } });
    if (!lease) {
      throw new NotFoundException(`Lease ${leaseId} not found`);
    }
    const existing = await this.rentReviewRepo.find({ where: { leaseId, ownerId } });
    const taken = new Set(existing.map((r) => String(r.reviewDate).slice(0, 10)));
    return buildReviewSchedule(lease).map((p) => ({ ...p, alreadyRecorded: taken.has(p.reviewDate) }));
  }

  /**
   * Writes the proposed schedule. A date that already has a review is left
   * alone, so running this twice does not duplicate anything and a review the
   * user has since edited is never overwritten.
   */
  async generateSchedule(leaseId: string, ownerId: string): Promise<{ created: RentReviewResponse[]; skipped: number }> {
    const proposals = await this.schedule(leaseId, ownerId);
    const toCreate = proposals.filter((p) => !p.alreadyRecorded);

    const created = await Promise.all(
      toCreate.map(async (p) =>
        this.toResponse(
          await this.rentReviewRepo.save(
            this.rentReviewRepo.create({
              ownerId,
              leaseId,
              reviewDate: p.reviewDate,
              reviewType: p.reviewType,
              oldRentAnnual: p.oldRentAnnual,
              newRentAnnual: p.newRentAnnual,
              percentChange: p.percentChange,
              status: RentReviewStatus.SCHEDULED,
              notes: p.notes,
            }),
          ),
        ),
      ),
    );

    return { created, skipped: proposals.length - toCreate.length };
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
