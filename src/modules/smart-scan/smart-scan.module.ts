import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertyEntity } from '../../entities/property.entity';
import { LeaseEntity } from '../../entities/lease.entity';
import { SmartScanController } from './smart-scan.controller';
import { SmartScanService } from './smart-scan.service';
import { ScanProgressBus } from './scan-progress.bus';

@Module({
  imports: [TypeOrmModule.forFeature([PropertyEntity, LeaseEntity])],
  controllers: [SmartScanController],
  providers: [SmartScanService, ScanProgressBus],
  exports: [SmartScanService],
})
export class SmartScanModule {}
