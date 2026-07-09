import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertyEntity } from '../../entities/property.entity';
import { RentalIncomeEntity } from '../../entities/rental-income.entity';
import { PropertyExpenseEntity } from '../../entities/property-expense.entity';
import { MaintenanceRecordEntity } from '../../entities/maintenance-record.entity';
import { ValuationEntity } from '../../entities/valuation.entity';
import { InvoiceEntity } from '../../entities/invoice.entity';
import { PortfolioController } from './portfolio.controller';
import { PortfolioAnalyticsService } from './portfolio-analytics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PropertyEntity,
      RentalIncomeEntity,
      PropertyExpenseEntity,
      MaintenanceRecordEntity,
      ValuationEntity,
      InvoiceEntity,
    ]),
  ],
  controllers: [PortfolioController],
  providers: [PortfolioAnalyticsService],
  exports: [PortfolioAnalyticsService],
})
export class PortfolioModule {}
