import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RentReviewService, ScheduleProposal } from './rent-review.service';
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

  // Declared before the ':id' route, or Nest would read 'schedule' as an id.
  @Get('schedule/:leaseId')
  @ApiOperation({
    summary:
      'The review schedule this lease implies: a review on each anniversary plus a market review at the end of the term. Saves nothing; dates that already have a review are flagged.',
  })
  async schedule(
    @Param('leaseId') leaseId: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<ScheduleProposal[]>> {
    const data = await this.rentReviewService.schedule(leaseId, user.id);
    return { success: true, message: 'Review schedule built', data };
  }

  @Post('schedule/:leaseId')
  @ApiOperation({
    summary: 'Create the scheduled reviews for a lease. Dates that already have a review are left untouched.',
  })
  async generateSchedule(
    @Param('leaseId') leaseId: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<{ created: RentReviewResponse[]; skipped: number }>> {
    const data = await this.rentReviewService.generateSchedule(leaseId, user.id);
    return { success: true, message: 'Review schedule created', data };
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
