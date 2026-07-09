import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  InvoiceEntity,
  InvoiceClassifiedBy,
  InvoiceStatus,
  InvoiceType,
} from '../../entities/invoice.entity';
import { InvoiceLineItemEntity } from '../../entities/invoice-line-item.entity';
import { RentalIncomeEntity, RentalIncomeStatus } from '../../entities/rental-income.entity';
import { PropertyExpenseEntity } from '../../entities/property-expense.entity';
import { MaintenanceRecordEntity, MaintenanceCategory } from '../../entities/maintenance-record.entity';
import { PropertyExpenseCategory } from '../../entities/enums/property-expense-category.enum';
import {
  ClassifyInvoiceRequest,
  CreateInvoiceRequest,
  InvoiceQueryDto,
  InvoiceResponse,
  PayInvoiceRequest,
  UpdateInvoiceRequest,
} from '../../dto/invoice.dto';
import { StandardPaginatedResponse } from '../../dto/standard';

const INCOME_INVOICE_TYPES = [InvoiceType.AGENT_STATEMENT, InvoiceType.RENT_INVOICE];
const COMMISSION_CATEGORIES = [PropertyExpenseCategory.MANAGEMENT_FEE, PropertyExpenseCategory.LEASING_COMMISSION];

const INVOICE_TYPE_TO_EXPENSE_CATEGORY: Partial<Record<InvoiceType, PropertyExpenseCategory>> = {
  [InvoiceType.MAINTENANCE]: PropertyExpenseCategory.MAINTENANCE,
  [InvoiceType.REPAIR]: PropertyExpenseCategory.REPAIRS,
  [InvoiceType.RATES]: PropertyExpenseCategory.RATES,
  [InvoiceType.LAND_TAX]: PropertyExpenseCategory.LAND_TAX,
  [InvoiceType.INSURANCE]: PropertyExpenseCategory.INSURANCE,
  [InvoiceType.UTILITIES]: PropertyExpenseCategory.UTILITIES,
  [InvoiceType.MANAGEMENT_FEE]: PropertyExpenseCategory.MANAGEMENT_FEE,
  [InvoiceType.LEASING_COMMISSION]: PropertyExpenseCategory.LEASING_COMMISSION,
  [InvoiceType.OWNERS_CORP]: PropertyExpenseCategory.OWNERS_CORP,
  [InvoiceType.LEGAL]: PropertyExpenseCategory.LEGAL,
  [InvoiceType.CAPITAL_WORKS]: PropertyExpenseCategory.CAPITAL_WORKS,
  [InvoiceType.OTHER]: PropertyExpenseCategory.OTHER,
};

const MAINTENANCE_INVOICE_TYPES = [InvoiceType.MAINTENANCE, InvoiceType.REPAIR];

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(InvoiceEntity)
    private readonly invoiceRepo: Repository<InvoiceEntity>,
    @InjectRepository(InvoiceLineItemEntity)
    private readonly invoiceLineItemRepo: Repository<InvoiceLineItemEntity>,
  ) {}

  async create(req: CreateInvoiceRequest, ownerId: string): Promise<InvoiceResponse> {
    const { lineItems, ...invoiceFields } = req;

    return this.invoiceRepo.manager.transaction(async (manager) => {
      const invoice = manager.create(InvoiceEntity, { ...invoiceFields, ownerId });
      const savedInvoice = await manager.save(invoice);

      let savedLineItems: InvoiceLineItemEntity[] = [];
      if (lineItems?.length) {
        const lineItemEntities = lineItems.map((li) =>
          manager.create(InvoiceLineItemEntity, { ...li, ownerId, invoiceId: savedInvoice.id }),
        );
        savedLineItems = await manager.save(lineItemEntities);
      }

      return this.toResponse({ ...savedInvoice, lineItems: savedLineItems });
    });
  }

  async findAll(
    query: InvoiceQueryDto,
    ownerId: string,
  ): Promise<StandardPaginatedResponse<InvoiceResponse>> {
    const { offset = 0, limit = 20, status, propertyId, direction, from, to } = query;
    const qb = this.invoiceRepo
      .createQueryBuilder('invoice')
      .where('invoice.owner_id = :ownerId', { ownerId });

    if (status) qb.andWhere('invoice.status = :status', { status });
    if (propertyId) qb.andWhere('invoice.property_id = :propertyId', { propertyId });
    if (direction) qb.andWhere('invoice.direction = :direction', { direction });
    if (from) qb.andWhere('invoice.issue_date >= :from', { from });
    if (to) qb.andWhere('invoice.issue_date <= :to', { to });

    const [items, total] = await qb
      .orderBy('invoice.issue_date', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { offset, limit, total, items: items.map((item) => this.toResponse(item)) };
  }

  async findOne(id: string, ownerId: string): Promise<InvoiceResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    return this.toResponse(entity);
  }

  async update(id: string, req: UpdateInvoiceRequest, ownerId: string): Promise<InvoiceResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    const { lineItems, ...fields } = req;
    Object.assign(entity, fields);
    const saved = await this.invoiceRepo.save(entity);
    return this.toResponse(saved);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    await this.findEntityOrFail(id, ownerId);
    await this.invoiceRepo.softDelete({ id, ownerId });
  }

  async classify(id: string, req: ClassifyInvoiceRequest, ownerId: string): Promise<InvoiceResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    entity.propertyId = req.propertyId;
    entity.invoiceType = req.invoiceType;
    entity.classifiedBy = InvoiceClassifiedBy.USER;
    entity.status = InvoiceStatus.CLASSIFIED;
    const saved = await this.invoiceRepo.save(entity);
    return this.toResponse(saved);
  }

  async pay(id: string, req: PayInvoiceRequest, ownerId: string): Promise<InvoiceResponse> {
    const entity = await this.findEntityOrFail(id, ownerId);
    entity.paidDate = req.paidDate;
    entity.paidAmount = req.paidAmount;
    entity.status = InvoiceStatus.PAID;
    const saved = await this.invoiceRepo.save(entity);
    return this.toResponse(saved);
  }

  /** Idempotent: re-running deletes prior generated rows for this invoice before recreating them. */
  async generatePostings(id: string, ownerId: string): Promise<{ rentalIncomes: number; propertyExpenses: number; maintenanceRecords: number }> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id, ownerId },
      relations: ['lineItems'],
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }
    if (!invoice.propertyId) {
      throw new BadRequestException('Invoice must be classified to a property before generating postings');
    }

    return this.invoiceRepo.manager.transaction(async (manager) => {
      await manager.delete(RentalIncomeEntity, { sourceInvoiceId: id, ownerId });
      await manager.delete(MaintenanceRecordEntity, { sourceInvoiceId: id, ownerId });
      await manager.delete(PropertyExpenseEntity, { sourceInvoiceId: id, ownerId });

      let rentalIncomes = 0;
      let propertyExpenses = 0;
      let maintenanceRecords = 0;

      if (INCOME_INVOICE_TYPES.includes(invoice.invoiceType)) {
        const lineItems = invoice.lineItems ?? [];
        const agentCommission = lineItems
          .filter((li) => COMMISSION_CATEGORIES.includes(li.category))
          .reduce((sum, li) => sum + li.amount, 0);
        const otherDeductions = lineItems
          .filter((li) => !COMMISSION_CATEGORIES.includes(li.category))
          .reduce((sum, li) => sum + li.amount, 0);
        const grossAmount = invoice.subtotal;
        const netAmount = grossAmount - agentCommission - otherDeductions;

        await manager.save(
          manager.create(RentalIncomeEntity, {
            ownerId,
            propertyId: invoice.propertyId,
            periodStart: invoice.periodStart ?? invoice.issueDate,
            periodEnd: invoice.periodEnd ?? invoice.issueDate,
            grossAmount,
            outgoingsReimbursed: 0,
            gstAmount: invoice.gstAmount,
            agentCommission,
            otherDeductions,
            netAmount,
            status:
              invoice.invoiceType === InvoiceType.RENT_INVOICE
                ? RentalIncomeStatus.INVOICED
                : RentalIncomeStatus.RECEIVED,
            sourceInvoiceId: invoice.id,
          }),
        );
        rentalIncomes = 1;
      } else {
        const lineItems = invoice.lineItems ?? [];
        const expenseRows =
          lineItems.length > 0
            ? lineItems.map((li) =>
                manager.create(PropertyExpenseEntity, {
                  ownerId,
                  propertyId: li.propertyId ?? invoice.propertyId,
                  expenseDate: invoice.issueDate,
                  category: li.category,
                  description: li.description,
                  amount: li.amount,
                  gstAmount: li.gstAmount,
                  currency: invoice.currency,
                  sourceInvoiceId: invoice.id,
                  sourceInvoiceLineItemId: li.id,
                  sourceDocumentId: invoice.sourceDocumentId,
                }),
              )
            : [
                manager.create(PropertyExpenseEntity, {
                  ownerId,
                  propertyId: invoice.propertyId,
                  expenseDate: invoice.issueDate,
                  category: INVOICE_TYPE_TO_EXPENSE_CATEGORY[invoice.invoiceType] ?? PropertyExpenseCategory.OTHER,
                  description: invoice.notes ?? `${invoice.invoiceType} - ${invoice.issuerName}`,
                  amount: invoice.subtotal,
                  gstAmount: invoice.gstAmount,
                  currency: invoice.currency,
                  sourceInvoiceId: invoice.id,
                  sourceDocumentId: invoice.sourceDocumentId,
                }),
              ];

        const savedExpenses = await manager.save(expenseRows);
        propertyExpenses = savedExpenses.length;

        if (MAINTENANCE_INVOICE_TYPES.includes(invoice.invoiceType)) {
          const maintenanceRows = savedExpenses.map((expense) =>
            manager.create(MaintenanceRecordEntity, {
              ownerId,
              propertyId: invoice.propertyId,
              serviceDate: invoice.issueDate,
              category: MaintenanceCategory.OTHER,
              vendor: invoice.issuerName,
              description: expense.description,
              cost: expense.amount,
              gstAmount: expense.gstAmount,
              currency: invoice.currency,
              sourceInvoiceId: invoice.id,
              sourceExpenseId: expense.id,
              sourceDocumentId: invoice.sourceDocumentId,
            }),
          );
          const savedMaintenance = await manager.save(maintenanceRows);
          maintenanceRecords = savedMaintenance.length;
        }
      }

      return { rentalIncomes, propertyExpenses, maintenanceRecords };
    });
  }

  private async findEntityOrFail(id: string, ownerId: string): Promise<InvoiceEntity> {
    const entity = await this.invoiceRepo.findOne({
      where: { id, ownerId },
      relations: ['lineItems'],
    });
    if (!entity) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }
    return entity;
  }

  private toResponse(entity: InvoiceEntity): InvoiceResponse {
    const {
      id,
      ownerId,
      propertyId,
      direction,
      invoiceType,
      invoiceNumber,
      issuerName,
      issuerAbn,
      issueDate,
      dueDate,
      periodStart,
      periodEnd,
      subtotal,
      gstAmount,
      totalAmount,
      currency,
      status,
      paidDate,
      paidAmount,
      classificationConfidence,
      classifiedBy,
      sourceDocumentId,
      notes,
      lineItems,
      createdAt,
      updatedAt,
    } = entity;

    return {
      id,
      ownerId,
      propertyId,
      direction,
      invoiceType,
      invoiceNumber,
      issuerName,
      issuerAbn,
      issueDate,
      dueDate,
      periodStart,
      periodEnd,
      subtotal,
      gstAmount,
      totalAmount,
      currency,
      status,
      paidDate,
      paidAmount,
      classificationConfidence,
      classifiedBy,
      sourceDocumentId,
      notes,
      lineItems: lineItems?.map((li) => ({
        id: li.id,
        invoiceId: li.invoiceId,
        lineNumber: li.lineNumber,
        description: li.description,
        category: li.category,
        propertyId: li.propertyId,
        quantity: li.quantity,
        unitAmount: li.unitAmount,
        amount: li.amount,
        gstAmount: li.gstAmount,
        notes: li.notes,
      })),
      createdAt,
      updatedAt,
    };
  }
}
