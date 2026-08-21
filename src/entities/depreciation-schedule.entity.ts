import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { moneyTransformer } from '../core/utils';
import { PropertyEntity } from './property.entity';
import { DocumentEntity } from './document.entity';

export enum DepreciationMethod {
  DIMINISHING_VALUE = 'DIMINISHING_VALUE',
  PRIME_COST = 'PRIME_COST',
}

@Entity('depreciation_schedules')
export class DepreciationScheduleEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'property_id' })
  propertyId: string;

  @ManyToOne(() => PropertyEntity)
  @JoinColumn({ name: 'property_id' })
  property: PropertyEntity;

  @Column({ type: 'date', name: 'financial_year_start' })
  financialYearStart: string;

  @Column({ type: 'date', name: 'financial_year_end' })
  financialYearEnd: string;

  @Column({ type: 'enum', enum: DepreciationMethod })
  method: DepreciationMethod;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'division_40_amount', nullable: true, transformer: moneyTransformer })
  division40Amount: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'division_43_amount', nullable: true, transformer: moneyTransformer })
  division43Amount: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'total_amount', transformer: moneyTransformer })
  totalAmount: number;

  @Column({ type: 'uuid', name: 'source_document_id', nullable: true })
  sourceDocumentId: string;

  @ManyToOne(() => DocumentEntity, { nullable: true })
  @JoinColumn({ name: 'source_document_id' })
  sourceDocument: DocumentEntity;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
