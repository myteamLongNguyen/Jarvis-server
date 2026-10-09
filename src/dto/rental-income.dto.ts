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

/**
 * The rent roll answers one question per property per month: did the rent for
 * this month come in, and if not, how far along is it. A property with no record
 * at all for the month is the most important row on the page, so it gets its own
 * status rather than being left out.
 */
export const RENT_ROLL_MISSING = 'MISSING' as const;
export type RentRollStatus = RentalIncomeStatus | typeof RENT_ROLL_MISSING;

export class RentRollQueryDto {
  @ApiPropertyOptional({ description: 'Month to report on, as YYYY-MM. Defaults to the current month.' })
  @IsOptional()
  @IsString()
  month?: string;

  @ApiPropertyOptional({ description: 'Include personal (non-investment) properties.' })
  @IsOptional()
  includePersonal?: boolean;
}

export class RentRollRow {
  @ApiProperty() propertyId: string;
  @ApiProperty() propertyName: string;
  @ApiProperty({ description: 'Null when nothing has been recorded for this month yet.', nullable: true })
  rentalIncomeId: string | null;
  @ApiProperty({ enum: [...Object.values(RentalIncomeStatus), RENT_ROLL_MISSING] }) status: RentRollStatus;
  @ApiProperty() grossAmount: number;
  @ApiProperty() netAmount: number;
  @ApiProperty() amountReceived: number;
  @ApiProperty({ description: 'Net still to come in. Zero once the money has landed.' })
  outstanding: number;
  @ApiPropertyOptional() periodStart?: string;
  @ApiPropertyOptional() periodEnd?: string;
  @ApiPropertyOptional() receivedDate?: string;
  @ApiProperty() agentCommission: number;
  @ApiProperty({ description: 'True when paperwork backs this month: a linked invoice, or a statement filed for it.' })
  hasDocument: boolean;
  @ApiPropertyOptional() invoiceId?: string;
  @ApiPropertyOptional() invoiceNumber?: string;
  @ApiPropertyOptional({ description: 'A filed statement or invoice dated inside the month, when one exists.' })
  documentId?: string;
  @ApiProperty({ description: 'Worked out from a longer statement rather than filed for this month.' })
  apportioned: boolean;
  @ApiProperty({ description: 'How many records make up this row. Above one when a property bills per unit.' })
  recordCount: number;
  @ApiPropertyOptional({ description: 'What the lease says this month should be, when a lease is on file.' })
  expectedFromLease?: number;
}

export class RentRollTotals {
  @ApiProperty() expected: number;
  @ApiProperty() received: number;
  @ApiProperty() outstanding: number;
  @ApiProperty() propertiesTotal: number;
  @ApiProperty() propertiesReceived: number;
  @ApiProperty() propertiesMissing: number;
}

export class RentRollResponse {
  @ApiProperty({ description: 'The month reported on, as YYYY-MM.' }) month: string;
  @ApiProperty() periodStart: string;
  @ApiProperty() periodEnd: string;
  @ApiProperty({ type: RentRollTotals }) totals: RentRollTotals;
  @ApiProperty({ type: [RentRollRow] }) rows: RentRollRow[];
}
