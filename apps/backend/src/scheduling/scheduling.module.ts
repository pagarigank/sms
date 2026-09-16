import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunicationsModule } from '../communications/communications.module';
import { BillingModule } from '../billing/billing.module';
import { ClassOffering } from './class-offering.entity';
import { SchoolCalendar } from './school-calendar.entity';
import { CalendarEvent } from './calendar-event.entity';
import { StudentSchedule } from './student-schedule.entity';
import { FacultyLoadLimit } from './faculty-load-limit.entity';
import { AttendanceRecord } from './attendance-record.entity';
import { AttendanceConfig } from './attendance-config.entity';
import { AttendanceExcuse } from './attendance-excuse.entity';
import { AttendanceNotificationThreshold } from './attendance-notification-threshold.entity';
import { GradeEntry } from './grade-entry.entity';
import { GradeChangeRequest } from './grade-change-request.entity';
import { PermanentRecord } from './permanent-record.entity';
import { Enrollment } from '../sis/enrollment.entity';
import { Student } from '../sis/student.entity';
import { Guardian } from '../sis/guardian.entity';
import { StudentGuardian } from '../sis/student-guardian.entity';
import { StudentSectionAssignment } from '../sis/student-section-assignment.entity';
import { EnrollmentHold } from '../sis/enrollment-hold.entity';
import { PromotionDecision } from '../sis/promotion-decision.entity';
import { SchoolYear } from '../academic/school-year.entity';
import { GradeLevel } from '../academic/grade-level.entity';
import { Curriculum } from '../academic/curriculum.entity';
import { Subject } from '../academic/subject.entity';
import { Room } from '../facility/room.entity';
import { Employee } from '../hr/employee.entity';
import { SchedulingService } from './scheduling.service';
import { AttendanceService } from './attendance.service';
import { GradingExtendedService } from './grading-extended.service';
import { ReEnrollmentService } from './re-enrollment.service';
import { SchedulingController } from './scheduling.controller';
import { AttendanceController } from './attendance.controller';
import { GradingExtendedController } from './grading-extended.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClassOffering,
      SchoolCalendar,
      CalendarEvent,
      StudentSchedule,
      FacultyLoadLimit,
      AttendanceRecord,
      AttendanceConfig,
      AttendanceExcuse,
      AttendanceNotificationThreshold,
      GradeEntry,
      GradeChangeRequest,
      PermanentRecord,
      Enrollment,
      StudentSectionAssignment,
      EnrollmentHold,
      PromotionDecision,
      SchoolYear,
      GradeLevel,
      Curriculum,
      Student,
      Guardian,
      StudentGuardian,
      Subject,
      Room,
      Employee,
    ]),
    CommunicationsModule,
    BillingModule,
  ],
  providers: [SchedulingService, AttendanceService, GradingExtendedService, ReEnrollmentService],
  controllers: [SchedulingController, AttendanceController, GradingExtendedController],
  exports: [SchedulingService, AttendanceService, GradingExtendedService, ReEnrollmentService],
})
export class SchedulingModule {}
