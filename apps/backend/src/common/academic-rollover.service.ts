import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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
    private dataSource: DataSource,
  ) {}

  /**
   * Rollover: create a new school year and clone the full academic structure
   * (terms, curricula + their subjects, grading systems + components, honor
   * roll configs) from a prior year.
   *
   * Everything runs in ONE transaction: a mid-way failure (validation error,
   * connection drop, constraint conflict) rolls back the whole chain, so the
   * tenant can never be left with a partially-rolled-over year — e.g. a new
   * school year with some curricula cloned but no grading systems, which
   * would block publish/enrollment for that year.
   */
  async rollover(
    tenantId: string,
    sourceSchoolYearId: string,
    newSchoolYear: { name: string; startDate: string; endDate: string },
    createdBy: string,
  ): Promise<RolloverResult> {
    return this.dataSource.transaction(async (manager) => {
      const schoolYearsRepo = manager.getRepository(SchoolYear);
      const termsRepo = manager.getRepository(Term);
      const curriculaRepo = manager.getRepository(Curriculum);
      const curriculumSubjectsRepo = manager.getRepository(CurriculumSubject);
      const gradingSystemsRepo = manager.getRepository(GradingSystem);
      const gradeComponentsRepo = manager.getRepository(GradeComponent);
      const honorRollConfigsRepo = manager.getRepository(HonorRollConfig);

      // Guard against duplicate school-year names within the tenant before
      // writing anything (the transaction also rolls back on a unique hit).
      const sourceSY = await schoolYearsRepo.findOne({ where: { id: sourceSchoolYearId, tenantId } });
      if (!sourceSY) throw new BadRequestException('Source school year not found');

      const duplicateName = await schoolYearsRepo.findOne({ where: { tenantId, name: newSchoolYear.name } });
      if (duplicateName) throw new BadRequestException(`School year "${newSchoolYear.name}" already exists`);

      // Create new school year
      const savedSY = await schoolYearsRepo.save(
        schoolYearsRepo.create({
          tenantId,
          name: newSchoolYear.name,
          startDate: newSchoolYear.startDate,
          endDate: newSchoolYear.endDate,
          status: 'draft',
        }),
      );

      // Clone terms
      const sourceTerms = await termsRepo.find({ where: { schoolYearId: sourceSchoolYearId, tenantId } });
      let termsCreated = 0;
      for (const term of sourceTerms) {
        await termsRepo.save(
          termsRepo.create({
            tenantId,
            schoolYearId: savedSY.id,
            name: term.name,
            sequence: term.sequence,
            startDate: term.startDate,
            endDate: term.endDate,
            gradingDeadline: term.gradingDeadline,
          }),
        );
        termsCreated++;
      }

      // Clone curricula (+ subjects)
      const sourceCurricula = await curriculaRepo.find({ where: { schoolYearId: sourceSchoolYearId, tenantId } });
      let curriculaCloned = 0;
      for (const curr of sourceCurricula) {
        const savedCurr = await curriculaRepo.save(
          curriculaRepo.create({
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
          }),
        );

        const sourceSubjects = await curriculumSubjectsRepo.find({
          where: { curriculumId: curr.id, tenantId },
        });
        for (const cs of sourceSubjects) {
          await curriculumSubjectsRepo.save(
            curriculumSubjectsRepo.create({
              tenantId,
              curriculumId: savedCurr.id,
              subjectId: cs.subjectId,
              termId: cs.termId,
              prerequisiteSubjectId: cs.prerequisiteSubjectId,
            }),
          );
        }
        curriculaCloned++;
      }

      // Clone grading systems (+ components)
      const sourceGradingSystems = await gradingSystemsRepo.find({
        where: { schoolYearId: sourceSchoolYearId, tenantId },
      });
      let gradingSystemsCloned = 0;
      for (const gs of sourceGradingSystems) {
        const savedGS = await gradingSystemsRepo.save(
          gradingSystemsRepo.create({
            tenantId,
            branchId: gs.branchId,
            educationLevelId: gs.educationLevelId,
            schoolYearId: savedSY.id,
            name: gs.name,
            type: gs.type,
            config: gs.config,
            isActive: gs.isActive,
          }),
        );

        const sourceComponents = await gradeComponentsRepo.find({
          where: { gradingSystemId: gs.id, tenantId },
        });
        for (const comp of sourceComponents) {
          await gradeComponentsRepo.save(
            gradeComponentsRepo.create({
              tenantId,
              gradingSystemId: savedGS.id,
              name: comp.name,
              weight: comp.weight,
              order: comp.order,
            }),
          );
        }
        gradingSystemsCloned++;
      }

      // Clone honor roll configs
      const sourceHRC = await honorRollConfigsRepo.find({
        where: { schoolYearId: sourceSchoolYearId, tenantId },
      });
      let honorRollConfigsCloned = 0;
      for (const hrc of sourceHRC) {
        await honorRollConfigsRepo.save(
          honorRollConfigsRepo.create({
            tenantId,
            branchId: hrc.branchId,
            educationLevelId: hrc.educationLevelId,
            schoolYearId: savedSY.id,
            withHonorsThreshold: hrc.withHonorsThreshold,
            withHighHonorsThreshold: hrc.withHighHonorsThreshold,
            withHighestHonorsThreshold: hrc.withHighestHonorsThreshold,
            isActive: hrc.isActive,
          }),
        );
        honorRollConfigsCloned++;
      }

      return {
        schoolYear: savedSY,
        termsCreated,
        curriculaCloned,
        gradingSystemsCloned,
        honorRollConfigsCloned,
      };
    });
  }

  /**
   * Get rollover preview: what will be cloned from a source school year.
   */
  async getRolloverPreview(tenantId: string, sourceSchoolYearId: string) {
    const m = this.dataSource.manager;
    const [terms, curricula, gradingSystems, honorRollConfigs] = await Promise.all([
      m.getRepository(Term).count({ where: { schoolYearId: sourceSchoolYearId, tenantId } }),
      m.getRepository(Curriculum).count({ where: { schoolYearId: sourceSchoolYearId, tenantId } }),
      m.getRepository(GradingSystem).count({ where: { schoolYearId: sourceSchoolYearId, tenantId } }),
      m.getRepository(HonorRollConfig).count({ where: { schoolYearId: sourceSchoolYearId, tenantId } }),
    ]);

    return { terms, curricula, gradingSystems, honorRollConfigs };
  }
}
