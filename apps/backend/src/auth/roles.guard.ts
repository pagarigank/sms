import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserRole } from '../tenants/user-role.entity';
import { Role } from '../tenants/role.entity';

export const ROLES_KEY = 'roles';
export const RequireRoles = (...roles: string[]) => {
  return (target: any, key?: string, descriptor?: any) => {
    if (descriptor) {
      Reflect.defineMetadata(ROLES_KEY, roles, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(ROLES_KEY, roles, target);
    return target;
  };
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(UserRole) private userRolesRepo: Repository<UserRole>,
    @InjectRepository(Role) private rolesRepo: Repository<Role>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException('Not authenticated');

    const tenantId = user.tenantId;
    const userRoles = await this.userRolesRepo.find({
      where: { userId: user.sub, tenantId },
    });
    if (userRoles.length === 0) throw new ForbiddenException('No roles assigned');

    const roleIds = userRoles.map(ur => ur.roleId);
    const roles = await this.rolesRepo.find({ where: { id: In(roleIds) } });
    const roleNames = roles.map(r => r.name);

    const hasRole = requiredRoles.some(role => roleNames.includes(role));
    if (!hasRole) throw new ForbiddenException(`Required roles: ${requiredRoles.join(', ')}`);

    return true;
  }
}
