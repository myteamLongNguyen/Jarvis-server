import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsUUID, IsNumber, IsDateString } from 'class-validator';
import { MaintenanceCategory } from '../entities/maintenance-record.entity';
import { DateRangeQueryDto } from './pagination.dto';

export class CreateMaintenanceRecordRequest {
  @ApiProperty()
  @IsUUID()
  propertyId: string;

  @ApiProperty()
  @IsDateString()
  serviceDate: string;

  @ApiProperty({ enum: MaintenanceCategory })
  @IsEnum(MaintenanceCategory)
  category: MaintenanceCategory;

  @ApiProperty()
  @IsString()
  vendor: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNumber()
  cost: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  gstAmount?: number;

  @ApiPropertyOptional({ default: 'AUD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  nextServiceDueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sourceInvoiceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sourceExpenseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sourceDocumentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateMaintenanceRecordRequest extends PartialType(CreateMaintenanceRecordRequest) {}

export class MaintenanceRecordQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ enum: MaintenanceCategory })
  @IsOptional()
  @IsEnum(MaintenanceCategory)
  category?: MaintenanceCategory;
}

export class MaintenanceRecordResponse {
  @ApiProperty() id: string;
  @ApiProperty() ownerId: string;
  @ApiProperty() propertyId: string;
  @ApiProperty() serviceDate: string;
  @ApiProperty({ enum: MaintenanceCategory }) category: MaintenanceCategory;
  @ApiProperty() vendor: string;
  @ApiProperty() description: string;
  @ApiProperty() cost: number;
  @ApiProperty() gstAmount: number;
  @ApiProperty() currency: string;
  @ApiPropertyOptional() nextServiceDueDate?: string;
  @ApiPropertyOptional() sourceInvoiceId?: string;
  @ApiPropertyOptional() sourceExpenseId?: string;
  @ApiPropertyOptional() sourceDocumentId?: string;
  @ApiPropertyOptional() notes?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
