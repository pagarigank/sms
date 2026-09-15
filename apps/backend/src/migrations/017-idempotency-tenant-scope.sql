-- 017: Tenant-scope the IdempotencyGuard's key table.
--
-- The guard now stores keys per tenant (+ method + path) so that:
--  - the same UUID reused on a different route is not falsely rejected,
--  - a key replayed by another tenant cannot collide or be rejected by it,
--  - the guard's SELECT can filter by tenant instead of globally.
--
-- tenant_id is nullable TEXT (matches the x-tenant-id header / JWT tenantId,
-- both strings) so pre-existing global keys survive the expansion.
ALTER TABLE idempotency_keys ADD COLUMN IF NOT EXISTS tenant_id TEXT;
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_tenant ON idempotency_keys(tenant_id);
