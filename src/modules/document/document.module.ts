import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity } from '../../entities/document.entity';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { SupabaseModule } from '../../core/supabase/supabase.module';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentEntity]), SupabaseModule],
  controllers: [DocumentController],
  providers: [DocumentService],
  exports: [DocumentService],
})
export class DocumentModule {}
