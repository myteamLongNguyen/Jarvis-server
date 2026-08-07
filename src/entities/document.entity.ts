import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { PropertyEntity } from './property.entity';

export enum DocumentType {
  LEASE = 'LEASE',
  LEASE_VARIATION = 'LEASE_VARIATION',
  RENT_REVIEW_NOTICE = 'RENT_REVIEW_NOTICE',
  INVOICE = 'INVOICE',
  PROPERTY_STATEMENT = 'PROPERTY_STATEMENT',
  COMMISSION_INVOICE = 'COMMISSION_INVOICE',
  VALUATION = 'VALUATION',
  PHOTO = 'PHOTO',
  SITE_PLAN = 'SITE_PLAN',
  COMPLIANCE_CERT = 'COMPLIANCE_CERT',
  INSURANCE_POLICY = 'INSURANCE_POLICY',
  RATES_NOTICE = 'RATES_NOTICE',
  CORRESPONDENCE = 'CORRESPONDENCE',
  OTHER = 'OTHER',
}

export enum DocumentIngestionStatus {
  PENDING = 'PENDING',
  INGESTED = 'INGESTED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export enum DocumentClassificationStatus {
  UNCLASSIFIED = 'UNCLASSIFIED',
  AUTO_CLASSIFIED = 'AUTO_CLASSIFIED',
  USER_CONFIRMED = 'USER_CONFIRMED',
}

export enum StorageProvider {
  GOOGLE_DRIVE = 'GOOGLE_DRIVE',
  SUPABASE = 'SUPABASE',
}

@Entity('documents')
export class DocumentEntity extends BaseEntity {
  @Column({ type: 'uuid', name: 'property_id', nullable: true })
  propertyId: string;

  @ManyToOne(() => PropertyEntity, (property) => property.documents, { nullable: true })
  @JoinColumn({ name: 'property_id' })
  property: PropertyEntity;

  @Column({ type: 'enum', enum: DocumentType, name: 'document_type' })
  documentType: DocumentType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date', name: 'document_date' })
  documentDate: string;

  @Column({ type: 'enum', enum: StorageProvider, name: 'storage_provider', default: StorageProvider.SUPABASE })
  storageProvider: StorageProvider;

  @Column({ type: 'varchar', length: 1000, name: 'storage_path', nullable: true })
  storagePath: string;

  @Column({ type: 'varchar', length: 255, name: 'google_drive_file_id', unique: true, nullable: true })
  googleDriveFileId: string;

  @Column({ type: 'varchar', length: 500, name: 'google_drive_folder_path', nullable: true })
  googleDriveFolderPath: string;

  @Column({ type: 'varchar', length: 150, name: 'mime_type', nullable: true })
  mimeType: string;

  @Column({ type: 'bigint', name: 'file_size_bytes', nullable: true })
  fileSizeBytes: number;

  @Column({ type: 'varchar', length: 64, name: 'checksum_sha256', nullable: true })
  checksumSha256: string;

  @Column({ type: 'enum', enum: DocumentIngestionStatus, name: 'ingestion_status', default: DocumentIngestionStatus.PENDING })
  ingestionStatus: DocumentIngestionStatus;

  @Column({ type: 'enum', enum: DocumentClassificationStatus, name: 'classification_status', default: DocumentClassificationStatus.UNCLASSIFIED })
  classificationStatus: DocumentClassificationStatus;

  @Column({ type: 'timestamptz', name: 'ingested_at', nullable: true })
  ingestedAt: Date;

  @Column({ type: 'timestamptz', name: 'classified_at', nullable: true })
  classifiedAt: Date;
}
