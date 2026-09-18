import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody, ApiParam } from '@nestjs/swagger';
import { SmartScanService } from './smart-scan.service';
import { ScanProgressBus } from './scan-progress.bus';
import { SmartScanResponse } from '../../dto/smart-scan.dto';
import { StandardDataResponse } from '../../dto/standard';
import { AuthUser } from '../../decorators/user.decorator';
import { AuthUserPayload } from '../../types/auth';

// Client-generated, so it must be treated as untrusted input: it only ever keys an
// in-memory progress channel, never a database row, but a bounded shape keeps a
// malformed one from being used as a cache key.
const SCAN_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

@ApiBearerAuth()
@ApiTags('smart-scan')
@Controller('smart-scan')
export class SmartScanController {
  constructor(
    private readonly smartScanService: SmartScanService,
    private readonly progressBus: ScanProgressBus,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        scanId: {
          type: 'string',
          description: 'Optional. Progress for this scan is published to GET /smart-scan/progress/{scanId}.',
        },
      },
    },
  })
  @ApiOperation({
    summary:
      'Reads a property document (PDF or photo) with AI: classifies what it is, matches it to a property, and returns a pre-filled payload for the matching app form. Always a suggestion for the user to confirm, never ground truth.',
  })
  @ApiResponse({ status: 201, type: SmartScanResponse })
  async scan(
    @UploadedFile() file: Express.Multer.File,
    @AuthUser() user: AuthUserPayload,
    @Body('scanId') scanId?: string,
  ): Promise<StandardDataResponse<SmartScanResponse>> {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    const data = await this.smartScanService.scan(file, user.id, this.validScanId(scanId));
    return { success: true, message: 'Document scanned', data };
  }

  @Get('progress/:scanId')
  @ApiParam({ name: 'scanId', description: 'The id sent with the upload' })
  @ApiOperation({
    summary:
      'Progress for an in-flight scan, as Server-Sent Events. A scan takes 20-40s, and the classification lands well before the extracted fields, so the client can show what the document is while the rest runs. Purely informational — the scan result itself comes back on the upload response.',
  })
  async progress(@Param('scanId') scanId: string, @Res() res: Response): Promise<void> {
    if (!this.validScanId(scanId)) {
      throw new BadRequestException('scanId is malformed');
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const send = (event: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        unsubscribe();
        res.end();
        resolve();
      };

      const { unsubscribe, finished } = this.progressBus.subscribe(scanId, (event) => {
        // The result itself is large and the client already gets it from the upload
        // response; this channel only needs to say that the scan is over.
        send(event.type === 'result' ? { type: 'done' } : event);
        if (event.type === 'result') finish();
      });

      // The upload may have finished before the listener attached at all.
      if (finished) {
        send({ type: 'done' });
        finish();
        return;
      }

      res.on('close', finish);
    });
  }

  private validScanId(scanId?: string): string | undefined {
    return scanId && SCAN_ID_RE.test(scanId) ? scanId : undefined;
  }
}
