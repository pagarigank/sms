import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from '../tenants/role.entity';
import { Permission } from '../tenants/permission.entity';
import { UserRole } from '../tenants/user-role.entity';
import { RolePermission } from '../tenants/role-permission.entity';

@ApiTags('iam')
@ApiBearerAuth('access-token')
@Controller('iam')
export class IamController {
  constructor(
    @InjectRepository(Role) private rolesRepo: Repository<Role>,
    @InjectRepository(Permission) private permissionsRepo: Repository<Permission>,
    @InjectRepository(UserRole) private userRolesRepo: Repository<UserRole>,
    @InjectRepository(RolePermission) private rolePermissionsRepo: Repository<RolePermission>,
  ) {}

  @Get('roles')
  @ApiOperation({ summary: 'List all roles', description: 'Returns all roles in the current tenant.' })
  @ApiResponse({ status: 200, description: 'List of roles.' })
  async findAllRoles() {
    return this.rolesRepo.find();
  }

  @Get('permissions')
  @ApiOperation({ summary: 'List all permissions', description: 'Returns the global permission catalog (not tenant-scoped).' })
  @ApiResponse({ status: 200, description: 'List of permissions.' })
  async findAllPermissions() {
    return this.permissionsRepo.find();
  }

  @Get('users/:userId/roles')
  @ApiOperation({ summary: 'Get user roles', description: 'Returns all roles assigned to a specific user.' })
  @ApiResponse({ status: 200, description: 'User roles and role details.' })
  async getUserRoles(@Param('userId') userId: string) {
    const userRoles = await this.userRolesRepo.find({ where: { userId } });
    const roleIds = userRoles.map(ur => ur.roleId);
    const roles = await this.rolesRepo.find({ where: { id: In(roleIds) } });
    return { userRoles, roles };
  }

  @Get('users/:userId/permissions')
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
}
