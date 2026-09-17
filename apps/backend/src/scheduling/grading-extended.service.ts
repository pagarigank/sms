import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { GradeEntry } from './grade-entry.entity';
import { GradeChangeRequest } from './grade-change-request.entity';
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
  ) {}

  // === Grade Entries ===
  async getGradebook(classOfferingId: string, tenantId: string) {
    return this.gradeEntriesRepo.find({
      where: { classOfferingId, tenantId },
      order: { studentId: 'ASC', gradeComponentId: 'ASC' },
    });
  }

  async enterGrade(data: Partial<GradeEntry>, enteredByUserId?: string) {
    const entry = await this.normalizeGradeEntry(data);
    if (enteredByUserId) entry.enteredByUserId = enteredByUserId;
    return this.gradeEntriesRepo.save(entry);
  }

  async bulkEnterGrades(entries: Partial<GradeEntry>[]) {
    const results = { created: 0, updated: 0, errors: [] as any[] };

    for (const raw of entries) {
      try {
        const entry = await this.normalizeGradeEntry(raw);
        const existing = await this.gradeEntriesRepo.findOne({
          where: {
            studentId: entry.studentId,
            classOfferingId: entry.classOfferingId,
            gradeComponentId: entry.gradeComponentId,
            termId: entry.termId,
            tenantId: entry.tenantId,
          },
        });

        if (existing) {
          Object.assign(existing, entry);
          await this.gradeEntriesRepo.save(existing);
          results.updated++;
        } else {
          const newEntry = this.gradeEntriesRepo.create(entry);
          await this.gradeEntriesRepo.save(newEntry);
          results.created++;
        }
      } catch (error: any) {
        results.errors.push({
          entry: raw,
          error: error.message,
          status: error.getStatus?.() ?? 400,
        });
      }
    }

    return results;
  }

  /**
   * Complete a client-supplied grade entry so it satisfies the NOT NULL
   * foreign keys on grade_entries, and derive the computed score columns.
   *
   * Clients (the gradebook grid) send only { studentId, classOfferingId,
   * gradeComponentId, rawScore } — everything else is derivable server-side:
   *   termId            ← class offering
   *   gradingSystemId   ← grade component
   *   enrollmentId      ← the student's enrollment in the offering's school year
   *   percentage        ← rawScore / maxScore × 100 (rawScore as-is when no max is set)
   *   transmutedGrade   ← the grading system's configured transmutation table
   *                       (e.g. DepEd Order 8 s. 2015 — nothing hard-coded here)
   */
  private async normalizeGradeEntry(data: Partial<GradeEntry>): Promise<GradeEntry> {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new BadRequestException('Request body must be a JSON object');
    }

    const missing: string[] = [];
    if (!data.studentId) missing.push('studentId');
    if (!data.classOfferingId) missing.push('classOfferingId');
    if (!data.gradeComponentId) missing.push('gradeComponentId');
    if (missing.length) throw new BadRequestException(`Missing required field(s): ${missing.join(', ')}`);

    // `score` is a common client alias for rawScore — accept it but never store it.
    const payload: Partial<GradeEntry> & { score?: unknown } = { ...data };
    if (payload.rawScore == null && payload.score != null) payload.rawScore = payload.score as number;
    delete payload.score;

    const rawScore = payload.rawScore == null ? null : Number(payload.rawScore);
    if (rawScore != null && Number.isNaN(rawScore)) {
      throw new BadRequestException('rawScore (or score) must be a number');
    }
    const maxScore = payload.maxScore == null ? null : Number(payload.maxScore);
    if (maxScore != null && (Number.isNaN(maxScore) || maxScore <= 0)) {
      throw new BadRequestException('maxScore must be a positive number');
    }

    const offeringsRepo = this.gradeEntriesRepo.manager.getRepository(ClassOffering);
    const offering = await offeringsRepo.findOne({ where: { id: payload.classOfferingId, tenantId: payload.tenantId } });
    if (!offering) throw new NotFoundException(`Class offering ${payload.classOfferingId} not found`);

    const componentsRepo = this.gradeEntriesRepo.manager.getRepository(GradeComponent);
    const component = await componentsRepo.findOne({ where: { id: payload.gradeComponentId, tenantId: payload.tenantId } });
    if (!component) throw new NotFoundException(`Grade component ${payload.gradeComponentId} not found`);

    let enrollmentId: string | undefined = payload.enrollmentId;
    if (!enrollmentId) {
      const enrollment = await this.gradeEntriesRepo.manager.getRepository(Enrollment).findOne({
        where: { tenantId: payload.tenantId, studentId: payload.studentId, schoolYearId: offering.schoolYearId },
        order: { createdAt: 'DESC' },
      });
      if (!enrollment) {
        throw new BadRequestException(
          `No enrollment found for student ${payload.studentId} in the class offering's school year — cannot record a grade`,
        );
      }
      enrollmentId = enrollment.id;
    }

    const percentage =
      rawScore == null ? null : maxScore ? (rawScore / maxScore) * 100 : rawScore;
    const roundedPercentage = percentage == null ? null : Math.round(percentage * 100) / 100;
    const transmutedGrade =
      roundedPercentage == null ? null : await this.transmuteGrade(component.gradingSystemId, roundedPercentage);

    return this.gradeEntriesRepo.create({
      ...payload,
      tenantId: payload.tenantId!,
      enrollmentId,
      termId: payload.termId ?? offering.termId,
      gradingSystemId: component.gradingSystemId,
      rawScore,
      maxScore,
      percentage: roundedPercentage,
      transmutedGrade,
    });
  }

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

  async finalizeGrades(classOfferingId: string, termId: string, tenantId: string) {
    const entries = await this.gradeEntriesRepo.find({
      where: { classOfferingId, termId, tenantId },
    });

    for (const entry of entries) {
      entry.isFinalized = true;
      await this.gradeEntriesRepo.save(entry);
    }

    return { finalized: entries.length };
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
        rawScore: e.rawScore,
        maxScore: e.maxScore,
        percentage: e.percentage,
        transmutedGrade: e.transmutedGrade,
        isFinalized: e.isFinalized,
        termId: e.termId,
      };
    });
  }

  // === Grade Change Requests ===
  async createChangeRequest(data: Partial<GradeChangeRequest>) {
    const request = this.changeRequestsRepo.create(data);
    return this.changeRequestsRepo.save(request);
  }

  async approveChangeRequest(id: string, tenantId: string, approvedBy: string) {
    const request = await this.changeRequestsRepo.findOne({ where: { id, tenantId } });
    if (!request) throw new NotFoundException('Grade change request not found');
    if (request.status !== 'pending') throw new BadRequestException('Request is not pending');

    // Update the grade entry, keeping the computed columns consistent.
    if (request.gradeEntryId) {
      const gradeEntry = await this.gradeEntriesRepo.findOne({ where: { id: request.gradeEntryId } });
      if (gradeEntry) {
        gradeEntry.rawScore = request.newScore;
        const percentage =
          gradeEntry.maxScore && gradeEntry.maxScore > 0
            ? (Number(request.newScore) / Number(gradeEntry.maxScore)) * 100
            : Number(request.newScore);
        gradeEntry.percentage = Math.round(percentage * 100) / 100;
        gradeEntry.transmutedGrade = await this.transmuteGrade(gradeEntry.gradingSystemId, gradeEntry.percentage);
        await this.gradeEntriesRepo.save(gradeEntry);
      }
    }

    request.status = 'approved';
    request.approvedByUserId = approvedBy;
    request.approvedAt = new Date();
    return this.changeRequestsRepo.save(request);
  }

  async rejectChangeRequest(id: string, tenantId: string, approvedBy: string, reason?: string) {
    const request = await this.changeRequestsRepo.findOne({ where: { id, tenantId } });
    if (!request) throw new NotFoundException('Grade change request not found');

    request.status = 'rejected';
    request.approvedByUserId = approvedBy;
    request.approvedAt = new Date();
    if (reason) request.reason = reason;
    return this.changeRequestsRepo.save(request);
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
