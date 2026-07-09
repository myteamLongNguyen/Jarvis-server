import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RentalIncomeEntity } from '../../entities/rental-income.entity';
import { RentalIncomeController } from './rental-income.controller';
import { RentalIncomeService } from './rental-income.service';

@Module({
  imports: [TypeOrmModule.forFeature([RentalIncomeEntity])],
  controllers: [RentalIncomeController],
  providers: [RentalIncomeService],
  exports: [RentalIncomeService],
})
export class RentalIncomeModule {}
