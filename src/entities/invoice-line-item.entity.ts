import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { moneyTransformer } from '../core/utils';
import { InvoiceEntity } from './invoice.entity';
import { PropertyEntity } from './property.entity';
import { PropertyExpenseCategory } from './enums/property-expense-category.enum';

export { PropertyExpenseCategory };

@Entity('invoice_line_items')
export class InvoiceLineItemEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'invoice_id' })
  invoiceId: string;

  @ManyToOne(() => InvoiceEntity, (invoice) => invoice.lineItems)
  @JoinColumn({ name: 'invoice_id' })
  invoice: InvoiceEntity;

  @Column({ type: 'int', name: 'line_number' })
  lineNumber: number;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @Column({ type: 'enum', enum: PropertyExpenseCategory })
  category: PropertyExpenseCategory;

  @Column({ type: 'uuid', name: 'property_id', nullable: true })
  propertyId: string;

  @ManyToOne(() => PropertyEntity, { nullable: true })
  @JoinColumn({ name: 'property_id' })
  property: PropertyEntity;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 1, transformer: moneyTransformer })
  quantity: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'unit_amount', transformer: moneyTransformer })
  unitAmount: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: moneyTransformer })
  amount: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'gst_amount', transformer: moneyTransformer })
  gstAmount: number;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
