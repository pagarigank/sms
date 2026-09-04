import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GradingSystem } from './grading-system.entity';
import { GradeComponent } from './grade-component.entity';
import { HonorRollConfig } from './honor-roll-config.entity';
import { GradingService } from './grading.service';
import { GradingController } from './grading.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GradingSystem, GradeComponent, HonorRollConfig])],
  controllers: [GradingController],
  providers: [GradingService],
  exports: [GradingService],
})
export class GradingModule {}
