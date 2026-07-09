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
import { RentalIncomeModule } from './modules/rental-income/rental-income.module';
import { PropertyExpenseModule } from './modules/property-expense/property-expense.module';
import { PropertyStatementModule } from './modules/property-statement/property-statement.module';
import { ValuationModule } from './modules/valuation/valuation.module';
import { MaintenanceRecordModule } from './modules/maintenance-record/maintenance-record.module';
import { DocumentModule } from './modules/document/document.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';

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
    RentalIncomeModule,
    PropertyExpenseModule,
    PropertyStatementModule,
    ValuationModule,
    MaintenanceRecordModule,
    DocumentModule,
    PortfolioModule,
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
