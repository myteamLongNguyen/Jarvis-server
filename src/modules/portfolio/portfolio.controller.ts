import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PortfolioAnalyticsService } from './portfolio-analytics.service';
import {
  AsOfQueryDto,
  PortfolioSummaryQueryDto,
  PortfolioSummaryResponse,
  PropertyRankingItem,
  PropertyRankingQueryDto,
} from '../../dto/portfolio.dto';
import { StandardDataResponse } from '../../dto/standard';
import { AuthUser } from '../../decorators/user.decorator';
import { AuthUserPayload } from '../../types/auth';

@ApiBearerAuth()
@ApiTags('portfolio')
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioAnalyticsService: PortfolioAnalyticsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Portfolio-wide totals across all properties' })
  async getSummary(
    @Query() query: PortfolioSummaryQueryDto,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<PortfolioSummaryResponse>> {
    const data = await this.portfolioAnalyticsService.getPortfolioSummary(user.id, query.includePersonal);
    return { success: true, message: 'Portfolio summary', data };
  }

  @Get('income-by-property')
  @ApiOperation({ summary: 'Properties ranked by net income' })
  async getIncomeByProperty(
    @Query() query: PropertyRankingQueryDto,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<PropertyRankingItem[]>> {
    const data = await this.portfolioAnalyticsService.getIncomeByProperty(
      user.id,
      query.from,
      query.to,
      query.includePersonal,
    );
    return { success: true, message: 'Income by property', data };
  }

  @Get('return-by-property')
  @ApiOperation({ summary: 'Properties ranked by net yield on cost' })
  async getReturnByProperty(
    @Query() query: AsOfQueryDto,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<PropertyRankingItem[]>> {
    const data = await this.portfolioAnalyticsService.getReturnByProperty(user.id, query.asOf, query.includePersonal);
    return { success: true, message: 'Return by property', data };
  }

  @Get('maintenance-by-property')
  @ApiOperation({ summary: 'Properties ranked by maintenance spend' })
  async getMaintenanceByProperty(
    @Query() query: PropertyRankingQueryDto,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<PropertyRankingItem[]>> {
    const data = await this.portfolioAnalyticsService.getMaintenanceByProperty(
      user.id,
      query.from,
      query.to,
      query.includePersonal,
    );
    return { success: true, message: 'Maintenance by property', data };
  }
}
