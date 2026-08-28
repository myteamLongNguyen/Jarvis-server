import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaseEntity } from '../../entities/lease.entity';
import { RentReviewEntity } from '../../entities/rent-review.entity';
import { DocumentEntity } from '../../entities/document.entity';
import { RentalIncomeEntity } from '../../entities/rental-income.entity';
import { PropertyEntity } from '../../entities/property.entity';
import { ReminderController } from './reminder.controller';
import { ReminderService } from './reminder.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([LeaseEntity, RentReviewEntity, DocumentEntity, RentalIncomeEntity, PropertyEntity]),
  ],
  controllers: [ReminderController],
  providers: [ReminderService],
  exports: [ReminderService],
})
export class ReminderModule {}
