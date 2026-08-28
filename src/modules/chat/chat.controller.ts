import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatRequestDto } from '../../dto/chat.dto';
import { AuthUser } from '../../decorators/user.decorator';
import { AuthUserPayload } from '../../types/auth';

@ApiBearerAuth()
@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('stream')
  @ApiOperation({
    summary:
      'Ask the in-app assistant a question about your own portfolio data. Streams the reply as Server-Sent Events.',
  })
  async stream(@Body() body: ChatRequestDto, @AuthUser() user: AuthUserPayload, @Res() res: Response): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const send = (event: { type: string; [key: string]: unknown }) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      for await (const event of this.chatService.streamChat(user.id, body.message, body.history)) {
        send(event);
      }
    } catch {
      send({ type: 'error', message: 'Something went wrong talking to the assistant — please try again.' });
    } finally {
      res.end();
    }
  }
}
