import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MaintenanceRecordService } from './maintenance-record.service';
import {
  CreateMaintenanceRecordRequest,
  UpdateMaintenanceRecordRequest,
  MaintenanceRecordQueryDto,
  MaintenanceRecordResponse,
} from '../../dto/maintenance-record.dto';
import { StandardDataResponse, StandardPaginatedResponse, StandardResponse } from '../../dto/standard';
import { AuthUser } from '../../decorators/user.decorator';
import { AuthUserPayload } from '../../types/auth';

@ApiBearerAuth()
@ApiTags('maintenance-records')
@Controller('maintenance-records')
export class MaintenanceRecordController {
  constructor(private readonly maintenanceRecordService: MaintenanceRecordService) {}

  @Post()
  @ApiOperation({ summary: 'Create a maintenance record' })
  @ApiResponse({ status: 201, type: MaintenanceRecordResponse })
  async create(
    @Body() req: CreateMaintenanceRecordRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<MaintenanceRecordResponse>> {
    const data = await this.maintenanceRecordService.create(req, user.id);
    return { success: true, message: 'Maintenance record created', data };
  }

  @Get()
  @ApiOperation({ summary: 'List maintenance records' })
  async findAll(
    @Query() query: MaintenanceRecordQueryDto,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardPaginatedResponse<MaintenanceRecordResponse>> {
    return this.maintenanceRecordService.findAll(query, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a maintenance record by id' })
  async findOne(
    @Param('id') id: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<MaintenanceRecordResponse>> {
    const data = await this.maintenanceRecordService.findOne(id, user.id);
    return { success: true, message: 'Maintenance record found', data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a maintenance record' })
  async update(
    @Param('id') id: string,
    @Body() req: UpdateMaintenanceRecordRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<MaintenanceRecordResponse>> {
    const data = await this.maintenanceRecordService.update(id, req, user.id);
    return { success: true, message: 'Maintenance record updated', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a maintenance record' })
  async remove(
    @Param('id') id: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardResponse> {
    await this.maintenanceRecordService.remove(id, user.id);
    return { success: true, message: 'Maintenance record deleted' };
  }
}
