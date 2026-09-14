-- 013: Phase 11.1 — RLS GUC safety (found by the G-16 live drill).
--
-- PROBLEM: Two policy generations coexist across the 103 public-schema
-- policies. 45 tenant_isolation_* policies cast the tenant GUC to uuid —
--     ("tenantId" = (current_setting('app.current_tenant_id'::text, true))::uuid)
--     ("tenantId" = (current_setting('app.current_tenant_id'::text))::uuid)   -- missing_ok missing!
-- and 80 cast the platform-admin GUC to boolean:
--     (current_setting('app.is_platform_admin'::text, true))::boolean = true
-- The rls-bypass drill (src/testing/rls-bypass.spec.js) proved that an EMPTY
-- GUC ('') makes the uuid/boolean casts ERROR ('invalid input syntax for
-- type uuid: ""') on 4/16 sampled tables — a request that should fail CLOSED
-- (0 rows) instead blows up with a 500. The generation WITHOUT missing_ok
-- even errors when the GUC is entirely unset.
--
-- FIX: regenerate every policy using TEXT comparison, which is null-safe and
-- empty-safe:
--     "tenantId"::text = current_setting('app.current_tenant_id'::text, true)
--     current_setting('app.is_platform_admin'::text, true) = 'true'
-- Empty/unset GUC now yields 0 rows (fail closed); a valid UUID behaves
-- exactly as before. Policy name/roles/for/with_check are preserved.
--
-- NOTE ON THE ROLE (deliberately NOT forced here): migration 012 defines
-- sms_app as NOLOGIN (drill uses SET ROLE). If a deployment instead created
-- sms_app WITH LOGIN per the migration-004 comment, aligning is manual:
--     ALTER ROLE sms_app NOLOGIN;   -- or keep LOGIN and connect directly
-- The drill script asserts the NOBYPASSRLS + NOLOGIN posture either way.
--
-- Idempotent: safe to re-run (drop + create).

DO $$
DECLARE
  pol RECORD;
  new_qual TEXT;
  new_with_check TEXT;
  roles_sql TEXT;
  cmd_sql TEXT;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    new_qual := pol.qual;
    new_with_check := pol.with_check;

    -- 1. uuid-cast tenant comparisons -> text comparison (with missing_ok).
    --    Handles the quoted column form and bare "id".
    new_qual := regexp_replace(new_qual,
      '("[A-Za-z_]+"|[a-z_]+)\s*=\s*\(current_setting\(''app\.current_tenant_id''::text, true\)\)::uuid',
      '(\1)::text = current_setting(''app.current_tenant_id''::text, true)');
    new_qual := regexp_replace(new_qual,
      '("[A-Za-z_]+"|[a-z_]+)\s*=\s*\(current_setting\(''app\.current_tenant_id''::text\)\)::uuid',
      '(\1)::text = current_setting(''app.current_tenant_id''::text, true)');

    -- 2. Same normalization inside WITH CHECK expressions.
    IF new_with_check IS NOT NULL THEN
      new_with_check := regexp_replace(new_with_check,
        '("[A-Za-z_]+"|[a-z_]+)\s*=\s*\(current_setting\(''app\.current_tenant_id''::text, true\)\)::uuid',
        '(\1)::text = current_setting(''app.current_tenant_id''::text, true)');
      new_with_check := regexp_replace(new_with_check,
        '("[A-Za-z_]+"|[a-z_]+)\s*=\s*\(current_setting\(''app\.current_tenant_id''::text\)\)::uuid',
        '(\1)::text = current_setting(''app.current_tenant_id''::text, true)');
    END IF;

    -- 3. boolean-cast platform-admin comparison -> string comparison.
    new_qual := regexp_replace(new_qual,
      '\(current_setting\(''app\.is_platform_admin''::text, true\)\)::boolean = true',
      'current_setting(''app.is_platform_admin''::text, true) = ''true''');
    IF new_with_check IS NOT NULL THEN
      new_with_check := regexp_replace(new_with_check,
        '\(current_setting\(''app\.is_platform_admin''::text, true\)\)::boolean = true',
        'current_setting(''app.is_platform_admin''::text, true) = ''true''');
    END IF;

    -- 4. Text comparisons missing missing_ok -> add it (unset GUC must not error).
    new_qual := regexp_replace(new_qual,
      '= current_setting\(''app\.current_tenant_id''::text\)',
      '= current_setting(''app.current_tenant_id''::text, true)');
    new_qual := regexp_replace(new_qual,
      '= current_setting\(''app\.is_platform_admin''::text\)',
      '= current_setting(''app.is_platform_admin''::text, true)');
    IF new_with_check IS NOT NULL THEN
      new_with_check := regexp_replace(new_with_check,
        '= current_setting\(''app\.current_tenant_id''::text\)',
        '= current_setting(''app.current_tenant_id''::text, true)');
      new_with_check := regexp_replace(new_with_check,
        '= current_setting\(''app\.is_platform_admin''::text\)',
        '= current_setting(''app.is_platform_admin''::text, true)');
    END IF;

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
      CASE WHEN new_with_check IS NOT NULL THEN format(' WITH CHECK (%s)', new_with_check) ELSE '' END
    );
  END LOOP;
END
$$;

-- ============================================================
-- Post-condition assertions (hard-fail if normalization missed anything)
-- ============================================================
DO $$
DECLARE
  bad INT;
BEGIN
  -- No policy may still cast the tenant GUC to uuid.
  SELECT count(*) INTO bad FROM pg_policies
  WHERE schemaname = 'public'
    AND (qual LIKE '%current_tenant_id%::uuid%' OR with_check LIKE '%current_tenant_id%::uuid%');
  IF bad > 0 THEN RAISE EXCEPTION '013: % policies still cast tenant GUC to uuid', bad; END IF;

  -- No policy may still cast the platform-admin GUC to boolean.
  SELECT count(*) INTO bad FROM pg_policies
  WHERE schemaname = 'public'
    AND (qual LIKE '%is_platform_admin%::boolean%' OR with_check LIKE '%is_platform_admin%::boolean%');
  IF bad > 0 THEN RAISE EXCEPTION '013: % policies still cast is_platform_admin to boolean', bad; END IF;

  -- Every current_setting call must use missing_ok=true.
  SELECT count(*) INTO bad FROM pg_policies
  WHERE schemaname = 'public'
    AND ((qual LIKE '%current_setting(''app.current_tenant_id''::text)%'
       OR qual LIKE '%current_setting(''app.is_platform_admin''::text)%')
     OR (with_check LIKE '%current_setting(''app.current_tenant_id''::text)%'
       OR with_check LIKE '%current_setting(''app.is_platform_admin''::text)%'));
  IF bad > 0 THEN RAISE EXCEPTION '013: % policies call current_setting without missing_ok', bad; END IF;
END
$$;
