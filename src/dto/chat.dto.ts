import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class ChatHistoryMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @ApiProperty()
  @IsString()
  @MaxLength(8000)
  content: string;
}

export class ChatRequestDto {
  @ApiProperty({ description: "The user's new message" })
  @IsString()
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional({
    type: [ChatHistoryMessageDto],
    description: 'Prior turns in this conversation, oldest first. Omit on the first message.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryMessageDto)
  history?: ChatHistoryMessageDto[];
}
