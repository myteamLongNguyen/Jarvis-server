import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { moneyTransformer } from '../core/utils';
import { PropertyEntity } from './property.entity';
import { TenantEntity } from './tenant.entity';
import { RentReviewEntity } from './rent-review.entity';
import { RentReviewMechanism } from './enums/rent-review-mechanism.enum';

export { RentReviewMechanism };

export enum LeaseStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  HOLDOVER = 'HOLDOVER',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED',
}

export enum RentFrequency {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUALLY = 'ANNUALLY',
}

export enum OutgoingsRecoveryType {
  GROSS = 'GROSS',
  NET = 'NET',
  SEMI_GROSS = 'SEMI_GROSS',
}

export enum BondType {
  BANK_GUARANTEE = 'BANK_GUARANTEE',
  CASH = 'CASH',
  PERSONAL_GUARANTEE = 'PERSONAL_GUARANTEE',
}

export type LeaseOptionTerm = {
  termMonths: number;
  exercised: boolean;
  exerciseByDate: string;
};

@Entity('leases')
export class LeaseEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'property_id' })
  propertyId: string;

  @ManyToOne(() => PropertyEntity, (property) => property.leases)
  @JoinColumn({ name: 'property_id' })
  property: PropertyEntity;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => TenantEntity)
  @JoinColumn({ name: 'tenant_id' })
  tenant: TenantEntity;

  @Column({ type: 'enum', enum: LeaseStatus, default: LeaseStatus.DRAFT })
  status: LeaseStatus;

  @Column({ type: 'date', name: 'commencement_date' })
  commencementDate: string;

  @Column({ type: 'date', name: 'expiry_date' })
  expiryDate: string;

  @Column({ type: 'int', name: 'initial_term_months' })
  initialTermMonths: number;

  @Column({ type: 'jsonb', name: 'option_terms', nullable: true })
  optionTerms: LeaseOptionTerm[];

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'base_rent_annual', transformer: moneyTransformer })
  baseRentAnnual: number;

  @Column({ type: 'enum', enum: RentFrequency, name: 'rent_frequency' })
  rentFrequency: RentFrequency;

  @Column({ type: 'enum', enum: OutgoingsRecoveryType, name: 'outgoings_recovery_type' })
  outgoingsRecoveryType: OutgoingsRecoveryType;

  @Column({ type: 'enum', enum: RentReviewMechanism, name: 'rent_review_mechanism' })
  rentReviewMechanism: RentReviewMechanism;

  @Column({ type: 'numeric', precision: 6, scale: 3, name: 'rent_review_value', nullable: true, transformer: moneyTransformer })
  rentReviewValue: number;

  @Column({ type: 'date', name: 'next_review_date', nullable: true })
  nextReviewDate: string;

  @Column({ type: 'int', name: 'rent_free_period_months', nullable: true })
  rentFreePeriodMonths: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'bond_amount', transformer: moneyTransformer })
  bondAmount: number;

  @Column({ type: 'enum', enum: BondType, name: 'bond_type' })
  bondType: BondType;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => RentReviewEntity, (rentReview) => rentReview.lease)
  rentReviews: RentReviewEntity[];
}
