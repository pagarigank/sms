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
   * Branch-scoped grants take precedence over tenant-wide grants.
   */
  async hasPermission(userId: string, tenantId: string, resource: string, action: string, branchId?: string): Promise<boolean> {
    // Get all user roles for this tenant
    const allRoles = await this.userRolesRepo.find({
      where: { userId, tenantId },
    });
    
    if (allRoles.length === 0) return false;

    // Filter to branch-scoped or tenant-wide roles
    const relevantRoles = allRoles.filter(ur => {
      // Tenant-wide role (branchId is null) applies everywhere
      if (!ur.branchId) return true;
      // Branch-specific role applies only to that branch
      if (branchId && ur.branchId === branchId) return true;
      return false;
    });

    if (relevantRoles.length === 0) return false;

    const roleIds = relevantRoles.map(ur => ur.roleId);
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
   * Supports: TeachesSection, GuardianOf, AdvisorOf, EnrolledIn
   */
  async hasRelation(userId: string, tenantId: string, relation: string, objectType: string, objectId: string): Promise<boolean> {
    const edge = await this.rebacEdgesRepo.findOne({
      where: { subjectUserId: userId, tenantId, relation, objectType, objectId },
    });
    return !!edge;
  }

  /**
   * Enforce ReBAC relationship - throws if no relationship exists.
   */
  async enforceRelation(userId: string, tenantId: string, relation: string, objectType: string, objectId: string): Promise<void> {
    const has = await this.hasRelation(userId, tenantId, relation, objectType, objectId);
    if (!has) {
      throw new ForbiddenException(`Access denied: no ${relation} relationship on ${objectType}:${objectId}`);
    }
  }

  /**
   * Create a ReBAC relationship edge.
   */
  async createRelation(userId: string, tenantId: string, relation: string, objectType: string, objectId: string): Promise<RebacEdge> {
    const edge = this.rebacEdgesRepo.create({
      subjectUserId: userId,
      tenantId,
      relation,
      objectType,
      objectId,
    });
    return this.rebacEdgesRepo.save(edge);
  }

  /**
   * Delete a ReBAC relationship edge.
   */
  async deleteRelation(userId: string, tenantId: string, relation: string, objectType: string, objectId: string): Promise<void> {
    await this.rebacEdgesRepo.delete({
      subjectUserId: userId,
      tenantId,
      relation,
      objectType,
      objectId,
    });
  }

  /**
   * Get all relationships for a user (e.g., all sections a teacher teaches).
   */
  async getUserRelations(userId: string, tenantId: string, relation?: string, objectType?: string): Promise<RebacEdge[]> {
    const where: any = { subjectUserId: userId, tenantId };
    if (relation) where.relation = relation;
    if (objectType) where.objectType = objectType;
    return this.rebacEdgesRepo.find({ where });
  }

  /**
   * Check if user can access a specific resource (combined RBAC + ReBAC).
   * First checks RBAC permission, then if the permission requires a relationship,
   * checks the ReBAC edge.
   */
  async canAccess(userId: string, tenantId: string, resource: string, action: string, branchId?: string, objectId?: string): Promise<boolean> {
    // Check RBAC permission
    const hasPermission = await this.hasPermission(userId, tenantId, resource, action, branchId);
    if (!hasPermission) return false;

    // If objectId is provided, check ReBAC relationship for record-level access
    if (objectId) {
      // Determine required relation based on resource
      const requiredRelation = this.getRequiredRelation(resource, action);
      if (requiredRelation) {
        return this.hasRelation(userId, tenantId, requiredRelation, resource, objectId);
      }
    }

    return true;
  }

  /**
   * Determine the required ReBAC relationship for a given resource/action.
   */
  private getRequiredRelation(resource: string, action: string): string | null {
    // Teachers can only access their assigned sections
    if (resource.startsWith('grading.') || resource === 'attendance.record') {
      return 'TeachesSection';
    }
    // Guardians can only access their children's data
    if (resource.startsWith('sis.student') || resource.startsWith('billing.')) {
      return 'GuardianOf';
    }
    // Advisors can access their advised students
    if (resource === 'sis.enrollment' || resource === 'promotion.decision') {
      return 'AdvisorOf';
    }
    return null;
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

  /**
   * Seed default ReBAC relationships for a new tenant.
   */
  async seedDefaultRelations(tenantId: string, userId: string, branchId?: string): Promise<void> {
    // This is called when a new user is created or when a tenant is provisioned
    // For now, it's a no-op - relationships are created dynamically
  }
}
