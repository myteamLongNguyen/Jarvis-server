import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RentalIncomeEntity } from '../../entities/rental-income.entity';
import { PropertyEntity } from '../../entities/property.entity';
import { InvoiceEntity } from '../../entities/invoice.entity';
import { LeaseEntity } from '../../entities/lease.entity';
import { DocumentEntity } from '../../entities/document.entity';
import { RentalIncomeController } from './rental-income.controller';
import { RentalIncomeService } from './rental-income.service';
import { RentRollService } from './rent-roll.service';

@Module({
  imports: [TypeOrmModule.forFeature([RentalIncomeEntity, PropertyEntity, InvoiceEntity, LeaseEntity, DocumentEntity])],
  controllers: [RentalIncomeController],
  providers: [RentalIncomeService, RentRollService],
  exports: [RentalIncomeService, RentRollService],
})
export class RentalIncomeModule {}
