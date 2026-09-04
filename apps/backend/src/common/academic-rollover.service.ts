import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolYear } from '../academic/school-year.entity';
import { Term } from '../academic/term.entity';
import { Curriculum } from '../academic/curriculum.entity';
import { CurriculumSubject } from '../academic/curriculum-subject.entity';
import { GradingSystem } from '../academic/grading-system.entity';
import { GradeComponent } from '../academic/grade-component.entity';
import { HonorRollConfig } from '../academic/honor-roll-config.entity';

export interface RolloverResult {
  schoolYear: SchoolYear;
  termsCreated: number;
  curriculaCloned: number;
  gradingSystemsCloned: number;
  honorRollConfigsCloned: number;
}

@Injectable()
export class AcademicRolloverService {
  constructor(
    @InjectRepository(SchoolYear) private schoolYearsRepo: Repository<SchoolYear>,
    @InjectRepository(Term) private termsRepo: Repository<Term>,
    @InjectRepository(Curriculum) private curriculaRepo: Repository<Curriculum>,
    @InjectRepository(CurriculumSubject) private curriculumSubjectsRepo: Repository<CurriculumSubject>,
    @InjectRepository(GradingSystem) private gradingSystemsRepo: Repository<GradingSystem>,
    @InjectRepository(GradeComponent) private gradeComponentsRepo: Repository<GradeComponent>,
    @InjectRepository(HonorRollConfig) private honorRollConfigsRepo: Repository<HonorRollConfig>,
  ) {}

  /**
   * Rollover: Create a new school year and clone structure from a prior year.
   */
  async rollover(
    tenantId: string,
    sourceSchoolYearId: string,
    newSchoolYear: { name: string; startDate: string; endDate: string },
    createdBy: string,
  ): Promise<RolloverResult> {
    // Validate source school year exists
    const sourceSY = await this.schoolYearsRepo.findOne({ where: { id: sourceSchoolYearId, tenantId } });
    if (!sourceSY) throw new BadRequestException('Source school year not found');

    // Create new school year
    const targetSY = this.schoolYearsRepo.create({
      tenantId,
      name: newSchoolYear.name,
      startDate: newSchoolYear.startDate,
      endDate: newSchoolYear.endDate,
      status: 'draft',
    });
    const savedSY = await this.schoolYearsRepo.save(targetSY);

    // Clone terms
    const sourceTerms = await this.termsRepo.find({ where: { schoolYearId: sourceSchoolYearId, tenantId } });
    let termsCreated = 0;
    for (const term of sourceTerms) {
      const newTerm = this.termsRepo.create({
        tenantId,
        schoolYearId: savedSY.id,
        name: term.name,
        sequence: term.sequence,
        startDate: term.startDate,
        endDate: term.endDate,
        gradingDeadline: term.gradingDeadline,
      });
      await this.termsRepo.save(newTerm);
      termsCreated++;
    }

    // Clone curricula
    const sourceCurricula = await this.curriculaRepo.find({ where: { schoolYearId: sourceSchoolYearId, tenantId } });
    let curriculaCloned = 0;
    for (const curr of sourceCurricula) {
      const newCurr = this.curriculaRepo.create({
        tenantId,
        branchId: curr.branchId,
        educationLevelId: curr.educationLevelId,
        gradeLevelId: curr.gradeLevelId,
        strandId: curr.strandId,
        programId: curr.programId,
        schoolYearId: savedSY.id,
        status: 'draft',
        versionLabel: curr.versionLabel,
        clonedFromCurriculumId: curr.id,
        clonedAt: new Date(),
        clonedBy: createdBy,
      });
      const savedCurr = await this.curriculaRepo.save(newCurr);

      // Clone curriculum subjects
      const sourceSubjects = await this.curriculumSubjectsRepo.find({
        where: { curriculumId: curr.id, tenantId },
      });
      for (const cs of sourceSubjects) {
        const newCS = this.curriculumSubjectsRepo.create({
          tenantId,
          curriculumId: savedCurr.id,
          subjectId: cs.subjectId,
          termId: cs.termId,
          prerequisiteSubjectId: cs.prerequisiteSubjectId,
        });
        await this.curriculumSubjectsRepo.save(newCS);
      }
      curriculaCloned++;
    }

    // Clone grading systems
    const sourceGradingSystems = await this.gradingSystemsRepo.find({
      where: { schoolYearId: sourceSchoolYearId, tenantId },
    });
    let gradingSystemsCloned = 0;
    for (const gs of sourceGradingSystems) {
      const newGS = this.gradingSystemsRepo.create({
        tenantId,
        branchId: gs.branchId,
        educationLevelId: gs.educationLevelId,
        schoolYearId: savedSY.id,
        name: gs.name,
        type: gs.type,
        config: gs.config,
        isActive: gs.isActive,
      });
      const savedGS = await this.gradingSystemsRepo.save(newGS);

      // Clone grade components
      const sourceComponents = await this.gradeComponentsRepo.find({
        where: { gradingSystemId: gs.id, tenantId },
      });
      for (const comp of sourceComponents) {
        const newComp = this.gradeComponentsRepo.create({
          tenantId,
          gradingSystemId: savedGS.id,
          name: comp.name,
          weight: comp.weight,
          order: comp.order,
        });
        await this.gradeComponentsRepo.save(newComp);
      }
      gradingSystemsCloned++;
    }

    // Clone honor roll configs
    const sourceHRC = await this.honorRollConfigsRepo.find({
      where: { schoolYearId: sourceSchoolYearId, tenantId },
    });
    let honorRollConfigsCloned = 0;
    for (const hrc of sourceHRC) {
      const newHRC = this.honorRollConfigsRepo.create({
        tenantId,
        branchId: hrc.branchId,
        educationLevelId: hrc.educationLevelId,
        schoolYearId: savedSY.id,
        withHonorsThreshold: hrc.withHonorsThreshold,
        withHighHonorsThreshold: hrc.withHighHonorsThreshold,
        withHighestHonorsThreshold: hrc.withHighestHonorsThreshold,
        isActive: hrc.isActive,
      });
      await this.honorRollConfigsRepo.save(newHRC);
      honorRollConfigsCloned++;
    }

    return {
      schoolYear: savedSY,
      termsCreated,
      curriculaCloned,
      gradingSystemsCloned,
      honorRollConfigsCloned,
    };
  }

  /**
   * Get rollover preview: what will be cloned from a source school year.
   */
  async getRolloverPreview(tenantId: string, sourceSchoolYearId: string) {
    const [terms, curricula, gradingSystems, honorRollConfigs] = await Promise.all([
      this.termsRepo.count({ where: { schoolYearId: sourceSchoolYearId, tenantId } }),
      this.curriculaRepo.count({ where: { schoolYearId: sourceSchoolYearId, tenantId } }),
      this.gradingSystemsRepo.count({ where: { schoolYearId: sourceSchoolYearId, tenantId } }),
      this.honorRollConfigsRepo.count({ where: { schoolYearId: sourceSchoolYearId, tenantId } }),
    ]);

    return { terms, curricula, gradingSystems, honorRollConfigs };
  }
}
