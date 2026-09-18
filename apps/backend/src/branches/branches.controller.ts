import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../auth/permissions.guard';

@ApiTags('branches')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @RequirePermission('tenancy.branch', 'view')
  @ApiOperation({ summary: 'List all branches', description: 'Returns all branches visible to the authenticated user (tenant-scoped).' })
  @ApiResponse({ status: 200, description: 'List of branches.' })
  findAll() {
    return this.branchesService.findAll();
  }

  @Get(':id')
  @RequirePermission('tenancy.branch', 'view')
  @ApiOperation({ summary: 'Get branch by ID' })
  @ApiResponse({ status: 200, description: 'Branch found.' })
  @ApiResponse({ status: 404, description: 'Branch not found.' })
  findOne(@Param('id') id: string) {
    return this.branchesService.findOne(id);
  }

  @Post()
  @RequirePermission('tenancy.branch', 'create')
  @ApiOperation({ summary: 'Create a new branch', description: 'Tenant Admin creates a new campus/branch within their tenant.' })
  @ApiResponse({ status: 201, description: 'Branch created.' })
  create(@Body() createBranchDto: CreateBranchDto) {
    return this.branchesService.create(createBranchDto);
  }

  @Put(':id')
  @RequirePermission('tenancy.branch', 'edit')
  @ApiOperation({ summary: 'Update a branch' })
  @ApiResponse({ status: 200, description: 'Branch updated.' })
  update(@Param('id') id: string, @Body() body: Partial<CreateBranchDto & { contactEmail: string; contactPhone: string }>) {
    return this.branchesService.update(id, body);
  }

  @Delete(':id')
  @RequirePermission('tenancy.branch', 'delete')
  @ApiOperation({ summary: 'Delete a branch' })
  @ApiResponse({ status: 200, description: 'Branch deleted.' })
  remove(@Param('id') id: string) {
    return this.branchesService.remove(id);
  }
}

