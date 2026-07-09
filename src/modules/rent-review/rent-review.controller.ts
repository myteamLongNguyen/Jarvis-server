import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RentReviewService } from './rent-review.service';
import {
  CreateRentReviewRequest,
  UpdateRentReviewRequest,
  RentReviewQueryDto,
  RentReviewResponse,
} from '../../dto/rent-review.dto';
import { StandardDataResponse, StandardPaginatedResponse, StandardResponse } from '../../dto/standard';
import { AuthUser } from '../../decorators/user.decorator';
import { AuthUserPayload } from '../../types/auth';

@ApiBearerAuth()
@ApiTags('rent-reviews')
@Controller('rent-reviews')
export class RentReviewController {
  constructor(private readonly rentReviewService: RentReviewService) {}

  @Post()
  @ApiOperation({ summary: 'Create a rent review' })
  @ApiResponse({ status: 201, type: RentReviewResponse })
  async create(
    @Body() req: CreateRentReviewRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<RentReviewResponse>> {
    const data = await this.rentReviewService.create(req, user.id);
    return { success: true, message: 'Rent review created', data };
  }

  @Get()
  @ApiOperation({ summary: 'List rent reviews' })
  async findAll(
    @Query() query: RentReviewQueryDto,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardPaginatedResponse<RentReviewResponse>> {
    return this.rentReviewService.findAll(query, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a rent review by id' })
  async findOne(
    @Param('id') id: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<RentReviewResponse>> {
    const data = await this.rentReviewService.findOne(id, user.id);
    return { success: true, message: 'Rent review found', data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a rent review' })
  async update(
    @Param('id') id: string,
    @Body() req: UpdateRentReviewRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<RentReviewResponse>> {
    const data = await this.rentReviewService.update(id, req, user.id);
    return { success: true, message: 'Rent review updated', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a rent review' })
  async remove(
    @Param('id') id: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardResponse> {
    await this.rentReviewService.remove(id, user.id);
    return { success: true, message: 'Rent review deleted' };
  }
}
