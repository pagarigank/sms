-- 007: enable RLS on applicants (missed when the table was added in migration 004).
-- Every other tenant-scoped table carries the tenant_isolation_* policy created in
-- 003-rls-policies.sql; applicants holds PII (names, emails, phones, addresses) and
-- was the only tenant-scoped table left unprotected.
-- Note: the table owner bypasses RLS unless FORCE is set; production app roles are
-- subject to the policy as with all other tables.

ALTER TABLE "applicants" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_applicants"
  ON "applicants"
  AS PERMISSIVE
  USING ((("tenantId")::text = current_setting('app.current_tenant_id'::text)));
