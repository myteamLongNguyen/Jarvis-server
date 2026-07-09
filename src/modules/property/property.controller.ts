import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PropertyService } from './property.service';
import { PropertyAnalyticsService } from './property-analytics.service';
import {
  CreatePropertyRequest,
  UpdatePropertyRequest,
  PropertyQueryDto,
  PropertyResponse,
} from '../../dto/property.dto';
import { StandardDataResponse, StandardPaginatedResponse, StandardResponse } from '../../dto/standard';
import { DateRangeQueryDto } from '../../dto/pagination.dto';
import { AsOfQueryDto, PropertySummaryResponse, ReturnResponse } from '../../dto/portfolio.dto';
import { InvoiceQueryDto, InvoiceResponse } from '../../dto/invoice.dto';
import { AuthUser } from '../../decorators/user.decorator';
import { AuthUserPayload } from '../../types/auth';

@ApiBearerAuth()
@ApiTags('properties')
@Controller('properties')
export class PropertyController {
  constructor(
    private readonly propertyService: PropertyService,
    private readonly propertyAnalyticsService: PropertyAnalyticsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a property' })
  @ApiResponse({ status: 201, type: PropertyResponse })
  async create(
    @Body() req: CreatePropertyRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<PropertyResponse>> {
    const data = await this.propertyService.create(req, user.id);
    return { success: true, message: 'Property created', data };
  }

  @Get()
  @ApiOperation({ summary: 'List properties' })
  async findAll(
    @Query() query: PropertyQueryDto,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardPaginatedResponse<PropertyResponse>> {
    return this.propertyService.findAll(query, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a property by id' })
  async findOne(
    @Param('id') id: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<PropertyResponse>> {
    const data = await this.propertyService.findOne(id, user.id);
    return { success: true, message: 'Property found', data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a property' })
  async update(
    @Param('id') id: string,
    @Body() req: UpdatePropertyRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<PropertyResponse>> {
    const data = await this.propertyService.update(id, req, user.id);
    return { success: true, message: 'Property updated', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a property' })
  async remove(
    @Param('id') id: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardResponse> {
    await this.propertyService.remove(id, user.id);
    return { success: true, message: 'Property deleted' };
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Per-property snapshot for the AI query surface' })
  async getSummary(
    @Param('id') id: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<PropertySummaryResponse>> {
    const data = await this.propertyAnalyticsService.getSummary(id, user.id);
    return { success: true, message: 'Property summary', data };
  }

  @Get(':id/income')
  @ApiOperation({ summary: 'Rental income time-series for a property' })
  async getIncome(
    @Param('id') id: string,
    @Query() query: DateRangeQueryDto & { groupBy?: 'month' | 'quarter' | 'year' },
    @AuthUser() user: AuthUserPayload,
  ) {
    const data = await this.propertyAnalyticsService.getIncomeTimeSeries(
      id,
      user.id,
      query.from,
      query.to,
      query.groupBy,
    );
    return { success: true, message: 'Income time-series', data };
  }

  @Get(':id/expenses')
  @ApiOperation({ summary: 'Property expenses grouped by month or category' })
  async getExpenses(
    @Param('id') id: string,
    @Query() query: DateRangeQueryDto & { groupBy?: 'month' | 'category' },
    @AuthUser() user: AuthUserPayload,
  ) {
    const data = await this.propertyAnalyticsService.getExpensesGrouped(
      id,
      user.id,
      query.from,
      query.to,
      query.groupBy,
    );
    return { success: true, message: 'Expenses grouped', data };
  }

  @Get(':id/maintenance')
  @ApiOperation({ summary: 'Maintenance records and total spend for a property' })
  async getMaintenance(
    @Param('id') id: string,
    @Query() query: DateRangeQueryDto,
    @AuthUser() user: AuthUserPayload,
  ) {
    const data = await this.propertyAnalyticsService.getMaintenance(id, user.id, query.from, query.to);
    return { success: true, message: 'Maintenance summary', data };
  }

  @Get(':id/return')
  @ApiOperation({ summary: 'Yield/ROI calculations for a property' })
  async getReturn(
    @Param('id') id: string,
    @Query() query: AsOfQueryDto,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<ReturnResponse>> {
    const data = await this.propertyAnalyticsService.getReturn(id, user.id, query.asOf);
    return { success: true, message: 'Property return', data };
  }

  @Get(':id/invoices')
  @ApiOperation({ summary: 'Paginated invoices for a property' })
  async getInvoices(
    @Param('id') id: string,
    @Query() query: InvoiceQueryDto,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardPaginatedResponse<InvoiceResponse>> {
    return this.propertyAnalyticsService.getInvoices(id, user.id, query);
  }
}
