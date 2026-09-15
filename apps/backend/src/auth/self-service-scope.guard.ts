import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PolicyService } from '../iam/policy.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import { isSelfServiceRoute, resolveStaffPermission } from './api-permissions';
import { StudentAccessService } from './student-access.service';

/**
 * Closes the IDOR gap left by the self-service exemptions in
 * `api-permissions.ts`.
 *
 * `PermissionsGuard` deliberately skips portal (guardian/student) endpoints —
 * those roles hold no staff permission — which made them authentication-only.
 * Any authenticated portal user could then read another family's data simply by
 * changing the `studentId` (or `userId`) in the request.
 *
 * This guard runs after `PermissionsGuard` and narrows such routes:
 *   1. Public routes and platform admins pass.
 *   2. Non-self-service routes pass (they are already permission-gated).
 *   3. A caller holding the route's *own* staff permission passes — that is the
 *      same authority staff had before, so no staff workflow regresses.
 *   4. Otherwise the caller is confined to their own identity: a client-supplied
 *      `userId` must be the caller, a `studentId` must be one of their children
 *      (or themselves), and a thread must be one they participate in.
 */
@Injectable()
export class SelfServiceScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly policy: PolicyService,
    private readonly studentAccess: StudentAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException('Not authenticated');
    // Platform admins operate across tenants (impersonation/support tooling).
    if (user.platformAdmin) return true;

    const method: string = request.method;
    const path: string = request.path ?? request.url ?? '';
    if (!isSelfServiceRoute(method, path)) return true;

    const userId: string = user.sub ?? user.id;
    const tenantId: string = user.tenantId ?? request.headers?.['x-tenant-id'];

    // Staff bypass: whoever could reach this endpoint before the exemption was
    // added still can. Checked against the route's own (non-exempt) permission.
    const staffPermission = resolveStaffPermission(method, path);
    if (
      staffPermission &&
      tenantId &&
      (await this.policy.hasPermission(userId, tenantId, staffPermission.resource, staffPermission.action))
    ) {
      return true;
    }

    // A client-supplied identity must be the caller's own.
    const requestedUserId = asString(request.query?.userId) ?? asString(request.body?.userId);
    if (requestedUserId && requestedUserId !== userId) {
      throw new ForbiddenException('Access denied: cannot act on another user\'s behalf');
    }

    // Student-scoped reads/writes must target a student the caller owns.
    const studentId =
      asString(request.params?.studentId) ??
      asString(request.query?.studentId) ??
      asString(request.body?.studentId);
    if (studentId) {
      await this.studentAccess.assertStudentAccess(userId, tenantId, studentId);
    }

    // Thread-scoped reads/writes require participation.
    const threadId = asString(request.params?.threadId);
    if (threadId) {
      await this.studentAccess.assertThreadAccess(userId, tenantId, threadId);
    }

    return true;
  }
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value;
  return undefined;
}
