-- ============================================================
-- 000 — Entity-accurate schema baseline
-- ============================================================
-- GENERATED FILE — the DDL below is derived from the TypeORM @Entity
-- metadata, which is the source of truth for the application. Do not
-- hand-edit the generated block; regenerate instead:
--
--   cd apps/backend
--   npm run schema:generate
-- (that builds first, then splices the generated DDL into this template;
--  check the result with `npm run schema:drift`)
--
-- History: this file previously carried ~37 hand-written CREATE TABLE
-- statements using snake_case column names ("tenant_id", "created_at") while
-- every entity maps to camelCase ("tenantId", "createdAt"). It also omitted 68
-- of the 105 entity tables, so it could never build the schema the application
-- expects. The database everyone ran against had been materialised by TypeORM
-- `synchronize`, which is why the mismatch went unnoticed: every statement here
-- is `IF NOT EXISTS`, so on an existing database this file is a no-op.
--
-- Every statement is idempotent and safe to re-run on a populated database.
--
-- Row-level security is NOT defined here: 003-rls-policies.sql creates the
-- tenant_isolation_<table> policies for every tenant-scoped table, and
-- 012/013/014 add the platform-admin role gate. Creating them here as well
-- collided with those files (same policy names, no DROP POLICY IF EXISTS),
-- which is why 003 could not run.
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
-- pgcrypto: gen_random_uuid() (older migrations / functions)
-- uuid-ossp: uuid_generate_v4() (TypeORM's @PrimaryGeneratedColumn('uuid'))
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES, INDEXES AND CONSTRAINTS
-- ============================================================
-- Generated from every @Entity in apps/backend/src.
-- @@ENTITY_DDL@@

-- ============================================================
-- SUPPLEMENTARY TABLES (no entity — used by IdempotencyGuard)
-- ============================================================
-- Shape matches the deployed table (key is the primary key; request_method /
-- request_path / created_at are NOT NULL) plus the `id` column that
-- IdempotencyGuard reads (`SELECT id FROM idempotency_keys`). The previous
-- definition here had `id` as the primary key, a `response` column, and
-- nullable request columns — none of which existed in the deployed table.
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  key TEXT PRIMARY KEY,
  tenant_id TEXT,
  request_method TEXT NOT NULL,
  request_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key ON idempotency_keys(key);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_tenant ON idempotency_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires ON idempotency_keys(expires_at);

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================
-- Defined in 003-rls-policies.sql (all tenant-scoped tables) and refined by
-- 012-hardening-rls-and-or-race.sql / 013-platform-admin-rls.sql /
-- 014-rls-platform-admin-role-gate.sql. Kept out of this file so the policy
-- names do not collide.
