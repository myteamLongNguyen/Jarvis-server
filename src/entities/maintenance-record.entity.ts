import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { moneyTransformer } from '../core/utils';
import { PropertyEntity } from './property.entity';
import { InvoiceEntity } from './invoice.entity';
import { PropertyExpenseEntity } from './property-expense.entity';
import { DocumentEntity } from './document.entity';

export enum MaintenanceCategory {
  HVAC = 'HVAC',
  PLUMBING = 'PLUMBING',
  ELECTRICAL = 'ELECTRICAL',
  STRUCTURAL = 'STRUCTURAL',
  COMPLIANCE = 'COMPLIANCE',
  GROUNDS = 'GROUNDS',
  CLEANING = 'CLEANING',
  OTHER = 'OTHER',
}

@Entity('maintenance_records')
export class MaintenanceRecordEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'property_id' })
  propertyId: string;

  @ManyToOne(() => PropertyEntity, (property) => property.maintenanceRecords)
  @JoinColumn({ name: 'property_id' })
  property: PropertyEntity;

  @Column({ type: 'date', name: 'service_date' })
  serviceDate: string;

  @Column({ type: 'enum', enum: MaintenanceCategory })
  category: MaintenanceCategory;

  @Column({ type: 'varchar', length: 150 })
  vendor: string;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: moneyTransformer })
  cost: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'gst_amount', default: 0, transformer: moneyTransformer })
  gstAmount: number;

  @Column({ type: 'varchar', length: 3, default: 'AUD' })
  currency: string;

  @Column({ type: 'date', name: 'next_service_due_date', nullable: true })
  nextServiceDueDate: string;

  @Column({ type: 'uuid', name: 'source_invoice_id', nullable: true })
  sourceInvoiceId: string;

  @ManyToOne(() => InvoiceEntity, { nullable: true })
  @JoinColumn({ name: 'source_invoice_id' })
  sourceInvoice: InvoiceEntity;

  @Column({ type: 'uuid', name: 'source_expense_id', nullable: true })
  sourceExpenseId: string;

  @ManyToOne(() => PropertyExpenseEntity, { nullable: true })
  @JoinColumn({ name: 'source_expense_id' })
  sourceExpense: PropertyExpenseEntity;

  @Column({ type: 'uuid', name: 'source_document_id', nullable: true })
  sourceDocumentId: string;

  @ManyToOne(() => DocumentEntity, { nullable: true })
  @JoinColumn({ name: 'source_document_id' })
  sourceDocument: DocumentEntity;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
