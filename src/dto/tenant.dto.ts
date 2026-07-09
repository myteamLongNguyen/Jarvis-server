import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsEmail, MaxLength } from 'class-validator';
import { TenantEntityType } from '../entities/tenant.entity';
import { PaginationQueryDto } from './pagination.dto';

export class CreateTenantRequest {
  @ApiProperty()
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiProperty({ enum: TenantEntityType })
  @IsEnum(TenantEntityType)
  entityType: TenantEntityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  abn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  contactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateTenantRequest extends PartialType(CreateTenantRequest) {}

export class TenantQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TenantEntityType })
  @IsOptional()
  @IsEnum(TenantEntityType)
  entityType?: TenantEntityType;

  @ApiPropertyOptional({ description: 'Search by tenant name' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class TenantResponse {
  @ApiProperty() id: string;
  @ApiProperty() ownerId: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: TenantEntityType }) entityType: TenantEntityType;
  @ApiPropertyOptional() abn?: string;
  @ApiPropertyOptional() contactName?: string;
  @ApiPropertyOptional() email?: string;
  @ApiPropertyOptional() phone?: string;
  @ApiPropertyOptional() notes?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
