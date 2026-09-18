import { Controller, Get, Post, Put, Body, Param, Query, Headers, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SchedulingService } from './scheduling.service';

@ApiTags('scheduling')
@ApiBearerAuth('access-token')
@Controller('scheduling')
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  // === Class Offerings ===
  @Get('offerings')
  @ApiOperation({ summary: 'List class offerings' })
  async listOfferings(
    @Headers('x-tenant-id') tenantId: string,
    @Query('branchId') branchId?: string,
    @Query('schoolYearId') schoolYearId?: string,
    @Query('termId') termId?: string,
    @Req() req?: any
  ) {
    const userId = req?.user?.sub ?? req?.user?.id;
    const isFacultyOnly = userId ? await this.schedulingService.isFacultyOnly(userId) : false;
    const facultyUserId = isFacultyOnly ? userId : undefined;
    return this.schedulingService.findAllOfferings(tenantId, branchId, schoolYearId, termId, facultyUserId);
  }

  @Post('offerings')
  @ApiOperation({ summary: 'Create a class offering (with conflict check)' })
  async createOffering(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.schedulingService.createOffering({ ...data, tenantId });
  }

  @Put('offerings/:id')
  @ApiOperation({ summary: 'Update a class offering' })
  async updateOffering(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string, @Body() data: any) {
    return this.schedulingService.updateOffering(id, tenantId, data);
  }

  @Post('offerings/check-conflict')
  @ApiOperation({ summary: 'Check for scheduling conflicts before creating' })
  async checkConflict(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    const conflict = await this.schedulingService.checkSchedulingConflict({ ...data, tenantId });
    return { hasConflict: !!conflict, conflict };
  }

  // === Faculty Load ===
  @Get('faculty/:employeeId/load')
  @ApiOperation({ summary: 'Get faculty load for a term' })
  async getFacultyLoad(
    @Param('employeeId') employeeId: string,
    @Headers('x-tenant-id') tenantId: string,
    @Query('termId') termId: string,
  ) {
    return this.schedulingService.getFacultyLoad(tenantId, employeeId, termId);
  }

  // === Timetable ===
  @Get('timetable')
  @ApiOperation({ summary: 'Get timetable for a section' })
  async getTimetable(
    @Headers('x-tenant-id') tenantId: string,
    @Query('sectionId') sectionId: string,
    @Query('termId') termId: string,
  ) {
    return this.schedulingService.getTimetable(tenantId, sectionId, termId);
  }

  // === School Calendar ===
  @Get('calendars')
  @ApiOperation({ summary: 'List school calendars' })
  async listCalendars(@Headers('x-tenant-id') tenantId: string, @Query('branchId') branchId?: string) {
    return this.schedulingService.getCalendars(tenantId, branchId);
  }

  @Post('calendars')
  @ApiOperation({ summary: 'Create a school calendar' })
  async createCalendar(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.schedulingService.createCalendar({ ...data, tenantId });
  }

  @Get('calendars/:calendarId/events')
  @ApiOperation({ summary: 'Get calendar events' })
  async getEvents(@Param('calendarId') calendarId: string, @Headers('x-tenant-id') tenantId: string) {
    return this.schedulingService.getCalendarEvents(calendarId, tenantId);
  }

  @Post('calendars/events')
  @ApiOperation({ summary: 'Create a calendar event' })
  async createEvent(@Body() data: any, @Headers('x-tenant-id') tenantId: string) {
    return this.schedulingService.createEvent({ ...data, tenantId });
  }

  // === Student Schedule ===
  @Get('students/:studentId/schedule')
  @ApiOperation({ summary: 'Get student schedule' })
  async getStudentSchedule(@Param('studentId') studentId: string, @Headers('x-tenant-id') tenantId: string) {
    return this.schedulingService.getStudentSchedule(studentId, tenantId);
  }
}

