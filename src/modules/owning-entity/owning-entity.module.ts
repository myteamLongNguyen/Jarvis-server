import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertyOwningEntity } from '../../entities/property-owning-entity.entity';
import { OwningEntityController } from './owning-entity.controller';
import { OwningEntityService } from './owning-entity.service';

@Module({
  imports: [TypeOrmModule.forFeature([PropertyOwningEntity])],
  controllers: [OwningEntityController],
  providers: [OwningEntityService],
  exports: [OwningEntityService],
})
export class OwningEntityModule {}
