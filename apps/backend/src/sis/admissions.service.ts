import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Applicant } from './applicant.entity';
import { ApplicantStageConfig } from './applicant-stage-config.entity';
import { ApplicantStageTransition } from './applicant-stage-transition.entity';
import { SectionAssignmentRule } from './section-assignment-rule.entity';
import { Student } from './student.entity';
import { Enrollment } from './enrollment.entity';
import { SchoolYear } from '../academic/school-year.entity';
import { GradeLevel } from '../academic/grade-level.entity';
import { Curriculum } from '../academic/curriculum.entity';

@Injectable()
export class AdmissionsService {
  constructor(
    @InjectRepository(Applicant) private applicantsRepo: Repository<Applicant>,
    @InjectRepository(ApplicantStageConfig) private stagesRepo: Repository<ApplicantStageConfig>,
    @InjectRepository(ApplicantStageTransition) private transitionsRepo: Repository<ApplicantStageTransition>,
    @InjectRepository(SectionAssignmentRule) private rulesRepo: Repository<SectionAssignmentRule>,
    @InjectRepository(Student) private studentsRepo: Repository<Student>,
    @InjectRepository(Enrollment) private enrollmentsRepo: Repository<Enrollment>,
    @InjectRepository(SchoolYear) private schoolYearsRepo: Repository<SchoolYear>,
    @InjectRepository(GradeLevel) private gradeLevelsRepo: Repository<GradeLevel>,
    @InjectRepository(Curriculum) private curriculaRepo: Repository<Curriculum>,
    private dataSource: DataSource,
  ) {}

  // === Pipeline Stages ===
  async getStageConfigs(tenantId: string, branchId?: string) {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    return this.stagesRepo.find({ where, order: { sortOrder: 'ASC' } });
  }

  async createStageConfig(data: Partial<ApplicantStageConfig>) {
    const stage = this.stagesRepo.create(data);
    return this.stagesRepo.save(stage);
  }

  async updateStageConfig(id: string, tenantId: string, data: Partial<ApplicantStageConfig>) {
    const stage = await this.stagesRepo.findOne({ where: { id, tenantId } });
    if (!stage) throw new NotFoundException('Stage config not found');
    Object.assign(stage, data);
    return this.stagesRepo.save(stage);
  }

  // === Stage Transitions ===
  async getTransitions(tenantId: string) {
    return this.transitionsRepo.find({ where: { tenantId } });
  }

  async createTransition(data: Partial<ApplicantStageTransition>) {
    const transition = this.transitionsRepo.create(data);
    return this.transitionsRepo.save(transition);
  }

  // === Applicants (G-23) ===
  async createApplicant(data: Partial<Applicant>) {
    if (!data.firstName || !data.lastName) {
      throw new BadRequestException('firstName and lastName are required');
    }

    // Resolve default stage if none provided
    let stageId = data.stageId;
    let status = data.status ?? 'new';
    if (!stageId) {
      const defaultStage = await this.stagesRepo.findOne({
        where: { tenantId: data.tenantId, isDefault: true, isActive: true },
      });
      stageId = defaultStage?.id ?? null;
      if (defaultStage) status = defaultStage.stageCode;
    }

    const applicant = this.applicantsRepo.create({ ...data, stageId, status });
    return this.applicantsRepo.save(applicant);
  }

  async getApplicants(tenantId: string, status?: string) {
    const where: any = { tenantId };
    if (status) where.status = status;
    return this.applicantsRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOneApplicant(id: string, tenantId: string) {
    const applicant = await this.applicantsRepo.findOne({ where: { id, tenantId } });
    if (!applicant) throw new NotFoundException(`Applicant ${id} not found`);
    return applicant;
  }

  async updateApplicant(id: string, tenantId: string, data: Partial<Applicant>) {
    const applicant = await this.findOneApplicant(id, tenantId);
    Object.assign(applicant, data);
    return this.applicantsRepo.save(applicant);
  }

  /**
   * Move an applicant to another pipeline stage (Kanban drag).
   * Validates the stage belongs to the tenant and syncs the status mirror.
   */
  async moveApplicantToStage(id: string, tenantId: string, stageId: string) {
    const applicant = await this.findOneApplicant(id, tenantId);
    const stage = await this.stagesRepo.findOne({ where: { id: stageId, tenantId } });
    if (!stage) throw new NotFoundException(`Stage ${stageId} not found`);

    applicant.stageId = stage.id;
    applicant.status = stage.stageCode;
    return this.applicantsRepo.save(applicant);
  }

  /**
   * Convert an accepted applicant into a real student with an enrollment.
   *
   * Student creation + enrollment creation + applicant stage-move run in ONE
   * transaction: a failure between the writes would leave inconsistent state.
   * Rolling back together keeps all rows consistent.
   */
  async convertApplicantToStudent(
    id: string,
    tenantId: string,
    enrollmentOptions?: {
      schoolYearId?: string;
      gradeLevelId?: string;
      curriculumId?: string;
      sectionId?: string;
      strandId?: string;
      programId?: string;
      notes?: string;
    },
  ) {
    const applicant = await this.findOneApplicant(id, tenantId);

    // Guard against double conversion
    const existing = await this.studentsRepo.findOne({
      where: { tenantId, firstName: applicant.firstName, lastName: applicant.lastName },
    });
    if (existing) {
      throw new BadRequestException(
        `A student named ${applicant.firstName} ${applicant.lastName} already exists (id ${existing.id})`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const studentsRepo = manager.getRepository(Student);
      const enrollmentsRepo = manager.getRepository(Enrollment);
      const applicantsRepo = manager.getRepository(Applicant);
      const stagesRepo = manager.getRepository(ApplicantStageConfig);
      const schoolYearsRepo = manager.getRepository(SchoolYear);
      const gradeLevelsRepo = manager.getRepository(GradeLevel);
      const curriculaRepo = manager.getRepository(Curriculum);

      // Resolve enrollment defaults if not provided
      let schoolYearId = enrollmentOptions?.schoolYearId;
      if (!schoolYearId) {
        const activeSY = await schoolYearsRepo.findOne({
          where: { tenantId, status: 'active' },
          order: { startDate: 'DESC' },
        });
        schoolYearId = activeSY?.id;
        if (!schoolYearId) {
          throw new BadRequestException(
            'No active school year found. Please provide schoolYearId or activate a school year.',
          );
        }
      }

      let gradeLevelId = enrollmentOptions?.gradeLevelId;
      if (!gradeLevelId) {
        const firstGL = await gradeLevelsRepo.findOne({
          where: { tenantId },
          order: { code: 'ASC' },
        });
        gradeLevelId = firstGL?.id;
        if (!gradeLevelId) {
          throw new BadRequestException(
            'No grade level found. Please provide gradeLevelId or configure grade levels.',
          );
        }
      }

      let curriculumId = enrollmentOptions?.curriculumId;
      if (!curriculumId) {
        const branchId = applicant.branchId;
        const curriculum = await curriculaRepo.findOne({
          where: { tenantId, branchId, gradeLevelId },
          order: { createdAt: 'DESC' },
        });
        curriculumId = curriculum?.id;
        if (!curriculumId) {
          throw new BadRequestException(
            `No curriculum found for branch ${branchId} and grade level ${gradeLevelId}. Please provide curriculumId.`,
          );
        }
      }

      const saved = await studentsRepo.save(
        studentsRepo.create({
          tenantId,
          branchId: applicant.branchId ?? undefined,
          firstName: applicant.firstName,
          middleName: applicant.middleName ?? undefined,
          lastName: applicant.lastName,
          birthDate: applicant.birthDate ?? undefined,
          sex: applicant.gender ?? undefined,
          address: applicant.address ?? undefined,
          status: 'active',
          customFields: { convertedFromApplicantId: applicant.id },
        }),
      );

      // Create enrollment for the new student
      const enrollment = await enrollmentsRepo.save(
        enrollmentsRepo.create({
          tenantId,
          branchId: applicant.branchId ?? tenantId,
          studentId: saved.id,
          schoolYearId,
          curriculumId,
          gradeLevelId,
          sectionId: enrollmentOptions?.sectionId ?? undefined,
          strandId: enrollmentOptions?.strandId ?? undefined,
          programId: enrollmentOptions?.programId ?? undefined,
          status: 'enrolled',
          enrolledAt: new Date(),
          notes: enrollmentOptions?.notes ?? `Converted from applicant ${applicant.id}`,
          customFields: { convertedFromApplicantId: applicant.id },
        }),
      );

      // Move applicant to the terminal 'enrolled' stage if configured
      const enrolledStage = await stagesRepo.findOne({
        where: { tenantId, stageCode: 'enrolled', isActive: true },
      });
      if (enrolledStage) {
        applicant.stageId = enrolledStage.id;
        applicant.status = enrolledStage.stageCode;
        applicant.notes = [
          applicant.notes,
          `Converted to student ${saved.id} with enrollment ${enrollment.id}`,
        ]
          .filter(Boolean)
          .join(' | ');
        await applicantsRepo.save(applicant);
      }

      return { student: saved, enrollment };
    });
  }

  // === Pipeline Kanban ===
  async getApplicantsByStage(tenantId: string) {
    const stages = await this.getStageConfigs(tenantId);
    const applicants = await this.applicantsRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });

    const pipeline: Record<string, Applicant[]> = {};
    for (const stage of stages) pipeline[stage.stageCode] = [];

    const fallbackStage = stages.find((s) => s.isDefault) ?? stages[0];
    for (const applicant of applicants) {
      const stage =
        stages.find((s) => s.id === applicant.stageId) ??
        stages.find((s) => s.stageCode === applicant.status) ??
        fallbackStage;
      if (stage && pipeline[stage.stageCode]) pipeline[stage.stageCode].push(applicant);
    }

    return { stages, pipeline };
  }

  // === Section Assignment Rules ===
  async getSectionRules(tenantId: string, sectionId?: string) {
    const where: any = { tenantId };
    if (sectionId) where.sectionId = sectionId;
    return this.rulesRepo.find({ where, order: { priority: 'ASC' } });
  }

  async createSectionRule(data: Partial<SectionAssignmentRule>) {
    const rule = this.rulesRepo.create(data);
    return this.rulesRepo.save(rule);
  }

  async updateSectionRule(id: string, tenantId: string, data: Partial<SectionAssignmentRule>) {
    const rule = await this.rulesRepo.findOne({ where: { id, tenantId } });
    if (!rule) throw new NotFoundException('Rule not found');
    Object.assign(rule, data);
    return this.rulesRepo.save(rule);
  }

  // === Bulk Import ===
  async bulkImportStudents(tenantId: string, records: Partial<Student>[]) {
    const results = { created: 0, skipped: 0, errors: [] as any[] };

    for (const record of records) {
      try {
        if (record.lrn && !/^\d{12}$/.test(record.lrn)) {
          results.errors.push({ record, error: 'Invalid LRN format' });
          results.skipped++;
          continue;
        }

        if (record.lrn) {
          const existing = await this.studentsRepo.findOne({ where: { lrn: record.lrn, tenantId } });
          if (existing) {
            results.errors.push({ record, error: 'LRN already exists' });
            results.skipped++;
            continue;
          }
        }

        const student = this.studentsRepo.create({ ...record, tenantId });
        await this.studentsRepo.save(student);
        results.created++;
      } catch (error: any) {
        results.errors.push({ record, error: error.message });
        results.skipped++;
      }
    }

    return results;
  }
}
