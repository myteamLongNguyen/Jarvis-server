import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { moneyTransformer } from '../core/utils';
import { LeaseEntity } from './lease.entity';
import { RentReviewMechanism } from './enums/rent-review-mechanism.enum';
import { DocumentEntity } from './document.entity';

export enum RentReviewStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  DISPUTED = 'DISPUTED',
  WAIVED = 'WAIVED',
}

@Entity('rent_reviews')
export class RentReviewEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'lease_id' })
  leaseId: string;

  @ManyToOne(() => LeaseEntity, (lease) => lease.rentReviews)
  @JoinColumn({ name: 'lease_id' })
  lease: LeaseEntity;

  @Column({ type: 'date', name: 'review_date' })
  reviewDate: string;

  @Column({ type: 'enum', enum: RentReviewMechanism, name: 'review_type' })
  reviewType: RentReviewMechanism;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'old_rent_annual', transformer: moneyTransformer })
  oldRentAnnual: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, name: 'new_rent_annual', transformer: moneyTransformer })
  newRentAnnual: number;

  @Column({ type: 'numeric', precision: 6, scale: 3, name: 'percent_change', transformer: moneyTransformer })
  percentChange: number;

  @Column({ type: 'enum', enum: RentReviewStatus, default: RentReviewStatus.SCHEDULED })
  status: RentReviewStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'uuid', name: 'source_document_id', nullable: true })
  sourceDocumentId: string;

  @ManyToOne(() => DocumentEntity, { nullable: true })
  @JoinColumn({ name: 'source_document_id' })
  sourceDocument: DocumentEntity;
}
