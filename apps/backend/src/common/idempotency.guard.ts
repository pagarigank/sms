import { Injectable, CanActivate, ExecutionContext, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class IdempotencyGuard implements CanActivate {
  constructor(private dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const idempotencyKey = request.headers['idempotency-key'];

    if (!idempotencyKey) {
      throw new ConflictException('Idempotency-Key header is required for this operation');
    }

    // Check if this key has been used before
    const existing = await this.dataSource.query(
      `SELECT id FROM idempotency_keys WHERE key = $1 AND expires_at > NOW()`,
      [idempotencyKey],
    );

    if (existing.length > 0) {
      throw new ConflictException('Idempotency key already used');
    }

    // Store the key (expires in 24 hours)
    await this.dataSource.query(
      `INSERT INTO idempotency_keys (key, request_method, request_path, created_at, expires_at)
       VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '24 hours')`,
      [idempotencyKey, request.method, request.path],
    );

    return true;
  }
}
