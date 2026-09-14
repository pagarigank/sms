import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { GradingSystem } from './grading-system.entity';
import { GradeComponent } from './grade-component.entity';
import { HonorRollConfig } from './honor-roll-config.entity';

@Injectable()
export class GradingService {
  constructor(
    @InjectRepository(GradingSystem) private gradingSystemsRepo: Repository<GradingSystem>,
    @InjectRepository(GradeComponent) private gradeComponentsRepo: Repository<GradeComponent>,
    @InjectRepository(HonorRollConfig) private honorRollRepo: Repository<HonorRollConfig>,
  ) {}

  // === Grading Systems ===
  findGradingSystems(tenantId: string, filters?: { educationLevelId?: string; schoolYearId?: string; branchId?: string }) {
    const where: any = { tenantId };
    if (filters?.educationLevelId) where.educationLevelId = filters.educationLevelId;
    if (filters?.schoolYearId) where.schoolYearId = filters.schoolYearId;
    if (filters?.branchId) where.branchId = filters.branchId;
    return this.gradingSystemsRepo.find({ where });
  }

  async findOneGradingSystem(id: string) {
    const gs = await this.gradingSystemsRepo.findOneBy({ id });
    if (!gs) throw new NotFoundException(`Grading system ${id} not found`);
    return gs;
  }

  /**
   * Partial update scoped to the caller's tenant (id is a global UUID, so the
   * tenant guard prevents cross-tenant writes via the API).
   */
  async updateGradingSystem(id: string, tenantId: string, data: Partial<GradingSystem>) {
    const gs = await this.gradingSystemsRepo.findOneBy({ id, tenantId });
    if (!gs) throw new NotFoundException(`Grading system ${id} not found`);
    // config merges rather than replaces, so partial config updates don't
    // clobber unrelated keys (e.g. gradeScale vs future display options).
    const { config, ...rest } = data;
    Object.assign(gs, rest);
    if (config) gs.config = { ...(gs.config ?? {}), ...config };
    return this.gradingSystemsRepo.save(gs);
  }

  async createGradingSystem(data: Partial<GradingSystem>) {
    // Enforce resolution rule: only one active per (tenant, education_level, school_year, branch)
    if (data.isActive !== false) {
      const existing = await this.gradingSystemsRepo.findOne({
        where: {
          tenantId: data.tenantId,
          educationLevelId: data.educationLevelId,
          schoolYearId: data.schoolYearId,
          branchId: data.branchId ? data.branchId : IsNull(),
          isActive: true,
        },
      });
      if (existing) {
        throw new ConflictException(
          `Active grading system already exists for this education level + school year` +
          (data.branchId ? ` + branch` : ` (tenant default)`),
        );
      }
    }
    return this.gradingSystemsRepo.save(this.gradingSystemsRepo.create(data));
  }

  /**
   * Resolve which grading system applies for a given context.
   * Resolution order: (1) branch-specific active, (2) tenant-default active.
   */
  async resolveGradingSystem(tenantId: string, educationLevelId: string, schoolYearId: string, branchId?: string): Promise<GradingSystem> {
    // Try branch-specific first
    if (branchId) {
      const branch = await this.gradingSystemsRepo.findOne({
        where: { tenantId, educationLevelId, schoolYearId, branchId, isActive: true },
      });
      if (branch) return branch;
    }
    // Fall back to tenant default (branchId = NULL)
    const tenantDefault = await this.gradingSystemsRepo.findOne({
      where: { tenantId, educationLevelId, schoolYearId, branchId: IsNull(), isActive: true },
    });
    if (tenantDefault) return tenantDefault;
    throw new NotFoundException(`No active grading system found for education level ${educationLevelId}, school year ${schoolYearId}`);
  }

  // === Grade Components ===
  findGradeComponents(gradingSystemId: string) { return this.gradeComponentsRepo.find({ where: { gradingSystemId }, order: { order: 'ASC' } }); }
  async createGradeComponent(data: Partial<GradeComponent>) { return this.gradeComponentsRepo.save(this.gradeComponentsRepo.create(data)); }

  // === Honor Roll Configs ===
  findHonorRollConfigs(tenantId: string, filters?: { educationLevelId?: string; schoolYearId?: string }) {
    const where: any = { tenantId };
    if (filters?.educationLevelId) where.educationLevelId = filters.educationLevelId;
    if (filters?.schoolYearId) where.schoolYearId = filters.schoolYearId;
    return this.honorRollRepo.find({ where });
  }
  async createHonorRollConfig(data: Partial<HonorRollConfig>) { return this.honorRollRepo.save(this.honorRollRepo.create(data)); }
}
