-- 012: Phase 11 non-functional hardening.
--
-- 1. series_counters unique scope index — closes the get-or-create race in
--    allocateOrNumber/reserveOrBlock. Without it, two concurrent first
--    allocations could insert two counter rows for the same series and
--    allocate DUPLICATE BIR OR numbers. With it, the service's
--    INSERT ... ON CONFLICT DO NOTHING + SELECT ... FOR UPDATE pattern is
--    fully atomic (see cashiering.service.ts).
--
-- 2. `sms_app` NOLOGIN role — a non-owner application role. Postgres table
--    owners bypass RLS unless FORCE RLS is set, which is why the live
--    owner connection sees cross-tenant rows. Production deployments and
--    the RLS bypass test suite connect/SET ROLE to `sms_app`, which has
--    plain DML grants and NO BYPASSRLS, so tenant_isolation_* policies
--    actually enforce.

-- ============================================================
-- 1. OR counter scope uniqueness (BIR: zero duplicate OR numbers)
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_series_counters_scope
  ON series_counters ("tenantId", "branchId", "atpSeriesId");

-- ============================================================
-- 2. Non-owner application role for real RLS enforcement
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sms_app') THEN
    CREATE ROLE sms_app NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO sms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sms_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sms_app;
