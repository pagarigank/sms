import { Controller, Get, Post, Put, Body, Param, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SisService } from './sis.service';

@ApiTags('sis')
@ApiBearerAuth('access-token')
@Controller('api/v1/sis')
export class SisController {
  constructor(private readonly sisService: SisService) {}

  // === Students ===
  @Get('students')
  @ApiOperation({ summary: 'List all students for a tenant' })
  async findAllStudents(@Headers('x-tenant-id') tenantId: string, @Query('branchId') branchId?: string) {
    return this.sisService.findAllStudents(tenantId, branchId);
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

  @Get('students/duplicates')
  @ApiOperation({ summary: 'Find potential duplicate students (LRN or name+birthdate match)' })
  async findDuplicates(@Headers('x-tenant-id') tenantId: string) {
    return this.sisService.findDuplicateStudents(tenantId);
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
  ) {
    return this.sisService.findAllSections(tenantId, branchId, schoolYearId);
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
}
