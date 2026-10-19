import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsUUID, IsInt, IsDateString } from 'class-validator';
import {
  DocumentArea,
  DocumentType,
  DocumentIngestionStatus,
  DocumentClassificationStatus,
} from '../entities/document.entity';
import { PaginationQueryDto } from './pagination.dto';

export class CreateDocumentRequest {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsDateString()
  documentDate: string;

  @ApiPropertyOptional({ description: 'Renewal/expiry date, e.g. for INSURANCE_POLICY or COMPLIANCE_CERT documents' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiProperty()
  @IsString()
  googleDriveFileId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  googleDriveFolderPath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  fileSizeBytes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checksumSha256?: string;

  @ApiPropertyOptional({ enum: DocumentIngestionStatus })
  @IsOptional()
  @IsEnum(DocumentIngestionStatus)
  ingestionStatus?: DocumentIngestionStatus;

  @ApiPropertyOptional({ enum: DocumentClassificationStatus })
  @IsOptional()
  @IsEnum(DocumentClassificationStatus)
  classificationStatus?: DocumentClassificationStatus;
}

export class UpdateDocumentRequest extends PartialType(CreateDocumentRequest) {}

export class UploadDocumentRequest {
  @ApiPropertyOptional({ enum: DocumentArea, description: 'Which app the document belongs to. Defaults to PROPERTIES.' })
  @IsOptional()
  @IsEnum(DocumentArea)
  area?: DocumentArea;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsDateString()
  documentDate: string;

  @ApiPropertyOptional({ description: 'Renewal/expiry date, e.g. for INSURANCE_POLICY or COMPLIANCE_CERT documents' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class DocumentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: DocumentArea, description: 'Which app the document belongs to. Defaults to PROPERTIES.' })
  @IsOptional()
  @IsEnum(DocumentArea)
  area?: DocumentArea;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ enum: DocumentType })
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @ApiPropertyOptional({ enum: DocumentClassificationStatus })
  @IsOptional()
  @IsEnum(DocumentClassificationStatus)
  classificationStatus?: DocumentClassificationStatus;
}

export class DocumentResponse {
  @ApiProperty() id: string;
  @ApiProperty() ownerId: string;
  @ApiProperty({ enum: DocumentArea }) area: DocumentArea;
  @ApiPropertyOptional() propertyId?: string;
  @ApiProperty({ enum: DocumentType }) documentType: DocumentType;
  @ApiProperty() title: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty() documentDate: string;
  @ApiPropertyOptional() expiryDate?: string;
  @ApiPropertyOptional() googleDriveFileId?: string;
  @ApiPropertyOptional() googleDriveFolderPath?: string;
  @ApiPropertyOptional() mimeType?: string;
  @ApiPropertyOptional() fileSizeBytes?: number;
  @ApiPropertyOptional() checksumSha256?: string;
  @ApiProperty({ enum: DocumentIngestionStatus }) ingestionStatus: DocumentIngestionStatus;
  @ApiProperty({ enum: DocumentClassificationStatus }) classificationStatus: DocumentClassificationStatus;
  @ApiPropertyOptional() ingestedAt?: Date;
  @ApiPropertyOptional() classifiedAt?: Date;
  @ApiPropertyOptional() url?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
