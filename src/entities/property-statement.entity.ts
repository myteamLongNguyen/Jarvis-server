import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { moneyTransformer } from '../core/utils';
import { PropertyEntity } from './property.entity';
import { ManagingAgentEntity } from './managing-agent.entity';
import { InvoiceEntity } from './invoice.entity';
import { DocumentEntity } from './document.entity';

@Entity('property_statements')
export class PropertyStatementEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'property_id' })
  propertyId: string;

  @ManyToOne(() => PropertyEntity, (property) => property.statements)
  @JoinColumn({ name: 'property_id' })
  property: PropertyEntity;

  @Column({ type: 'uuid', name: 'managing_agent_id' })
  managingAgentId: string;

  @ManyToOne(() => ManagingAgentEntity)
  @JoinColumn({ name: 'managing_agent_id' })
  managingAgent: ManagingAgentEntity;

  @Column({ type: 'date', name: 'statement_date' })
  statementDate: string;

  @Column({ type: 'date', name: 'period_start' })
  periodStart: string;

  @Column({ type: 'date', name: 'period_end' })
  periodEnd: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'gross_income', transformer: moneyTransformer })
  grossIncome: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'total_expenses', transformer: moneyTransformer })
  totalExpenses: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'net_to_owner', transformer: moneyTransformer })
  netToOwner: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'opening_balance', transformer: moneyTransformer })
  openingBalance: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'closing_balance', transformer: moneyTransformer })
  closingBalance: number;

  @Column({ type: 'uuid', name: 'source_invoice_id', nullable: true })
  sourceInvoiceId: string;

  @ManyToOne(() => InvoiceEntity, { nullable: true })
  @JoinColumn({ name: 'source_invoice_id' })
  sourceInvoice: InvoiceEntity;

  @Column({ type: 'uuid', name: 'source_document_id', nullable: true })
  sourceDocumentId: string;

  @ManyToOne(() => DocumentEntity, { nullable: true })
  @JoinColumn({ name: 'source_document_id' })
  sourceDocument: DocumentEntity;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
