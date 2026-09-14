import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { runWithTenantContext } from './tenant-context';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // 1) Explicit override (impersonation flow sets req.tenantId after
    //    JWT verification), 2) JWT payload (set by JwtAuthGuard), 3) header
    //    (trusted only for pre-auth public endpoints like tenant lookup).
    const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
    const jwtTenantId = (req as any).user?.tenantId as string | undefined;
    const overrideTenantId = (req as any).tenantId as string | undefined;
    const tenantId = overrideTenantId || jwtTenantId || headerTenantId;

    const platformAdmin = Boolean((req as any).user?.platformAdmin);
    if (tenantId && typeof tenantId === 'string' && /^[0-9a-fA-F-]{36}$/.test(tenantId)) {
      (req as any).tenantId = tenantId;
      // Run the rest of the request (all downstream TypeORM queries) inside
      // the tenant context; TenantAwareDataSource reads it per connection.
      // Platform admins bypass RLS via the app.is_platform_admin GUC.
      return runWithTenantContext({ tenantId, platformAdmin }, () => next());
    }
    // No tenant context (platform admin viewing all, or unauthenticated public
    // endpoint). Platform admin flag still propagates to GUC so RLS policies
    // that check is_platform_admin can allow cross-tenant access.
    return runWithTenantContext({ tenantId: '' as any, platformAdmin }, () => next());
  }
}
