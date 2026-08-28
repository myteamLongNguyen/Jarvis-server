import { Module } from '@nestjs/common';
import { PropertyModule } from '../property/property.module';
import { LeaseModule } from '../lease/lease.module';
import { RentReviewModule } from '../rent-review/rent-review.module';
import { RentalIncomeModule } from '../rental-income/rental-income.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { TenantModule } from '../tenant/tenant.module';
import { ReminderModule } from '../reminder/reminder.module';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [
    PropertyModule,
    LeaseModule,
    RentReviewModule,
    RentalIncomeModule,
    InvoiceModule,
    TenantModule,
    ReminderModule,
    PortfolioModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
