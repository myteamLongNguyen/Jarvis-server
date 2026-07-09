import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LeaseService } from './lease.service';
import { CreateLeaseRequest, UpdateLeaseRequest, LeaseQueryDto, LeaseResponse } from '../../dto/lease.dto';
import { StandardDataResponse, StandardPaginatedResponse, StandardResponse } from '../../dto/standard';
import { AuthUser } from '../../decorators/user.decorator';
import { AuthUserPayload } from '../../types/auth';

@ApiBearerAuth()
@ApiTags('leases')
@Controller('leases')
export class LeaseController {
  constructor(private readonly leaseService: LeaseService) {}

  @Post()
  @ApiOperation({ summary: 'Create a lease' })
  @ApiResponse({ status: 201, type: LeaseResponse })
  async create(
    @Body() req: CreateLeaseRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<LeaseResponse>> {
    const data = await this.leaseService.create(req, user.id);
    return { success: true, message: 'Lease created', data };
  }

  @Get()
  @ApiOperation({ summary: 'List leases' })
  async findAll(
    @Query() query: LeaseQueryDto,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardPaginatedResponse<LeaseResponse>> {
    return this.leaseService.findAll(query, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a lease by id' })
  async findOne(
    @Param('id') id: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<LeaseResponse>> {
    const data = await this.leaseService.findOne(id, user.id);
    return { success: true, message: 'Lease found', data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a lease' })
  async update(
    @Param('id') id: string,
    @Body() req: UpdateLeaseRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<LeaseResponse>> {
    const data = await this.leaseService.update(id, req, user.id);
    return { success: true, message: 'Lease updated', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a lease' })
  async remove(
    @Param('id') id: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardResponse> {
    await this.leaseService.remove(id, user.id);
    return { success: true, message: 'Lease deleted' };
  }
}
