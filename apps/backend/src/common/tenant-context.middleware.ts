import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    // Extract tenant from JWT payload (set by JwtAuthGuard) or from header
    const user = (req as any).user;
    const tenantId = user?.tenantId || req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      throw new UnauthorizedException('Missing tenant context');
    }

    // Attach tenant context to request for downstream use
    (req as any).tenantId = tenantId;

    // Branch ID from query param or header (optional, for branch-scoped access)
    const branchId = req.headers['x-branch-id'] as string || req.query.branchId as string;
    if (branchId) {
      (req as any).branchId = branchId;
    }

    next();
  }
}
