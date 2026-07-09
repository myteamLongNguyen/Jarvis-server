import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentService } from './document.service';
import {
  CreateDocumentRequest,
  UpdateDocumentRequest,
  DocumentQueryDto,
  DocumentResponse,
} from '../../dto/document.dto';
import { StandardDataResponse, StandardPaginatedResponse, StandardResponse } from '../../dto/standard';
import { AuthUser } from '../../decorators/user.decorator';
import { AuthUserPayload } from '../../types/auth';

@ApiBearerAuth()
@ApiTags('documents')
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  @ApiOperation({ summary: 'Register document metadata (file itself lives in Google Drive)' })
  @ApiResponse({ status: 201, type: DocumentResponse })
  async create(
    @Body() req: CreateDocumentRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<DocumentResponse>> {
    const data = await this.documentService.create(req, user.id);
    return { success: true, message: 'Document created', data };
  }

  @Get()
  @ApiOperation({ summary: 'List documents' })
  async findAll(
    @Query() query: DocumentQueryDto,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardPaginatedResponse<DocumentResponse>> {
    return this.documentService.findAll(query, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a document by id' })
  async findOne(
    @Param('id') id: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<DocumentResponse>> {
    const data = await this.documentService.findOne(id, user.id);
    return { success: true, message: 'Document found', data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update document metadata' })
  async update(
    @Param('id') id: string,
    @Body() req: UpdateDocumentRequest,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<DocumentResponse>> {
    const data = await this.documentService.update(id, req, user.id);
    return { success: true, message: 'Document updated', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a document' })
  async remove(
    @Param('id') id: string,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardResponse> {
    await this.documentService.remove(id, user.id);
    return { success: true, message: 'Document deleted' };
  }
}
