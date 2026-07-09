import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum OwningEntityType {
  COMPANY = 'COMPANY',
  TRUST = 'TRUST',
  INDIVIDUAL = 'INDIVIDUAL',
  SMSF = 'SMSF',
  PARTNERSHIP = 'PARTNERSHIP',
}

@Entity('owning_entities')
export class PropertyOwningEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 150, name: 'legal_name' })
  legalName: string;

  @Column({ type: 'enum', enum: OwningEntityType, name: 'entity_type' })
  entityType: OwningEntityType;

  @Column({ type: 'varchar', length: 20, nullable: true })
  abn: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  acn: string;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
