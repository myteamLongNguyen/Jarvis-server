import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';
import {
  ClassifyInvoiceRequest,
  CreateInvoiceRequest,
  InvoiceQueryDto,
  InvoiceResponse,
  PayInvoiceRequest,
  UpdateInvoiceRequest,
} from '../../dto/invoice.dto';
import { StandardDataResponse, StandardPaginatedResponse, StandardResponse } from '../../dto/standard';
import { AuthUser } from '../../decorators/user.decorator';
import { AuthUserPayload } from '../../types/auth';

@ApiBearerAuth()
@ApiTags('invoices')
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @ApiOperation({ summary: 'Create an invoice from a parsed document' })
  @ApiResponse({ status: 201, type: InvoiceResponse })
  async create(
    @Body() req: CreateInvoiceRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<InvoiceResponse>> {
    const data = await this.invoiceService.create(req, user.id);
    return { success: true, message: 'Invoice created', data };
  }

  @Get()
  @ApiOperation({ summary: 'List invoices (e.g. ?status=UNSORTED for the classification worklist)' })
  async findAll(
    @Query() query: InvoiceQueryDto,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardPaginatedResponse<InvoiceResponse>> {
    return this.invoiceService.findAll(query, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an invoice by id' })
  async findOne(
    @Param('id') id: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<InvoiceResponse>> {
    const data = await this.invoiceService.findOne(id, user.id);
    return { success: true, message: 'Invoice found', data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an invoice' })
  async update(
    @Param('id') id: string,
    @Body() req: UpdateInvoiceRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<InvoiceResponse>> {
    const data = await this.invoiceService.update(id, req, user.id);
    return { success: true, message: 'Invoice updated', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete an invoice' })
  async remove(
    @Param('id') id: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardResponse> {
    await this.invoiceService.remove(id, user.id);
    return { success: true, message: 'Invoice deleted' };
  }

  @Patch(':id/classify')
  @ApiOperation({ summary: 'Attribute an unsorted invoice to a property' })
  async classify(
    @Param('id') id: string,
    @Body() req: ClassifyInvoiceRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<InvoiceResponse>> {
    const data = await this.invoiceService.classify(id, req, user.id);
    return { success: true, message: 'Invoice classified', data };
  }

  @Post(':id/generate-postings')
  @ApiOperation({ summary: 'Generate rental income / expense / maintenance rows from this invoice (idempotent)' })
  async generatePostings(
    @Param('id') id: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<{ rentalIncomes: number; propertyExpenses: number; maintenanceRecords: number }>> {
    const data = await this.invoiceService.generatePostings(id, user.id);
    return { success: true, message: 'Postings generated', data };
  }

  @Patch(':id/pay')
  @ApiOperation({ summary: 'Mark an invoice as paid' })
  async pay(
    @Param('id') id: string,
    @Body() req: PayInvoiceRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<InvoiceResponse>> {
    const data = await this.invoiceService.pay(id, req, user.id);
    return { success: true, message: 'Invoice marked as paid', data };
  }
}
