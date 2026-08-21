import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepreciationScheduleEntity } from '../../entities/depreciation-schedule.entity';
import { DepreciationScheduleController } from './depreciation-schedule.controller';
import { DepreciationScheduleService } from './depreciation-schedule.service';

@Module({
  imports: [TypeOrmModule.forFeature([DepreciationScheduleEntity])],
  controllers: [DepreciationScheduleController],
  providers: [DepreciationScheduleService],
  exports: [DepreciationScheduleService],
})
export class DepreciationScheduleModule {}
