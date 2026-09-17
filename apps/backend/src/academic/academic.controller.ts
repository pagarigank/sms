import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Headers, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AcademicService } from './academic.service';
import { AcademicRolloverService } from '../common/academic-rollover.service';

@ApiTags('academic')
@ApiBearerAuth('access-token')
@Controller('academic')
export class AcademicController {
  constructor(
    private readonly academicService: AcademicService,
    private readonly rolloverService: AcademicRolloverService,
  ) {}

  // === Education Levels ===
  @Get('education-levels')
  @ApiOperation({ summary: 'List education levels' })
  findEduLevels(@Headers('x-tenant-id') tenantId: string) { return this.academicService.findEduLevels(tenantId); }

  @Post('education-levels')
  @ApiOperation({ summary: 'Create education level', description: 'e.g. Kindergarten, Elementary, JHS, SHS, College' })
  createEduLevel(@Body() body: any, @Headers('x-tenant-id') tenantId: string) { return this.academicService.createEduLevel({ ...body, tenantId }); }

  @Patch('education-levels/:id')
  @ApiOperation({ summary: 'Update education level' })
  updateEduLevel(@Param('id') id: string, @Body() body: any) { return this.academicService.updateEduLevel(id, body); }

  @Delete('education-levels/:id')
  @ApiOperation({ summary: 'Delete education level', description: 'Fails with 409 if referenced by grade levels or curricula.' })
  removeEduLevel(@Param('id') id: string) { return this.academicService.removeEduLevel(id); }

  // === Grade Levels ===
  @Get('grade-levels')
  @ApiOperation({ summary: 'List grade levels', description: 'Filtered by education level.' })
  @ApiQuery({ name: 'educationLevelId', required: false })
  findGradeLevels(@Headers('x-tenant-id') tenantId: string, @Query('educationLevelId') elId?: string) {
    return this.academicService.findGradeLevels(tenantId, elId);
  }

  @Post('grade-levels')
  @ApiOperation({ summary: 'Create grade level', description: 'e.g. Grade 7, Grade 11, 1st Year College' })
  createGradeLevel(@Body() body: any, @Headers('x-tenant-id') tenantId: string) { return this.academicService.createGradeLevel({ ...body, tenantId }); }

  @Patch('grade-levels/:id')
  @ApiOperation({ summary: 'Update grade level' })
  updateGradeLevel(@Param('id') id: string, @Body() body: any) { return this.academicService.updateGradeLevel(id, body); }

  @Delete('grade-levels/:id')
  @ApiOperation({ summary: 'Delete grade level', description: 'Fails with 409 if referenced by sections or curricula.' })
  removeGradeLevel(@Param('id') id: string) { return this.academicService.removeGradeLevel(id); }

  // === School Years ===
  @Get('school-years')
  @ApiOperation({ summary: 'List school years' })
  findSchoolYears(@Headers('x-tenant-id') tenantId: string) { return this.academicService.findSchoolYears(tenantId); }

  @Get('school-years/:id')
  @ApiOperation({ summary: 'Get school year detail' })
  findOneSchoolYear(@Param('id') id: string) { return this.academicService.findOneSchoolYear(id); }

  @Post('school-years')
  @ApiOperation({ summary: 'Create school year', description: 'e.g. SY 2026-2027' })
  createSchoolYear(@Body() body: any, @Headers('x-tenant-id') tenantId: string) { return this.academicService.createSchoolYear({ ...body, tenantId }); }

  @Patch('school-years/:id')
  @ApiOperation({ summary: 'Update school year' })
  updateSchoolYear(@Param('id') id: string, @Body() body: any) { return this.academicService.updateSchoolYear(id, body); }

  @Delete('school-years/:id')
  @ApiOperation({ summary: 'Delete school year', description: 'Fails with 409 if referenced by terms or curricula.' })
  removeSchoolYear(@Param('id') id: string) { return this.academicService.removeSchoolYear(id); }

  // NOTE: literal route must be declared before any parameterized sibling —
  // NestJS matches in declaration order.
  @Post('school-years/:id/activate')
  @ApiOperation({ summary: 'Activate school year', description: 'One active school year per tenant: the previous active becomes completed.' })
  activateSchoolYear(@Param('id') id: string) { return this.academicService.activateSchoolYear(id); }

  // === Terms ===
  @Get('school-years/:schoolYearId/terms')
  @ApiOperation({ summary: 'List terms in a school year' })
  findTerms(@Param('schoolYearId') syId: string) { return this.academicService.findTerms(syId); }

  @Post('terms')
  @ApiOperation({ summary: 'Create term', description: 'e.g. First Quarter, Semester 1' })
  createTerm(@Body() body: any, @Headers('x-tenant-id') tenantId: string) { return this.academicService.createTerm({ ...body, tenantId }); }

  @Patch('terms/:id')
  @ApiOperation({ summary: 'Update term' })
  updateTerm(@Param('id') id: string, @Body() body: any) { return this.academicService.updateTerm(id, body); }

  @Delete('terms/:id')
  @ApiOperation({ summary: 'Delete term', description: 'Fails with 409 if referenced by curricula subjects or enrollments.' })
  removeTerm(@Param('id') id: string) { return this.academicService.removeTerm(id); }

  // === Tracks (SHS) ===
  @Get('tracks')
  @ApiOperation({ summary: 'List tracks (SHS)', description: 'e.g. Academic, TVL, Sports, Arts & Design' })
  findTracks(@Headers('x-tenant-id') tenantId: string) { return this.academicService.findTracks(tenantId); }

  @Post('tracks')
  @ApiOperation({ summary: 'Create track' })
  createTrack(@Body() body: any, @Headers('x-tenant-id') tenantId: string) { return this.academicService.createTrack({ ...body, tenantId }); }

  @Patch('tracks/:id')
  @ApiOperation({ summary: 'Update track' })
  updateTrack(@Param('id') id: string, @Body() body: any) { return this.academicService.updateTrack(id, body); }

  @Delete('tracks/:id')
  @ApiOperation({ summary: 'Delete track', description: 'Fails with 409 if referenced by strands or curricula.' })
  removeTrack(@Param('id') id: string) { return this.academicService.removeTrack(id); }

  // === Strands (SHS) ===
  @Get('strands')
  @ApiOperation({ summary: 'List strands (SHS)', description: 'e.g. STEM, ABM, HUMSS, GAS, TVL' })
  @ApiQuery({ name: 'trackId', required: false })
  findStrands(@Headers('x-tenant-id') tenantId: string, @Query('trackId') trackId?: string) {
    return this.academicService.findStrands(tenantId, trackId);
  }

  @Post('strands')
  @ApiOperation({ summary: 'Create strand' })
  createStrand(@Body() body: any, @Headers('x-tenant-id') tenantId: string) { return this.academicService.createStrand({ ...body, tenantId }); }

  @Patch('strands/:id')
  @ApiOperation({ summary: 'Update strand' })
  updateStrand(@Param('id') id: string, @Body() body: any) { return this.academicService.updateStrand(id, body); }

  @Delete('strands/:id')
  @ApiOperation({ summary: 'Delete strand', description: 'Fails with 409 if referenced by curricula.' })
  removeStrand(@Param('id') id: string) { return this.academicService.removeStrand(id); }

  // === Programs (College) ===
  @Get('programs')
  @ApiOperation({ summary: 'List programs (College)', description: 'e.g. BSIT, BSA, BSBA' })
  findPrograms(@Headers('x-tenant-id') tenantId: string) { return this.academicService.findPrograms(tenantId); }

  @Post('programs')
  @ApiOperation({ summary: 'Create program' })
  createProgram(@Body() body: any, @Headers('x-tenant-id') tenantId: string) { return this.academicService.createProgram({ ...body, tenantId }); }

  @Patch('programs/:id')
  @ApiOperation({ summary: 'Update program' })
  updateProgram(@Param('id') id: string, @Body() body: any) { return this.academicService.updateProgram(id, body); }

  @Delete('programs/:id')
  @ApiOperation({ summary: 'Delete program', description: 'Fails with 409 if referenced by curricula.' })
  removeProgram(@Param('id') id: string) { return this.academicService.removeProgram(id); }

  // === Subjects ===
  @Get('subjects')
  @ApiOperation({ summary: 'List subjects/courses' })
  findSubjects(@Headers('x-tenant-id') tenantId: string) { return this.academicService.findSubjects(tenantId); }

  @Get('subjects/:id')
  @ApiOperation({ summary: 'Get subject detail' })
  findOneSubject(@Param('id') id: string) { return this.academicService.findOneSubject(id); }

  @Post('subjects')
  @ApiOperation({ summary: 'Create subject', description: 'Supports units, hours/week, lecture/lab split, prerequisites, co-requisites, learning area.' })
  createSubject(@Body() body: any, @Headers('x-tenant-id') tenantId: string) { return this.academicService.createSubject({ ...body, tenantId }); }

  @Patch('subjects/:id')
  @ApiOperation({ summary: 'Update subject' })
  updateSubject(@Param('id') id: string, @Body() body: any) { return this.academicService.updateSubject(id, body); }

  @Delete('subjects/:id')
  @ApiOperation({ summary: 'Delete subject', description: 'Fails with 409 if referenced by curricula or class offerings.' })
  removeSubject(@Param('id') id: string) { return this.academicService.removeSubject(id); }

  // === Curricula ===
  @Get('curricula')
  @ApiOperation({ summary: 'List curricula', description: 'Filtered by school year, education level, or branch.' })
  @ApiQuery({ name: 'schoolYearId', required: false })
  @ApiQuery({ name: 'educationLevelId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  findCurricula(
    @Headers('x-tenant-id') tenantId: string,
    @Query('schoolYearId') syId?: string,
    @Query('educationLevelId') elId?: string,
    @Query('branchId') branchId?: string,
  ) { return this.academicService.findCurricula(tenantId, { schoolYearId: syId, educationLevelId: elId, branchId }); }

  @Get('curricula/:id')
  @ApiOperation({ summary: 'Get curriculum detail' })
  findOneCurriculum(@Param('id') id: string) { return this.academicService.findOneCurriculum(id); }

  @Post('curricula')
  @ApiOperation({ summary: 'Create curriculum', description: 'Scope by education level, grade, strand, program, school year. Status: draft → active → archived.' })
  createCurriculum(@Body() body: any, @Headers('x-tenant-id') tenantId: string) { return this.academicService.createCurriculum({ ...body, tenantId }); }

  @Patch('curricula/:id')
  @ApiOperation({ summary: 'Update curriculum' })
  updateCurriculumRoute(@Param('id') id: string, @Body() body: any) { return this.academicService.updateCurriculum(id, body); }

  @Delete('curricula/:id')
  @ApiOperation({ summary: 'Delete curriculum', description: 'Fails with 409 if referenced by enrollments.' })
  removeCurriculum(@Param('id') id: string) { return this.academicService.removeCurriculum(id); }

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
  createCurriculumSubject(@Body() body: any, @Headers('x-tenant-id') tenantId: string) { return this.academicService.createCurriculumSubject({ ...body, tenantId }); }

  @Delete('curriculum-subjects/:id')
  @ApiOperation({ summary: 'Remove a subject from a curriculum' })
  removeCurriculumSubject(@Param('id') id: string) { return this.academicService.removeCurriculumSubject(id); }

  @Post('curricula/:id/publish')
  @ApiOperation({ summary: 'Publish curriculum', description: 'Transition from draft → active. Validates effectiveGradingSystemId is set on all subjects.' })
  async publishCurriculum(@Param('id') id: string) {
    return this.academicService.updateCurriculum(id, { status: 'active' });
  }

  // === Academic Rollover ===
  @Get('school-years/:id/rollover-preview')
  @ApiOperation({ summary: 'Preview what a rollover would clone from a school year', description: 'Counts terms, curricula, grading systems and honor-roll configs that would be cloned.' })
  rolloverPreview(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.rolloverService.getRolloverPreview(tenantId, id);
  }

  @Post('school-years/:id/rollover')
  @ApiOperation({ summary: 'Roll over to a new school year', description: 'Creates the new year and clones terms, curricula (+subjects), grading systems (+components) and honor-roll configs in ONE transaction.' })
  async rollover(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { name: string; startDate: string; endDate: string; createdBy?: string },
  ) {
    for (const field of ['name', 'startDate', 'endDate'] as const) {
      if (!body?.[field]) throw new BadRequestException(`body.${field} is required`);
    }
    return this.rolloverService.rollover(tenantId, id, body, body.createdBy ?? 'system');
  }
}
