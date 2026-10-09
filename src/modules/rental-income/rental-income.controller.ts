import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RentalIncomeService } from './rental-income.service';
import { RentRollService } from './rent-roll.service';
import {
  CreateRentalIncomeRequest,
  UpdateRentalIncomeRequest,
  RentalIncomeQueryDto,
  RentalIncomeResponse,
  RentRollQueryDto,
  RentRollResponse,
} from '../../dto/rental-income.dto';
import { StandardDataResponse, StandardPaginatedResponse, StandardResponse } from '../../dto/standard';
import { AuthUser } from '../../decorators/user.decorator';
import { AuthUserPayload } from '../../types/auth';

@ApiBearerAuth()
@ApiTags('rental-incomes')
@Controller('rental-incomes')
export class RentalIncomeController {
  constructor(
    private readonly rentalIncomeService: RentalIncomeService,
    private readonly rentRollService: RentRollService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a rental income record' })
  @ApiResponse({ status: 201, type: RentalIncomeResponse })
  async create(
    @Body() req: CreateRentalIncomeRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<RentalIncomeResponse>> {
    const data = await this.rentalIncomeService.create(req, user.id);
    return { success: true, message: 'Rental income created', data };
  }

  @Get()
  @ApiOperation({ summary: 'List rental income records' })
  async findAll(
    @Query() query: RentalIncomeQueryDto,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardPaginatedResponse<RentalIncomeResponse>> {
    return this.rentalIncomeService.findAll(query, user.id);
  }

  // Declared before the :id route, or Nest reads "rent-roll" as an id.
  @Get('rent-roll')
  @ApiOperation({ summary: 'Rent due and received for every property in one month' })
  @ApiResponse({ status: 200, type: RentRollResponse })
  async getRentRoll(
    @Query() query: RentRollQueryDto,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<RentRollResponse>> {
    const data = await this.rentRollService.getRentRoll(user.id, query.month, query.includePersonal);
    return { success: true, message: 'Rent roll', data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a rental income record by id' })
  async findOne(
    @Param('id') id: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<RentalIncomeResponse>> {
    const data = await this.rentalIncomeService.findOne(id, user.id);
    return { success: true, message: 'Rental income found', data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a rental income record' })
  async update(
    @Param('id') id: string,
    @Body() req: UpdateRentalIncomeRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<RentalIncomeResponse>> {
    const data = await this.rentalIncomeService.update(id, req, user.id);
    return { success: true, message: 'Rental income updated', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a rental income record' })
  async remove(
    @Param('id') id: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardResponse> {
    await this.rentalIncomeService.remove(id, user.id);
    return { success: true, message: 'Rental income deleted' };
  }
}
