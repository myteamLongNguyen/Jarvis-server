import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PropertyExpenseService } from './property-expense.service';
import {
  CreatePropertyExpenseRequest,
  UpdatePropertyExpenseRequest,
  PropertyExpenseQueryDto,
  PropertyExpenseResponse,
} from '../../dto/property-expense.dto';
import { StandardDataResponse, StandardPaginatedResponse, StandardResponse } from '../../dto/standard';
import { AuthUser } from '../../decorators/user.decorator';
import { AuthUserPayload } from '../../types/auth';

@ApiBearerAuth()
@ApiTags('property-expenses')
@Controller('property-expenses')
export class PropertyExpenseController {
  constructor(private readonly propertyExpenseService: PropertyExpenseService) {}

  @Post()
  @ApiOperation({ summary: 'Create a property expense' })
  @ApiResponse({ status: 201, type: PropertyExpenseResponse })
  async create(
    @Body() req: CreatePropertyExpenseRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<PropertyExpenseResponse>> {
    const data = await this.propertyExpenseService.create(req, user.id);
    return { success: true, message: 'Property expense created', data };
  }

  @Get()
  @ApiOperation({ summary: 'List property expenses' })
  async findAll(
    @Query() query: PropertyExpenseQueryDto,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardPaginatedResponse<PropertyExpenseResponse>> {
    return this.propertyExpenseService.findAll(query, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a property expense by id' })
  async findOne(
    @Param('id') id: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<PropertyExpenseResponse>> {
    const data = await this.propertyExpenseService.findOne(id, user.id);
    return { success: true, message: 'Property expense found', data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a property expense' })
  async update(
    @Param('id') id: string,
    @Body() req: UpdatePropertyExpenseRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<PropertyExpenseResponse>> {
    const data = await this.propertyExpenseService.update(id, req, user.id);
    return { success: true, message: 'Property expense updated', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a property expense' })
  async remove(
    @Param('id') id: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardResponse> {
    await this.propertyExpenseService.remove(id, user.id);
    return { success: true, message: 'Property expense deleted' };
  }
}
