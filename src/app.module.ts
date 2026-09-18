import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './core/database/database.module';
import { SupabaseAuthGuard } from './guards';
import { OwningEntityModule } from './modules/owning-entity/owning-entity.module';
import { ManagingAgentModule } from './modules/managing-agent/managing-agent.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { PropertyModule } from './modules/property/property.module';
import { LeaseModule } from './modules/lease/lease.module';
import { RentReviewModule } from './modules/rent-review/rent-review.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { SmartScanModule } from './modules/smart-scan/smart-scan.module';
import { RentalIncomeModule } from './modules/rental-income/rental-income.module';
import { PropertyExpenseModule } from './modules/property-expense/property-expense.module';
import { PropertyStatementModule } from './modules/property-statement/property-statement.module';
import { ValuationModule } from './modules/valuation/valuation.module';
import { DepreciationScheduleModule } from './modules/depreciation-schedule/depreciation-schedule.module';
import { MaintenanceRecordModule } from './modules/maintenance-record/maintenance-record.module';
import { DocumentModule } from './modules/document/document.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { ReminderModule } from './modules/reminder/reminder.module';
import { ChatModule } from './modules/chat/chat.module';

@Module({
  imports: [
    DatabaseModule,
    OwningEntityModule,
    ManagingAgentModule,
    TenantModule,
    PropertyModule,
    LeaseModule,
    RentReviewModule,
    InvoiceModule,
    SmartScanModule,
    RentalIncomeModule,
    PropertyExpenseModule,
    PropertyStatementModule,
    ValuationModule,
    DepreciationScheduleModule,
    MaintenanceRecordModule,
    DocumentModule,
    PortfolioModule,
    ReminderModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },
  ],
})
export class AppModule {}
