import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PropertyStatementService } from './property-statement.service';
import {
  CreatePropertyStatementRequest,
  UpdatePropertyStatementRequest,
  PropertyStatementQueryDto,
  PropertyStatementResponse,
} from '../../dto/property-statement.dto';
import { StandardDataResponse, StandardPaginatedResponse, StandardResponse } from '../../dto/standard';
import { AuthUser } from '../../decorators/user.decorator';
import { AuthUserPayload } from '../../types/auth';

@ApiBearerAuth()
@ApiTags('property-statements')
@Controller('property-statements')
export class PropertyStatementController {
  constructor(private readonly propertyStatementService: PropertyStatementService) {}

  @Post()
  @ApiOperation({ summary: 'Create a property statement' })
  @ApiResponse({ status: 201, type: PropertyStatementResponse })
  async create(
    @Body() req: CreatePropertyStatementRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<PropertyStatementResponse>> {
    const data = await this.propertyStatementService.create(req, user.id);
    return { success: true, message: 'Property statement created', data };
  }

  @Get()
  @ApiOperation({ summary: 'List property statements' })
  async findAll(
    @Query() query: PropertyStatementQueryDto,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardPaginatedResponse<PropertyStatementResponse>> {
    return this.propertyStatementService.findAll(query, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a property statement by id' })
  async findOne(
    @Param('id') id: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<PropertyStatementResponse>> {
    const data = await this.propertyStatementService.findOne(id, user.id);
    return { success: true, message: 'Property statement found', data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a property statement' })
  async update(
    @Param('id') id: string,
    @Body() req: UpdatePropertyStatementRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<PropertyStatementResponse>> {
    const data = await this.propertyStatementService.update(id, req, user.id);
    return { success: true, message: 'Property statement updated', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a property statement' })
  async remove(
    @Param('id') id: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardResponse> {
    await this.propertyStatementService.remove(id, user.id);
    return { success: true, message: 'Property statement deleted' };
  }
}
