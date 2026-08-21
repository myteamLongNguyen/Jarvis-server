import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsUUID, IsNumber, IsDateString } from 'class-validator';
import { DepreciationMethod } from '../entities/depreciation-schedule.entity';
import { PaginationQueryDto } from './pagination.dto';

export class CreateDepreciationScheduleRequest {
  @ApiProperty()
  @IsUUID()
  propertyId: string;

  @ApiProperty()
  @IsDateString()
  financialYearStart: string;

  @ApiProperty()
  @IsDateString()
  financialYearEnd: string;

  @ApiProperty({ enum: DepreciationMethod })
  @IsEnum(DepreciationMethod)
  method: DepreciationMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  division40Amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  division43Amount?: number;

  @ApiProperty()
  @IsNumber()
  totalAmount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sourceDocumentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDepreciationScheduleRequest extends PartialType(CreateDepreciationScheduleRequest) {}

export class DepreciationScheduleQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ enum: DepreciationMethod })
  @IsOptional()
  @IsEnum(DepreciationMethod)
  method?: DepreciationMethod;
}

export class DepreciationScheduleResponse {
  @ApiProperty() id: string;
  @ApiProperty() ownerId: string;
  @ApiProperty() propertyId: string;
  @ApiProperty() financialYearStart: string;
  @ApiProperty() financialYearEnd: string;
  @ApiProperty({ enum: DepreciationMethod }) method: DepreciationMethod;
  @ApiPropertyOptional() division40Amount?: number;
  @ApiPropertyOptional() division43Amount?: number;
  @ApiProperty() totalAmount: number;
  @ApiPropertyOptional() sourceDocumentId?: string;
  @ApiPropertyOptional() notes?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
