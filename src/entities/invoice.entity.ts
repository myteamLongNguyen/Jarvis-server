import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { moneyTransformer } from '../core/utils';
import { PropertyEntity } from './property.entity';
import { DocumentEntity } from './document.entity';
import { InvoiceLineItemEntity } from './invoice-line-item.entity';
import { PropertyExpenseEntity } from './property-expense.entity';
import { RentalIncomeEntity } from './rental-income.entity';

export enum InvoiceDirection {
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING',
}

export enum InvoiceType {
  AGENT_STATEMENT = 'AGENT_STATEMENT',
  RENT_INVOICE = 'RENT_INVOICE',
  MAINTENANCE = 'MAINTENANCE',
  REPAIR = 'REPAIR',
  RATES = 'RATES',
  LAND_TAX = 'LAND_TAX',
  INSURANCE = 'INSURANCE',
  UTILITIES = 'UTILITIES',
  MANAGEMENT_FEE = 'MANAGEMENT_FEE',
  LEASING_COMMISSION = 'LEASING_COMMISSION',
  OWNERS_CORP = 'OWNERS_CORP',
  LEGAL = 'LEGAL',
  CAPITAL_WORKS = 'CAPITAL_WORKS',
  OTHER = 'OTHER',
}

export enum InvoiceStatus {
  UNSORTED = 'UNSORTED',
  CLASSIFIED = 'CLASSIFIED',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  DISPUTED = 'DISPUTED',
  WRITTEN_OFF = 'WRITTEN_OFF',
}

export enum InvoiceClassifiedBy {
  USER = 'USER',
  AI = 'AI',
  RULE = 'RULE',
}

@Entity('invoices')
export class InvoiceEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'property_id', nullable: true })
  propertyId: string;

  @ManyToOne(() => PropertyEntity, (property) => property.invoices, { nullable: true })
  @JoinColumn({ name: 'property_id' })
  property: PropertyEntity;

  @Column({ type: 'enum', enum: InvoiceDirection })
  direction: InvoiceDirection;

  @Column({ type: 'enum', enum: InvoiceType, name: 'invoice_type' })
  invoiceType: InvoiceType;

  @Column({ type: 'varchar', length: 100, name: 'invoice_number', nullable: true })
  invoiceNumber: string;

  @Column({ type: 'varchar', length: 150, name: 'issuer_name' })
  issuerName: string;

  @Column({ type: 'varchar', length: 20, name: 'issuer_abn', nullable: true })
  issuerAbn: string;

  @Column({ type: 'date', name: 'issue_date' })
  issueDate: string;

  @Column({ type: 'date', name: 'due_date', nullable: true })
  dueDate: string;

  @Column({ type: 'date', name: 'period_start', nullable: true })
  periodStart: string;

  @Column({ type: 'date', name: 'period_end', nullable: true })
  periodEnd: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: moneyTransformer })
  subtotal: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'gst_amount', transformer: moneyTransformer })
  gstAmount: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'total_amount', transformer: moneyTransformer })
  totalAmount: number;

  @Column({ type: 'varchar', length: 3, default: 'AUD' })
  currency: string;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.UNSORTED })
  status: InvoiceStatus;

  @Column({ type: 'date', name: 'paid_date', nullable: true })
  paidDate: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'paid_amount', nullable: true, transformer: moneyTransformer })
  paidAmount: number;

  @Column({ type: 'numeric', precision: 4, scale: 3, name: 'classification_confidence', nullable: true, transformer: moneyTransformer })
  classificationConfidence: number;

  @Column({ type: 'enum', enum: InvoiceClassifiedBy, name: 'classified_by', nullable: true })
  classifiedBy: InvoiceClassifiedBy;

  @Column({ type: 'uuid', name: 'source_document_id', nullable: true })
  sourceDocumentId: string;

  @ManyToOne(() => DocumentEntity, { nullable: true })
  @JoinColumn({ name: 'source_document_id' })
  sourceDocument: DocumentEntity;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => InvoiceLineItemEntity, (lineItem) => lineItem.invoice)
  lineItems: InvoiceLineItemEntity[];

  @OneToMany(() => PropertyExpenseEntity, (expense) => expense.sourceInvoice)
  generatedExpenses: PropertyExpenseEntity[];

  @OneToMany(() => RentalIncomeEntity, (rentalIncome) => rentalIncome.sourceInvoice)
  generatedRentalIncomes: RentalIncomeEntity[];
}
