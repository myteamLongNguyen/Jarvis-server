import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OwningEntityService } from './owning-entity.service';
import {
  CreateOwningEntityRequest,
  UpdateOwningEntityRequest,
  OwningEntityQueryDto,
  OwningEntityResponse,
} from '../../dto/property-owning-entity.dto';
import { StandardDataResponse, StandardPaginatedResponse, StandardResponse } from '../../dto/standard';
import { AuthUser } from '../../decorators/user.decorator';
import { AuthUserPayload } from '../../types/auth';

@ApiBearerAuth()
@ApiTags('owning-entities')
@Controller('owning-entities')
export class OwningEntityController {
  constructor(private readonly owningEntityService: OwningEntityService) {}

  @Post()
  @ApiOperation({ summary: 'Create an owning entity' })
  @ApiResponse({ status: 201, type: OwningEntityResponse })
  async create(
    @Body() req: CreateOwningEntityRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<OwningEntityResponse>> {
    const data = await this.owningEntityService.create(req, user.id);
    return { success: true, message: 'Owning entity created', data };
  }

  @Get()
  @ApiOperation({ summary: 'List owning entities' })
  async findAll(
    @Query() query: OwningEntityQueryDto,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardPaginatedResponse<OwningEntityResponse>> {
    return this.owningEntityService.findAll(query, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an owning entity by id' })
  async findOne(
    @Param('id') id: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<OwningEntityResponse>> {
    const data = await this.owningEntityService.findOne(id, user.id);
    return { success: true, message: 'Owning entity found', data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an owning entity' })
  async update(
    @Param('id') id: string,
    @Body() req: UpdateOwningEntityRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<OwningEntityResponse>> {
    const data = await this.owningEntityService.update(id, req, user.id);
    return { success: true, message: 'Owning entity updated', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete an owning entity' })
  async remove(
    @Param('id') id: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardResponse> {
    await this.owningEntityService.remove(id, user.id);
    return { success: true, message: 'Owning entity deleted' };
  }
}
