import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  // === Education Levels ===
  findEduLevels(tenantId: string) { return this.eduLevelsRepo.find({ where: { tenantId } }); }
  async createEduLevel(data: Partial<EducationLevel>) { return this.eduLevelsRepo.save(this.eduLevelsRepo.create(data)); }

  // === Grade Levels ===
  findGradeLevels(tenantId: string, educationLevelId?: string) {
    const where: any = { tenantId };
    if (educationLevelId) where.educationLevelId = educationLevelId;
    return this.gradeLevelsRepo.find({ where, order: { sortOrder: 'ASC' } });
  }
  async createGradeLevel(data: Partial<GradeLevel>) { return this.gradeLevelsRepo.save(this.gradeLevelsRepo.create(data)); }

  // === School Years ===
  findSchoolYears(tenantId: string) { return this.schoolYearsRepo.find({ where: { tenantId } }); }
  async findOneSchoolYear(id: string) {
    const sy = await this.schoolYearsRepo.findOneBy({ id });
    if (!sy) throw new NotFoundException(`School year ${id} not found`);
    return sy;
  }
  async createSchoolYear(data: Partial<SchoolYear>) { return this.schoolYearsRepo.save(this.schoolYearsRepo.create(data)); }

  // === Terms ===
  findTerms(schoolYearId: string) { return this.termsRepo.find({ where: { schoolYearId }, order: { sequence: 'ASC' } }); }
  async createTerm(data: Partial<Term>) { return this.termsRepo.save(this.termsRepo.create(data)); }

  // === Tracks (SHS) ===
  findTracks(tenantId: string) { return this.tracksRepo.find({ where: { tenantId } }); }
  async createTrack(data: Partial<Track>) { return this.tracksRepo.save(this.tracksRepo.create(data)); }

  // === Strands (SHS) ===
  findStrands(tenantId: string, trackId?: string) {
    const where: any = { tenantId };
    if (trackId) where.trackId = trackId;
    return this.strandsRepo.find({ where });
  }
  async createStrand(data: Partial<Strand>) { return this.strandsRepo.save(this.strandsRepo.create(data)); }

  // === Programs (College) ===
  findPrograms(tenantId: string) { return this.programsRepo.find({ where: { tenantId } }); }
  async createProgram(data: Partial<Program>) { return this.programsRepo.save(this.programsRepo.create(data)); }

  // === Subjects ===
  findSubjects(tenantId: string) { return this.subjectsRepo.find({ where: { tenantId } }); }
  async findOneSubject(id: string) {
    const s = await this.subjectsRepo.findOneBy({ id });
    if (!s) throw new NotFoundException(`Subject ${id} not found`);
    return s;
  }
  async createSubject(data: Partial<Subject>) { return this.subjectsRepo.save(this.subjectsRepo.create(data)); }

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

  // === Curriculum Subjects ===
  findCurriculumSubjects(curriculumId: string) { return this.currSubjectsRepo.find({ where: { curriculumId }, order: { order: 'ASC' } }); }
  async createCurriculumSubject(data: Partial<CurriculumSubject>) { return this.currSubjectsRepo.save(this.currSubjectsRepo.create(data)); }
  async removeCurriculumSubject(id: string) {
    const result = await this.currSubjectsRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException(`CurriculumSubject ${id} not found`);
  }
}
