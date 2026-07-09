import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID, IsNumber, IsDateString, IsString } from 'class-validator';
import { RentalIncomeStatus } from '../entities/rental-income.entity';
import { DateRangeQueryDto } from './pagination.dto';

export class CreateRentalIncomeRequest {
  @ApiProperty()
  @IsUUID()
  propertyId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  leaseId?: string;

  @ApiProperty()
  @IsDateString()
  periodStart: string;

  @ApiProperty()
  @IsDateString()
  periodEnd: string;

  @ApiProperty()
  @IsNumber()
  grossAmount: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  outgoingsReimbursed?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  gstAmount?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  agentCommission?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  otherDeductions?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  amountReceived?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  receivedDate?: string;

  @ApiPropertyOptional({ enum: RentalIncomeStatus })
  @IsOptional()
  @IsEnum(RentalIncomeStatus)
  status?: RentalIncomeStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sourceInvoiceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sourceStatementId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateRentalIncomeRequest extends PartialType(CreateRentalIncomeRequest) {}

export class RentalIncomeQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ enum: RentalIncomeStatus })
  @IsOptional()
  @IsEnum(RentalIncomeStatus)
  status?: RentalIncomeStatus;

  @ApiPropertyOptional({ enum: ['month', 'quarter', 'year'] })
  @IsOptional()
  @IsString()
  groupBy?: 'month' | 'quarter' | 'year';
}

export class RentalIncomeResponse {
  @ApiProperty() id: string;
  @ApiProperty() ownerId: string;
  @ApiProperty() propertyId: string;
  @ApiPropertyOptional() leaseId?: string;
  @ApiProperty() periodStart: string;
  @ApiProperty() periodEnd: string;
  @ApiProperty() grossAmount: number;
  @ApiProperty() outgoingsReimbursed: number;
  @ApiProperty() gstAmount: number;
  @ApiProperty() agentCommission: number;
  @ApiProperty() otherDeductions: number;
  @ApiProperty() netAmount: number;
  @ApiPropertyOptional() amountReceived?: number;
  @ApiPropertyOptional() receivedDate?: string;
  @ApiProperty({ enum: RentalIncomeStatus }) status: RentalIncomeStatus;
  @ApiPropertyOptional() sourceInvoiceId?: string;
  @ApiPropertyOptional() sourceStatementId?: string;
  @ApiPropertyOptional() notes?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
