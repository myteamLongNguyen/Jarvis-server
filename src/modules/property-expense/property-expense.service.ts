import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PropertyExpenseEntity } from '../../entities/property-expense.entity';
import {
  CreatePropertyExpenseRequest,
  UpdatePropertyExpenseRequest,
  PropertyExpenseQueryDto,
  PropertyExpenseResponse,
} from '../../dto/property-expense.dto';
import { StandardPaginatedResponse } from '../../dto/standard';

@Injectable()
export class PropertyExpenseService {
  constructor(
    @InjectRepository(PropertyExpenseEntity)
    private readonly propertyExpenseRepo: Repository<PropertyExpenseEntity>,
  ) {}

  async create(req: CreatePropertyExpenseRequest, ownerId: string): Promise<PropertyExpenseResponse> {
    const entity = this.propertyExpenseRepo.create({ ...req, ownerId });
    const saved = await this.propertyExpenseRepo.save(entity);
    return this.toResponse(saved);
  }

  async findAll(
    query: PropertyExpenseQueryDto,
    ownerId: string,
  ): Promise<StandardPaginatedResponse<PropertyExpenseResponse>> {
    const { offset = 0, limit = 20, propertyId, category, from, to } = query;
    const qb = this.propertyExpenseRepo
      .createQueryBuilder('expense')
      .where('expense.owner_id = :ownerId', { ownerId });

    if (propertyId) qb.andWhere('expense.property_id = :propertyId', { propertyId });
    if (category) qb.andWhere('expense.category = :category', { category });
    if (from) qb.andWhere('expense.expense_date >= :from', { from });
    if (to) qb.andWhere('expense.expense_date <= :to', { to });

    const [items, total] = await qb
      .orderBy('expense.expense_date', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { offset, limit, total, items: items.map((item) => this.toResponse(item)) };
  }

  async findOne(id: string, ownerId: string): Promise<PropertyExpenseResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    return this.toResponse(entity);
  }

  async update(
    id: string,
    req: UpdatePropertyExpenseRequest,
    ownerId: string,
  ): Promise<PropertyExpenseResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    Object.assign(entity, req);
    const saved = await this.propertyExpenseRepo.save(entity);
    return this.toResponse(saved);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    await this.findEntityOrFail(id, ownerId);
    await this.propertyExpenseRepo.softDelete({ id, ownerId });
  }

  private async findEntityOrFail(id: string, ownerId: string): Promise<PropertyExpenseEntity> {
    const entity = await this.propertyExpenseRepo.findOne({ where: { id, ownerId } });
    if (!entity) {
      throw new NotFoundException(`Property expense ${id} not found`);
    }
    return entity;
  }

  private toResponse(entity: PropertyExpenseEntity): PropertyExpenseResponse {
    const {
      id,
      ownerId,
      propertyId,
      expenseDate,
      periodStart,
      periodEnd,
      category,
      description,
      amount,
      gstAmount,
      currency,
      recoverableFromTenant,
      recoveredAmount,
      paidDate,
      sourceInvoiceId,
      sourceInvoiceLineItemId,
      sourceDocumentId,
      notes,
      createdAt,
      updatedAt,
    } = entity;

    return {
      id,
      ownerId,
      propertyId,
      expenseDate,
      periodStart,
      periodEnd,
      category,
      description,
      amount,
      gstAmount,
      currency,
      recoverableFromTenant,
      recoveredAmount,
      paidDate,
      sourceInvoiceId,
      sourceInvoiceLineItemId,
      sourceDocumentId,
      notes,
      createdAt,
      updatedAt,
    };
  }
}
