import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ManagingAgentService } from './managing-agent.service';
import {
  CreateManagingAgentRequest,
  UpdateManagingAgentRequest,
  ManagingAgentQueryDto,
  ManagingAgentResponse,
} from '../../dto/managing-agent.dto';
import { StandardDataResponse, StandardPaginatedResponse, StandardResponse } from '../../dto/standard';
import { AuthUser } from '../../decorators/user.decorator';
import { AuthUserPayload } from '../../types/auth';

@ApiBearerAuth()
@ApiTags('managing-agents')
@Controller('managing-agents')
export class ManagingAgentController {
  constructor(private readonly managingAgentService: ManagingAgentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a managing agent' })
  @ApiResponse({ status: 201, type: ManagingAgentResponse })
  async create(
    @Body() req: CreateManagingAgentRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<ManagingAgentResponse>> {
    const data = await this.managingAgentService.create(req, user.id);
    return { success: true, message: 'Managing agent created', data };
  }

  @Get()
  @ApiOperation({ summary: 'List managing agents' })
  async findAll(
    @Query() query: ManagingAgentQueryDto,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardPaginatedResponse<ManagingAgentResponse>> {
    return this.managingAgentService.findAll(query, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a managing agent by id' })
  async findOne(
    @Param('id') id: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<ManagingAgentResponse>> {
    const data = await this.managingAgentService.findOne(id, user.id);
    return { success: true, message: 'Managing agent found', data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a managing agent' })
  async update(
    @Param('id') id: string,
    @Body() req: UpdateManagingAgentRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<ManagingAgentResponse>> {
    const data = await this.managingAgentService.update(id, req, user.id);
    return { success: true, message: 'Managing agent updated', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a managing agent' })
  async remove(
    @Param('id') id: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardResponse> {
    await this.managingAgentService.remove(id, user.id);
    return { success: true, message: 'Managing agent deleted' };
  }
}
