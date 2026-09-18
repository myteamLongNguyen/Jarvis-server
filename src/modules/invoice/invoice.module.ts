import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceEntity } from '../../entities/invoice.entity';
import { InvoiceLineItemEntity } from '../../entities/invoice-line-item.entity';
import { RentalIncomeEntity } from '../../entities/rental-income.entity';
import { PropertyExpenseEntity } from '../../entities/property-expense.entity';
import { MaintenanceRecordEntity } from '../../entities/maintenance-record.entity';
import { PropertyEntity } from '../../entities/property.entity';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { InvoiceScanService } from './invoice-scan.service';
import { SmartScanModule } from '../smart-scan/smart-scan.module';

@Module({
  imports: [
    SmartScanModule,
    TypeOrmModule.forFeature([
      InvoiceEntity,
      InvoiceLineItemEntity,
      RentalIncomeEntity,
      PropertyExpenseEntity,
      MaintenanceRecordEntity,
      PropertyEntity,
    ]),
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService, InvoiceScanService],
  exports: [InvoiceService],
})
export class InvoiceModule {}
