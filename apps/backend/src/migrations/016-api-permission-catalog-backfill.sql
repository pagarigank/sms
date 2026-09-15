-- ============================================================
-- 016 — Backfill permission codes used by the API→permission map
-- ============================================================
-- The live `permissions` catalog is missing five codes that
-- `apps/backend/src/auth/api-permissions.ts` requires. A code that is absent
-- from the catalog can never be granted to a role, so `PermissionsGuard` denies
-- those routes to EVERY role — silently unreachable endpoints:
--
--   billing.invoice:approve     PUT /invoices/:id/apply-discount
--                               PUT /invoices/:id/apply-payment
--   document.template:create    PUT /documents/templates/:id
--   document.request:approve    PUT /documents/requests/:id/{status,approve}
--                               POST /documents/generate
--                               PUT /documents/generated/:id/void
--   grading.report_card:view    GET /grading/permanent-records[/form137|/tor]
--   grading.report_card:approve PUT /grading/permanent-records/:id/finalize
--                               PUT /grading/change-requests/:id/{approve,reject}
--
-- `001-phase1-rls-and-seed.sql` defines these rows but they never reached the
-- live database. This migration is idempotent and safe to re-run.
--
-- Ids continue the 015 `e0000000-…` series to avoid collisions with the
-- `c0000000-…` ids already used by 001/004.

-- ------------------------------------------------------------
-- 1. Ensure the codes exist
-- ------------------------------------------------------------
INSERT INTO permissions (id, resource, action, description) VALUES
  ('e0000000-0000-0000-0000-000000000007', 'billing.invoice',     'approve', 'Approve invoices / adjust invoice balances'),
  ('e0000000-0000-0000-0000-000000000008', 'document.template',   'create',  'Create document templates'),
  ('e0000000-0000-0000-0000-000000000009', 'document.request',    'approve', 'Approve/release document requests'),
  ('e0000000-0000-0000-0000-00000000000a', 'grading.report_card', 'view',    'View report cards / permanent records'),
  ('e0000000-0000-0000-0000-00000000000b', 'grading.report_card', 'approve', 'Finalize report cards / permanent records')
-- Guard against the resource+action already existing under a different id
-- (a partial 001 seed would otherwise create a duplicate grant target).
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 2. Grant to the full-access roles
-- ------------------------------------------------------------
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT r.id, p.id
FROM roles r
JOIN permissions p
  ON (p.resource, p.action) IN (
    ('billing.invoice', 'approve'),
    ('document.template', 'create'),
    ('document.request', 'approve'),
    ('grading.report_card', 'view'),
    ('grading.report_card', 'approve')
  )
WHERE r.name IN ('Super Admin', 'Tenant Admin', 'Principal')
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 3. Grant to the functional roles (mirrors 015's role mapping)
-- ------------------------------------------------------------
-- Finance / Cashier: invoice adjustments and payment application
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.resource = 'billing.invoice' AND p.action = 'approve'
WHERE r.name IN ('Finance', 'Cashier')
ON CONFLICT DO NOTHING;

-- Registrar / Admissions: document template authoring + request release
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT r.id, p.id
FROM roles r
JOIN permissions p
  ON (p.resource, p.action) IN (('document.template', 'create'), ('document.request', 'approve'))
WHERE r.name IN ('Registrar', 'Admissions')
ON CONFLICT DO NOTHING;

-- Faculty: report card / permanent record visibility + finalization
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.resource = 'grading.report_card'
WHERE r.name = 'Faculty'
ON CONFLICT DO NOTHING;
