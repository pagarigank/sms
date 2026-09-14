import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private store = new Map<string, RateLimitEntry>();
  private readonly WINDOW_MS = 60 * 1000; // 1 minute
  private readonly MAX_REQUESTS = 300; // per minute per tenant
  private lastPrune = 0;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Liveness probes must never be throttled (they come from the
    // orchestrator, not a tenant).
    if (request.path?.includes('/health') || request.url?.includes('/health')) {
      return true;
    }

    const tenantId = request.user?.tenantId || request.headers['x-tenant-id'] || 'anonymous';
    const key = `${tenantId}:${this.getWindowKey()}`;

    const entry = this.store.get(key) || { count: 0, resetAt: Date.now() + this.WINDOW_MS };

    if (Date.now() > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = Date.now() + this.WINDOW_MS;
    }

    entry.count++;
    this.store.set(key, entry);

    // Prune expired windows periodically so the in-memory store cannot grow
    // unbounded across tenants (DoS surface).
    const now = Date.now();
    if (now - this.lastPrune > this.WINDOW_MS) {
      this.lastPrune = now;
      for (const [k, v] of this.store) {
        if (now > v.resetAt) this.store.delete(k);
      }
    }

    // Set rate limit headers
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', this.MAX_REQUESTS);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, this.MAX_REQUESTS - entry.count));
    response.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > this.MAX_REQUESTS) {
      throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }

  private getWindowKey(): string {
    return Math.floor(Date.now() / this.WINDOW_MS).toString();
  }
}
