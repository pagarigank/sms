import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Applicant } from './applicant.entity';
import { ApplicantStageConfig } from './applicant-stage-config.entity';
import { ApplicantStageTransition } from './applicant-stage-transition.entity';
import { SectionAssignmentRule } from './section-assignment-rule.entity';
import { Student } from './student.entity';
import { Enrollment } from './enrollment.entity';

@Injectable()
export class AdmissionsService {
  constructor(
    @InjectRepository(Applicant) private applicantsRepo: Repository<Applicant>,
    @InjectRepository(ApplicantStageConfig) private stagesRepo: Repository<ApplicantStageConfig>,
    @InjectRepository(ApplicantStageTransition) private transitionsRepo: Repository<ApplicantStageTransition>,
    @InjectRepository(SectionAssignmentRule) private rulesRepo: Repository<SectionAssignmentRule>,
    @InjectRepository(Student) private studentsRepo: Repository<Student>,
    @InjectRepository(Enrollment) private enrollmentsRepo: Repository<Enrollment>,
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
   * Convert an accepted applicant into a real Student (G-23 completion).
   * Applicant is marked 'enrolled' and linked via metadata for traceability.
   */
  /**
   * Convert an accepted applicant into a real student.
   *
   * Student creation + applicant stage-move run in ONE transaction: a failure
   * between the two writes would leave a student with an applicant still
   * 'pending', and the name-based double-conversion guard would then block
   * any retry — an operator dead-end. Rolling back together keeps both rows
   * consistent (either both commit or neither does).
   */
  async convertApplicantToStudent(id: string, tenantId: string) {
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
      const applicantsRepo = manager.getRepository(Applicant);
      const stagesRepo = manager.getRepository(ApplicantStageConfig);

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

      // Move applicant to the terminal 'enrolled' stage if configured
      const enrolledStage = await stagesRepo.findOne({
        where: { tenantId, stageCode: 'enrolled', isActive: true },
      });
      if (enrolledStage) {
        applicant.stageId = enrolledStage.id;
        applicant.status = enrolledStage.stageCode;
        applicant.notes = [applicant.notes, `Converted to student ${saved.id}`].filter(Boolean).join(' | ');
        await applicantsRepo.save(applicant);
      }

      return saved;
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
