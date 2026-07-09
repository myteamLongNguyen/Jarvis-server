import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { moneyTransformer } from '../core/utils';
import { PropertyEntity } from './property.entity';
import { DocumentEntity } from './document.entity';

export enum ValuationType {
  BANK = 'BANK',
  INDEPENDENT = 'INDEPENDENT',
  DESKTOP = 'DESKTOP',
  OWNER_ESTIMATE = 'OWNER_ESTIMATE',
  COUNCIL = 'COUNCIL',
}

@Entity('valuations')
export class ValuationEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'property_id' })
  propertyId: string;

  @ManyToOne(() => PropertyEntity, (property) => property.valuations)
  @JoinColumn({ name: 'property_id' })
  property: PropertyEntity;

  @Column({ type: 'date', name: 'valuation_date' })
  valuationDate: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'valuation_amount', transformer: moneyTransformer })
  valuationAmount: number;

  @Column({ type: 'enum', enum: ValuationType, name: 'valuation_type' })
  valuationType: ValuationType;

  @Column({ type: 'varchar', length: 150, nullable: true })
  valuer: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  purpose: string;

  @Column({ type: 'uuid', name: 'source_document_id', nullable: true })
  sourceDocumentId: string;

  @ManyToOne(() => DocumentEntity, { nullable: true })
  @JoinColumn({ name: 'source_document_id' })
  sourceDocument: DocumentEntity;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
