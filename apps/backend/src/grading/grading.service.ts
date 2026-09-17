import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GradingSystem } from './entities/grading-system.entity';
import { GradeComponent } from './entities/grade-component.entity';
import { GradeEntry } from './entities/grade-entry.entity';
import { HonorRollConfig } from './entities/honor-roll-config.entity';
import { GradeChangeRequest } from './entities/grade-change-request.entity';
import { ClassOffering } from '../scheduling/class-offering.entity';
import { StudentSectionAssignment } from '../sis/student-section-assignment.entity';

// ============================================================
// DepEd DO 015 s.2026 — Grading Presets
// ============================================================

/** Descriptor sets per Key Stage 1 level (3-term, DO 015 s.2026) */
export const DEPED_KS1_DESCRIPTORS = {
  kindergarten: [
    { value: 'beginning',  label: 'Beginning',  shortLabel: 'B' },
    { value: 'developing', label: 'Developing',  shortLabel: 'D' },
    { value: 'consistent', label: 'Consistent',  shortLabel: 'C' },
  ],
  grades1to3: [
    { value: 'emerging',   label: 'Emerging',   shortLabel: 'E' },
    { value: 'developing', label: 'Developing',  shortLabel: 'D' },
    { value: 'approaching',label: 'Approaching', shortLabel: 'AP' },
    { value: 'meeting',    label: 'Meeting',     shortLabel: 'M' },
    { value: 'advancing',  label: 'Advancing',   shortLabel: 'AV' },
  ],
};

/**
 * Returns the DepEd-standard grading system preset configuration
 * for a given grade tier. Used to auto-populate the Grading System form.
 */
export function getDepEdPreset(tier: 'kindergarten' | 'grades1to3' | 'grades4to10' | 'grades11to12') {
  switch (tier) {
    case 'kindergarten':
      return {
        name: 'DepEd KS1 — Kindergarten (DO 015, s.2026)',
        type: 'descriptive_ks1',
        config: {
          policyRef: 'DO 015 s.2026',
          terms: 3,
          descriptorSet: 'kindergarten',
          descriptors: DEPED_KS1_DESCRIPTORS.kindergarten,
          noNumericGrade: true,
          noHonorRoll: true,
          note: 'Qualitative assessment only. No numerical grades issued.',
        },
        components: [], // No weighted components — purely descriptive
      };

    case 'grades1to3':
      return {
        name: 'DepEd KS1 — Grades 1–3 (DO 015, s.2026)',
        type: 'descriptive_ks1',
        config: {
          policyRef: 'DO 015 s.2026',
          terms: 3,
          descriptorSet: 'grades1to3',
          descriptors: DEPED_KS1_DESCRIPTORS.grades1to3,
          noNumericGrade: true,
          noHonorRoll: true,
          note: 'Descriptive grading transitioning from Grade 1 (SY 2026-2027). Grade 2 and 3 follow in subsequent years.',
        },
        components: [], // No weighted components
      };

    case 'grades4to10':
      return {
        name: 'DepEd K-12 — Grades 4–10 (DO 015, s.2026)',
        type: 'numeric_zero_based',
        config: {
          policyRef: 'DO 015 s.2026',
          terms: 3,
          passingGrade: 75,
          finalGradeMethod: 'average_of_terms',
          noTransmutation: true,
          note: 'Zero-based grading: Raw percentage is the grade. No transmutation table used.',
        },
        components: [
          { name: 'Written Work (WW)',       weight: 25, order: 1 },
          { name: 'Performance Tasks (PT)', weight: 50, order: 2 },
          { name: 'Quarterly Assessment (QA)', weight: 25, order: 3 },
        ],
      };

    case 'grades11to12':
      return {
        name: 'DepEd K-12 — Grades 11–12 Senior High (DO 015, s.2026)',
        type: 'numeric_zero_based',
        config: {
          policyRef: 'DO 015 s.2026',
          terms: 3,
          passingGrade: 75,
          finalGradeMethod: 'average_of_terms',
          noTransmutation: true,
          note: 'Zero-based grading: Raw percentage is the grade. No transmutation table used.',
        },
        components: [
          { name: 'Written Work (WW)',       weight: 25, order: 1 },
          { name: 'Performance Tasks (PT)', weight: 50, order: 2 },
          { name: 'Quarterly Assessment (QA)', weight: 25, order: 3 },
        ],
      };
  }
}

@Injectable()
export class GradingService {
  constructor(
    @InjectRepository(GradingSystem)
    private readonly sysRepo: Repository<GradingSystem>,
    @InjectRepository(GradeComponent)
    private readonly compRepo: Repository<GradeComponent>,
    @InjectRepository(GradeEntry)
    private readonly entryRepo: Repository<GradeEntry>,
    @InjectRepository(HonorRollConfig)
    private readonly hrRepo: Repository<HonorRollConfig>,
    @InjectRepository(GradeChangeRequest)
    private readonly gcrRepo: Repository<GradeChangeRequest>,
    @InjectRepository(ClassOffering)
    private readonly classOfferingRepo: Repository<ClassOffering>,
    @InjectRepository(StudentSectionAssignment)
    private readonly ssaRepo: Repository<StudentSectionAssignment>,
  ) {}

  // ============================
  // Grading Systems & Components
  // ============================

  async listGradingSystems(tenantId: string, query: any) {
    const where: any = { tenantId };
    if (query.educationLevelId) where.educationLevelId = query.educationLevelId;
    if (query.schoolYearId) where.schoolYearId = query.schoolYearId;
    if (query.branchId) where.branchId = query.branchId;

    return this.sysRepo.find({ where, order: { name: 'ASC' } });
  }

  async createGradingSystem(tenantId: string, data: any) {
    const sys = this.sysRepo.create({ tenantId, ...data });
    return this.sysRepo.save(sys);
  }

  async updateGradingSystem(tenantId: string, id: string, data: any) {
    const sys = await this.sysRepo.findOne({ where: { id, tenantId } });
    if (!sys) throw new NotFoundException('Grading system not found');
    Object.assign(sys, data);
    return this.sysRepo.save(sys);
  }

  async resolveGradingSystem(tenantId: string, query: any) {
    const where: any = { tenantId, educationLevelId: query.educationLevelId, schoolYearId: query.schoolYearId, isActive: true };
    if (query.branchId) where.branchId = query.branchId;
    const sys = await this.sysRepo.findOne({ where });
    if (!sys) throw new NotFoundException('Active grading system not found');
    return sys;
  }

  async listComponents(tenantId: string, systemId: string) {
    return this.compRepo.find({
      where: { tenantId, gradingSystemId: systemId },
      order: { order: 'ASC', name: 'ASC' },
    });
  }

  async createComponent(tenantId: string, data: any) {
    const comp = this.compRepo.create({ tenantId, ...data });
    return this.compRepo.save(comp);
  }

  /**
   * Returns the list of DepEd standard presets that can be applied to
   * a grading system. Optionally filter by tier.
   */
  getPresets(tier?: string) {
    const tiers: Array<'kindergarten' | 'grades1to3' | 'grades4to10' | 'grades11to12'> =
      ['kindergarten', 'grades1to3', 'grades4to10', 'grades11to12'];
    const filtered = tier ? tiers.filter(t => t === tier) : tiers;
    return filtered.map(t => ({ tier: t, ...getDepEdPreset(t) }));
  }

  /**
   * Seeds a grading system from a DepEd preset.
   * Creates the GradingSystem record and all GradeComponent rows in one shot.
   */
  async seedDepEdSystem(
    tenantId: string,
    tier: 'kindergarten' | 'grades1to3' | 'grades4to10' | 'grades11to12',
    educationLevelId: string,
    schoolYearId: string,
    branchId?: string,
  ) {
    const preset = getDepEdPreset(tier);
    if (!preset) throw new BadRequestException(`Unknown DepEd preset tier: ${tier}`);

    // Create the grading system
    const sys = (await this.createGradingSystem(tenantId, {
      name: preset.name,
      type: preset.type,
      config: preset.config,
      educationLevelId,
      schoolYearId,
      branchId: branchId ?? null,
      isActive: true,
    })) as unknown as GradingSystem;

    // Create the grade components (if any — KS1 descriptive has none)
    const comps = [];
    for (const comp of preset.components) {
      comps.push(await this.createComponent(tenantId, {
        gradingSystemId: sys.id,
        ...comp,
      }));
    }

    return { system: sys, components: comps };
  }

  // ============================
  // Grade Computation
  // ============================

  /**
   * Compute the weighted term grade for a set of component entries.
   * For 'numeric_zero_based': no transmutation — raw weighted percentage IS the grade.
   * For 'descriptive_ks1': returns null (no numeric computation).
   */
  computeTermGrade(
    entries: { weight: number; score: number; maxScore: number }[],
    systemType: string,
  ): number | null {
    if (systemType === 'descriptive_ks1') return null;

    let termGrade = 0;
    for (const e of entries) {
      if (!e.maxScore || e.maxScore <= 0) continue;
      const ps = (Number(e.score) / Number(e.maxScore)) * 100;
      termGrade += ps * (Number(e.weight) / 100);
    }
    return Math.round(termGrade * 100) / 100;
  }

  /**
   * Compute the Final Grade as the simple average of term grades
   * (DO 015 s.2026 — 3 terms; DO 8 s.2015 — 4 quarters).
   */
  computeFinalGrade(termGrades: number[]): number | null {
    const valid = termGrades.filter(g => g != null && !isNaN(g));
    if (valid.length === 0) return null;
    return Math.round((valid.reduce((s, g) => s + g, 0) / valid.length) * 100) / 100;
  }

  // ============================
  // Gradebook Entries
  // ============================

  async getGradebook(tenantId: string, classOfferingId: string) {
    const offering = await this.classOfferingRepo.findOne({ where: { tenantId, id: classOfferingId } });
    if (!offering) return [];

    const enrolledStudents = await this.ssaRepo.find({ where: { tenantId, sectionId: offering.sectionId } });
    const entries = await this.entryRepo.find({
      where: { tenantId, classOfferingId },
    });

    const enrolledIds = new Set(enrolledStudents.map(e => e.studentId));
    
    // Add empty placeholder entries for enrolled students that have NO grades yet
    const existingStudentIds = new Set(entries.map(e => e.studentId));
    for (const sid of enrolledIds) {
      if (!existingStudentIds.has(sid)) {
        // Return a dummy entry so the UI knows the student is in the roster
        entries.push({
          studentId: sid,
          classOfferingId,
          // dummy component
          gradeComponentId: '00000000-0000-0000-0000-000000000000',
          gradingMode: 'numeric',
        } as any);
      }
    }

    return entries;
  }

  async enterGrade(tenantId: string, data: any, userId: string) {
    // Validate descriptive grades for KS1 systems
    if (data.gradingMode === 'descriptive_ks1' && data.descriptiveGrade) {
      const validKinder = ['beginning', 'developing', 'consistent'];
      const validG1to3 = ['emerging', 'developing', 'approaching', 'meeting', 'advancing'];
      if (![...validKinder, ...validG1to3].includes(data.descriptiveGrade)) {
        throw new BadRequestException(`Invalid descriptive grade: ${data.descriptiveGrade}`);
      }
    }

    // Basic upsert based on term, component, student
    const existing = await this.entryRepo.findOne({
      where: {
        tenantId,
        studentId: data.studentId,
        classOfferingId: data.classOfferingId,
        termId: data.termId,
        gradeComponentId: data.gradeComponentId,
      }
    });

    if (existing) {
      if (existing.locked) throw new Error('Grades are locked for this term');
      Object.assign(existing, {
        score: data.rawScore !== undefined ? data.rawScore : data.score,
        maxScore: data.maxScore,
        percentage: data.percentage,
        transmutedGrade: data.gradingMode === 'descriptive_ks1' ? null : data.transmutedGrade,
        descriptiveGrade: data.descriptiveGrade ?? existing.descriptiveGrade,
        gradingMode: data.gradingMode ?? existing.gradingMode,
        remarks: data.remarks ?? existing.remarks,
        enteredByUserId: userId,
      });
      return this.entryRepo.save(existing);
    }

    const entry = this.entryRepo.create({
      tenantId,
      branchId: data.branchId,
      studentId: data.studentId,
      classOfferingId: data.classOfferingId,
      termId: data.termId,
      gradeComponentId: data.gradeComponentId,
      gradingSystemId: data.gradingSystemId,
      score: data.rawScore !== undefined ? data.rawScore : data.score,
      maxScore: data.maxScore,
      percentage: data.percentage,
      transmutedGrade: data.gradingMode === 'descriptive_ks1' ? null : data.transmutedGrade,
      descriptiveGrade: data.descriptiveGrade,
      gradingMode: data.gradingMode ?? 'numeric',
      remarks: data.remarks,
      enteredByUserId: userId,
    });

    return this.entryRepo.save(entry);
  }

  async bulkEnterGrades(tenantId: string, data: { entries: any[] }, userId: string) {
    const results = [];
    for (const entry of data.entries) {
      results.push(await this.enterGrade(tenantId, entry, userId));
    }
    return results;
  }

  async finalizeGrades(tenantId: string, classOfferingId: string, termId: string) {
    await this.entryRepo.update(
      { tenantId, classOfferingId, termId },
      { locked: true }
    );
    return { success: true };
  }

  // ============================
  // Honor Roll Configs
  // ============================
  async listHonorRollConfigs(tenantId: string, query: any) {
    const where: any = { tenantId };
    if (query.educationLevelId) where.educationLevelId = query.educationLevelId;
    if (query.schoolYearId) where.schoolYearId = query.schoolYearId;
    return this.hrRepo.find({ where });
  }

  async createHonorRollConfig(tenantId: string, data: any) {
    const config = this.hrRepo.create({ tenantId, ...data });
    return this.hrRepo.save(config);
  }
}
