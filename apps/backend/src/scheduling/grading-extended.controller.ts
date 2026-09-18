import { Controller, Get, Post, Put, Body, Param, Query, Headers, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GradingExtendedService } from './grading-extended.service';

@ApiTags('grading-extended')
@ApiBearerAuth('access-token')
@Controller('grading')
export class GradingExtendedController {
  constructor(private readonly gradingService: GradingExtendedService) {}

  // === Gradebook ===
  // Note: gradebook/entries/bulk/finalize now live in GradingController
  // (grading.module). Those routes collided with this controller until the
  // duplicates were removed here — the grading implementation is the live one.

  @Get('students/:studentId')
  @ApiOperation({ summary: 'Get student grades' })
  async getStudentGrades(
    @Param('studentId') studentId: string,
    @Headers('x-tenant-id') tenantId: string,
    @Query('termId') termId?: string,
  ) {
    return this.gradingService.getStudentGrades(studentId, tenantId, termId);
  }

  // === Grade Change Requests ===
  @Get('change-requests')
  @ApiOperation({ summary: 'List grade change requests' })
  async getChangeRequests(@Headers('x-tenant-id') tenantId: string, @Query('classOfferingId') classOfferingId?: string) {
    return this.gradingService.getChangeRequests(tenantId, classOfferingId);
  }

  @Post('change-requests')
  @ApiOperation({ summary: 'Submit a grade change request' })
  async createChangeRequest(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.gradingService.createChangeRequest({ ...data, tenantId });
  }

  @Put('change-requests/:id/approve')
  @ApiOperation({ summary: 'Approve a grade change request' })
  async approveChangeRequest(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.gradingService.approveChangeRequest(id, tenantId, 'system');
  }

  @Put('change-requests/:id/reject')
  @ApiOperation({ summary: 'Reject a grade change request' })
  async rejectChangeRequest(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { reason?: string },
  ) {
    return this.gradingService.rejectChangeRequest(id, tenantId, 'system', body.reason);
  }

  // === Permanent Records (Form 137 / TOR) ===
  @Get('permanent-records')
  @ApiOperation({ summary: 'Get permanent record for a student' })
  async getPermanentRecord(
    @Headers('x-tenant-id') tenantId: string,
    @Query('studentId') studentId: string,
    @Query('schoolYearId') schoolYearId: string,
  ) {
    return this.gradingService.getPermanentRecord(studentId, tenantId, schoolYearId);
  }

  @Post('permanent-records')
  @ApiOperation({ summary: 'Create a permanent record' })
  async createPermanentRecord(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new BadRequestException('Request body must be a JSON object');
    }
    return this.gradingService.createPermanentRecord({ ...data, tenantId });
  }

  @Put('permanent-records/:id/finalize')
  @ApiOperation({ summary: 'Finalize/verify a permanent record' })
  async finalizePermanentRecord(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.gradingService.finalizePermanentRecord(id, tenantId, 'system');
  }

  @Get('permanent-records/form137')
  @ApiOperation({ summary: 'Generate Form 137 (Report Card)' })
  async generateForm137(
    @Headers('x-tenant-id') tenantId: string,
    @Query('studentId') studentId: string,
    @Query('schoolYearId') schoolYearId: string,
  ) {
    return this.gradingService.generateForm137(studentId, tenantId, schoolYearId);
  }

  @Get('permanent-records/tor')
  @ApiOperation({ summary: 'Generate TOR (Transcript of Records)' })
  async generateTOR(@Headers('x-tenant-id') tenantId: string, @Query('studentId') studentId: string) {
    return this.gradingService.generateTOR(studentId, tenantId);
  }
}

