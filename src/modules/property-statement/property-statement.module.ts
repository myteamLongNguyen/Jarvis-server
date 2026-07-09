import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertyStatementEntity } from '../../entities/property-statement.entity';
import { PropertyStatementController } from './property-statement.controller';
import { PropertyStatementService } from './property-statement.service';

@Module({
  imports: [TypeOrmModule.forFeature([PropertyStatementEntity])],
  controllers: [PropertyStatementController],
  providers: [PropertyStatementService],
  exports: [PropertyStatementService],
})
export class PropertyStatementModule {}
