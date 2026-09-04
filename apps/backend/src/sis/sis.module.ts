import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './student.entity';
import { Guardian } from './guardian.entity';
import { StudentGuardian } from './student-guardian.entity';
import { Enrollment } from './enrollment.entity';
import { Section } from './section.entity';
import { StudentSectionAssignment } from './student-section-assignment.entity';
import { EnrollmentHold } from './enrollment-hold.entity';
import { StudentDocument } from './student-document.entity';
import { StudentTransfer } from './student-transfer.entity';
import { PromotionDecision } from './promotion-decision.entity';
import { BehaviorIncident } from './behavior-incident.entity';
import { HealthRecord } from './health-record.entity';
import { StudentMergeAudit } from './student-merge-audit.entity';
import { ApplicantStageConfig } from './applicant-stage-config.entity';
import { ApplicantStageTransition } from './applicant-stage-transition.entity';
import { SectionAssignmentRule } from './section-assignment-rule.entity';
import { SisService } from './sis.service';
import { SisController } from './sis.controller';
import { AdmissionsService } from './admissions.service';
import { AdmissionsController } from './admissions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Student,
      Guardian,
      StudentGuardian,
      Enrollment,
      Section,
      StudentSectionAssignment,
      EnrollmentHold,
      StudentDocument,
      StudentTransfer,
      PromotionDecision,
      BehaviorIncident,
      HealthRecord,
      StudentMergeAudit,
      ApplicantStageConfig,
      ApplicantStageTransition,
      SectionAssignmentRule,
    ]),
  ],
  providers: [SisService, AdmissionsService],
  controllers: [SisController, AdmissionsController],
  exports: [SisService, AdmissionsService],
})
export class SisModule {}
