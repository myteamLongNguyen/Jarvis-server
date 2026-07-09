import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManagingAgentEntity } from '../../entities/managing-agent.entity';
import { ManagingAgentController } from './managing-agent.controller';
import { ManagingAgentService } from './managing-agent.service';

@Module({
  imports: [TypeOrmModule.forFeature([ManagingAgentEntity])],
  controllers: [ManagingAgentController],
  providers: [ManagingAgentService],
  exports: [ManagingAgentService],
})
export class ManagingAgentModule {}
