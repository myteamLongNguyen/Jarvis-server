import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReminderService } from './reminder.service';
import { ReminderQueryDto, ReminderSummaryResponse } from '../../dto/reminder.dto';
import { StandardDataResponse } from '../../dto/standard';
import { AuthUser } from '../../decorators/user.decorator';
import { AuthUserPayload } from '../../types/auth';

@ApiBearerAuth()
@ApiTags('reminders')
@Controller('reminders')
export class ReminderController {
  constructor(private readonly reminderService: ReminderService) {}

  @Get()
  @ApiOperation({
    summary:
      'Upcoming/overdue lease expiries, rent reviews, insurance/compliance renewals, and unpaid or unrecorded rent — computed live, not stored',
  })
  async getReminders(
    @Query() query: ReminderQueryDto,
    @AuthUser() user: AuthUserPayload,
  ): Promise<StandardDataResponse<ReminderSummaryResponse>> {
    const data = await this.reminderService.getReminders(user.id, query.windowDays);
    return { success: true, message: 'Reminders', data };
  }
}
