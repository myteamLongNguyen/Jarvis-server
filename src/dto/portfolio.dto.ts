import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { DateRangeQueryDto } from './pagination.dto';

const toBoolean = ({ value }: { value: unknown }) => value === 'true' || value === true;

export class AsOfQueryDto {
  @ApiPropertyOptional({ description: 'Defaults to today' })
  @IsOptional()
  @IsDateString()
  asOf?: string;

  @ApiPropertyOptional({ description: 'Include PERSONAL-category properties (excluded by default)', default: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  includePersonal?: boolean;
}

export class PortfolioSummaryQueryDto {
  @ApiPropertyOptional({ description: 'Include PERSONAL-category properties (excluded by default)', default: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  includePersonal?: boolean;
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

export class PropertyRankingQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({ description: 'Include PERSONAL-category properties (excluded by default)', default: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  includePersonal?: boolean;
}

export class PropertyRankingItem {
  @ApiProperty() propertyId: string;
  @ApiProperty() propertyName: string;
  @ApiProperty() value: number;
}

export class FinancialYearReportQueryDto {
  @ApiPropertyOptional({ description: 'e.g. "2025-2026" for FY2025-26. Defaults to the current Australian financial year.' })
  @IsOptional()
  fy?: string;

  @ApiPropertyOptional({ description: 'Include PERSONAL-category properties (excluded by default)', default: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  includePersonal?: boolean;
}

export class PropertyFinancialYearLine {
  @ApiProperty() propertyId: string;
  @ApiProperty() propertyName: string;
  @ApiProperty() grossIncome: number;
  @ApiProperty() netIncome: number;
  @ApiProperty() expensesTotal: number;
  @ApiPropertyOptional() depreciationDiminishingValue?: number;
  @ApiPropertyOptional() depreciationPrimeCost?: number;
  @ApiPropertyOptional() openingValuation?: number;
  @ApiPropertyOptional() closingValuation?: number;
}

export class FinancialYearReportTotals {
  @ApiProperty() grossIncome: number;
  @ApiProperty() netIncome: number;
  @ApiProperty() expensesTotal: number;
  @ApiProperty() depreciationDiminishingValue: number;
  @ApiProperty() depreciationPrimeCost: number;
}

export class FinancialYearReportResponse {
  @ApiProperty() financialYearLabel: string;
  @ApiProperty() periodStart: string;
  @ApiProperty() periodEnd: string;
  @ApiProperty({ type: [PropertyFinancialYearLine] }) properties: PropertyFinancialYearLine[];
  @ApiProperty() totals: FinancialYearReportTotals;
}
