import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum ReminderCategory {
  LEASE_EXPIRY = 'LEASE_EXPIRY',
  RENT_REVIEW = 'RENT_REVIEW',
  COMPLIANCE_RENEWAL = 'COMPLIANCE_RENEWAL',
  UNPAID_RENTAL = 'UNPAID_RENTAL',
}

export enum ReminderSeverity {
  OVERDUE = 'OVERDUE',
  DUE_SOON = 'DUE_SOON',
}

export class ReminderQueryDto {
  @ApiPropertyOptional({
    description: 'How many days ahead of today to look for upcoming (not-yet-overdue) items. Overdue items are always included.',
    default: 60,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  windowDays?: number;
}

export class ReminderItem {
  @ApiProperty() id: string;
  @ApiProperty({ enum: ReminderCategory }) category: ReminderCategory;
  @ApiProperty({ enum: ReminderSeverity }) severity: ReminderSeverity;
  @ApiProperty() title: string;
  @ApiProperty() detail: string;
  @ApiPropertyOptional() dueDate?: string;
  @ApiPropertyOptional() propertyId?: string;
  @ApiPropertyOptional() propertyName?: string;
  @ApiPropertyOptional() entityId?: string;
  @ApiPropertyOptional() amount?: number;
  @ApiPropertyOptional({
    description:
      'Set only on the earliest shown period of a lease with a longer backlog: how many further, even-earlier missing periods exist beyond the ones returned here (truncated for display). A non-zero value means the true backlog is larger than the items list suggests.',
  })
  hiddenEarlierCount?: number;
}

export class ReminderCounts {
  @ApiProperty() leaseExpiries: number;
  @ApiProperty() rentReviews: number;
  @ApiProperty() complianceRenewals: number;
  @ApiProperty() unpaidRental: number;
  @ApiProperty() overdueTotal: number;
}

export class ReminderSummaryResponse {
  @ApiProperty() asOf: string;
  @ApiProperty() windowDays: number;
  @ApiProperty() counts: ReminderCounts;
  @ApiProperty({ type: [ReminderItem] }) items: ReminderItem[];
}
