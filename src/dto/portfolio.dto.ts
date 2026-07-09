import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';
import { DateRangeQueryDto } from './pagination.dto';

export class AsOfQueryDto {
  @ApiPropertyOptional({ description: 'Defaults to today' })
  @IsOptional()
  @IsDateString()
  asOf?: string;
}

export class ReturnResponse {
  @ApiProperty() grossYieldOnCost: number;
  @ApiProperty() netYieldOnCost: number;
  @ApiProperty() grossYieldOnCurrentValuation: number;
  @ApiProperty() netYieldOnCurrentValuation: number;
  @ApiProperty() cashOnCashReturn: number;
  @ApiProperty() totalReturnSincePurchase: number;
}

export class PropertySummaryResponse {
  @ApiProperty() property: any;
  @ApiProperty() activeLeases: number;
  @ApiProperty() currentAnnualRent: number;
  @ApiProperty() ytdGrossIncome: number;
  @ApiProperty() ytdNetIncome: number;
  @ApiProperty() ytdMaintenance: number;
  @ApiPropertyOptional() lastValuation?: number;
  @ApiProperty() yieldOnCost: number;
  @ApiPropertyOptional() yieldOnValuation?: number;
  @ApiProperty() unpaidInvoicesTotal: number;
  @ApiPropertyOptional() nextRentReview?: string;
  @ApiProperty() expiringLeases: number;
}

export class PortfolioSummaryResponse {
  @ApiProperty() propertyCount: number;
  @ApiProperty() portfolioValue: number;
  @ApiProperty() ytdGrossIncome: number;
  @ApiProperty() ytdNetIncome: number;
  @ApiProperty() ytdMaintenance: number;
  @ApiProperty() blendedYieldOnCost: number;
  @ApiProperty() blendedYieldOnValuation: number;
  @ApiProperty() unpaidInvoicesTotal: number;
  @ApiProperty() overdueInvoicesCount: number;
}

export class PropertyRankingQueryDto extends DateRangeQueryDto {}

export class PropertyRankingItem {
  @ApiProperty() propertyId: string;
  @ApiProperty() propertyName: string;
  @ApiProperty() value: number;
}
