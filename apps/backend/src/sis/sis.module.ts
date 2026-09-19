import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './student.entity';
import { Guardian } from './guardian.entity';
import { StudentGuardian } from './student-guardian.entity';
import { Enrollment } from './enrollment.entity';
import { EnrollmentSubject } from './enrollment-subject.entity';
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
import { Applicant } from './applicant.entity';
import { SectionAssignmentRule } from './section-assignment-rule.entity';
import { SchoolYear } from '../academic/school-year.entity';
import { GradeLevel } from '../academic/grade-level.entity';
import { Curriculum } from '../academic/curriculum.entity';
import { StudentImmunization } from './student-immunization.entity';
import { StudentMedication } from './student-medication.entity';
import { StudentCarePlan } from './student-care-plan.entity';
import { StudentAllergy } from './student-allergy.entity';
import { StudentScreening } from './student-screening.entity';
import { StudentIEP } from './student-iep.entity';
import { Student504Plan } from './student-504-plan.entity';
import { StudentEvaluation } from './student-evaluation.entity';
import { StudentAccommodation } from './student-accommodation.entity';
import { StudentDisciplineIncident } from './student-discipline-incident.entity';
import { StudentIntervention } from './student-intervention.entity';
import { StudentSELAssessment } from './student-sel-assessment.entity';
import { StudentLearningProfile } from './student-learning-profile.entity';
import { StudentGoal } from './student-goal.entity';
import { StudentFamilyContext } from './student-family-context.entity';
import { StudentCommunicationLog } from './student-communication-log.entity';
import { SisService } from './sis.service';
import { SisController } from './sis.controller';
import { AdmissionsService } from './admissions.service';
import { AdmissionsController } from './admissions.controller';
import { BillingModule } from '../billing/billing.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { ConfigEngineModule } from '../config/config.module';

@Module({
  imports: [
    BillingModule,
    SchedulingModule,
    ConfigEngineModule,
    TypeOrmModule.forFeature([
      Student,
      Guardian,
      StudentGuardian,
      Enrollment,
      EnrollmentSubject,
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
      Applicant,
      SectionAssignmentRule,
      SchoolYear,
      GradeLevel,
      Curriculum,
      StudentImmunization,
      StudentMedication,
      StudentCarePlan,
      StudentAllergy,
      StudentScreening,
      StudentIEP,
      Student504Plan,
      StudentEvaluation,
      StudentAccommodation,
      StudentDisciplineIncident,
      StudentIntervention,
      StudentSELAssessment,
      StudentLearningProfile,
      StudentGoal,
      StudentFamilyContext,
      StudentCommunicationLog,
    ]),
  ],
  providers: [SisService, AdmissionsService],
  controllers: [SisController, AdmissionsController],
  exports: [SisService, AdmissionsService],
})
export class SisModule {}
