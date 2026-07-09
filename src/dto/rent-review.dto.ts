import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID, IsNumber, IsDateString, IsString } from 'class-validator';
import { RentReviewMechanism } from '../entities/enums/rent-review-mechanism.enum';
import { RentReviewStatus } from '../entities/rent-review.entity';
import { PaginationQueryDto } from './pagination.dto';

export class CreateRentReviewRequest {
  @ApiProperty()
  @IsUUID()
  leaseId: string;

  @ApiProperty()
  @IsDateString()
  reviewDate: string;

  @ApiProperty({ enum: RentReviewMechanism })
  @IsEnum(RentReviewMechanism)
  reviewType: RentReviewMechanism;

  @ApiProperty()
  @IsNumber()
  oldRentAnnual: number;

  @ApiProperty()
  @IsNumber()
  newRentAnnual: number;

  @ApiProperty()
  @IsNumber()
  percentChange: number;

  @ApiPropertyOptional({ enum: RentReviewStatus })
  @IsOptional()
  @IsEnum(RentReviewStatus)
  status?: RentReviewStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sourceDocumentId?: string;
}

export class UpdateRentReviewRequest extends PartialType(CreateRentReviewRequest) {}

export class RentReviewQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  leaseId?: string;

  @ApiPropertyOptional({ enum: RentReviewStatus })
  @IsOptional()
  @IsEnum(RentReviewStatus)
  status?: RentReviewStatus;
}

export class RentReviewResponse {
  @ApiProperty() id: string;
  @ApiProperty() ownerId: string;
  @ApiProperty() leaseId: string;
  @ApiProperty() reviewDate: string;
  @ApiProperty({ enum: RentReviewMechanism }) reviewType: RentReviewMechanism;
  @ApiProperty() oldRentAnnual: number;
  @ApiProperty() newRentAnnual: number;
  @ApiProperty() percentChange: number;
  @ApiProperty({ enum: RentReviewStatus }) status: RentReviewStatus;
  @ApiPropertyOptional() notes?: string;
  @ApiPropertyOptional() sourceDocumentId?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
