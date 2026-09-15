import { Controller, Get, Post, Put, Body, Param, Query, Headers, Req, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';

@ApiTags('attendance')
@ApiBearerAuth('access-token')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // === Roster ===
  @Get('roster')
  @ApiOperation({ summary: 'Get the student roster for a class offering (attendance-entry grid)' })
  async getRoster(
    @Headers('x-tenant-id') tenantId: string,
    @Query('classOfferingId') classOfferingId: string,
  ) {
    return this.attendanceService.getClassRoster(tenantId, classOfferingId);
  }

  // === Records ===
  @Get('records')
  @ApiOperation({ summary: 'Get attendance records for a class on a date' })
  async getRecords(
    @Headers('x-tenant-id') tenantId: string,
    @Query('classOfferingId') classOfferingId: string,
    @Query('date') date: string,
  ) {
    return this.attendanceService.getAttendanceForClass(classOfferingId, date, tenantId);
  }

  @Post('records')
  @ApiOperation({ summary: 'Record attendance for a student' })
  async recordAttendance(@Body() data: any, @Headers('x-tenant-id') tenantId: string, @Req() req: any) {
    return this.attendanceService.recordAttendance({ ...data, tenantId }, req.user?.id ?? req.user?.userId ?? req.user?.sub);
  }

  @Post('records/bulk')
  @ApiOperation({ summary: 'Bulk record attendance for a class' })
  async bulkRecord(@Body() body: { records: any[] }, @Headers('x-tenant-id') tenantId: string, @Req() req: any) {
    if (!body || !Array.isArray(body.records)) {
      throw new BadRequestException('Body must be { records: [...] }');
    }
    const records = body.records.map(r => ({ ...r, tenantId }));
    return this.attendanceService.bulkRecordAttendance(records, req.user?.id ?? req.user?.userId ?? req.user?.sub);
  }

  @Get('students/:studentId/summary')
  @ApiOperation({ summary: 'Get student attendance summary' })
  async getSummary(
    @Param('studentId') studentId: string,
    @Headers('x-tenant-id') tenantId: string,
    @Query('schoolYearId') schoolYearId: string,
  ) {
    return this.attendanceService.getStudentAttendanceSummary(studentId, tenantId, schoolYearId);
  }

  @Get('students/:studentId/threshold-check')
  @ApiOperation({ summary: 'Check if student exceeds absence notification thresholds' })
  async checkThresholds(@Param('studentId') studentId: string, @Headers('x-tenant-id') tenantId: string) {
    return this.attendanceService.checkAbsenceThresholds(tenantId, studentId);
  }

  // === Config ===
  @Get('config')
  @ApiOperation({ summary: 'Get attendance configuration' })
  async getConfigs(@Headers('x-tenant-id') tenantId: string, @Query('branchId') branchId?: string) {
    return this.attendanceService.getConfigs(tenantId, branchId);
  }

  @Post('config')
  @ApiOperation({ summary: 'Create attendance configuration' })
  async createConfig(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.attendanceService.createConfig({ ...data, tenantId });
  }

  // === Excuses ===
  @Get('excuses')
  @ApiOperation({ summary: 'List attendance excuses' })
  async getExcuses(@Headers('x-tenant-id') tenantId: string, @Query('studentId') studentId?: string) {
    return this.attendanceService.getExcuses(tenantId, studentId);
  }

  @Post('excuses')
  @ApiOperation({ summary: 'Submit an attendance excuse' })
  async createExcuse(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.attendanceService.createExcuse({ ...data, tenantId });
  }

  @Put('excuses/:id/review')
  @ApiOperation({ summary: 'Review/approve/reject an excuse' })
  async reviewExcuse(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { status: string; reviewNotes?: string },
  ) {
    return this.attendanceService.reviewExcuse(id, tenantId, body.status, 'system', body.reviewNotes);
  }

  // === Thresholds ===
  @Get('thresholds')
  @ApiOperation({ summary: 'Get notification thresholds' })
  async getThresholds(@Headers('x-tenant-id') tenantId: string, @Query('branchId') branchId?: string) {
    return this.attendanceService.getThresholds(tenantId, branchId);
  }

  @Post('thresholds')
  @ApiOperation({ summary: 'Create notification threshold' })
  async createThreshold(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.attendanceService.createThreshold({ ...data, tenantId });
  }
}
