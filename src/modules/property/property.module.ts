import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertyEntity } from '../../entities/property.entity';
import { LeaseEntity } from '../../entities/lease.entity';
import { RentReviewEntity } from '../../entities/rent-review.entity';
import { RentalIncomeEntity } from '../../entities/rental-income.entity';
import { PropertyExpenseEntity } from '../../entities/property-expense.entity';
import { MaintenanceRecordEntity } from '../../entities/maintenance-record.entity';
import { InvoiceEntity } from '../../entities/invoice.entity';
import { PropertyController } from './property.controller';
import { PropertyService } from './property.service';
import { PropertyAnalyticsService } from './property-analytics.service';
import { PortfolioModule } from '../portfolio/portfolio.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PropertyEntity,
      LeaseEntity,
      RentReviewEntity,
      RentalIncomeEntity,
      PropertyExpenseEntity,
      MaintenanceRecordEntity,
      InvoiceEntity,
    ]),
    PortfolioModule,
  ],
  controllers: [PropertyController],
  providers: [PropertyService, PropertyAnalyticsService],
  exports: [PropertyService, PropertyAnalyticsService],
})
export class PropertyModule {}
