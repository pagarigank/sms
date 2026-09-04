import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AcademicService } from './academic.service';

@ApiTags('academic')
@ApiBearerAuth('access-token')
@Controller('academic')
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  // === Education Levels ===
  @Get('education-levels')
  @ApiOperation({ summary: 'List education levels' })
  @ApiQuery({ name: 'tenantId', required: true })
  findEduLevels(@Query('tenantId') tenantId: string) { return this.academicService.findEduLevels(tenantId); }

  @Post('education-levels')
  @ApiOperation({ summary: 'Create education level', description: 'e.g. Kindergarten, Elementary, JHS, SHS, College' })
  createEduLevel(@Body() body: any) { return this.academicService.createEduLevel(body); }

  // === Grade Levels ===
  @Get('grade-levels')
  @ApiOperation({ summary: 'List grade levels', description: 'Filtered by education level.' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'educationLevelId', required: false })
  findGradeLevels(@Query('tenantId') tenantId: string, @Query('educationLevelId') elId?: string) {
    return this.academicService.findGradeLevels(tenantId, elId);
  }

  @Post('grade-levels')
  @ApiOperation({ summary: 'Create grade level', description: 'e.g. Grade 7, Grade 11, 1st Year College' })
  createGradeLevel(@Body() body: any) { return this.academicService.createGradeLevel(body); }

  // === School Years ===
  @Get('school-years')
  @ApiOperation({ summary: 'List school years' })
  @ApiQuery({ name: 'tenantId', required: true })
  findSchoolYears(@Query('tenantId') tenantId: string) { return this.academicService.findSchoolYears(tenantId); }

  @Get('school-years/:id')
  @ApiOperation({ summary: 'Get school year detail' })
  findOneSchoolYear(@Param('id') id: string) { return this.academicService.findOneSchoolYear(id); }

  @Post('school-years')
  @ApiOperation({ summary: 'Create school year', description: 'e.g. SY 2026-2027' })
  createSchoolYear(@Body() body: any) { return this.academicService.createSchoolYear(body); }

  // === Terms ===
  @Get('school-years/:schoolYearId/terms')
  @ApiOperation({ summary: 'List terms in a school year' })
  findTerms(@Param('schoolYearId') syId: string) { return this.academicService.findTerms(syId); }

  @Post('terms')
  @ApiOperation({ summary: 'Create term', description: 'e.g. First Quarter, Semester 1' })
  createTerm(@Body() body: any) { return this.academicService.createTerm(body); }

  // === Tracks (SHS) ===
  @Get('tracks')
  @ApiOperation({ summary: 'List tracks (SHS)', description: 'e.g. Academic, TVL, Sports, Arts & Design' })
  @ApiQuery({ name: 'tenantId', required: true })
  findTracks(@Query('tenantId') tenantId: string) { return this.academicService.findTracks(tenantId); }

  @Post('tracks')
  @ApiOperation({ summary: 'Create track' })
  createTrack(@Body() body: any) { return this.academicService.createTrack(body); }

  // === Strands (SHS) ===
  @Get('strands')
  @ApiOperation({ summary: 'List strands (SHS)', description: 'e.g. STEM, ABM, HUMSS, GAS, TVL' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'trackId', required: false })
  findStrands(@Query('tenantId') tenantId: string, @Query('trackId') trackId?: string) {
    return this.academicService.findStrands(tenantId, trackId);
  }

  @Post('strands')
  @ApiOperation({ summary: 'Create strand' })
  createStrand(@Body() body: any) { return this.academicService.createStrand(body); }

  // === Programs (College) ===
  @Get('programs')
  @ApiOperation({ summary: 'List programs (College)', description: 'e.g. BSIT, BSA, BSBA' })
  @ApiQuery({ name: 'tenantId', required: true })
  findPrograms(@Query('tenantId') tenantId: string) { return this.academicService.findPrograms(tenantId); }

  @Post('programs')
  @ApiOperation({ summary: 'Create program' })
  createProgram(@Body() body: any) { return this.academicService.createProgram(body); }

  // === Subjects ===
  @Get('subjects')
  @ApiOperation({ summary: 'List subjects/courses' })
  @ApiQuery({ name: 'tenantId', required: true })
  findSubjects(@Query('tenantId') tenantId: string) { return this.academicService.findSubjects(tenantId); }

  @Get('subjects/:id')
  @ApiOperation({ summary: 'Get subject detail' })
  findOneSubject(@Param('id') id: string) { return this.academicService.findOneSubject(id); }

  @Post('subjects')
  @ApiOperation({ summary: 'Create subject', description: 'Supports units, hours/week, lecture/lab split, prerequisites, co-requisites, learning area.' })
  createSubject(@Body() body: any) { return this.academicService.createSubject(body); }

  // === Curricula ===
  @Get('curricula')
  @ApiOperation({ summary: 'List curricula', description: 'Filtered by school year, education level, or branch.' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'schoolYearId', required: false })
  @ApiQuery({ name: 'educationLevelId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  findCurricula(
    @Query('tenantId') tenantId: string,
    @Query('schoolYearId') syId?: string,
    @Query('educationLevelId') elId?: string,
    @Query('branchId') branchId?: string,
  ) { return this.academicService.findCurricula(tenantId, { schoolYearId: syId, educationLevelId: elId, branchId }); }

  @Get('curricula/:id')
  @ApiOperation({ summary: 'Get curriculum detail' })
  findOneCurriculum(@Param('id') id: string) { return this.academicService.findOneCurriculum(id); }

  @Post('curricula')
  @ApiOperation({ summary: 'Create curriculum', description: 'Scope by education level, grade, strand, program, school year. Status: draft → active → archived.' })
  createCurriculum(@Body() body: any) { return this.academicService.createCurriculum(body); }

  @Post('curricula/:id/clone')
  @ApiOperation({ summary: 'Clone curriculum', description: 'Clone from prior school year. Sets clonedFromCurriculumId, clonedAt, clonedBy.' })
  async cloneCurriculum(@Param('id') id: string, @Body() body: { schoolYearId: string; clonedBy?: string }) {
    const original = await this.academicService.findOneCurriculum(id);
    const clone = await this.academicService.createCurriculum({
      ...original,
      id: undefined,
      schoolYearId: body.schoolYearId,
      status: 'draft',
      clonedFromCurriculumId: id,
      clonedAt: new Date(),
      clonedBy: body.clonedBy,
    });
    return clone;
  }

  // === Curriculum Subjects ===
  @Get('curricula/:curriculumId/subjects')
  @ApiOperation({ summary: 'List subjects in a curriculum' })
  findCurriculumSubjects(@Param('curriculumId') currId: string) { return this.academicService.findCurriculumSubjects(currId); }

  @Post('curriculum-subjects')
  @ApiOperation({ summary: 'Add subject to curriculum', description: 'Assign a subject to a term within a curriculum, with prerequisite linking.' })
  createCurriculumSubject(@Body() body: any) { return this.academicService.createCurriculumSubject(body); }

  @Post('curricula/:id/publish')
  @ApiOperation({ summary: 'Publish curriculum', description: 'Transition from draft → active. Validates effectiveGradingSystemId is set on all subjects.' })
  async publishCurriculum(@Param('id') id: string) {
    return this.academicService.updateCurriculum(id, { status: 'active' });
  }
}
