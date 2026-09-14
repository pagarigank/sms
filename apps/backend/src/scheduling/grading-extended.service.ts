import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { GradeEntry } from './grade-entry.entity';
import { GradeChangeRequest } from './grade-change-request.entity';
import { PermanentRecord } from './permanent-record.entity';
import { ClassOffering } from './class-offering.entity';
import { Subject } from '../academic/subject.entity';
import { GradeComponent } from '../academic/grade-component.entity';

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

  async enterGrade(data: Partial<GradeEntry>) {
    const entry = this.gradeEntriesRepo.create(data);
    return this.gradeEntriesRepo.save(entry);
  }

  async bulkEnterGrades(entries: Partial<GradeEntry>[]) {
    const results = { created: 0, updated: 0, errors: [] as any[] };

    for (const entry of entries) {
      try {
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
        results.errors.push({ entry, error: error.message });
      }
    }

    return results;
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

    // Update the grade entry
    if (request.gradeEntryId) {
      const gradeEntry = await this.gradeEntriesRepo.findOne({ where: { id: request.gradeEntryId } });
      if (gradeEntry) {
        gradeEntry.rawScore = request.newScore;
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

  async createPermanentRecord(data: Partial<PermanentRecord>) {
    const record = this.permanentRecordsRepo.create(data);
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
