import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AttendanceRecord } from './attendance-record.entity';
import { AttendanceConfig } from './attendance-config.entity';
import { AttendanceExcuse } from './attendance-excuse.entity';
import { AttendanceNotificationThreshold } from './attendance-notification-threshold.entity';
import { ClassOffering } from './class-offering.entity';
import { StudentSectionAssignment } from '../sis/student-section-assignment.entity';
import { Student } from '../sis/student.entity';
import { Enrollment } from '../sis/enrollment.entity';
import { Guardian } from '../sis/guardian.entity';
import { StudentGuardian } from '../sis/student-guardian.entity';
import { CommunicationsService } from '../communications/communications.service';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectRepository(AttendanceRecord) private recordsRepo: Repository<AttendanceRecord>,
    @InjectRepository(AttendanceConfig) private configsRepo: Repository<AttendanceConfig>,
    @InjectRepository(AttendanceExcuse) private excusesRepo: Repository<AttendanceExcuse>,
    @InjectRepository(AttendanceNotificationThreshold) private thresholdsRepo: Repository<AttendanceNotificationThreshold>,
    @InjectRepository(ClassOffering) private offeringsRepo: Repository<ClassOffering>,
    @InjectRepository(StudentSectionAssignment) private assignmentsRepo: Repository<StudentSectionAssignment>,
    @InjectRepository(Student) private studentsRepo: Repository<Student>,
    @InjectRepository(Guardian) private guardiansRepo: Repository<Guardian>,
    @InjectRepository(StudentGuardian) private studentGuardiansRepo: Repository<StudentGuardian>,
    private communicationsService: CommunicationsService,
  ) {}

  /**
   * Real class roster for the attendance-entry grid: resolves the offering's
   * section, then its active student assignments, then the student records.
   * Returns enrollmentId/sectionId so bulk records satisfy the NOT NULL
   * columns on attendance_records.
   */
  async getClassRoster(tenantId: string, classOfferingId: string) {
    const offering = await this.offeringsRepo.findOne({ where: { id: classOfferingId, tenantId } });
    if (!offering) throw new NotFoundException(`Class offering ${classOfferingId} not found`);
    if (!offering.sectionId) return [];

    const assignments = await this.assignmentsRepo.find({
      where: { tenantId, sectionId: offering.sectionId, isActive: true },
    });
    if (assignments.length === 0) return [];

    const students = await this.studentsRepo.find({
      where: { tenantId, id: In(assignments.map((a) => a.studentId)) },
      order: { lastName: 'ASC', firstName: 'ASC' },
    });

    return students.map((s) => ({
      studentId: s.id,
      firstName: s.firstName,
      middleName: s.middleName,
      lastName: s.lastName,
      studentNumber: s.studentNumber,
      lrn: s.lrn,
      enrollmentId: assignments.find((a) => a.studentId === s.id)?.enrollmentId ?? null,
      sectionId: offering.sectionId,
    }));
  }

  // === Attendance Records ===
  async getAttendanceForClass(classOfferingId: string, attendanceDate: string, tenantId: string) {
    return this.recordsRepo.find({
      where: { classOfferingId, attendanceDate: attendanceDate as any, tenantId },
    });
  }

  async recordAttendance(data: Partial<AttendanceRecord>, recordedByUserId?: string) {
    const record = await this.normalizeAttendanceRecord(data);
    if (recordedByUserId) record.recordedByUserId = recordedByUserId;

    // Check if already recorded
    const existing = await this.recordsRepo.findOne({
      where: {
        studentId: record.studentId,
        classOfferingId: record.classOfferingId,
        attendanceDate: record.attendanceDate,
        tenantId: record.tenantId,
      },
    });

    if (existing) {
      Object.assign(existing, record);
      return this.recordsRepo.save(existing);
    }

    return this.recordsRepo.save(record);
  }

  async bulkRecordAttendance(records: Partial<AttendanceRecord>[], recordedByUserId?: string) {
    const results = { created: 0, updated: 0, errors: [] as any[] };

    for (const raw of records) {
      try {
        const record = await this.normalizeAttendanceRecord(raw);
        if (recordedByUserId) record.recordedByUserId = recordedByUserId;

        const existing = await this.recordsRepo.findOne({
          where: {
            studentId: record.studentId,
            classOfferingId: record.classOfferingId,
            attendanceDate: record.attendanceDate,
            tenantId: record.tenantId,
          },
        });

        if (existing) {
          Object.assign(existing, record);
          await this.recordsRepo.save(existing);
          results.updated++;
        } else {
          await this.recordsRepo.save(record);
          results.created++;
        }
      } catch (error: any) {
        results.errors.push({
          record: raw,
          error: error.message,
          status: error.getStatus?.() ?? 400,
        });
      }
    }

    return results;
  }

  /**
   * Complete a client-supplied attendance record so it satisfies the NOT NULL
   * foreign keys on attendance_records.
   *
   * The attendance grid sends { studentId, enrollmentId?, sectionId?,
   * classOfferingId, attendanceDate, status }. enrollmentId/sectionId are
   * derivable server-side — the grid's roster entry can legitimately lack an
   * enrollmentId (an empty string), and clients that only know the class
   * offering shouldn't need to resolve the rest themselves:
   *   sectionId     ← class offering
   *   enrollmentId  ← the student's enrollment in the offering's school year
   */
  private async normalizeAttendanceRecord(data: Partial<AttendanceRecord>): Promise<Partial<AttendanceRecord>> {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new BadRequestException('Record must be a JSON object');
    }

    const missing: string[] = [];
    if (!data.studentId) missing.push('studentId');
    if (!data.classOfferingId) missing.push('classOfferingId');
    if (!data.attendanceDate) missing.push('attendanceDate');
    if (!data.status) missing.push('status');
    if (missing.length) throw new BadRequestException(`Missing required field(s): ${missing.join(', ')}`);

    if (isNaN(new Date(data.attendanceDate as any).getTime())) {
      throw new BadRequestException('attendanceDate must be a valid date');
    }

    const offering = await this.offeringsRepo.findOne({
      where: { id: data.classOfferingId!, tenantId: data.tenantId! },
    });
    if (!offering) {
      throw new NotFoundException(`Class offering ${data.classOfferingId} not found`);
    }

    // An empty string from the UI means "not provided" — derive it.
    let enrollmentId = data.enrollmentId || undefined;
    if (!enrollmentId) {
      const enrollment = await this.recordsRepo.manager.getRepository(Enrollment).findOne({
        where: { tenantId: data.tenantId!, studentId: data.studentId!, schoolYearId: offering.schoolYearId },
        order: { createdAt: 'DESC' },
      });
      if (!enrollment) {
        throw new BadRequestException(
          `No enrollment found for student ${data.studentId} in the class offering's school year — cannot record attendance`,
        );
      }
      enrollmentId = enrollment.id;
    }

    return {
      ...data,
      enrollmentId,
      sectionId: data.sectionId || offering.sectionId,
    };
  }

  async getStudentAttendanceSummary(studentId: string, tenantId: string, schoolYearId: string) {
    const records = await this.recordsRepo.find({
      where: { studentId, tenantId },
      order: { attendanceDate: 'DESC' },
    });

    const summary = {
      totalDays: records.length,
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      late: records.filter(r => r.status === 'late').length,
      excused: records.filter(r => r.status === 'excused').length,
      attendanceRate: 0,
    };

    summary.attendanceRate = summary.totalDays > 0
      ? ((summary.present + summary.late) / summary.totalDays) * 100
      : 0;

    return summary;
  }

  // === Attendance Config ===
  async getConfigs(tenantId: string, branchId?: string) {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    return this.configsRepo.find({ where });
  }

  async createConfig(data: Partial<AttendanceConfig>) {
    const config = this.configsRepo.create(data);
    return this.configsRepo.save(config);
  }

  // === Excuses ===
  async getExcuses(tenantId: string, studentId?: string) {
    const where: any = { tenantId };
    if (studentId) where.studentId = studentId;
    return this.excusesRepo.find({ where, order: { submittedAt: 'DESC' } });
  }

  async createExcuse(data: Partial<AttendanceExcuse>) {
    const excuse = this.excusesRepo.create(data);
    return this.excusesRepo.save(excuse);
  }

  async reviewExcuse(id: string, tenantId: string, status: string, reviewedBy: string, notes?: string) {
    const excuse = await this.excusesRepo.findOne({ where: { id, tenantId } });
    if (!excuse) throw new NotFoundException('Excuse not found');
    excuse.status = status;
    excuse.reviewedByUserId = reviewedBy;
    if (notes) excuse.reviewNotes = notes;
    return this.excusesRepo.save(excuse);
  }

  // === Notification Thresholds ===
  async getThresholds(tenantId: string, branchId?: string) {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    return this.thresholdsRepo.find({ where });
  }

  async createThreshold(data: Partial<AttendanceNotificationThreshold>) {
    const threshold = this.thresholdsRepo.create(data);
    return this.thresholdsRepo.save(threshold);
  }

  /**
   * Evaluate the tenant's absence/tardiness thresholds for a student and,
   * when breached, dispatch `attendance_absence` notifications to every
   * guardian who `canReceiveNotifications`. Dispatch failures are logged and
   * swallowed so threshold checks never break attendance entry.
   */
  async checkAbsenceThresholds(tenantId: string, studentId: string) {
    // Get recent attendance
    const records = await this.recordsRepo.find({
      where: { studentId, tenantId },
      order: { attendanceDate: 'DESC' },
      take: 30,
    });

    const absentCount = records.filter(r => r.status === 'absent').length;
    const lateCount = records.filter(r => r.status === 'late').length;

    // Check consecutive absences
    let consecutiveAbsences = 0;
    for (const record of records) {
      if (record.status === 'absent') {
        consecutiveAbsences++;
      } else {
        break;
      }
    }

    // Get thresholds
    const thresholds = await this.thresholdsRepo.findOne({ where: { tenantId, isActive: true } });
    if (!thresholds) return { shouldNotify: false };

    const shouldNotify =
      absentCount >= thresholds.absenceCountThreshold ||
      lateCount >= thresholds.tardyCountThreshold ||
      consecutiveAbsences >= thresholds.consecutiveAbsenceThreshold;

    if (!shouldNotify) {
      return {
        shouldNotify,
        absentCount,
        lateCount,
        consecutiveAbsences,
        thresholds,
      };
    }

    const dispatched = await this.dispatchAbsenceAlerts(tenantId, studentId, {
      absentCount,
      lateCount,
      consecutiveAbsences,
    });

    return {
      shouldNotify,
      absentCount,
      lateCount,
      consecutiveAbsences,
      thresholds,
      notificationsDispatched: dispatched,
    };
  }

  /**
   * Send `attendance_absence` notifications for a student to all guardians
   * who opted into notifications. Uses the last absence date as the template
   * `{{date}}` variable. Best-effort: never throws to the caller.
   */
  private async dispatchAbsenceAlerts(
    tenantId: string,
    studentId: string,
    counts: { absentCount: number; lateCount: number; consecutiveAbsences: number },
  ): Promise<number> {
    try {      const student = await this.studentsRepo.findOne({ where: { id: studentId, tenantId } });
      if (!student) return 0;

      const links = await this.studentGuardiansRepo.find({ where: { tenantId, studentId } });
      if (links.length === 0) return 0;

      const guardianIds = [...new Set(links.map((l) => l.guardianId))];
      const guardians = await this.guardiansRepo.find({ where: { id: In(guardianIds), tenantId } });      const notifiable = guardians.filter((g) => {
        const link = links.find((l) => l.guardianId === g.id);
        return link?.canReceiveNotifications && (g.email || g.contactNumber);
      });
      if (notifiable.length === 0) return 0;

      const latestRecord = await this.recordsRepo.findOne({
        where: { studentId, tenantId, status: 'absent' },
        order: { attendanceDate: 'DESC' },
      });
      const absenceDate = latestRecord?.attendanceDate
        ? String(latestRecord.attendanceDate)
        : new Date().toISOString().slice(0, 10);

      let dispatched = 0;
      for (const guardian of notifiable) {
        const results = await this.communicationsService.dispatch({
          tenantId,
          branchId: student.branchId,
          eventType: 'attendance_absence',
          recipientUserId: guardian.id,
          recipientPhone: guardian.contactNumber ?? null,
          recipientEmail: guardian.email ?? null,
          variables: {
            studentName: `${student.firstName} ${student.lastName}`,
            date: absenceDate,
            absentCount: counts.absentCount,
            lateCount: counts.lateCount,
            consecutiveAbsences: counts.consecutiveAbsences,
          },
        });
        dispatched += results.length;
      }
      return dispatched;
    } catch (err) {
      this.logger.warn(
        `Absence-threshold dispatch failed for student ${studentId}: ${err instanceof Error ? err.message : err}`,
      );
      return 0;
    }
  }
}
