import { Controller, Get, Post, Put, Delete, Body, Param, Query, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from '../tenants/role.entity';
import { Permission } from '../tenants/permission.entity';
import { UserRole } from '../tenants/user-role.entity';
import { RolePermission } from '../tenants/role-permission.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../auth/permissions.guard';
import { UseGuards } from '@nestjs/common';

@ApiTags('iam')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('iam')
export class IamController {
  constructor(
    @InjectRepository(Role) private rolesRepo: Repository<Role>,
    @InjectRepository(Permission) private permissionsRepo: Repository<Permission>,
    @InjectRepository(UserRole) private userRolesRepo: Repository<UserRole>,
    @InjectRepository(RolePermission) private rolePermissionsRepo: Repository<RolePermission>,
  ) {}

  @Get('roles')
  @RequirePermission('iam.role', 'view')
  @ApiOperation({ summary: 'List all roles', description: 'Returns all roles (optionally filtered by tenant).' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiResponse({ status: 200, description: 'List of roles.' })
  async findAllRoles(@Query('tenantId') tenantId?: string) {
    if (!tenantId || tenantId === '00000000-0000-0000-0000-000000000000') {
      return this.rolesRepo.find();
    }
    return this.rolesRepo.find({
      where: [
        { tenantId },
        { tenantId: '00000000-0000-0000-0000-000000000000' },
        { isSystem: true },
      ],
      order: { isSystem: 'DESC', name: 'ASC' },
    });
  }

  @Get('roles/:id')
  @RequirePermission('iam.role', 'view')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiResponse({ status: 200, description: 'Role found.' })
  @ApiResponse({ status: 404, description: 'Role not found.' })
  async getRole(@Param('id') id: string) {
    const role = await this.rolesRepo.findOneBy({ id });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  @Post('roles')
  @RequirePermission('iam.role', 'create')
  @ApiOperation({ summary: 'Create a role', description: 'Create a new role in a tenant.' })
  @ApiResponse({ status: 201, description: 'Role created.' })
  async createRole(@Body() body: { name: string; description?: string; isSystem?: boolean; tenantId: string }) {
    const role = this.rolesRepo.create({
      name: body.name,
      description: body.description,
      isSystem: body.isSystem ?? false,
      tenantId: body.tenantId,
    });
    return this.rolesRepo.save(role);
  }

  @Put('roles/:id')
  @RequirePermission('iam.role', 'edit')
  @ApiOperation({ summary: 'Update a role' })
  async updateRole(@Param('id') id: string, @Body() body: { name?: string; description?: string; isSystem?: boolean }) {
    const role = await this.rolesRepo.findOneBy({ id });
    if (!role) throw new NotFoundException('Role not found');
    if (body.name !== undefined) role.name = body.name;
    if (body.description !== undefined) role.description = body.description;
    if (body.isSystem !== undefined) role.isSystem = body.isSystem;
    return this.rolesRepo.save(role);
  }

  @Delete('roles/:id')
  @RequirePermission('iam.role', 'delete')
  @ApiOperation({ summary: 'Delete a role' })
  async deleteRole(@Param('id') id: string) {
    const role = await this.rolesRepo.findOneBy({ id });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new BadRequestException('Cannot delete system roles');
    await this.rolesRepo.remove(role);
  }

  @Get('permissions')
  @RequirePermission('iam.permission', 'view')
  @ApiOperation({ summary: 'List all permissions', description: 'Returns the global permission catalog (not tenant-scoped).' })
  @ApiQuery({ name: 'resource', required: false })
  @ApiResponse({ status: 200, description: 'List of permissions.' })
  async findAllPermissions(@Query('resource') resource?: string) {
    return this.permissionsRepo.find({ where: resource ? { resource } : {} });
  }

  @Get('roles/:roleId/permissions')
  @RequirePermission('iam.role', 'view')
  @ApiOperation({ summary: 'Get role permissions', description: 'Returns all permissions assigned to a role.' })
  @ApiResponse({ status: 200, description: 'Role permissions.' })
  async getRolePermissions(@Param('roleId') roleId: string) {
    const rolePerms = await this.rolePermissionsRepo.find({ where: { roleId } });
    const permissionIds = rolePerms.map(rp => rp.permissionId);
    if (permissionIds.length === 0) return { permissions: [] };
    const permissions = await this.permissionsRepo.find({ where: { id: In(permissionIds) } });
    return { permissions };
  }

  @Put('roles/:roleId/permissions')
  @RequirePermission('iam.role', 'edit')
  @ApiOperation({ summary: 'Update role permissions', description: 'Replace all permissions for a role with the given list.' })
  @ApiResponse({ status: 200, description: 'Permissions updated.' })
  async updateRolePermissions(@Param('roleId') roleId: string, @Body() body: { permissionIds: string[] }) {
    // Remove existingpermissions
    await this.rolePermissionsRepo.delete({ roleId });
    // Add new ones
    const perms = body.permissionIds.map(pid => this.rolePermissionsRepo.create({ roleId, permissionId: pid }));
    return this.rolePermissionsRepo.save(perms);
  }

  @Get('users/:userId/roles')
  @RequirePermission('platform.user', 'view')
  @ApiOperation({ summary: 'Get user roles', description: 'Returns all roles assigned to a specific user.' })
  @ApiResponse({ status: 200, description: 'User roles and role details.' })
  async getUserRoles(@Param('userId') userId: string) {
    const userRoles = await this.userRolesRepo.find({ where: { userId } });
    const roleIds = userRoles.map(ur => ur.roleId);
    const roles = await this.rolesRepo.find({ where: { id: In(roleIds) } });
    return { userRoles, roles };
  }

  @Get('users/:userId/permissions')
  @RequirePermission('platform.user', 'view')
  @ApiOperation({ summary: 'Get user permissions', description: 'Returns all effective permissions for a user (derived from their roles).' })
  @ApiResponse({ status: 200, description: 'User permissions.' })
  async getUserPermissions(@Param('userId') userId: string) {
    const userRoles = await this.userRolesRepo.find({ where: { userId } });
    if (userRoles.length === 0) return { permissions: [] };

    const roleIds = userRoles.map(ur => ur.roleId);
    const rolePermissions = await this.rolePermissionsRepo.find({ where: { roleId: In(roleIds) } });
    if (rolePermissions.length === 0) return { permissions: [] };

    const permissionIds = rolePermissions.map(rp => rp.permissionId);
    const permissions = await this.permissionsRepo.find({ where: { id: In(permissionIds) } });
    return { permissions };
  }

  @Get('user-roles')
  @RequirePermission('platform.user', 'view')
  @ApiOperation({ summary: 'List user-role assignments', description: 'Returns all user-role assignments (platform admin: all; tenant admin: own tenant).' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiResponse({ status: 200, description: 'List of user-role assignments.' })
  async listUserRoles(@Query('tenantId') tenantId?: string, @Query('branchId') branchId?: string) {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (branchId) where.branchId = branchId;
    return this.userRolesRepo.find({ where, relations: ['role'] });
  }

  @Post('user-roles')
  @RequirePermission('platform.user', 'assign_role')
  @ApiOperation({ summary: 'Assign a role to a user', description: 'Assign a role to a user in a specific tenant (and optionally branch).' })
  @ApiResponse({ status: 201, description: 'Role assigned.' })
  async assignRoleToUser(@Body() body: { userId: string; roleId: string; tenantId: string; branchId?: string }) {
    const existing = await this.userRolesRepo.findOne({ where: { userId: body.userId, roleId: body.roleId, tenantId: body.tenantId } });
    if (existing) throw new BadRequestException('Role already assigned to user in this tenant');
    const userRole = this.userRolesRepo.create({
      userId: body.userId,
      roleId: body.roleId,
      tenantId: body.tenantId,
      branchId: body.branchId ?? null,
    });
    return this.userRolesRepo.save(userRole);
  }

  @Delete('users/:userId/roles/:roleId')
  @RequirePermission('platform.user', 'assign_role')
  @ApiOperation({ summary: 'Remove a role from a user' })
  async removeRoleFromUser(@Param('userId') userId: string, @Param('roleId') roleId: string) {
    const result = await this.userRolesRepo.delete({ userId, roleId });
    if (result.affected === 0) throw new NotFoundException('User role assignment not found');
  }
}

