-- 014: Phase 11.1 — G-30 remediation: role-gate the platform-admin RLS bypass.
--
-- PROBLEM (found by the G-16 live drill, 2026-09-14): the tenant_isolation_*
-- policies allow a bypass via
--     current_setting('app.is_platform_admin'::text, true) = 'true'
-- but Postgres lets ANY role set a custom GUC:
--     SELECT set_config('app.is_platform_admin', 'true', false)
-- So any SQL-level actor (e.g. SQLi through the pooled connection) can
-- self-elevate past tenant isolation. Drill-verified: spoofing the flag
-- as a NOBYPASSRLS role leaked the platform tenant's row (users 4 → 5).
--
-- FIX: authority moves to DATABASE ROLE MEMBERSHIP, which a session cannot
-- grant itself. A NOLOGIN marker role `platform_admin_rls` is created and
-- the bypass clause becomes a dual condition:
--     (current_setting('app.is_platform_admin'::text, true) = 'true'
--      AND pg_has_role(current_user, 'platform_admin_rls', 'member'))
-- - A spoofed GUC without membership is now INERT (the drill asserts this).
-- - Membership can only be granted by a superuser: GRANT platform_admin_rls
--   TO <admin-connection-role>. The application pool role (sms_app) is
--   granted membership here for local/dev parity with the pre-014 behavior;
--   PRODUCTION should grant it only to a dedicated platform-admin connection
--   role/pool (or to nothing, if admin reads go through the owner path).
--
-- Idempotent: safe to re-run.

-- ============================================================
-- 1. Marker role (NOLOGIN — it is only ever checked, never assumed)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'platform_admin_rls') THEN
    CREATE ROLE platform_admin_rls NOLOGIN NOINHERIT;
  END IF;
END
$$;

-- Local/dev parity: the pooled app role keeps platform-admin capability.
-- Production: grant this to the dedicated admin connection role instead.
GRANT platform_admin_rls TO sms_app;

-- ============================================================
-- 2. Regenerate every policy that uses the GUC bypass, adding the
--    membership gate. Per-policy roles/cmd/with_check are preserved.
-- ============================================================
DO $$
DECLARE
  pol RECORD;
  new_qual TEXT;
  roles_sql TEXT;
  cmd_sql TEXT;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual LIKE '%is_platform_admin%' OR with_check LIKE '%is_platform_admin%')
  LOOP
    new_qual := pol.qual;

    -- The stored literal may carry a normalized cast: = 'true' or = 'true'::text
    new_qual := regexp_replace(new_qual,
      'current_setting\(''app\.is_platform_admin''::text, true\) = ''true''(::text)?',
      '(current_setting(''app.is_platform_admin''::text, true) = ''true'' AND pg_has_role(current_user, ''platform_admin_rls'', ''member''))');

    EXECUTE format('DROP POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);

    cmd_sql := CASE pol.cmd
      WHEN 'ALL' THEN 'ALL'
      WHEN 'SELECT' THEN 'SELECT'
      WHEN 'INSERT' THEN 'INSERT'
      WHEN 'UPDATE' THEN 'UPDATE'
      WHEN 'DELETE' THEN 'DELETE'
      ELSE 'ALL'
    END;

    SELECT string_agg(quote_ident(r), ', ') INTO roles_sql FROM unnest(pol.roles) AS r;
    IF roles_sql IS NULL OR roles_sql = '' THEN roles_sql := 'public'; END IF;

    EXECUTE format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s USING (%s)%s',
      pol.policyname, pol.schemaname, pol.tablename,
      CASE WHEN pol.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
      cmd_sql, roles_sql, new_qual,
      CASE WHEN pol.with_check IS NOT NULL THEN format(' WITH CHECK (%s)', pol.with_check) ELSE '' END
    );
  END LOOP;
END
$$;

-- ============================================================
-- 3. Post-condition assertions
-- ============================================================
DO $$
DECLARE
  total INT;
  gated INT;
BEGIN
  SELECT count(*) INTO total FROM pg_policies
  WHERE schemaname = 'public'
    AND (qual LIKE '%is_platform_admin%' OR with_check LIKE '%is_platform_admin%');
  -- NOTE: cast-agnostic match — Postgres normalizes stored policy expressions
  -- (current_user -> CURRENT_USER, literals gain ::name/::text casts), so an
  -- exact-text pattern would false-negative.
  SELECT count(*) INTO gated FROM pg_policies
  WHERE schemaname = 'public'
    AND (qual LIKE '%is_platform_admin%' OR with_check LIKE '%is_platform_admin%')
    AND qual LIKE '%pg_has_role%'
    AND qual LIKE '%platform_admin_rls%'
    AND qual LIKE '%member%';
  IF total <> gated THEN
    RAISE EXCEPTION '014: % of % is_platform_admin policies lack the platform_admin_rls membership gate', gated, total;
  END IF;
  IF total = 0 THEN
    RAISE EXCEPTION '014: no is_platform_admin policies found — refusing to no-op on an unexpected schema';
  END IF;
END
$$;
