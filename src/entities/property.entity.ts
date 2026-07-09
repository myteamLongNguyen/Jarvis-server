import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { moneyTransformer } from '../core/utils';
import { PropertyOwningEntity } from './property-owning-entity.entity';
import { ManagingAgentEntity } from './managing-agent.entity';
import { LeaseEntity } from './lease.entity';
import { InvoiceEntity } from './invoice.entity';
import { RentalIncomeEntity } from './rental-income.entity';
import { PropertyExpenseEntity } from './property-expense.entity';
import { PropertyStatementEntity } from './property-statement.entity';
import { ValuationEntity } from './valuation.entity';
import { MaintenanceRecordEntity } from './maintenance-record.entity';
import { DocumentEntity } from './document.entity';

export enum PropertyType {
  COMMERCIAL = 'COMMERCIAL',
  RESIDENTIAL = 'RESIDENTIAL',
  INDUSTRIAL = 'INDUSTRIAL',
  MIXED_USE = 'MIXED_USE',
  LAND = 'LAND',
}

export enum PropertyStatus {
  ACTIVE = 'ACTIVE',
  UNDER_CONTRACT = 'UNDER_CONTRACT',
  SOLD = 'SOLD',
  ARCHIVED = 'ARCHIVED',
}

@Entity('properties')
export class PropertyEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 255, name: 'address_line_1' })
  addressLine1: string;

  @Column({ type: 'varchar', length: 255, name: 'address_line_2', nullable: true })
  addressLine2: string;

  @Column({ type: 'varchar', length: 100 })
  suburb: string;

  @Column({ type: 'varchar', length: 50 })
  state: string;

  @Column({ type: 'varchar', length: 20 })
  postcode: string;

  @Column({ type: 'varchar', length: 2, default: 'AU' })
  country: string;

  @Column({ type: 'enum', enum: PropertyType, name: 'property_type' })
  propertyType: PropertyType;

  @Column({ type: 'enum', enum: PropertyStatus, default: PropertyStatus.ACTIVE })
  status: PropertyStatus;

  @Column({ type: 'date', name: 'purchase_date' })
  purchaseDate: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'purchase_price', transformer: moneyTransformer })
  purchasePrice: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'purchase_costs', transformer: moneyTransformer })
  purchaseCosts: number;

  @Column({ type: 'varchar', length: 3, name: 'purchase_currency', default: 'AUD' })
  purchaseCurrency: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'land_area_sqm', nullable: true, transformer: moneyTransformer })
  landAreaSqm: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'building_area_sqm', nullable: true, transformer: moneyTransformer })
  buildingAreaSqm: number;

  @Column({ type: 'uuid', name: 'owned_by_entity_id', nullable: true })
  ownedByEntityId: string;

  @ManyToOne(() => PropertyOwningEntity, { nullable: true })
  @JoinColumn({ name: 'owned_by_entity_id' })
  ownedByEntity: PropertyOwningEntity;

  @Column({ type: 'uuid', name: 'managing_agent_id', nullable: true })
  managingAgentId: string;

  @ManyToOne(() => ManagingAgentEntity, { nullable: true })
  @JoinColumn({ name: 'managing_agent_id' })
  managingAgent: ManagingAgentEntity;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => LeaseEntity, (lease) => lease.property)
  leases: LeaseEntity[];

  @OneToMany(() => InvoiceEntity, (invoice) => invoice.property)
  invoices: InvoiceEntity[];

  @OneToMany(() => RentalIncomeEntity, (rentalIncome) => rentalIncome.property)
  rentalIncomes: RentalIncomeEntity[];

  @OneToMany(() => PropertyExpenseEntity, (expense) => expense.property)
  expenses: PropertyExpenseEntity[];

  @OneToMany(() => PropertyStatementEntity, (statement) => statement.property)
  statements: PropertyStatementEntity[];

  @OneToMany(() => ValuationEntity, (valuation) => valuation.property)
  valuations: ValuationEntity[];

  @OneToMany(() => MaintenanceRecordEntity, (record) => record.property)
  maintenanceRecords: MaintenanceRecordEntity[];

  @OneToMany(() => DocumentEntity, (document) => document.property)
  documents: DocumentEntity[];
}
