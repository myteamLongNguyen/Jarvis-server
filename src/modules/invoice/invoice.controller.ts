import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';
import { InvoiceScanService } from './invoice-scan.service';
import {
  CheckInvoiceDuplicateRequest,
  ClassifyInvoiceRequest,
  DuplicateMatchResponse,
  CreateInvoiceRequest,
  InvoiceQueryDto,
  InvoiceResponse,
  InvoiceScanResponse,
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
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly invoiceScanService: InvoiceScanService,
  ) {}

  @Post('scan')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({
    summary:
      'AI-reads an invoice PDF or image (Claude) and returns the fields needed to pre-fill an invoice: issuer, dates, amounts, GST, line items and the matching property. Falls back to a filename/regex scan when AI is unavailable — check `extractedBy`. Always a pre-fill suggestion, not ground truth.',
  })
  @ApiResponse({ status: 201, type: InvoiceScanResponse })
  async scan(
    @UploadedFile() file: Express.Multer.File,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<InvoiceScanResponse>> {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    const data = await this.invoiceScanService.scan(file, user.id);
    return { success: true, message: 'Invoice scanned', data };
  }

  // Declared before the :id routes so "check-duplicate" is not read as an id.
  @Post('check-duplicate')
  @ApiOperation({ summary: 'Invoices already on file that look like this one' })
  @ApiResponse({ status: 200, type: [DuplicateMatchResponse] })
  @HttpCode(200)
  async checkDuplicate(
    @Body() req: CheckInvoiceDuplicateRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<DuplicateMatchResponse[]>> {
    const data = await this.invoiceService.checkDuplicate(req, user.id);
    return { success: true, message: 'Duplicate check', data };
  }

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
