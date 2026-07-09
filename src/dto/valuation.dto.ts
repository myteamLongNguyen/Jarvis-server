import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsUUID, IsNumber, IsDateString } from 'class-validator';
import { ValuationType } from '../entities/valuation.entity';
import { PaginationQueryDto } from './pagination.dto';

export class CreateValuationRequest {
  @ApiProperty()
  @IsUUID()
  propertyId: string;

  @ApiProperty()
  @IsDateString()
  valuationDate: string;

  @ApiProperty()
  @IsNumber()
  valuationAmount: number;

  @ApiProperty({ enum: ValuationType })
  @IsEnum(ValuationType)
  valuationType: ValuationType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  valuer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sourceDocumentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateValuationRequest extends PartialType(CreateValuationRequest) {}

export class ValuationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ enum: ValuationType })
  @IsOptional()
  @IsEnum(ValuationType)
  valuationType?: ValuationType;
}

export class ValuationResponse {
  @ApiProperty() id: string;
  @ApiProperty() ownerId: string;
  @ApiProperty() propertyId: string;
  @ApiProperty() valuationDate: string;
  @ApiProperty() valuationAmount: number;
  @ApiProperty({ enum: ValuationType }) valuationType: ValuationType;
  @ApiPropertyOptional() valuer?: string;
  @ApiPropertyOptional() purpose?: string;
  @ApiPropertyOptional() sourceDocumentId?: string;
  @ApiPropertyOptional() notes?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
