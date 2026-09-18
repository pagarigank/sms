-- ============================================================
-- Migration 036: Missing RBAC permissions + role grants
-- ============================================================
-- Adds permissions referenced in route-permission-map but never seeded:
--   * sis.promotion:view        - SIS / Promotions page
--   * reporting.sf_forms:view   - Reports / SF Forms page
-- Also ensures common frontend route-map codes exist in catalog.
-- Idempotent (ON CONFLICT DO NOTHING).
-- ============================================================

-- 1. Add missing permissions
INSERT INTO permissions ("id", "resource", "action", "description") VALUES
  -- SIS Promotions
  ('c0000000-0000-0000-0000-000000000150', 'sis.promotion', 'view', 'View student promotions'),
  ('c0000000-0000-0000-0000-000000000151', 'sis.promotion', 'create', 'Create/manage promotions'),
  -- Reporting SF Forms (DepEd school forms)
  ('c0000000-0000-0000-0000-000000000152', 'reporting.sf_forms', 'view', 'View DepEd school forms (SF1-SF10)'),
  -- Communications rules (frontend route-map uses this)
  ('c0000000-0000-0000-0000-000000000153', 'communications.rule', 'view', 'View notification rules'),
  -- Cashiering receipt (frontend route-map uses this)
  ('c0000000-0000-0000-0000-000000000154', 'cashiering.receipt', 'view', 'View official receipts')
ON CONFLICT ("id") DO NOTHING;

-- 2. Role permission grants for the new permissions
-- Tenant Admin gets everything tenant-scoped (already covered by "all permissions" grant in 004)
-- Registrar gets SIS promotions
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT 'b0000000-0000-0000-0000-000000000003', p."id" FROM permissions p
WHERE p.resource IN ('sis.promotion', 'reporting.sf_forms')
ON CONFLICT DO NOTHING;

-- Finance gets SF forms (for reporting)
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT 'b0000000-0000-0000-0000-000000000004', p."id" FROM permissions p
WHERE p.resource = 'reporting.sf_forms'
ON CONFLICT DO NOTHING;

-- Cashier gets receipt view
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT 'b0000000-0000-0000-0000-000000000005', p."id" FROM permissions p
WHERE p.resource = 'cashiering.receipt'
ON CONFLICT DO NOTHING;

-- Admissions role gets communications rules (for admissions workflow)
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT 'b0000000-0000-0000-0000-000000000009', p."id" FROM permissions p
WHERE p.resource = 'communications.rule'
ON CONFLICT DO NOTHING;

-- Principal gets SF forms + promotions oversight
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT 'b0000000-0000-0000-0000-000000000007', p."id" FROM permissions p
WHERE p.resource IN ('reporting.sf_forms', 'sis.promotion')
ON CONFLICT DO NOTHING;