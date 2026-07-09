import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsNumber, IsDateString, IsString } from 'class-validator';
import { PaginationQueryDto } from './pagination.dto';

export class CreatePropertyStatementRequest {
  @ApiProperty()
  @IsUUID()
  propertyId: string;

  @ApiProperty()
  @IsUUID()
  managingAgentId: string;

  @ApiProperty()
  @IsDateString()
  statementDate: string;

  @ApiProperty()
  @IsDateString()
  periodStart: string;

  @ApiProperty()
  @IsDateString()
  periodEnd: string;

  @ApiProperty()
  @IsNumber()
  grossIncome: number;

  @ApiProperty()
  @IsNumber()
  totalExpenses: number;

  @ApiProperty()
  @IsNumber()
  netToOwner: number;

  @ApiProperty()
  @IsNumber()
  openingBalance: number;

  @ApiProperty()
  @IsNumber()
  closingBalance: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sourceInvoiceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sourceDocumentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePropertyStatementRequest extends PartialType(CreatePropertyStatementRequest) {}

export class PropertyStatementQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  propertyId?: string;
}

export class PropertyStatementResponse {
  @ApiProperty() id: string;
  @ApiProperty() ownerId: string;
  @ApiProperty() propertyId: string;
  @ApiProperty() managingAgentId: string;
  @ApiProperty() statementDate: string;
  @ApiProperty() periodStart: string;
  @ApiProperty() periodEnd: string;
  @ApiProperty() grossIncome: number;
  @ApiProperty() totalExpenses: number;
  @ApiProperty() netToOwner: number;
  @ApiProperty() openingBalance: number;
  @ApiProperty() closingBalance: number;
  @ApiPropertyOptional() sourceInvoiceId?: string;
  @ApiPropertyOptional() sourceDocumentId?: string;
  @ApiPropertyOptional() notes?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
