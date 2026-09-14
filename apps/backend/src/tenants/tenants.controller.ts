import { Controller, Get, Post, Put, Delete, Body, Param, NotFoundException, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { TenantPlan } from './tenant-plan.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../auth/permissions.guard';

@ApiTags('tenants')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    @InjectRepository(TenantPlan) private plansRepo: Repository<TenantPlan>,
  ) {}

  @Get()
  @RequirePermission('platform.tenant', 'view')
  @ApiOperation({ summary: 'List all tenants (platform admin only)', description: 'Returns all tenants. Requires platform.tenant:view permission.' })
  @ApiResponse({ status: 200, description: 'List of all tenants.' })
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get('plans')
  @ApiOperation({ summary: 'List subscription plans (global catalog)' })
  listPlans() {
    return this.plansRepo.find({ where: { isActive: true } });
  }

  @Get('plans/catalog')
  @ApiOperation({ summary: 'List subscription plans (alias for plans)' })
  listPlansCatalog() {
    return this.plansRepo.find({ where: { isActive: true } });
  }

  @Get(':id')
  @RequirePermission('platform.tenant', 'view')
  @ApiOperation({ summary: 'Get tenant by ID' })
  @ApiResponse({ status: 200, description: 'Tenant found.' })
  @ApiResponse({ status: 404, description: 'Tenant not found.' })
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Post()
  @RequirePermission('platform.tenant', 'create')
  @ApiOperation({ summary: 'Create a new tenant (platform admin only)', description: 'Platform Admin creates a new school organization. Requires platform.tenant:create permission.' })
  @ApiResponse({ status: 201, description: 'Tenant created.' })
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.create(createTenantDto);
  }

  @Put(':id')
  @RequirePermission('platform.tenant', 'edit')
  @ApiOperation({ summary: 'Update tenant (platform admin only)' })
  update(@Param('id') id: string, @Body() body: Partial<CreateTenantDto & { branding: Record<string, any> }>) {
    return this.tenantsService.update(id, body);
  }

  @Delete(':id')
  @RequirePermission('platform.tenant', 'delete')
  @ApiOperation({ summary: 'Delete a tenant (platform admin only)' })
  remove(@Param('id') id: string) {
    return this.tenantsService.remove(id);
  }

  @Post(':id/suspend')
  @RequirePermission('platform.tenant', 'edit')
  @ApiOperation({ summary: 'Suspend a tenant (blocks logins)' })
  suspend(@Param('id') id: string) {
    return this.tenantsService.setStatus(id, 'suspended');
  }

  @Post(':id/activate')
  @RequirePermission('platform.tenant', 'edit')
  @ApiOperation({ summary: 'Reactivate a suspended tenant' })
  activate(@Param('id') id: string) {
    return this.tenantsService.setStatus(id, 'active');
  }
}
