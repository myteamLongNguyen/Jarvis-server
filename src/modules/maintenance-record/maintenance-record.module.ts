import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaintenanceRecordEntity } from '../../entities/maintenance-record.entity';
import { MaintenanceRecordController } from './maintenance-record.controller';
import { MaintenanceRecordService } from './maintenance-record.service';

@Module({
  imports: [TypeOrmModule.forFeature([MaintenanceRecordEntity])],
  controllers: [MaintenanceRecordController],
  providers: [MaintenanceRecordService],
  exports: [MaintenanceRecordService],
})
export class MaintenanceRecordModule {}
