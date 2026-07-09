import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum TenantEntityType {
  COMPANY = 'COMPANY',
  INDIVIDUAL = 'INDIVIDUAL',
  GOVERNMENT = 'GOVERNMENT',
}

@Entity('tenants')
export class TenantEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'enum', enum: TenantEntityType, name: 'entity_type' })
  entityType: TenantEntityType;

  @Column({ type: 'varchar', length: 20, nullable: true })
  abn: string;

  @Column({ type: 'varchar', length: 150, name: 'contact_name', nullable: true })
  contactName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
