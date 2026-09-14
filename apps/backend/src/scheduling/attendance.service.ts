import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AttendanceRecord } from './attendance-record.entity';
import { AttendanceConfig } from './attendance-config.entity';
import { AttendanceExcuse } from './attendance-excuse.entity';
import { AttendanceNotificationThreshold } from './attendance-notification-threshold.entity';
import { ClassOffering } from './class-offering.entity';
import { StudentSectionAssignment } from '../sis/student-section-assignment.entity';
import { Student } from '../sis/student.entity';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceRecord) private recordsRepo: Repository<AttendanceRecord>,
    @InjectRepository(AttendanceConfig) private configsRepo: Repository<AttendanceConfig>,
    @InjectRepository(AttendanceExcuse) private excusesRepo: Repository<AttendanceExcuse>,
    @InjectRepository(AttendanceNotificationThreshold) private thresholdsRepo: Repository<AttendanceNotificationThreshold>,
    @InjectRepository(ClassOffering) private offeringsRepo: Repository<ClassOffering>,
    @InjectRepository(StudentSectionAssignment) private assignmentsRepo: Repository<StudentSectionAssignment>,
    @InjectRepository(Student) private studentsRepo: Repository<Student>,
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

  async recordAttendance(data: Partial<AttendanceRecord>) {
    // Check if already recorded
    const existing = await this.recordsRepo.findOne({
      where: {
        studentId: data.studentId,
        classOfferingId: data.classOfferingId,
        attendanceDate: data.attendanceDate,
        tenantId: data.tenantId,
      },
    });

    if (existing) {
      Object.assign(existing, data);
      return this.recordsRepo.save(existing);
    }

    const record = this.recordsRepo.create(data);
    return this.recordsRepo.save(record);
  }

  async bulkRecordAttendance(records: Partial<AttendanceRecord>[]) {
    const results = { created: 0, updated: 0, errors: [] as any[] };

    for (const record of records) {
      try {
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
          const newRecord = this.recordsRepo.create(record);
          await this.recordsRepo.save(newRecord);
          results.created++;
        }
      } catch (error: any) {
        results.errors.push({ record, error: error.message });
      }
    }

    return results;
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

    return {
      shouldNotify,
      absentCount,
      lateCount,
      consecutiveAbsences,
      thresholds,
    };
  }
}
