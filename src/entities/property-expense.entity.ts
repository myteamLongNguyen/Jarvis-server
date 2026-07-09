import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { moneyTransformer } from '../core/utils';
import { PropertyEntity } from './property.entity';
import { InvoiceEntity } from './invoice.entity';
import { InvoiceLineItemEntity } from './invoice-line-item.entity';
import { DocumentEntity } from './document.entity';
import { PropertyExpenseCategory } from './enums/property-expense-category.enum';

export { PropertyExpenseCategory };

@Entity('property_expenses')
export class PropertyExpenseEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'property_id' })
  propertyId: string;

  @ManyToOne(() => PropertyEntity, (property) => property.expenses)
  @JoinColumn({ name: 'property_id' })
  property: PropertyEntity;

  @Column({ type: 'date', name: 'expense_date' })
  expenseDate: string;

  @Column({ type: 'date', name: 'period_start', nullable: true })
  periodStart: string;

  @Column({ type: 'date', name: 'period_end', nullable: true })
  periodEnd: string;

  @Column({ type: 'enum', enum: PropertyExpenseCategory })
  category: PropertyExpenseCategory;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: moneyTransformer })
  amount: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'gst_amount', default: 0, transformer: moneyTransformer })
  gstAmount: number;

  @Column({ type: 'varchar', length: 3, default: 'AUD' })
  currency: string;

  @Column({ type: 'boolean', name: 'recoverable_from_tenant', default: false })
  recoverableFromTenant: boolean;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'recovered_amount', default: 0, transformer: moneyTransformer })
  recoveredAmount: number;

  @Column({ type: 'date', name: 'paid_date', nullable: true })
  paidDate: string;

  @Column({ type: 'uuid', name: 'source_invoice_id', nullable: true })
  sourceInvoiceId: string;

  @ManyToOne(() => InvoiceEntity, (invoice) => invoice.generatedExpenses, { nullable: true })
  @JoinColumn({ name: 'source_invoice_id' })
  sourceInvoice: InvoiceEntity;

  @Column({ type: 'uuid', name: 'source_invoice_line_item_id', nullable: true })
  sourceInvoiceLineItemId: string;

  @ManyToOne(() => InvoiceLineItemEntity, { nullable: true })
  @JoinColumn({ name: 'source_invoice_line_item_id' })
  sourceInvoiceLineItem: InvoiceLineItemEntity;

  @Column({ type: 'uuid', name: 'source_document_id', nullable: true })
  sourceDocumentId: string;

  @ManyToOne(() => DocumentEntity, { nullable: true })
  @JoinColumn({ name: 'source_document_id' })
  sourceDocument: DocumentEntity;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
