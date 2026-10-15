import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsNumber,
  IsInt,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import {
  InvoiceDirection,
  InvoiceType,
  InvoiceStatus,
  InvoiceClassifiedBy,
} from '../entities/invoice.entity';
import { PropertyExpenseCategory } from '../entities/enums/property-expense-category.enum';
import { DateRangeQueryDto, PaginationQueryDto } from './pagination.dto';

export class CreateInvoiceLineItemRequest {
  @ApiProperty()
  @IsInt()
  lineNumber: number;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ enum: PropertyExpenseCategory })
  @IsEnum(PropertyExpenseCategory)
  category: PropertyExpenseCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiProperty()
  @IsNumber()
  unitAmount: number;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty()
  @IsNumber()
  gstAmount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateInvoiceRequest {
  @ApiPropertyOptional({ description: 'Nullable until sorted/classified' })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiProperty({ enum: InvoiceDirection })
  @IsEnum(InvoiceDirection)
  direction: InvoiceDirection;

  @ApiProperty({ enum: InvoiceType })
  @IsEnum(InvoiceType)
  invoiceType: InvoiceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiProperty()
  @IsString()
  issuerName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issuerAbn?: string;

  @ApiProperty()
  @IsDateString()
  issueDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @ApiProperty()
  @IsNumber()
  subtotal: number;

  @ApiProperty()
  @IsNumber()
  gstAmount: number;

  @ApiProperty()
  @IsNumber()
  totalAmount: number;

  @ApiPropertyOptional({ default: 'AUD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sourceDocumentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [CreateInvoiceLineItemRequest] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineItemRequest)
  lineItems?: CreateInvoiceLineItemRequest[];
}

export class UpdateInvoiceRequest extends PartialType(CreateInvoiceRequest) {}

export class ClassifyInvoiceRequest {
  @ApiProperty()
  @IsUUID()
  propertyId: string;

  @ApiProperty({ enum: InvoiceType })
  @IsEnum(InvoiceType)
  invoiceType: InvoiceType;
}

export class PayInvoiceRequest {
  @ApiProperty()
  @IsDateString()
  paidDate: string;

  @ApiProperty()
  @IsNumber()
  paidAmount: number;
}

export class InvoiceQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ enum: InvoiceDirection })
  @IsOptional()
  @IsEnum(InvoiceDirection)
  direction?: InvoiceDirection;
}

export class InvoiceScanLineItem {
  @ApiProperty() lineNumber: number;

  @ApiProperty() description: string;

  @ApiPropertyOptional({ enum: PropertyExpenseCategory }) category?: PropertyExpenseCategory;

  @ApiPropertyOptional() quantity?: number;

  @ApiPropertyOptional() unitAmount?: number;

  @ApiPropertyOptional() amount?: number;

  @ApiPropertyOptional() gstAmount?: number;
}

export class InvoiceScanResponse {
  @ApiPropertyOptional({ description: 'Best-guess property match, based on the address/suburb evidence in the document' })
  propertyId?: string;

  @ApiPropertyOptional()
  propertyName?: string;

  @ApiPropertyOptional({ enum: ['HIGH', 'LOW'], description: 'How confident the match is — always double-check before saving' })
  propertyMatchConfidence?: 'HIGH' | 'LOW';

  @ApiPropertyOptional({ enum: InvoiceDirection })
  direction?: InvoiceDirection;

  @ApiPropertyOptional({ enum: InvoiceType })
  invoiceType?: InvoiceType;

  @ApiPropertyOptional()
  invoiceNumber?: string;

  @ApiPropertyOptional()
  issuerName?: string;

  @ApiPropertyOptional()
  issuerAbn?: string;

  @ApiPropertyOptional({ description: 'Issue date found in the document, ISO format' })
  issueDate?: string;

  @ApiPropertyOptional()
  dueDate?: string;

  @ApiPropertyOptional()
  periodStart?: string;

  @ApiPropertyOptional()
  periodEnd?: string;

  @ApiPropertyOptional()
  subtotal?: number;

  @ApiPropertyOptional()
  gstAmount?: number;

  @ApiPropertyOptional({ description: 'Total payable including GST' })
  totalAmount?: number;

  @ApiPropertyOptional()
  currency?: string;

  @ApiPropertyOptional({ type: [InvoiceScanLineItem], description: 'Only present when the document itemises charges' })
  lineItems?: InvoiceScanLineItem[];

  @ApiPropertyOptional({ description: 'Anything worth double-checking about this extraction' })
  notes?: string;

  @ApiProperty({
    enum: ['AI', 'HEURISTIC'],
    description: 'AI = read by Claude; HEURISTIC = filename/regex fallback, far less complete',
  })
  extractedBy: 'AI' | 'HEURISTIC';
}

export class InvoiceLineItemResponse {
  @ApiProperty() id: string;
  @ApiProperty() invoiceId: string;
  @ApiProperty() lineNumber: number;
  @ApiProperty() description: string;
  @ApiProperty({ enum: PropertyExpenseCategory }) category: PropertyExpenseCategory;
  @ApiPropertyOptional() propertyId?: string;
  @ApiProperty() quantity: number;
  @ApiProperty() unitAmount: number;
  @ApiProperty() amount: number;
  @ApiProperty() gstAmount: number;
  @ApiPropertyOptional() notes?: string;
}

export class InvoiceResponse {
  @ApiProperty() id: string;
  @ApiProperty() ownerId: string;
  @ApiPropertyOptional() propertyId?: string;
  @ApiProperty({ enum: InvoiceDirection }) direction: InvoiceDirection;
  @ApiProperty({ enum: InvoiceType }) invoiceType: InvoiceType;
  @ApiPropertyOptional() invoiceNumber?: string;
  @ApiProperty() issuerName: string;
  @ApiPropertyOptional() issuerAbn?: string;
  @ApiProperty() issueDate: string;
  @ApiPropertyOptional() dueDate?: string;
  @ApiPropertyOptional() periodStart?: string;
  @ApiPropertyOptional() periodEnd?: string;
  @ApiProperty() subtotal: number;
  @ApiProperty() gstAmount: number;
  @ApiProperty() totalAmount: number;
  @ApiProperty() currency: string;
  @ApiProperty({ enum: InvoiceStatus }) status: InvoiceStatus;
  @ApiPropertyOptional() paidDate?: string;
  @ApiPropertyOptional() paidAmount?: number;
  @ApiPropertyOptional() classificationConfidence?: number;
  @ApiPropertyOptional({ enum: InvoiceClassifiedBy }) classifiedBy?: InvoiceClassifiedBy;
  @ApiPropertyOptional() sourceDocumentId?: string;
  @ApiPropertyOptional() notes?: string;
  @ApiPropertyOptional({ type: [InvoiceLineItemResponse] }) lineItems?: InvoiceLineItemResponse[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class CheckInvoiceDuplicateRequest {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiProperty({ enum: InvoiceType })
  @IsEnum(InvoiceType)
  invoiceType: InvoiceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiProperty()
  @IsString()
  issuerName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issuerAbn?: string;

  @ApiProperty()
  @IsDateString()
  issueDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @ApiProperty()
  @IsNumber()
  totalAmount: number;

  @ApiPropertyOptional({ description: 'The file this invoice was read from, when there is one.' })
  @IsOptional()
  @IsUUID()
  sourceDocumentId?: string;

  @ApiPropertyOptional({ description: 'Set when editing, so the invoice does not match itself.' })
  @IsOptional()
  @IsUUID()
  excludeInvoiceId?: string;
}

export class DuplicateMatchResponse {
  @ApiProperty({ description: 'Which rule fired, strongest first.' }) rule: string;
  @ApiProperty({ description: 'Plain words for the person looking at the warning.' }) reason: string;
  @ApiProperty() invoiceId: string;
  @ApiProperty() issuerName: string;
  @ApiPropertyOptional() invoiceNumber?: string;
  @ApiProperty() issueDate: string;
  @ApiProperty() totalAmount: number;
  @ApiProperty() status: string;
}
