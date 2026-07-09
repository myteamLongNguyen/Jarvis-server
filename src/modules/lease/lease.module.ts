import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaseEntity } from '../../entities/lease.entity';
import { LeaseController } from './lease.controller';
import { LeaseService } from './lease.service';

@Module({
  imports: [TypeOrmModule.forFeature([LeaseEntity])],
  controllers: [LeaseController],
  providers: [LeaseService],
  exports: [LeaseService],
})
export class LeaseModule {}
