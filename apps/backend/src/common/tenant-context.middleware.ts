import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { runWithTenantContext } from './tenant-context';
import { verifyJwtToken, extractBearerToken } from './jwt-utils';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Tenant identity precedence:
    // 1) Explicit override (req.tenantId - set by impersonation/other flows).
    // 2) Verified JWT payload. The middleware runs before guards, so it cannot
    //    read req.user; it therefore HMAC-verifies the Bearer token directly
    //    and derives the tenant from the signature-verified payload. The
    //    client x-tenant-id header is NEVER trusted on authenticated requests,
    //    otherwise a user of tenant A could set tenant B's id and read/write
    //    tenant B's rows (C1).
    // 3) Header (trusted only for pre-auth public endpoints like tenant lookup).
    const overrideTenantId = (req as any).tenantId as string | undefined;
    const token = extractBearerToken(req.headers.authorization);
    const jwtPayload = token ? verifyJwtToken(token) : null;
    const jwtTenantId = jwtPayload?.tenantId as string | undefined;
    const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
    const platformAdmin =
      Boolean((req as any).user?.platformAdmin) || Boolean(jwtPayload?.platformAdmin);
    const tenantId = overrideTenantId || jwtTenantId || headerTenantId;

    if (tenantId && typeof tenantId === 'string' && /^[0-9a-fA-F-]{36}$/.test(tenantId)) {
      (req as any).tenantId = tenantId;
      // Run the rest of the request (all downstream TypeORM queries) inside
      // the tenant context; TenantAwareDataSource reads it per connection.
      // Platform admins bypass RLS via the app.is_platform_admin GUC - which
      // is INERT at the DB unless the connection role is a member of the
      // platform_admin_rls marker role (migration 014, G-30 remediation).
      return runWithTenantContext({ tenantId, platformAdmin }, () => next());
    }
    // No tenant context (platform admin viewing all, or unauthenticated public
    // endpoint). Platform admin flag still propagates to GUC; policies honor
    // it only when the connection role holds platform_admin_rls membership
    // (migration 014, G-30 remediation).
    return runWithTenantContext({ tenantId: '' as any, platformAdmin }, () => next());
  }
}