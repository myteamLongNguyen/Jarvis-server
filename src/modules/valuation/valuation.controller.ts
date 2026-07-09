import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ValuationService } from './valuation.service';
import {
  CreateValuationRequest,
  UpdateValuationRequest,
  ValuationQueryDto,
  ValuationResponse,
} from '../../dto/valuation.dto';
import { StandardDataResponse, StandardPaginatedResponse, StandardResponse } from '../../dto/standard';
import { AuthUser } from '../../decorators/user.decorator';
import { AuthUserPayload } from '../../types/auth';

@ApiBearerAuth()
@ApiTags('valuations')
@Controller('valuations')
export class ValuationController {
  constructor(private readonly valuationService: ValuationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a valuation' })
  @ApiResponse({ status: 201, type: ValuationResponse })
  async create(
    @Body() req: CreateValuationRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<ValuationResponse>> {
    const data = await this.valuationService.create(req, user.id);
    return { success: true, message: 'Valuation created', data };
  }

  @Get()
  @ApiOperation({ summary: 'List valuations' })
  async findAll(
    @Query() query: ValuationQueryDto,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardPaginatedResponse<ValuationResponse>> {
    return this.valuationService.findAll(query, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a valuation by id' })
  async findOne(
    @Param('id') id: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<ValuationResponse>> {
    const data = await this.valuationService.findOne(id, user.id);
    return { success: true, message: 'Valuation found', data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a valuation' })
  async update(
    @Param('id') id: string,
    @Body() req: UpdateValuationRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<ValuationResponse>> {
    const data = await this.valuationService.update(id, req, user.id);
    return { success: true, message: 'Valuation updated', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a valuation' })
  async remove(
    @Param('id') id: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardResponse> {
    await this.valuationService.remove(id, user.id);
    return { success: true, message: 'Valuation deleted' };
  }
}
