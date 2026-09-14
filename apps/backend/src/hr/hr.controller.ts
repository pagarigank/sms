import { Controller, Get, Post, Put, Delete, Body, Param, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HrService } from './hr.service';

@ApiTags('hr')
@ApiBearerAuth('access-token')
@Controller('hr')
export class HrController {
  constructor(private readonly hrService: HrService) {}

  // === Employees ===
  @Get('employees')
  @ApiOperation({ summary: 'List employees' })
  async getEmployees(
    @Headers('x-tenant-id') tenantId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.hrService.getEmployees(tenantId, branchId);
  }

  @Get('employees/:id')
  @ApiOperation({ summary: 'Get employee by ID' })
  async getEmployee(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.hrService.getEmployee(id, tenantId);
  }

  @Post('employees')
  @ApiOperation({ summary: 'Create employee' })
  async createEmployee(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    return this.hrService.createEmployee({ ...body, tenantId });
  }

  @Put('employees/:id')
  @ApiOperation({ summary: 'Update employee' })
  async updateEmployee(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: any,
  ) {
    return this.hrService.updateEmployee(id, tenantId, body);
  }

  @Delete('employees/:id')
  @ApiOperation({ summary: 'Deactivate employee' })
  async deactivateEmployee(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.hrService.deactivateEmployee(id, tenantId);
  }

  // === Teaching Loads ===
  @Get('teaching-loads')
  @ApiOperation({ summary: 'List teaching loads' })
  async getTeachingLoads(
    @Headers('x-tenant-id') tenantId: string,
    @Query('employeeId') employeeId?: string,
    @Query('termId') termId?: string,
    @Query('schoolYearId') schoolYearId?: string,
  ) {
    return this.hrService.getTeachingLoads(tenantId, { employeeId, termId, schoolYearId });
  }

  @Post('teaching-loads')
  @ApiOperation({ summary: 'Assign teaching load' })
  async assignTeachingLoad(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    return this.hrService.assignTeachingLoad({ ...body, tenantId });
  }

  @Delete('teaching-loads/:id')
  @ApiOperation({ summary: 'Remove teaching load' })
  async removeTeachingLoad(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.hrService.removeTeachingLoad(id, tenantId);
  }

  @Get('teaching-loads/faculty-summary')
  @ApiOperation({ summary: 'Get faculty teaching summary' })
  async getFacultySummary(
    @Headers('x-tenant-id') tenantId: string,
    @Query('employeeId') employeeId: string,
    @Query('termId') termId: string,
  ) {
    return this.hrService.getFacultySummary(tenantId, employeeId, termId);
  }

  // === DTR ===
  @Get('dtr')
  @ApiOperation({ summary: 'List DTR records' })
  async getDtrRecords(
    @Headers('x-tenant-id') tenantId: string,
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.hrService.getDtrRecords(tenantId, { employeeId, startDate, endDate });
  }

  @Post('dtr')
  @ApiOperation({ summary: 'Record DTR entry (upsert by employee+date)' })
  async recordDtr(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    return this.hrService.recordDtr({ ...body, tenantId });
  }

  @Get('dtr/summary')
  @ApiOperation({ summary: 'Get employee DTR monthly summary' })
  async getDtrSummary(
    @Headers('x-tenant-id') tenantId: string,
    @Query('employeeId') employeeId: string,
    @Query('month') month: string,
  ) {
    return this.hrService.getEmployeeDtrSummary(tenantId, employeeId, month);
  }
}
