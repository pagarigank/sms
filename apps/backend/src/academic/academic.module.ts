import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { AcademicService } from './academic.service';
import { AcademicController } from './academic.controller';
import { AcademicRolloverService } from '../common/academic-rollover.service';

const ENTITIES = [
  EducationLevel, GradeLevel, SchoolYear, Term, Track, Strand, Program,
  Curriculum, Subject, CurriculumSubject,
];

@Module({
  imports: [TypeOrmModule.forFeature(ENTITIES)],
  controllers: [AcademicController],
  providers: [AcademicService, AcademicRolloverService],
  exports: [AcademicService, AcademicRolloverService],
})
export class AcademicModule {}
