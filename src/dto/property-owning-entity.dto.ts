import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { OwningEntityType } from '../entities/property-owning-entity.entity';
import { PaginationQueryDto } from './pagination.dto';

export class CreateOwningEntityRequest {
  @ApiProperty()
  @IsString()
  @MaxLength(150)
  legalName: string;

  @ApiProperty({ enum: OwningEntityType })
  @IsEnum(OwningEntityType)
  entityType: OwningEntityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  abn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  acn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateOwningEntityRequest extends PartialType(CreateOwningEntityRequest) {}

export class OwningEntityQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: OwningEntityType })
  @IsOptional()
  @IsEnum(OwningEntityType)
  entityType?: OwningEntityType;
}

export class OwningEntityResponse {
  @ApiProperty() id: string;
  @ApiProperty() ownerId: string;
  @ApiProperty() legalName: string;
  @ApiProperty({ enum: OwningEntityType }) entityType: OwningEntityType;
  @ApiPropertyOptional() abn?: string;
  @ApiPropertyOptional() acn?: string;
  @ApiPropertyOptional() notes?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
