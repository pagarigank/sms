import { Controller, Get, Post, Put, Body, Param, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportingService } from './reporting.service';

@ApiTags('reporting')
@ApiBearerAuth('access-token')
@Controller('reporting')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  // === Dashboard ===
  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard aggregation stats' })
  async getDashboardStats(
    @Headers('x-tenant-id') tenantId: string,
    @Query('branchId') branchId?: string,
    @Query('range') range?: 'week' | 'month' | 'quarter' | 'year',
  ) {
    return this.reportingService.getDashboardStats(tenantId, branchId, range);
  }

  // === Enrollment Reports ===
  @Get('enrollment')
  @ApiOperation({ summary: 'Get enrollment report with breakdowns' })
  async getEnrollmentReport(
    @Headers('x-tenant-id') tenantId: string,
    @Query('schoolYearId') schoolYearId?: string,
    @Query('branchId') branchId?: string,
    @Query('gradeLevelId') gradeLevelId?: string,
  ) {
    return this.reportingService.getEnrollmentReport(tenantId, { schoolYearId, branchId, gradeLevelId });
  }

  // === Revenue Reports ===
  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue report by method and daily trend' })
  async getRevenueReport(
    @Headers('x-tenant-id') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.reportingService.getRevenueReport(tenantId, { startDate, endDate, branchId });
  }

  // === AR Aging ===
  @Get('ar-aging')
  @ApiOperation({ summary: 'Get AR aging report' })
  async getARAgingReport(
    @Headers('x-tenant-id') tenantId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.reportingService.getARAgingReport(tenantId, branchId);
  }

  // === Discount Utilization ===
  @Get('discounts')
  @ApiOperation({ summary: 'Get discount/scholarship utilization report' })
  async getDiscountReport(@Headers('x-tenant-id') tenantId: string) {
    return this.reportingService.getDiscountReport(tenantId);
  }

  // === Learner Movement ===
  @Get('learner-movement')
  @ApiOperation({ summary: 'Get learner movement (promotion/retention/graduation) report' })
  async getLearnerMovementReport(
    @Headers('x-tenant-id') tenantId: string,
    @Query('schoolYearId') schoolYearId: string,
  ) {
    return this.reportingService.getLearnerMovementReport(tenantId, schoolYearId);
  }

  // === Report Templates ===
  @Get('templates')
  @ApiOperation({ summary: 'List report templates' })
  async getTemplates(@Headers('x-tenant-id') tenantId: string) {
    return this.reportingService.getTemplates(tenantId);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create custom report template' })
  async createTemplate(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    return this.reportingService.createTemplate({ ...body, tenantId });
  }

  // === Scheduled Reports ===
  @Get('scheduled')
  @ApiOperation({ summary: 'List scheduled report subscriptions' })
  async getScheduledReports(@Headers('x-tenant-id') tenantId: string) {
    return this.reportingService.getScheduledReports(tenantId);
  }

  @Post('scheduled')
  @ApiOperation({ summary: 'Create scheduled report subscription' })
  async createScheduledReport(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    return this.reportingService.createScheduledReport({ ...body, tenantId });
  }

  @Put('scheduled/:id/toggle')
  @ApiOperation({ summary: 'Toggle scheduled report active/inactive' })
  async toggleScheduledReport(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.reportingService.toggleScheduledReport(id, tenantId, body.isActive);
  }
}
