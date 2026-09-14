import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../auth/permissions.guard';

@ApiTags('departments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @RequirePermission('tenancy.department', 'view')
  @ApiOperation({ summary: 'List all departments', description: 'Returns departments (optionally filtered by tenant/branch).' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiResponse({ status: 200, description: 'List of departments.' })
  findAll(@Query('tenantId') tenantId?: string, @Query('branchId') branchId?: string) {
    return this.departmentsService.findAllFiltered(tenantId, branchId);
  }

  @Get(':id')
  @RequirePermission('tenancy.department', 'view')
  @ApiOperation({ summary: 'Get department by ID' })
  @ApiResponse({ status: 200, description: 'Department found.' })
  @ApiResponse({ status: 404, description: 'Department not found.' })
  findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Post()
  @RequirePermission('tenancy.department', 'create')
  @ApiOperation({ summary: 'Create a new department', description: 'Create a department (e.g. Elementary, JHS, SHS, College) within a branch.' })
  @ApiResponse({ status: 201, description: 'Department created.' })
  create(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentsService.create(createDepartmentDto);
  }

  @Put(':id')
  @RequirePermission('tenancy.department', 'edit')
  @ApiOperation({ summary: 'Update a department' })
  @ApiResponse({ status: 200, description: 'Department updated.' })
  update(@Param('id') id: string, @Body() body: Partial<CreateDepartmentDto>) {
    return this.departmentsService.update(id, body);
  }

  @Delete(':id')
  @RequirePermission('tenancy.department', 'delete')
  @ApiOperation({ summary: 'Delete a department' })
  @ApiResponse({ status: 200, description: 'Department deleted.' })
  remove(@Param('id') id: string) {
    return this.departmentsService.remove(id);
  }

  @Post(':id/set-default')
  @RequirePermission('tenancy.department', 'edit')
  @ApiOperation({ summary: 'Set a department as the default for its branch' })
  @ApiResponse({ status: 200, description: 'Department set as default.' })
  setDefault(@Param('id') id: string) {
    return this.departmentsService.setDefault(id);
  }
}
