import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GradingController } from './grading.controller';
import { GradingService } from './grading.service';
import { GradingSystem } from './entities/grading-system.entity';
import { GradeComponent } from './entities/grade-component.entity';
import { GradeEntry } from './entities/grade-entry.entity';
import { GradeChangeRequest } from './entities/grade-change-request.entity';
import { HonorRollConfig } from './entities/honor-roll-config.entity';
import { ClassOffering } from '../scheduling/class-offering.entity';
import { StudentSectionAssignment } from '../sis/student-section-assignment.entity';
import { AuditEvent } from '../config/audit-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GradingSystem,
      GradeComponent,
      GradeEntry,
      GradeChangeRequest,
      HonorRollConfig,
      ClassOffering,
      StudentSectionAssignment,
      AuditEvent,
    ]),
  ],
  controllers: [GradingController],
  providers: [GradingService],
  exports: [GradingService],
})
export class GradingModule {}
