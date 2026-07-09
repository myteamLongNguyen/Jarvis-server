import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RentReviewEntity } from '../../entities/rent-review.entity';
import { RentReviewController } from './rent-review.controller';
import { RentReviewService } from './rent-review.service';

@Module({
  imports: [TypeOrmModule.forFeature([RentReviewEntity])],
  controllers: [RentReviewController],
  providers: [RentReviewService],
  exports: [RentReviewService],
})
export class RentReviewModule {}
