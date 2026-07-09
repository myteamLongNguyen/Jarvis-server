import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { moneyTransformer } from '../core/utils';
import { PropertyEntity } from './property.entity';
import { LeaseEntity } from './lease.entity';
import { InvoiceEntity } from './invoice.entity';
import { PropertyStatementEntity } from './property-statement.entity';

export enum RentalIncomeStatus {
  EXPECTED = 'EXPECTED',
  INVOICED = 'INVOICED',
  RECEIVED = 'RECEIVED',
  OVERDUE = 'OVERDUE',
  WRITTEN_OFF = 'WRITTEN_OFF',
}

@Entity('rental_incomes')
export class RentalIncomeEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'property_id' })
  propertyId: string;

  @ManyToOne(() => PropertyEntity, (property) => property.rentalIncomes)
  @JoinColumn({ name: 'property_id' })
  property: PropertyEntity;

  @Column({ type: 'uuid', name: 'lease_id', nullable: true })
  leaseId: string;

  @ManyToOne(() => LeaseEntity, { nullable: true })
  @JoinColumn({ name: 'lease_id' })
  lease: LeaseEntity;

  @Column({ type: 'date', name: 'period_start' })
  periodStart: string;

  @Column({ type: 'date', name: 'period_end' })
  periodEnd: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'gross_amount', transformer: moneyTransformer })
  grossAmount: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'outgoings_reimbursed', default: 0, transformer: moneyTransformer })
  outgoingsReimbursed: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'gst_amount', default: 0, transformer: moneyTransformer })
  gstAmount: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'agent_commission', default: 0, transformer: moneyTransformer })
  agentCommission: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'other_deductions', default: 0, transformer: moneyTransformer })
  otherDeductions: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'net_amount', transformer: moneyTransformer })
  netAmount: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'amount_received', nullable: true, transformer: moneyTransformer })
  amountReceived: number;

  @Column({ type: 'date', name: 'received_date', nullable: true })
  receivedDate: string;

  @Column({ type: 'enum', enum: RentalIncomeStatus, default: RentalIncomeStatus.EXPECTED })
  status: RentalIncomeStatus;

  @Column({ type: 'uuid', name: 'source_invoice_id', nullable: true })
  sourceInvoiceId: string;

  @ManyToOne(() => InvoiceEntity, (invoice) => invoice.generatedRentalIncomes, { nullable: true })
  @JoinColumn({ name: 'source_invoice_id' })
  sourceInvoice: InvoiceEntity;

  @Column({ type: 'uuid', name: 'source_statement_id', nullable: true })
  sourceStatementId: string;

  @ManyToOne(() => PropertyStatementEntity, { nullable: true })
  @JoinColumn({ name: 'source_statement_id' })
  sourceStatement: PropertyStatementEntity;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
