import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicantStageConfig } from './applicant-stage-config.entity';
import { ApplicantStageTransition } from './applicant-stage-transition.entity';
import { SectionAssignmentRule } from './section-assignment-rule.entity';
import { Student } from './student.entity';
import { Enrollment } from './enrollment.entity';

@Injectable()
export class AdmissionsService {
  constructor(
    @InjectRepository(ApplicantStageConfig) private stagesRepo: Repository<ApplicantStageConfig>,
    @InjectRepository(ApplicantStageTransition) private transitionsRepo: Repository<ApplicantStageTransition>,
    @InjectRepository(SectionAssignmentRule) private rulesRepo: Repository<SectionAssignmentRule>,
    @InjectRepository(Student) private studentsRepo: Repository<Student>,
    @InjectRepository(Enrollment) private enrollmentsRepo: Repository<Enrollment>,
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

  // === Applicant Pipeline (Kanban) ===
  async getApplicantsByStage(tenantId: string) {
    const stages = await this.getStageConfigs(tenantId);
    const students = await this.studentsRepo.find({ where: { tenantId } });

    // Group students by their enrollment status
    const pipeline: Record<string, Student[]> = {};
    for (const stage of stages) {
      pipeline[stage.stageCode] = [];
    }

    // In a real implementation, applicants would have a current_stage_id field
    // For now, use enrollment status as a proxy
    for (const student of students) {
      const stageCode = student.status === 'active' ? 'enrolled' : 'inquiry';
      if (pipeline[stageCode]) {
        pipeline[stageCode].push(student);
      }
    }

    return { stages, pipeline };
  }

  // === Bulk Import ===
  async bulkImportStudents(tenantId: string, records: Partial<Student>[]) {
    const results = { created: 0, skipped: 0, errors: [] as any[] };

    for (const record of records) {
      try {
        // Validate LRN if provided
        if (record.lrn && !/^\d{12}$/.test(record.lrn)) {
          results.errors.push({ record, error: 'Invalid LRN format' });
          results.skipped++;
          continue;
        }

        // Check for duplicate LRN
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
