import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Observable } from 'rxjs';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private dataSource: DataSource) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId || request.headers['x-tenant-id'];

    if (!tenantId) {
      return next.handle();
    }

    // Store tenantId on request for downstream use
    (request as any).tenantId = tenantId;

    return next.handle();
  }
}
