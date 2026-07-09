import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { PropertyExpenseCategory } from '../entities/enums/property-expense-category.enum';
import { DateRangeQueryDto } from './pagination.dto';

export class CreatePropertyExpenseRequest {
  @ApiProperty()
  @IsUUID()
  propertyId: string;

  @ApiProperty()
  @IsDateString()
  expenseDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @ApiProperty({ enum: PropertyExpenseCategory })
  @IsEnum(PropertyExpenseCategory)
  category: PropertyExpenseCategory;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  gstAmount?: number;

  @ApiPropertyOptional({ default: 'AUD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  recoverableFromTenant?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  recoveredAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  paidDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sourceInvoiceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sourceInvoiceLineItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sourceDocumentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePropertyExpenseRequest extends PartialType(CreatePropertyExpenseRequest) {}

export class PropertyExpenseQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ enum: PropertyExpenseCategory })
  @IsOptional()
  @IsEnum(PropertyExpenseCategory)
  category?: PropertyExpenseCategory;

  @ApiPropertyOptional({ enum: ['month', 'category'] })
  @IsOptional()
  @IsString()
  groupBy?: 'month' | 'category';
}

export class PropertyExpenseResponse {
  @ApiProperty() id: string;
  @ApiProperty() ownerId: string;
  @ApiProperty() propertyId: string;
  @ApiProperty() expenseDate: string;
  @ApiPropertyOptional() periodStart?: string;
  @ApiPropertyOptional() periodEnd?: string;
  @ApiProperty({ enum: PropertyExpenseCategory }) category: PropertyExpenseCategory;
  @ApiProperty() description: string;
  @ApiProperty() amount: number;
  @ApiProperty() gstAmount: number;
  @ApiProperty() currency: string;
  @ApiProperty() recoverableFromTenant: boolean;
  @ApiProperty() recoveredAmount: number;
  @ApiPropertyOptional() paidDate?: string;
  @ApiPropertyOptional() sourceInvoiceId?: string;
  @ApiPropertyOptional() sourceInvoiceLineItemId?: string;
  @ApiPropertyOptional() sourceDocumentId?: string;
  @ApiPropertyOptional() notes?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
