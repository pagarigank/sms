import { Controller, Get, Post, Put, Body, Param, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdmissionsService } from './admissions.service';

@ApiTags('admissions')
@ApiBearerAuth('access-token')
@Controller('admissions')
export class AdmissionsController {
  constructor(private readonly admissionsService: AdmissionsService) {}

  // === Pipeline Stages ===
  @Get('stages')
  @ApiOperation({ summary: 'List applicant pipeline stages' })
  async getStages(@Headers('x-tenant-id') tenantId: string, @Query('branchId') branchId?: string) {
    return this.admissionsService.getStageConfigs(tenantId, branchId);
  }

  @Post('stages')
  @ApiOperation({ summary: 'Create a pipeline stage' })
  async createStage(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.admissionsService.createStageConfig({ ...data, tenantId });
  }

  @Put('stages/:id')
  @ApiOperation({ summary: 'Update a pipeline stage' })
  async updateStage(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string, @Body() data: any) {
    return this.admissionsService.updateStageConfig(id, tenantId, data);
  }

  // === Transitions ===
  @Get('transitions')
  @ApiOperation({ summary: 'List stage transitions' })
  async getTransitions(@Headers('x-tenant-id') tenantId: string) {
    return this.admissionsService.getTransitions(tenantId);
  }

  @Post('transitions')
  @ApiOperation({ summary: 'Create a stage transition rule' })
  async createTransition(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.admissionsService.createTransition({ ...data, tenantId });
  }

  // === Pipeline Kanban ===
  @Get('pipeline')
  @ApiOperation({ summary: 'Get applicants grouped by pipeline stage (Kanban view)' })
  async getPipeline(@Headers('x-tenant-id') tenantId: string) {
    return this.admissionsService.getApplicantsByStage(tenantId);
  }

  // === Applicants (G-23) ===
  @Post('applicants')
  @ApiOperation({ summary: 'Create an admissions applicant' })
  async createApplicant(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    return this.admissionsService.createApplicant({ ...body, tenantId });
  }

  @Get('applicants')
  @ApiOperation({ summary: 'List applicants' })
  async getApplicants(@Headers('x-tenant-id') tenantId: string, @Query('status') status?: string) {
    return this.admissionsService.getApplicants(tenantId, status);
  }

  @Get('applicants/:id')
  @ApiOperation({ summary: 'Get applicant detail' })
  async getApplicant(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.admissionsService.findOneApplicant(id, tenantId);
  }

  @Put('applicants/:id')
  @ApiOperation({ summary: 'Update applicant info' })
  async updateApplicant(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    return this.admissionsService.updateApplicant(id, tenantId, body);
  }

  @Put('applicants/:id/stage')
  @ApiOperation({ summary: 'Move applicant to another pipeline stage (Kanban drag)' })
  async moveApplicantStage(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { stageId: string },
  ) {
    return this.admissionsService.moveApplicantToStage(id, tenantId, body.stageId);
  }

  @Post('applicants/:id/convert')
  @ApiOperation({ summary: 'Convert an accepted applicant into an enrolled student' })
  async convertApplicant(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.admissionsService.convertApplicantToStudent(id, tenantId);
  }

  // === Section Assignment Rules ===
  @Get('section-rules')
  @ApiOperation({ summary: 'List section assignment rules' })
  async getSectionRules(@Headers('x-tenant-id') tenantId: string, @Query('sectionId') sectionId?: string) {
    return this.admissionsService.getSectionRules(tenantId, sectionId);
  }

  @Post('section-rules')
  @ApiOperation({ summary: 'Create a section assignment rule' })
  async createSectionRule(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.admissionsService.createSectionRule({ ...data, tenantId });
  }

  @Put('section-rules/:id')
  @ApiOperation({ summary: 'Update a section assignment rule' })
  async updateSectionRule(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string, @Body() data: any) {
    return this.admissionsService.updateSectionRule(id, tenantId, data);
  }

  // === Bulk Import ===
  @Post('bulk-import')
  @ApiOperation({ summary: 'Bulk import students from CSV/Excel' })
  async bulkImport(@Headers('x-tenant-id') tenantId: string, @Body() body: { records: any[] }) {
    return this.admissionsService.bulkImportStudents(tenantId, body.records);
  }
}
