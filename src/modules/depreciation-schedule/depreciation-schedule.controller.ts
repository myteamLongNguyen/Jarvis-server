import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DepreciationScheduleService } from './depreciation-schedule.service';
import {
  CreateDepreciationScheduleRequest,
  UpdateDepreciationScheduleRequest,
  DepreciationScheduleQueryDto,
  DepreciationScheduleResponse,
} from '../../dto/depreciation-schedule.dto';
import { StandardDataResponse, StandardPaginatedResponse, StandardResponse } from '../../dto/standard';
import { AuthUser } from '../../decorators/user.decorator';
import { AuthUserPayload } from '../../types/auth';

@ApiBearerAuth()
@ApiTags('depreciation-schedules')
@Controller('depreciation-schedules')
export class DepreciationScheduleController {
  constructor(private readonly depreciationScheduleService: DepreciationScheduleService) {}

  @Post()
  @ApiOperation({ summary: 'Create a depreciation schedule entry' })
  @ApiResponse({ status: 201, type: DepreciationScheduleResponse })
  async create(
    @Body() req: CreateDepreciationScheduleRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<DepreciationScheduleResponse>> {
    const data = await this.depreciationScheduleService.create(req, user.id);
    return { success: true, message: 'Depreciation schedule created', data };
  }

  @Get()
  @ApiOperation({ summary: 'List depreciation schedule entries' })
  async findAll(
    @Query() query: DepreciationScheduleQueryDto,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardPaginatedResponse<DepreciationScheduleResponse>> {
    return this.depreciationScheduleService.findAll(query, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a depreciation schedule entry by id' })
  async findOne(
    @Param('id') id: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<DepreciationScheduleResponse>> {
    const data = await this.depreciationScheduleService.findOne(id, user.id);
    return { success: true, message: 'Depreciation schedule found', data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a depreciation schedule entry' })
  async update(
    @Param('id') id: string,
    @Body() req: UpdateDepreciationScheduleRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<DepreciationScheduleResponse>> {
    const data = await this.depreciationScheduleService.update(id, req, user.id);
    return { success: true, message: 'Depreciation schedule updated', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a depreciation schedule entry' })
  async remove(
    @Param('id') id: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardResponse> {
    await this.depreciationScheduleService.remove(id, user.id);
    return { success: true, message: 'Depreciation schedule deleted' };
  }
}
