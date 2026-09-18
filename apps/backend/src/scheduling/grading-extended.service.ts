import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { GradeEntry } from '../grading/entities/grade-entry.entity';
import { GradeChangeRequest } from '../grading/entities/grade-change-request.entity';
import { AuditEvent } from '../config/audit-event.entity';
import { PermanentRecord } from './permanent-record.entity';
import { ClassOffering } from './class-offering.entity';
import { Subject } from '../academic/subject.entity';
import { GradeComponent } from '../grading/entities/grade-component.entity';
import { GradingSystem } from '../grading/entities/grading-system.entity';
import { Enrollment } from '../sis/enrollment.entity';

@Injectable()
export class GradingExtendedService {
  constructor(
    @InjectRepository(GradeEntry) private gradeEntriesRepo: Repository<GradeEntry>,
    @InjectRepository(GradeChangeRequest) private changeRequestsRepo: Repository<GradeChangeRequest>,
    @InjectRepository(PermanentRecord) private permanentRecordsRepo: Repository<PermanentRecord>,
    @InjectRepository(AuditEvent) private auditRepo: Repository<AuditEvent>,
  ) {}

  // === Grade Entries ===
  /**
   * Transmute a percentage into the grading system's reported grade using its
   * configured `config.transmutation` band table ({ "minPercentage": grade }).
   * Falls back to rounding the percentage when the system defines no table.
   */
  private async transmuteGrade(gradingSystemId: string, percentage: number): Promise<number> {
    const system = await this.gradeEntriesRepo.manager
      .getRepository(GradingSystem)
      .findOne({ where: { id: gradingSystemId } });
    const table = (system?.config as any)?.transmutation;
    if (!table || typeof table !== 'object') return Math.round(percentage);

    const bands = Object.entries(table as Record<string, number>)
      .map(([min, grade]) => ({ min: Number(min), grade: Number(grade) }))
      .filter((b) => !Number.isNaN(b.min) && !Number.isNaN(b.grade))
      .sort((a, b) => b.min - a.min);
    if (bands.length === 0) return Math.round(percentage);

    const match = bands.find((b) => percentage >= b.min);
    return match ? match.grade : bands[bands.length - 1].grade;
  }

  /**
   * Grades for one student, enriched for portal display: subject title,
   * component name, and class-offering grouping keys. Raw rows showed
   * UUIDs in the guardian portal.
   */
  async getStudentGrades(studentId: string, tenantId: string, termId?: string) {
    const where: any = { studentId, tenantId };
    if (termId) where.termId = termId;
    const entries = await this.gradeEntriesRepo.find({ where, order: { classOfferingId: 'ASC', gradeComponentId: 'ASC' } });
    if (entries.length === 0) return [];

    const offeringIds = Array.from(new Set(entries.map((e) => e.classOfferingId)));
    const componentIds = Array.from(new Set(entries.map((e) => e.gradeComponentId)));

    const [offerings, components] = await Promise.all([
      this.gradeEntriesRepo.manager.getRepository(ClassOffering).find({ where: { id: In(offeringIds) } }),
      this.gradeEntriesRepo.manager.getRepository(GradeComponent).find({ where: { id: In(componentIds) } }),
    ]);

    const subjectIds = Array.from(new Set(offerings.map((o) => o.subjectId)));
    const subjects = subjectIds.length
      ? await this.gradeEntriesRepo.manager.getRepository(Subject).find({ where: { id: In(subjectIds) } })
      : [];

    const subjectById = new Map(subjects.map((s) => [s.id, s]));
    const componentById = new Map(components.map((c) => [c.id, c]));
    const offeringById = new Map(offerings.map((o) => [o.id, o]));

    return entries.map((e) => {
      const offering = offeringById.get(e.classOfferingId);
      const subject = offering ? subjectById.get(offering.subjectId) : undefined;
      const component = componentById.get(e.gradeComponentId);
      return {
        id: e.id,
        classOfferingId: e.classOfferingId,
        subjectName: subject?.title ?? 'Subject',
        componentName: component?.name ?? 'Component',
        rawScore: e.score,
        maxScore: e.maxScore,
        percentage: e.percentage,
        transmutedGrade: e.transmutedGrade,
        isFinalized: e.locked,
        termId: e.termId,
      };
    });
  }

  // === Grade Change Requests ===

  /** Matches a canonical UUID string (avoids persisting 'system' etc. into uuid FKs). */
  private isUuid(v: string | null | undefined): v is string {
    return !!v && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v);
  }

  async createChangeRequest(data: Partial<GradeChangeRequest> & { newScore?: number; maxScore?: number }) {
    // Normalize legacy flat newScore payloads into the canonical new_grade JSONB.
    const row: Partial<GradeChangeRequest> = { ...data };
    row.newGrade = row.newGrade ?? {};
    if (data.newScore !== undefined) row.newGrade.score = data.newScore;
    if (data.maxScore !== undefined) row.newGrade.maxScore = data.maxScore;
    delete (row as any).newScore;
    delete (row as any).maxScore;

    // Snapshot the current entry into old_grade so the diff is auditable.
    if (row.gradeEntryId) {
      const current = await this.gradeEntriesRepo.findOne({ where: { id: row.gradeEntryId } });
      if (current) {
        row.branchId = row.branchId ?? current.branchId;
        row.studentId = row.studentId ?? current.studentId;
        row.classOfferingId = row.classOfferingId ?? current.classOfferingId;
        row.termId = row.termId ?? current.termId;
        row.oldGrade = {
          score: current.score,
          percentage: current.percentage,
          descriptiveGrade: current.descriptiveGrade,
          locked: current.locked,
        };
      }
    }

    const request = this.changeRequestsRepo.create(row as any);
    return this.changeRequestsRepo.save(request);
  }

  async approveChangeRequest(id: string, tenantId: string, approvedBy: string) {
    // Reject/Optimistic: re-fetch + write within a transaction so the applied
    // grade change and its audit row commit atomically.
    return this.changeRequestsRepo.manager.transaction(async (manager) => {
      const gcrRepo = manager.getRepository(GradeChangeRequest);
      const entryRepo = manager.getRepository(GradeEntry);
      const auditRepo = manager.getRepository(AuditEvent);

      const request = await gcrRepo.findOne({ where: { id, tenantId } });
      if (!request) throw new NotFoundException('Grade change request not found');
      if (request.status !== 'pending') throw new BadRequestException('Request is not pending');
      if (request.gradeEntryId) {
        const gradeEntry = await entryRepo.findOne({ where: { id: request.gradeEntryId } });
        if (!gradeEntry) throw new NotFoundException('Target grade entry not found');
        if (gradeEntry.locked) {
          throw new BadRequestException('Cannot approve change request: grades are locked for this term');
        }

        const ng = request.newGrade ?? {};
        const newScore = Number(ng.score ?? ng.percentage ?? ng.transmutedGrade ?? gradeEntry.score ?? 0);
        const max = ng.maxScore != null ? Number(ng.maxScore) : Number(gradeEntry.maxScore ?? 0);
        const percentage = max > 0 ? (newScore / max) * 100 : newScore;

        gradeEntry.score = newScore;
        gradeEntry.percentage = Math.round(percentage * 100) / 100;
        gradeEntry.transmutedGrade = await this.transmuteGrade(gradeEntry.gradingSystemId, gradeEntry.percentage);
        if (ng.descriptiveGrade) gradeEntry.descriptiveGrade = ng.descriptiveGrade;
        gradeEntry.isManualOverride = true;
        gradeEntry.overrideReason = request.reason;
        gradeEntry.overriddenAt = new Date();
        if (this.isUuid(request.approvedBy ?? approvedBy)) {
          gradeEntry.overriddenBy = request.approvedBy ?? approvedBy;
        }
        await entryRepo.save(gradeEntry);
      }

      request.status = 'approved';
      if (this.isUuid(approvedBy)) request.approvedBy = approvedBy;
      request.approvedAt = new Date();
      const saved = await gcrRepo.save(request);

      await auditRepo.save(auditRepo.create({
        tenantId,
        branchId: request.branchId,
        actorUserId: this.isUuid(approvedBy) ? approvedBy : undefined,
        entityType: 'grade_change_request',
        entityId: id,
        action: 'grade-change-request.approve',
        beforeState: { status: 'pending' },
        afterState: { status: 'approved', approvedBy: saved.approvedBy, approvedAt: saved.approvedAt, newGrade: saved.newGrade },
      }));

      return saved;
    });
  }

  async rejectChangeRequest(id: string, tenantId: string, approvedBy: string, reason?: string) {
    return this.changeRequestsRepo.manager.transaction(async (manager) => {
      const gcrRepo = manager.getRepository(GradeChangeRequest);
      const auditRepo = manager.getRepository(AuditEvent);

      const request = await gcrRepo.findOne({ where: { id, tenantId } });
      if (!request) throw new NotFoundException('Grade change request not found');
      if (request.status !== 'pending') throw new BadRequestException('Only pending requests can be rejected');

      request.status = 'rejected';
      if (this.isUuid(approvedBy)) request.approvedBy = approvedBy;
      request.approvedAt = new Date();
      if (reason) request.reason = reason;
      const saved = await gcrRepo.save(request);

      await auditRepo.save(auditRepo.create({
        tenantId,
        branchId: request.branchId,
        actorUserId: this.isUuid(approvedBy) ? approvedBy : undefined,
        entityType: 'grade_change_request',
        entityId: id,
        action: 'grade-change-request.reject',
        beforeState: { status: 'pending' },
        afterState: { status: 'rejected', approvedBy: saved.approvedBy, approvedAt: saved.approvedAt, reason: saved.reason },
      }));

      return saved;
    });
  }

  async getChangeRequests(tenantId: string, classOfferingId?: string) {
    const where: any = { tenantId };
    if (classOfferingId) where.classOfferingId = classOfferingId;
    return this.changeRequestsRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  // === Permanent Records (Form 137 / TOR) ===
  async getPermanentRecord(studentId: string, tenantId: string, schoolYearId: string) {
    return this.permanentRecordsRepo.findOne({
      where: { studentId, tenantId, schoolYearId },
    });
  }

  /**
   * Create a permanent record, deriving what clients don't send:
   *   enrollmentId  ← the student's enrollment for the record's school year
   *   gradeLevelId  ← that enrollment's grade level
   *   recordType    ← defaults to 'report_card'
   */
  async createPermanentRecord(data: Partial<PermanentRecord>) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new BadRequestException('Request body must be a JSON object');
    }

    const missing: string[] = [];
    if (!data.studentId) missing.push('studentId');
    if (!data.schoolYearId) missing.push('schoolYearId');
    if (missing.length) throw new BadRequestException(`Missing required field(s): ${missing.join(', ')}`);

    let enrollmentId = data.enrollmentId;
    let gradeLevelId = data.gradeLevelId;
    if (!enrollmentId || !gradeLevelId) {
      const enrollment = await this.permanentRecordsRepo.manager.getRepository(Enrollment).findOne({
        where: { tenantId: data.tenantId, studentId: data.studentId, schoolYearId: data.schoolYearId },
        order: { createdAt: 'DESC' },
      });
      if (!enrollment) {
        throw new BadRequestException(
          `No enrollment found for student ${data.studentId} in school year ${data.schoolYearId} — cannot create a permanent record`,
        );
      }
      enrollmentId = enrollmentId ?? enrollment.id;
      gradeLevelId = gradeLevelId ?? enrollment.gradeLevelId;
    }
    if (!gradeLevelId) {
      throw new BadRequestException('gradeLevelId could not be derived: the enrollment has no grade level');
    }

    const record = this.permanentRecordsRepo.create({
      ...data,
      enrollmentId,
      gradeLevelId,
      recordType: data.recordType ?? 'report_card',
    });
    return this.permanentRecordsRepo.save(record);
  }

  async finalizePermanentRecord(id: string, tenantId: string, verifiedBy: string) {
    const record = await this.permanentRecordsRepo.findOne({ where: { id, tenantId } });
    if (!record) throw new NotFoundException('Permanent record not found');

    record.status = 'verified';
    record.verifiedByUserId = verifiedBy;
    record.verifiedAt = new Date();
    return this.permanentRecordsRepo.save(record);
  }

  async generateForm137(studentId: string, tenantId: string, schoolYearId: string) {
    const record = await this.getPermanentRecord(studentId, tenantId, schoolYearId);
    if (!record) throw new NotFoundException('No permanent record found');

    // In production, this would generate a PDF
    return {
      recordType: 'Form 137',
      studentId,
      schoolYearId,
      grades: record.grades,
      attendance: record.attendance,
      generalAverage: record.generalAverage,
      rank: record.rank,
      verificationCode: record.verificationCode,
    };
  }

  async generateTOR(studentId: string, tenantId: string) {
    // Transcript of Records - all school years
    const records = await this.permanentRecordsRepo.find({
      where: { studentId, tenantId },
      order: { schoolYearId: 'ASC' },
    });

    return {
      recordType: 'TOR',
      studentId,
      records: records.map(r => ({
        schoolYearId: r.schoolYearId,
        gradeLevelId: r.gradeLevelId,
        grades: r.grades,
        generalAverage: r.generalAverage,
        rank: r.rank,
      })),
    };
  }
}
