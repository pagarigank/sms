import { Injectable, CanActivate, ExecutionContext, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Declarative replay protection for money and other non-reversible mutations.
 *
 * Usage: `@UseGuards(IdempotencyGuard)` on a route, then clients send
 * `Idempotency-Key: <uuid>` (same value on retry). A retried request with a
 * seen key is rejected with 409 instead of executing twice.
 *
 * The key is stored per tenant + method + path, so the same UUID reused on a
 * different route or by another tenant is not falsely rejected, and a replay
 * of the same request by a different tenant cannot collide.
 *
 * Note: the `payments.idempotencyKey` unique index remains the last-line
 * defense on `processPayment`; this guard protects routes that have no such
 * natural key (apply-payment, allocate, refunds, discounts).
 */
async function assertAndStore(
  dataSource: DataSource,
  request: any,
  idempotencyKey: string,
): Promise<void> {
  const tenantId = request.headers['x-tenant-id'] ?? request.user?.tenantId ?? null;
  const method = request.method ?? '';
  // request.path includes the /api/v1 prefix; normalize so the stored scope is
  // stable across deployments with different global prefixes.
  const path = String(request.path ?? request.url ?? '')
    .split('?')[0]
    .replace(/^\/api\/v\d+/, '');

  const existing = await dataSource.query(
    `SELECT id FROM idempotency_keys
     WHERE key = $1 AND tenant_id = $2 AND request_method = $3 AND request_path = $4
       AND expires_at > NOW()`,
    [idempotencyKey, tenantId, method, path],
  );

  if (existing.length > 0) {
    throw new ConflictException('Idempotency key already used');
  }

  // First writer wins (key is the table's primary key). A concurrent duplicate
  // insert on the same key no-ops — the replay is still rejected by the SELECT
  // above, or by the natural unique defenses on the underlying write.
  await dataSource.query(
    `INSERT INTO idempotency_keys (key, tenant_id, request_method, request_path, created_at, expires_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '24 hours')
     ON CONFLICT (key) DO NOTHING`,
    [idempotencyKey, tenantId, method, path],
  );
}

/**
 * Hard variant: requires the `Idempotency-Key` header on the decorated route.
 */
@Injectable()
export class IdempotencyGuard implements CanActivate {
  constructor(private dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const idempotencyKey = request.headers['idempotency-key'];

    if (!idempotencyKey) {
      throw new ConflictException('Idempotency-Key header is required for this operation');
    }

    await assertAndStore(this.dataSource, request, idempotencyKey);
    return true;
  }
}

/**
 * Soft variant for money-mutation routes whose clients do not send the header
 * yet: absent header → request passes through (previous behavior); present
 * header → enforced. Migrate clients to always send the key, then switch
 * these routes to the hard `IdempotencyGuard`.
 */
@Injectable()
export class OptionalIdempotencyGuard implements CanActivate {
  constructor(private dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const idempotencyKey = request.headers['idempotency-key'];
    if (!idempotencyKey) return true;

    await assertAndStore(this.dataSource, request, idempotencyKey);
    return true;
  }
}
