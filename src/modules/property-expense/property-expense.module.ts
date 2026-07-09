import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertyExpenseEntity } from '../../entities/property-expense.entity';
import { PropertyExpenseController } from './property-expense.controller';
import { PropertyExpenseService } from './property-expense.service';

@Module({
  imports: [TypeOrmModule.forFeature([PropertyExpenseEntity])],
  controllers: [PropertyExpenseController],
  providers: [PropertyExpenseService],
  exports: [PropertyExpenseService],
})
export class PropertyExpenseModule {}
