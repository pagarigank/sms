import { Controller, Get, Post, Put, Delete, Body, Param, Query, Headers, Req, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { SisService } from './sis.service';
import { ReEnrollmentService } from '../scheduling/re-enrollment.service';

@ApiTags('sis')
@ApiBearerAuth('access-token')
@Controller('sis')
export class SisController {
  constructor(
    private readonly sisService: SisService,
    private readonly reEnrollmentService: ReEnrollmentService,
  ) {}

  // === Students ===
  @Get('students')
  @ApiOperation({ summary: 'List all students for a tenant' })
  async findAllStudents(
    @Headers('x-tenant-id') tenantId: string, 
    @Query('branchId') branchId?: string,
    @Req() req?: any
  ) {
    const userId = req?.user?.sub ?? req?.user?.id;
    const isFacultyOnly = userId ? await this.sisService.isFacultyOnly(userId) : false;
    const facultyUserId = isFacultyOnly ? userId : undefined;
    return this.sisService.findAllStudents(tenantId, branchId, facultyUserId);
  }

  // Guardian portal: resolve "my children" from the authenticated user.
  // MUST be declared before students/:id so 'my-children' is not captured
  // as an :id parameter.
  @Get('students/my-children')
  @ApiOperation({ summary: 'Guardian portal: list the authenticated guardian\'s children' })
  async findMyChildren(@Req() req: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.findChildrenOfGuardianUser(req.user?.sub ?? req.user?.id, tenantId);
  }

  // NOTE: must be declared BEFORE students/:id, otherwise 'duplicates'
  // is captured as the :id parameter.
  @Get('students/duplicates')
  @ApiOperation({ summary: 'Find potential duplicate students (LRN or name+birthdate match)' })
  async findDuplicates(@Headers('x-tenant-id') tenantId: string) {
    return this.sisService.findDuplicateStudents(tenantId);
  }

  @Get('students/:id')
  @ApiOperation({ summary: 'Get student by ID' })
  async findStudent(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.findStudentById(id, tenantId);
  }

  @Get('students/:id/profile')
  @ApiOperation({ summary: 'Get student 360 profile (info + guardians + enrollments + documents + health + discipline)' })
  async getStudent360(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.getStudent360(id, tenantId);
  }

  @Post('students')
  @ApiOperation({ summary: 'Create a new student' })
  async createStudent(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.createStudent({ ...data, tenantId });
  }

  @Put('students/:id')
  @ApiOperation({ summary: 'Update student' })
  async updateStudent(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string, @Body() data: any) {
    return this.sisService.updateStudent(id, tenantId, data);
  }

  // === Guardians ===
  @Get('guardians')
  @ApiOperation({ summary: 'List all guardians' })
  async findAllGuardians(@Headers('x-tenant-id') tenantId: string) {
    return this.sisService.findAllGuardians(tenantId);
  }

  @Post('guardians')
  @ApiOperation({ summary: 'Create a new guardian' })
  async createGuardian(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.createGuardian({ ...data, tenantId });
  }

  @Post('students/:studentId/guardians/:guardianId/link')
  @ApiOperation({ summary: 'Link a guardian to a student' })
  async linkGuardian(
    @Param('studentId') studentId: string,
    @Param('guardianId') guardianId: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { relationship: string; isPrimary: boolean },
  ) {
    return this.sisService.linkGuardianToStudent(studentId, guardianId, tenantId, body.relationship, body.isPrimary);
  }

  @Get('students/:studentId/guardians')
  @ApiOperation({ summary: 'Get guardians for a student' })
  async getStudentGuardians(@Param('studentId') studentId: string) {
    return this.sisService.getStudentGuardians(studentId);
  }

  // === Enrollments ===
  @Get('enrollments')
  @ApiOperation({ summary: 'List enrollments' })
  async findAllEnrollments(@Headers('x-tenant-id') tenantId: string, @Query('schoolYearId') schoolYearId?: string) {
    return this.sisService.findAllEnrollments(tenantId, schoolYearId);
  }

  // Batch re-enrollment preview + execute. MUST be declared BEFORE
  // @Post('enrollments') — NestJS would otherwise treat it as a plain
  // enrollment create with a batch body.
  // NOTE: 'enrollments/batch' as a path segment is not a tenant prefix issue:
  // the permission map's 'sis/enrollments' prefix matches it too.
  @Post('enrollments/batch')
  @ApiOperation({ summary: 'Execute batch re-enrollment from a source school year into a draft target year' })
  async executeBatchReEnrollment(@Body() body: any, @Headers('x-tenant-id') tenantId: string, @Req() req: any) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('Body must be a JSON object');
    }
    const { sourceSchoolYearId, targetSchoolYearId, targetCurriculumId, gradeLevelMapping, includeHolds, includeOutstandingBalances } = body;
    const mapping: Record<string, string> = {};
    for (const m of gradeLevelMapping ?? body.gradeLevelMappings ?? []) {
      if (m?.sourceGradeLevelId && m?.targetGradeLevelId) mapping[m.sourceGradeLevelId] = m.targetGradeLevelId;
    }
    if (!sourceSchoolYearId || !targetSchoolYearId || !targetCurriculumId) {
      throw new BadRequestException('sourceSchoolYearId, targetSchoolYearId and targetCurriculumId are required');
    }
    if (Object.keys(mapping).length === 0) {
      throw new BadRequestException('At least one grade level mapping is required');
    }
    return this.reEnrollmentService.executeBatchReEnrollment({
      tenantId,
      sourceSchoolYearId,
      targetSchoolYearId,
      targetCurriculumId,
      createdBy: req.user?.sub ?? req.user?.id ?? 'system',
      gradeLevelMapping: mapping,
      includeHolds,
      includeOutstandingBalances,
    });
  }

  @Get('enrollments/batch/preview')
  @ApiOperation({ summary: 'Preview batch re-enrollment: counts, holds, grade-level breakdown' })
  async getReEnrollmentPreview(@Headers('x-tenant-id') tenantId: string, @Query('sourceSchoolYearId') sourceSchoolYearId: string) {
    if (!sourceSchoolYearId) throw new BadRequestException('sourceSchoolYearId is required');
    return this.reEnrollmentService.getReEnrollmentPreview(tenantId, sourceSchoolYearId);
  }

  @Post('enrollments')
  @ApiOperation({ summary: 'Create enrollment' })
  async createEnrollment(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.createEnrollment({ ...data, tenantId });
  }

  @Put('enrollments/:id')
  @ApiOperation({ summary: 'Update enrollment' })
  async updateEnrollment(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string, @Body() data: any) {
    return this.sisService.updateEnrollment(id, tenantId, data);
  }

  // === Sections ===
  @Get('sections')
  @ApiOperation({ summary: 'List sections' })
  async findAllSections(
    @Headers('x-tenant-id') tenantId: string,
    @Query('branchId') branchId?: string,
    @Query('schoolYearId') schoolYearId?: string,
    @Req() req?: any
  ) {
    const userId = req?.user?.sub ?? req?.user?.id;
    const isFacultyOnly = userId ? await this.sisService.isFacultyOnly(userId) : false;
    const facultyUserId = isFacultyOnly ? userId : undefined;
    return this.sisService.findAllSections(tenantId, branchId, schoolYearId, facultyUserId);
  }

  @Post('sections')
  @ApiOperation({ summary: 'Create a section' })
  async createSection(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.createSection({ ...data, tenantId });
  }

  @Put('sections/:id')
  @ApiOperation({ summary: 'Update a section' })
  async updateSection(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string, @Body() data: any) {
    return this.sisService.updateSection(id, tenantId, data);
  }

  @Delete('sections/:id')
  @ApiOperation({ summary: 'Delete a section', description: 'Fails with 409 if students are still assigned.' })
  async deleteSection(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.deleteSection(id, tenantId);
  }

  @Get('sections/:id/students')
  @ApiOperation({ summary: 'Section roster', description: 'Active student assignments for a section, joined with student profiles.' })
  async findSectionStudents(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.findSectionStudents(id, tenantId);
  }

  @Post('sections/:id/students/:studentId')
  @ApiOperation({ summary: 'Assign a student to a section by studentId', description: 'Resolves the student\'s active enrollment, then runs the capacity-checked assignment transaction.' })
  async assignSectionStudent(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @Headers('x-tenant-id') tenantId: string,
    @Req() req: any,
  ) {
    return this.sisService.assignStudentToSectionByStudent(
      id,
      studentId,
      tenantId,
      req.user?.sub ?? req.user?.id,
    );
  }

  @Delete('sections/:id/students/:studentId')
  @ApiOperation({ summary: 'Unassign a student from a section', description: 'Soft-deactivates the assignment and clears the enrollment pointer in one transaction.' })
  async removeSectionStudent(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.sisService.removeSectionAssignment(id, studentId, tenantId);
  }

  @Post('enrollments/:enrollmentId/assign-section/:sectionId')
  @ApiOperation({ summary: 'Assign an enrollment to a section' })
  async assignToSection(
    @Param('enrollmentId') enrollmentId: string,
    @Param('sectionId') sectionId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.sisService.assignStudentToSection(enrollmentId, sectionId, tenantId);
  }

  // === Enrollment Holds ===
  @Get('students/:studentId/holds')
  @ApiOperation({ summary: 'Get active holds for a student' })
  async getHolds(@Param('studentId') studentId: string, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.getStudentHolds(studentId, tenantId);
  }

  @Post('holds')
  @ApiOperation({ summary: 'Create an enrollment hold' })
  async createHold(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.createHold({ ...data, tenantId });
  }

  @Put('holds/:id/release')
  @ApiOperation({ summary: 'Release an enrollment hold' })
  async releaseHold(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.releaseHold(id, tenantId, 'system');
  }

  // === Documents ===
  @Get('students/:studentId/documents')
  @ApiOperation({ summary: 'Get student documents' })
  async getDocuments(@Param('studentId') studentId: string, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.getStudentDocuments(studentId, tenantId);
  }

  @Post('documents')
  @ApiOperation({ summary: 'Upload/create a student document' })
  async createDocument(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.createDocument({ ...data, tenantId });
  }

  // === Behavior Incidents ===
  @Get('incidents')
  @ApiOperation({ summary: 'List behavior incidents' })
  async findAllIncidents(@Headers('x-tenant-id') tenantId: string, @Query('studentId') studentId?: string) {
    return this.sisService.findAllIncidents(tenantId, studentId);
  }

  @Post('incidents')
  @ApiOperation({ summary: 'Create a behavior incident' })
  async createIncident(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.createIncident({ ...data, tenantId });
  }

  // === Health Records ===
  @Get('students/:studentId/health')
  @ApiOperation({ summary: 'Get student health records' })
  async getHealthRecords(@Param('studentId') studentId: string, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.getStudentHealthRecords(studentId, tenantId);
  }

  @Post('health')
  @ApiOperation({ summary: 'Create a health record' })
  async createHealthRecord(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.createHealthRecord({ ...data, tenantId });
  }

  // === Transfers ===
  @Get('students/:studentId/transfers')
  @ApiOperation({ summary: 'Get student transfers' })
  async getTransfers(@Param('studentId') studentId: string, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.getStudentTransfers(studentId, tenantId);
  }

  @Post('transfers')
  @ApiOperation({ summary: 'Create a student transfer request' })
  async createTransfer(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.createTransfer({ ...data, tenantId });
  }

  // === Promotion Decisions ===
  @Get('promotions')
  @ApiOperation({ summary: 'Get promotion decisions for a school year' })
  async getPromotions(@Headers('x-tenant-id') tenantId: string, @Query('schoolYearId') schoolYearId: string) {
    return this.sisService.getPromotionDecisions(tenantId, schoolYearId);
  }

  @Post('promotions')
  @ApiOperation({ summary: 'Create a promotion decision' })
  async createPromotion(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.createPromotionDecision({ ...data, tenantId });
  }

  // === Merge Audit ===
  @Post('merge-audit')
  @ApiOperation({ summary: 'Record a student merge for audit trail' })
  async createMergeAudit(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.createMergeAudit({ ...data, tenantId });
  }

  // === Health Module CRUD (Extended) ===
  
  @Post('students/:studentId/immunizations')
  @ApiOperation({ summary: 'Add an immunization record' })
  async addImmunization(@Param('studentId') studentId: string, @Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.addImmunization(tenantId, studentId, data);
  }
  @Put('students/:studentId/immunizations/:id')
  @ApiOperation({ summary: 'Update an immunization record' })
  async updateImmunization(@Param('id') id: string, @Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.updateImmunization(tenantId, id, data);
  }
  @Delete('students/:studentId/immunizations/:id')
  @ApiOperation({ summary: 'Delete an immunization record' })
  async deleteImmunization(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.deleteImmunization(tenantId, id);
  }

  @Post('students/:studentId/medications')
  @ApiOperation({ summary: 'Add a medication record' })
  async addMedication(@Param('studentId') studentId: string, @Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.addMedication(tenantId, studentId, data);
  }
  @Put('students/:studentId/medications/:id')
  @ApiOperation({ summary: 'Update a medication record' })
  async updateMedication(@Param('id') id: string, @Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.updateMedication(tenantId, id, data);
  }
  @Delete('students/:studentId/medications/:id')
  @ApiOperation({ summary: 'Delete a medication record' })
  async deleteMedication(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.deleteMedication(tenantId, id);
  }

  @Post('students/:studentId/care-plans')
  @ApiOperation({ summary: 'Add a care plan' })
  async addCarePlan(@Param('studentId') studentId: string, @Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.addCarePlan(tenantId, studentId, data);
  }
  @Put('students/:studentId/care-plans/:id')
  @ApiOperation({ summary: 'Update a care plan' })
  async updateCarePlan(@Param('id') id: string, @Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.updateCarePlan(tenantId, id, data);
  }
  @Delete('students/:studentId/care-plans/:id')
  @ApiOperation({ summary: 'Delete a care plan' })
  async deleteCarePlan(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.deleteCarePlan(tenantId, id);
  }

  @Post('students/:studentId/allergies')
  @ApiOperation({ summary: 'Add an allergy record' })
  async addAllergy(@Param('studentId') studentId: string, @Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.addAllergy(tenantId, studentId, data);
  }
  @Put('students/:studentId/allergies/:id')
  @ApiOperation({ summary: 'Update an allergy record' })
  async updateAllergy(@Param('id') id: string, @Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.updateAllergy(tenantId, id, data);
  }
    // === Special Education & Screenings CRUD ===
  
  @Post('students/:studentId/screenings')
  @ApiOperation({ summary: 'Add a screening record' })
  async addScreening(@Param('studentId') studentId: string, @Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.addScreening(tenantId, studentId, data);
  }
  @Put('students/:studentId/screenings/:id')
  @ApiOperation({ summary: 'Update a screening record' })
  async updateScreening(@Param('id') id: string, @Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.updateScreening(tenantId, id, data);
  }
  @Delete('students/:studentId/screenings/:id')
  @ApiOperation({ summary: 'Delete a screening record' })
  async deleteScreening(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.deleteScreening(tenantId, id);
  }

  @Post('students/:studentId/ieps')
  @ApiOperation({ summary: 'Add an IEP record' })
  async addIEP(@Param('studentId') studentId: string, @Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.addIEP(tenantId, studentId, data);
  }
  @Put('students/:studentId/ieps/:id')
  @ApiOperation({ summary: 'Update an IEP record' })
  async updateIEP(@Param('id') id: string, @Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.updateIEP(tenantId, id, data);
  }
  @Delete('students/:studentId/ieps/:id')
  @ApiOperation({ summary: 'Delete an IEP record' })
  async deleteIEP(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.deleteIEP(tenantId, id);
  }

  @Post('students/:studentId/504-plans')
  @ApiOperation({ summary: 'Add a 504 Plan record' })
  async addPlan504(@Param('studentId') studentId: string, @Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.addPlan504(tenantId, studentId, data);
  }
  @Put('students/:studentId/504-plans/:id')
  @ApiOperation({ summary: 'Update a 504 Plan record' })
  async updatePlan504(@Param('id') id: string, @Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.updatePlan504(tenantId, id, data);
  }
  @Delete('students/:studentId/504-plans/:id')
  @ApiOperation({ summary: 'Delete a 504 Plan record' })
  async deletePlan504(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.deletePlan504(tenantId, id);
  }

  @Post('students/:studentId/evaluations')
  @ApiOperation({ summary: 'Add an evaluation record' })
  async addEvaluation(@Param('studentId') studentId: string, @Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.addEvaluation(tenantId, studentId, data);
  }
  @Put('students/:studentId/evaluations/:id')
  @ApiOperation({ summary: 'Update an evaluation record' })
  async updateEvaluation(@Param('id') id: string, @Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.updateEvaluation(tenantId, id, data);
  }
  @Delete('students/:studentId/evaluations/:id')
  @ApiOperation({ summary: 'Delete an evaluation record' })
  async deleteEvaluation(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.deleteEvaluation(tenantId, id);
  }

  @Post('students/:studentId/accommodations')
  @ApiOperation({ summary: 'Add an accommodation record' })
  async addAccommodation(@Param('studentId') studentId: string, @Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.addAccommodation(tenantId, studentId, data);
  }
  @Put('students/:studentId/accommodations/:id')
  @ApiOperation({ summary: 'Update an accommodation record' })
  async updateAccommodation(@Param('id') id: string, @Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.updateAccommodation(tenantId, id, data);
  }
  @Delete('students/:studentId/accommodations/:id')
  @ApiOperation({ summary: 'Delete an accommodation record' })
  async deleteAccommodation(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.deleteAccommodation(tenantId, id);
  }

  @Delete('students/:studentId/allergies/:id')
  @ApiOperation({ summary: 'Delete an allergy record' })
  async deleteAllergy(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.deleteAllergy(tenantId, id);
  }

  // === MTSS/Behavioral & Learning CRUD ===

  @Post('students/:studentId/discipline-incidents')
  @ApiOperation({ summary: 'Add a discipline incident record' })
  async addDisciplineIncident(@Param('studentId') studentId: string, @Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.addDisciplineIncident(tenantId, studentId, data);
  }
  @Put('students/:studentId/discipline-incidents/:id')
  @ApiOperation({ summary: 'Update a discipline incident record' })
  async updateDisciplineIncident(@Param('id') id: string, @Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.updateDisciplineIncident(tenantId, id, data);
  }
  @Delete('students/:studentId/discipline-incidents/:id')
  @ApiOperation({ summary: 'Delete a discipline incident record' })
  async deleteDisciplineIncident(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.deleteDisciplineIncident(tenantId, id);
  }

  @Post('students/:studentId/interventions')
  @ApiOperation({ summary: 'Add an intervention record' })
  async addIntervention(@Param('studentId') studentId: string, @Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.addIntervention(tenantId, studentId, data);
  }
  @Put('students/:studentId/interventions/:id')
  @ApiOperation({ summary: 'Update an intervention record' })
  async updateIntervention(@Param('id') id: string, @Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.updateIntervention(tenantId, id, data);
  }
  @Delete('students/:studentId/interventions/:id')
  @ApiOperation({ summary: 'Delete an intervention record' })
  async deleteIntervention(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.deleteIntervention(tenantId, id);
  }

  @Post('students/:studentId/sel-assessments')
  @ApiOperation({ summary: 'Add an SEL assessment record' })
  async addSELAssessment(@Param('studentId') studentId: string, @Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.addSELAssessment(tenantId, studentId, data);
  }
  @Put('students/:studentId/sel-assessments/:id')
  @ApiOperation({ summary: 'Update an SEL assessment record' })
  async updateSELAssessment(@Param('id') id: string, @Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.updateSELAssessment(tenantId, id, data);
  }
  @Delete('students/:studentId/sel-assessments/:id')
  @ApiOperation({ summary: 'Delete an SEL assessment record' })
  async deleteSELAssessment(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.deleteSELAssessment(tenantId, id);
  }

  @Post('students/:studentId/learning-profiles')
  @ApiOperation({ summary: 'Add a learning profile record' })
  async addLearningProfile(@Param('studentId') studentId: string, @Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.addLearningProfile(tenantId, studentId, data);
  }
  @Put('students/:studentId/learning-profiles/:id')
  @ApiOperation({ summary: 'Update a learning profile record' })
  async updateLearningProfile(@Param('id') id: string, @Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.updateLearningProfile(tenantId, id, data);
  }
  @Delete('students/:studentId/learning-profiles/:id')
  @ApiOperation({ summary: 'Delete a learning profile record' })
  async deleteLearningProfile(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.deleteLearningProfile(tenantId, id);
  }

  @Post('students/:studentId/goals')
  @ApiOperation({ summary: 'Add a goal record' })
  async addGoal(@Param('studentId') studentId: string, @Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.addGoal(tenantId, studentId, data);
  }
  @Put('students/:studentId/goals/:id')
  @ApiOperation({ summary: 'Update a goal record' })
  async updateGoal(@Param('id') id: string, @Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.updateGoal(tenantId, id, data);
  }
  @Delete('students/:studentId/goals/:id')
  @ApiOperation({ summary: 'Delete a goal record' })
  async deleteGoal(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.sisService.deleteGoal(tenantId, id);
  }
}
