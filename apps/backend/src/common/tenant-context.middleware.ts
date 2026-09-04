import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private dataSource: DataSource) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Extract tenant_id from JWT token or header
    const tenantId = (req as any).user?.tenantId || req.headers['x-tenant-id'] as string;

    if (tenantId) {
      // Set the Postgres session variable for Row-Level Security
      const queryRunner = this.dataSource.createQueryRunner();
      try {
        await queryRunner.query(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
        // Store tenantId on request for downstream use
        (req as any).tenantId = tenantId;
      } finally {
        await queryRunner.release();
      }
    }

    next();
  }
}
