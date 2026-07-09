import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsNumber,
  IsInt,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import {
  LeaseStatus,
  RentFrequency,
  OutgoingsRecoveryType,
  RentReviewMechanism,
  BondType,
  LeaseOptionTerm,
} from '../entities/lease.entity';
import { PaginationQueryDto } from './pagination.dto';

export class LeaseOptionTermDto implements LeaseOptionTerm {
  @ApiProperty()
  @IsInt()
  termMonths: number;

  @ApiProperty()
  @IsBoolean()
  exercised: boolean;

  @ApiProperty()
  @IsDateString()
  exerciseByDate: string;
}

export class CreateLeaseRequest {
  @ApiProperty()
  @IsUUID()
  propertyId: string;

  @ApiProperty()
  @IsUUID()
  tenantId: string;

  @ApiPropertyOptional({ enum: LeaseStatus })
  @IsOptional()
  @IsEnum(LeaseStatus)
  status?: LeaseStatus;

  @ApiProperty()
  @IsDateString()
  commencementDate: string;

  @ApiProperty()
  @IsDateString()
  expiryDate: string;

  @ApiProperty()
  @IsInt()
  initialTermMonths: number;

  @ApiPropertyOptional({ type: [LeaseOptionTermDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LeaseOptionTermDto)
  optionTerms?: LeaseOptionTermDto[];

  @ApiProperty()
  @IsNumber()
  baseRentAnnual: number;

  @ApiProperty({ enum: RentFrequency })
  @IsEnum(RentFrequency)
  rentFrequency: RentFrequency;

  @ApiProperty({ enum: OutgoingsRecoveryType })
  @IsEnum(OutgoingsRecoveryType)
  outgoingsRecoveryType: OutgoingsRecoveryType;

  @ApiProperty({ enum: RentReviewMechanism })
  @IsEnum(RentReviewMechanism)
  rentReviewMechanism: RentReviewMechanism;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  rentReviewValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  nextReviewDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  rentFreePeriodMonths?: number;

  @ApiProperty()
  @IsNumber()
  bondAmount: number;

  @ApiProperty({ enum: BondType })
  @IsEnum(BondType)
  bondType: BondType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateLeaseRequest extends PartialType(CreateLeaseRequest) {}

export class LeaseQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ enum: LeaseStatus })
  @IsOptional()
  @IsEnum(LeaseStatus)
  status?: LeaseStatus;
}

export class LeaseResponse {
  @ApiProperty() id: string;
  @ApiProperty() ownerId: string;
  @ApiProperty() propertyId: string;
  @ApiProperty() tenantId: string;
  @ApiProperty({ enum: LeaseStatus }) status: LeaseStatus;
  @ApiProperty() commencementDate: string;
  @ApiProperty() expiryDate: string;
  @ApiProperty() initialTermMonths: number;
  @ApiPropertyOptional({ type: [LeaseOptionTermDto] }) optionTerms?: LeaseOptionTerm[];
  @ApiProperty() baseRentAnnual: number;
  @ApiProperty({ enum: RentFrequency }) rentFrequency: RentFrequency;
  @ApiProperty({ enum: OutgoingsRecoveryType }) outgoingsRecoveryType: OutgoingsRecoveryType;
  @ApiProperty({ enum: RentReviewMechanism }) rentReviewMechanism: RentReviewMechanism;
  @ApiPropertyOptional() rentReviewValue?: number;
  @ApiPropertyOptional() nextReviewDate?: string;
  @ApiPropertyOptional() rentFreePeriodMonths?: number;
  @ApiProperty() bondAmount: number;
  @ApiProperty({ enum: BondType }) bondType: BondType;
  @ApiPropertyOptional() notes?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
