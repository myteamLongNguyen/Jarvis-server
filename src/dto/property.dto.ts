import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsNumber,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { PropertyType, PropertyStatus, PropertyCategory } from '../entities/property.entity';
import { PaginationQueryDto } from './pagination.dto';

export class CreatePropertyRequest {
  @ApiProperty()
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  addressLine1: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  suburb: string;

  @ApiProperty()
  @IsString()
  @MaxLength(50)
  state: string;

  @ApiProperty()
  @IsString()
  @MaxLength(20)
  postcode: string;

  @ApiPropertyOptional({ default: 'AU' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @ApiProperty({ enum: PropertyType })
  @IsEnum(PropertyType)
  propertyType: PropertyType;

  @ApiPropertyOptional({ enum: PropertyStatus })
  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @ApiPropertyOptional({ enum: PropertyCategory, default: PropertyCategory.INVESTMENT })
  @IsOptional()
  @IsEnum(PropertyCategory)
  category?: PropertyCategory;

  @ApiProperty()
  @IsDateString()
  purchaseDate: string;

  @ApiProperty()
  @IsNumber()
  purchasePrice: number;

  @ApiProperty()
  @IsNumber()
  purchaseCosts: number;

  @ApiPropertyOptional({ default: 'AUD' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  purchaseCurrency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  landAreaSqm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  buildingAreaSqm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownedByEntityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  managingAgentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePropertyRequest extends PartialType(CreatePropertyRequest) {}

export class PropertyQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PropertyStatus })
  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @ApiPropertyOptional({ enum: PropertyType })
  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @ApiPropertyOptional({ enum: PropertyCategory })
  @IsOptional()
  @IsEnum(PropertyCategory)
  category?: PropertyCategory;

  @ApiPropertyOptional({ description: 'Search by property name' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class PropertyResponse {
  @ApiProperty() id: string;
  @ApiProperty() ownerId: string;
  @ApiProperty() name: string;
  @ApiProperty() addressLine1: string;
  @ApiPropertyOptional() addressLine2?: string;
  @ApiProperty() suburb: string;
  @ApiProperty() state: string;
  @ApiProperty() postcode: string;
  @ApiProperty() country: string;
  @ApiProperty({ enum: PropertyType }) propertyType: PropertyType;
  @ApiProperty({ enum: PropertyStatus }) status: PropertyStatus;
  @ApiProperty({ enum: PropertyCategory }) category: PropertyCategory;
  @ApiProperty() purchaseDate: string;
  @ApiProperty() purchasePrice: number;
  @ApiProperty() purchaseCosts: number;
  @ApiProperty() purchaseCurrency: string;
  @ApiPropertyOptional() landAreaSqm?: number;
  @ApiPropertyOptional() buildingAreaSqm?: number;
  @ApiPropertyOptional() ownedByEntityId?: string;
  @ApiPropertyOptional() managingAgentId?: string;
  @ApiPropertyOptional() notes?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
