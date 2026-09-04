import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserRole } from '../tenants/user-role.entity';
import { RolePermission } from '../tenants/role-permission.entity';
import { Permission } from '../tenants/permission.entity';
import { RebacEdge } from '../tenants/rebac-edge.entity';

@Injectable()
export class PolicyService {
  constructor(
    @InjectRepository(UserRole) private userRolesRepo: Repository<UserRole>,
    @InjectRepository(RolePermission) private rolePermissionsRepo: Repository<RolePermission>,
    @InjectRepository(Permission) private permissionsRepo: Repository<Permission>,
    @InjectRepository(RebacEdge) private rebacEdgesRepo: Repository<RebacEdge>,
  ) {}

  /**
   * Check if user has a specific permission within a tenant/branch scope.
   */
  async hasPermission(userId: string, tenantId: string, resource: string, action: string, branchId?: string): Promise<boolean> {
    // Get user's roles (branch-scoped or tenant-wide)
    const userRoles = await this.userRolesRepo.find({
      where: [
        { userId, tenantId, branchId },
        { userId, tenantId, branchId: undefined },
      ],
    });
    if (userRoles.length === 0) return false;

    const roleIds = userRoles.map(ur => ur.roleId);
    const rolePermissions = await this.rolePermissionsRepo.find({
      where: { roleId: In(roleIds) },
    });
    if (rolePermissions.length === 0) return false;

    const permissionIds = rolePermissions.map(rp => rp.permissionId);
    const permissions = await this.permissionsRepo.find({
      where: { id: In(permissionIds) },
    });

    return permissions.some(p => p.resource === resource && p.action === action);
  }

  /**
   * Enforce permission - throws if denied.
   */
  async enforce(userId: string, tenantId: string, resource: string, action: string, branchId?: string): Promise<void> {
    const allowed = await this.hasPermission(userId, tenantId, resource, action, branchId);
    if (!allowed) {
      throw new ForbiddenException(`Access denied: ${resource}:${action}`);
    }
  }

  /**
   * Check ReBAC relationship - e.g., does user TeachSection X?
   */
  async hasRelation(userId: string, tenantId: string, relation: string, objectType: string, objectId: string): Promise<boolean> {
    const edge = await this.rebacEdgesRepo.findOne({
      where: { subjectUserId: userId, tenantId, relation, objectType, objectId },
    });
    return !!edge;
  }

  /**
   * Get all roles for a user within a tenant.
   */
  async getUserRoles(userId: string, tenantId: string): Promise<UserRole[]> {
    return this.userRolesRepo.find({ where: { userId, tenantId } });
  }

  /**
   * Get all permissions for a user within a tenant.
   */
  async getUserPermissions(userId: string, tenantId: string): Promise<Permission[]> {
    const userRoles = await this.getUserRoles(userId, tenantId);
    if (userRoles.length === 0) return [];

    const roleIds = userRoles.map(ur => ur.roleId);
    const rolePermissions = await this.rolePermissionsRepo.find({
      where: { roleId: In(roleIds) },
    });
    if (rolePermissions.length === 0) return [];

    const permissionIds = rolePermissions.map(rp => rp.permissionId);
    return this.permissionsRepo.find({ where: { id: In(permissionIds) } });
  }
}
