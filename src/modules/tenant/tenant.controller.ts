import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import {
  CreateTenantRequest,
  UpdateTenantRequest,
  TenantQueryDto,
  TenantResponse,
} from '../../dto/tenant.dto';
import { StandardDataResponse, StandardPaginatedResponse, StandardResponse } from '../../dto/standard';
import { AuthUser } from '../../decorators/user.decorator';
import { AuthUserPayload } from '../../types/auth';

@ApiBearerAuth()
@ApiTags('tenants')
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @ApiOperation({ summary: 'Create a tenant' })
  @ApiResponse({ status: 201, type: TenantResponse })
  async create(
    @Body() req: CreateTenantRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<TenantResponse>> {
    const data = await this.tenantService.create(req, user.id);
    return { success: true, message: 'Tenant created', data };
  }

  @Get()
  @ApiOperation({ summary: 'List tenants' })
  async findAll(
    @Query() query: TenantQueryDto,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardPaginatedResponse<TenantResponse>> {
    return this.tenantService.findAll(query, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tenant by id' })
  async findOne(
    @Param('id') id: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<TenantResponse>> {
    const data = await this.tenantService.findOne(id, user.id);
    return { success: true, message: 'Tenant found', data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tenant' })
  async update(
    @Param('id') id: string,
    @Body() req: UpdateTenantRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<TenantResponse>> {
    const data = await this.tenantService.update(id, req, user.id);
    return { success: true, message: 'Tenant updated', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a tenant' })
  async remove(
    @Param('id') id: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardResponse> {
    await this.tenantService.remove(id, user.id);
    return { success: true, message: 'Tenant deleted' };
  }
}
