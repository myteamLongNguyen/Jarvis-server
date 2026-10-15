import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceEntity } from '../../entities/invoice.entity';
import { InvoiceLineItemEntity } from '../../entities/invoice-line-item.entity';
import { RentalIncomeEntity } from '../../entities/rental-income.entity';
import { PropertyExpenseEntity } from '../../entities/property-expense.entity';
import { MaintenanceRecordEntity } from '../../entities/maintenance-record.entity';
import { PropertyEntity } from '../../entities/property.entity';
import { DocumentEntity } from '../../entities/document.entity';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { InvoiceScanService } from './invoice-scan.service';
import { DuplicateCheckService } from './duplicate-check.service';
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
      DocumentEntity,
    ]),
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService, InvoiceScanService, DuplicateCheckService],
  exports: [InvoiceService],
})
export class InvoiceModule {}
