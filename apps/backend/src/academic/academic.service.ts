import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { EducationLevel } from '../education-levels/education-level.entity';
import { GradeLevel } from './grade-level.entity';
import { SchoolYear } from './school-year.entity';
import { Term } from './term.entity';
import { Track } from './track.entity';
import { Strand } from './strand.entity';
import { Program } from './program.entity';
import { Curriculum } from './curriculum.entity';
import { Subject } from './subject.entity';
import { CurriculumSubject } from './curriculum-subject.entity';

@Injectable()
export class AcademicService {
  constructor(
    @InjectRepository(EducationLevel) private eduLevelsRepo: Repository<EducationLevel>,
    @InjectRepository(GradeLevel) private gradeLevelsRepo: Repository<GradeLevel>,
    @InjectRepository(SchoolYear) private schoolYearsRepo: Repository<SchoolYear>,
    @InjectRepository(Term) private termsRepo: Repository<Term>,
    @InjectRepository(Track) private tracksRepo: Repository<Track>,
    @InjectRepository(Strand) private strandsRepo: Repository<Strand>,
    @InjectRepository(Program) private programsRepo: Repository<Program>,
    @InjectRepository(Curriculum) private curriculaRepo: Repository<Curriculum>,
    @InjectRepository(Subject) private subjectsRepo: Repository<Subject>,
    @InjectRepository(CurriculumSubject) private currSubjectsRepo: Repository<CurriculumSubject>,
  ) {}

  // --- Guarded mutation helpers (404 on missing, 409 on FK conflict) ---
  private async updateGuarded(repo: Repository<any>, id: string, data: any, label: string) {
    const res = await repo.update(id, data);
    if (res.affected === 0) throw new NotFoundException(`${label} ${id} not found`);
    return repo.findOneBy({ id });
  }

  private async deleteGuarded(repo: Repository<any>, id: string, label: string) {
    try {
      const res = await repo.delete(id);
      if (res.affected === 0) throw new NotFoundException(`${label} ${id} not found`);
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      if (e instanceof QueryFailedError) {
        throw new ConflictException(`${label} ${id} is referenced by other records and cannot be deleted`);
      }
      throw e;
    }
  }

  // === Education Levels ===
  findEduLevels(tenantId: string) { return this.eduLevelsRepo.find({ where: { tenantId } }); }
  async createEduLevel(data: Partial<EducationLevel>) { return this.eduLevelsRepo.save(this.eduLevelsRepo.create(data)); }
  updateEduLevel(id: string, data: Partial<EducationLevel>) { return this.updateGuarded(this.eduLevelsRepo, id, data, 'Education level'); }
  removeEduLevel(id: string) { return this.deleteGuarded(this.eduLevelsRepo, id, 'Education level'); }

  // === Grade Levels ===
  findGradeLevels(tenantId: string, educationLevelId?: string) {
    const where: any = { tenantId };
    if (educationLevelId) where.educationLevelId = educationLevelId;
    return this.gradeLevelsRepo.find({ where, order: { sortOrder: 'ASC' } });
  }
  async createGradeLevel(data: Partial<GradeLevel>) { return this.gradeLevelsRepo.save(this.gradeLevelsRepo.create(data)); }
  updateGradeLevel(id: string, data: Partial<GradeLevel>) { return this.updateGuarded(this.gradeLevelsRepo, id, data, 'Grade level'); }
  removeGradeLevel(id: string) { return this.deleteGuarded(this.gradeLevelsRepo, id, 'Grade level'); }

  // === School Years ===
  findSchoolYears(tenantId: string) { return this.schoolYearsRepo.find({ where: { tenantId } }); }
  async findOneSchoolYear(id: string) {
    const sy = await this.schoolYearsRepo.findOneBy({ id });
    if (!sy) throw new NotFoundException(`School year ${id} not found`);
    return sy;
  }
  async createSchoolYear(data: Partial<SchoolYear>) { return this.schoolYearsRepo.save(this.schoolYearsRepo.create(data)); }
  updateSchoolYear(id: string, data: Partial<SchoolYear>) { return this.updateGuarded(this.schoolYearsRepo, id, data, 'School year'); }
  removeSchoolYear(id: string) { return this.deleteGuarded(this.schoolYearsRepo, id, 'School year'); }
  /** One active school year per tenant: demote the previous active to completed. */
  async activateSchoolYear(id: string) {
    const sy = await this.findOneSchoolYear(id);
    await this.schoolYearsRepo.update({ tenantId: sy.tenantId, status: 'active' }, { status: 'completed' });
    return this.updateGuarded(this.schoolYearsRepo, id, { status: 'active' }, 'School year');
  }

  // === Terms ===
  findTerms(schoolYearId: string) { return this.termsRepo.find({ where: { schoolYearId }, order: { sequence: 'ASC' } }); }
  async createTerm(data: Partial<Term>) { return this.termsRepo.save(this.termsRepo.create(data)); }

  // === Tracks (SHS) ===
  findTracks(tenantId: string) { return this.tracksRepo.find({ where: { tenantId } }); }
  async createTrack(data: Partial<Track>) { return this.tracksRepo.save(this.tracksRepo.create(data)); }
  updateTrack(id: string, data: Partial<Track>) { return this.updateGuarded(this.tracksRepo, id, data, 'Track'); }
  removeTrack(id: string) { return this.deleteGuarded(this.tracksRepo, id, 'Track'); }

  // === Strands (SHS) ===
  findStrands(tenantId: string, trackId?: string) {
    const where: any = { tenantId };
    if (trackId) where.trackId = trackId;
    return this.strandsRepo.find({ where });
  }
  async createStrand(data: Partial<Strand>) { return this.strandsRepo.save(this.strandsRepo.create(data)); }
  updateStrand(id: string, data: Partial<Strand>) { return this.updateGuarded(this.strandsRepo, id, data, 'Strand'); }
  removeStrand(id: string) { return this.deleteGuarded(this.strandsRepo, id, 'Strand'); }

  // === Programs (College) ===
  findPrograms(tenantId: string) { return this.programsRepo.find({ where: { tenantId } }); }
  async createProgram(data: Partial<Program>) { return this.programsRepo.save(this.programsRepo.create(data)); }
  updateProgram(id: string, data: Partial<Program>) { return this.updateGuarded(this.programsRepo, id, data, 'Program'); }
  removeProgram(id: string) { return this.deleteGuarded(this.programsRepo, id, 'Program'); }

  // === Subjects ===
  findSubjects(tenantId: string) { return this.subjectsRepo.find({ where: { tenantId } }); }
  async findOneSubject(id: string) {
    const s = await this.subjectsRepo.findOneBy({ id });
    if (!s) throw new NotFoundException(`Subject ${id} not found`);
    return s;
  }
  async createSubject(data: Partial<Subject>) { return this.subjectsRepo.save(this.subjectsRepo.create(data)); }
  updateSubject(id: string, data: Partial<Subject>) { return this.updateGuarded(this.subjectsRepo, id, data, 'Subject'); }
  removeSubject(id: string) { return this.deleteGuarded(this.subjectsRepo, id, 'Subject'); }

  // === Curricula ===
  findCurricula(tenantId: string, filters?: { schoolYearId?: string; educationLevelId?: string; branchId?: string }) {
    const where: any = { tenantId };
    if (filters?.schoolYearId) where.schoolYearId = filters.schoolYearId;
    if (filters?.educationLevelId) where.educationLevelId = filters.educationLevelId;
    if (filters?.branchId) where.branchId = filters.branchId;
    return this.curriculaRepo.find({ where });
  }
  async findOneCurriculum(id: string) {
    const c = await this.curriculaRepo.findOneBy({ id });
    if (!c) throw new NotFoundException(`Curriculum ${id} not found`);
    return c;
  }
  async createCurriculum(data: Partial<Curriculum>) { return this.curriculaRepo.save(this.curriculaRepo.create(data)); }
  async updateCurriculum(id: string, data: Partial<Curriculum>) {
    await this.curriculaRepo.update(id, data);
    return this.findOneCurriculum(id);
  }
  removeCurriculum(id: string) { return this.deleteGuarded(this.curriculaRepo, id, 'Curriculum'); }

  // === Curriculum Subjects ===
  findCurriculumSubjects(curriculumId: string) { return this.currSubjectsRepo.find({ where: { curriculumId }, order: { order: 'ASC' } }); }
  async createCurriculumSubject(data: Partial<CurriculumSubject>) { return this.currSubjectsRepo.save(this.currSubjectsRepo.create(data)); }
  async removeCurriculumSubject(id: string) {
    const result = await this.currSubjectsRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException(`CurriculumSubject ${id} not found`);
  }
}
