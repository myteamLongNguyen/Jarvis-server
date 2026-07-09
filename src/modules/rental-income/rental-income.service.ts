import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RentalIncomeEntity } from '../../entities/rental-income.entity';
import {
  CreateRentalIncomeRequest,
  UpdateRentalIncomeRequest,
  RentalIncomeQueryDto,
  RentalIncomeResponse,
} from '../../dto/rental-income.dto';
import { StandardPaginatedResponse } from '../../dto/standard';

function computeNetAmount(fields: {
  grossAmount: number;
  outgoingsReimbursed?: number;
  agentCommission?: number;
  otherDeductions?: number;
}): number {
  return (
    fields.grossAmount +
    (fields.outgoingsReimbursed ?? 0) -
    (fields.agentCommission ?? 0) -
    (fields.otherDeductions ?? 0)
  );
}

@Injectable()
export class RentalIncomeService {
  constructor(
    @InjectRepository(RentalIncomeEntity)
    private readonly rentalIncomeRepo: Repository<RentalIncomeEntity>,
  ) {}

  async create(req: CreateRentalIncomeRequest, ownerId: string): Promise<RentalIncomeResponse> {
    const entity = this.rentalIncomeRepo.create({
      ...req,
      ownerId,
      netAmount: computeNetAmount(req),
    });
    const saved = await this.rentalIncomeRepo.save(entity);
    return this.toResponse(saved);
  }

  async findAll(
    query: RentalIncomeQueryDto,
    ownerId: string,
  ): Promise<StandardPaginatedResponse<RentalIncomeResponse>> {
    const { offset = 0, limit = 20, propertyId, status, from, to } = query;
    const qb = this.rentalIncomeRepo
      .createQueryBuilder('income')
      .where('income.owner_id = :ownerId', { ownerId });

    if (propertyId) qb.andWhere('income.property_id = :propertyId', { propertyId });
    if (status) qb.andWhere('income.status = :status', { status });
    if (from) qb.andWhere('income.period_start >= :from', { from });
    if (to) qb.andWhere('income.period_end <= :to', { to });

    const [items, total] = await qb
      .orderBy('income.period_start', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { offset, limit, total, items: items.map((item) => this.toResponse(item)) };
  }

  async findOne(id: string, ownerId: string): Promise<RentalIncomeResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    return this.toResponse(entity);
  }

  async update(
    id: string,
    req: UpdateRentalIncomeRequest,
    ownerId: string,
  ): Promise<RentalIncomeResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    Object.assign(entity, req);
    entity.netAmount = computeNetAmount(entity);
    const saved = await this.rentalIncomeRepo.save(entity);
    return this.toResponse(saved);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    await this.findEntityOrFail(id, ownerId);
    await this.rentalIncomeRepo.softDelete({ id, ownerId });
  }

  private async findEntityOrFail(id: string, ownerId: string): Promise<RentalIncomeEntity> {
    const entity = await this.rentalIncomeRepo.findOne({ where: { id, ownerId } });
    if (!entity) {
      throw new NotFoundException(`Rental income ${id} not found`);
    }
    return entity;
  }

  private toResponse(entity: RentalIncomeEntity): RentalIncomeResponse {
    const {
      id,
      ownerId,
      propertyId,
      leaseId,
      periodStart,
      periodEnd,
      grossAmount,
      outgoingsReimbursed,
      gstAmount,
      agentCommission,
      otherDeductions,
      netAmount,
      amountReceived,
      receivedDate,
      status,
      sourceInvoiceId,
      sourceStatementId,
      notes,
      createdAt,
      updatedAt,
    } = entity;

    return {
      id,
      ownerId,
      propertyId,
      leaseId,
      periodStart,
      periodEnd,
      grossAmount,
      outgoingsReimbursed,
      gstAmount,
      agentCommission,
      otherDeductions,
      netAmount,
      amountReceived,
      receivedDate,
      status,
      sourceInvoiceId,
      sourceStatementId,
      notes,
      createdAt,
      updatedAt,
    };
  }
}
