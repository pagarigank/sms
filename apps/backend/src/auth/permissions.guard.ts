import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserRole } from '../tenants/user-role.entity';
import { RolePermission } from '../tenants/role-permission.entity';
import { Permission } from '../tenants/permission.entity';
import { IS_PUBLIC_KEY } from './public.decorator';
import { resolveApiPermission } from './api-permissions';

export const REQUIRE_PERMISSION = 'require_permission';
export const RequirePermission = (resource: string, action: string) => {
  return (target: any, key?: string, descriptor?: any) => {
    const metadata = { resource, action };
    if (descriptor) {
      Reflect.defineMetadata(REQUIRE_PERMISSION, metadata, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(REQUIRE_PERMISSION, metadata, target);
    return target;
  };
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(UserRole) private userRolesRepo: Repository<UserRole>,
    @InjectRepository(RolePermission) private rolePermissionsRepo: Repository<RolePermission>,
    @InjectRepository(Permission) private permissionsRepo: Repository<Permission>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();

    // Explicit decorator metadata wins; otherwise fall back to the declarative
    // API→permission map (domain controllers carry no per-route decorators).
    const required =
      this.reflector.getAllAndOverride<{ resource: string; action: string }>(REQUIRE_PERMISSION, [
        context.getHandler(),
        context.getClass(),
      ]) ?? resolveApiPermission(request.method, request.path ?? request.url ?? '');

    // No declared requirement (unmapped route, self-service endpoint) → the
    // route is protected by authentication only.
    if (!required) return true;

    const user = request.user;
    if (!user) throw new ForbiddenException('Not authenticated');

    const jwtTenantId = user.tenantId;
    const isPlatformAdmin = Boolean(user.platformAdmin);

    // Platform admins: search across all tenants + system roles (tenantId = 000...000)
    // Regular users: only their own tenant's roles.
    const userRoles = await this.userRolesRepo.find({
      where: isPlatformAdmin
        ? { userId: user.sub ?? user.id }
        : { userId: user.sub ?? user.id, tenantId: jwtTenantId },
    });
    if (userRoles.length === 0) throw new ForbiddenException('No roles assigned');

    const roleIds = userRoles.map((ur) => ur.roleId);

    // Get permissions for those roles
    const rolePermissions = await this.rolePermissionsRepo.find({
      where: { roleId: In(roleIds) },
    });
    if (rolePermissions.length === 0) throw new ForbiddenException('No permissions assigned');

    const permissionIds = rolePermissions.map((rp) => rp.permissionId);
    const permissions = await this.permissionsRepo.find({
      where: { id: In(permissionIds) },
    });

    const hasPermission = permissions.some(
      (p) => p.resource === required.resource && p.action === required.action,
    );
    if (!hasPermission) {
      throw new ForbiddenException(`Missing permission: ${required.resource}:${required.action}`);
    }

    return true;
  }
}
