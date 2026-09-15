-- ============================================================
-- 004b — Facility demo rows + workflow definitions
-- ============================================================
-- These rows used to live at the end of 000-create-all-tables.sql, which runs
-- BEFORE the tenants/branches they reference exist (004-phase1-fixes.sql creates
-- the platform tenant, the Demo School tenant and the Main/North campuses).
-- With foreign keys in place the inserts failed, which aborted the whole file —
-- one of the reasons the migration set could not build a fresh database.
--
-- Column names are the entity/camelCase names ("tenantId", "isDefault", …);
-- 000 previously used snake_case, which no longer exists in the schema.
--
-- The workflow IDs were 'w0000000-…' in 000, which is not valid hex and so is
-- not a valid uuid — that block could never have run either.
--
-- Runs after 004 (tenants/branches) and before 005. Idempotent.
-- ============================================================

-- ============================================================
-- Demo Departments
-- ============================================================
INSERT INTO departments (id, "tenantId", "branchId", name, code, "educationLevelIds", "isDefault") VALUES
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Elementary', 'ELEM', '{f0000000-0000-0000-0000-000000000002}', true),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Junior High School', 'JHS', '{f0000000-0000-0000-0000-000000000003}', false),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Senior High School', 'SHS', '{f0000000-0000-0000-0000-000000000004}', false),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'College', 'COLL', '{f0000000-0000-0000-0000-000000000005}', false)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Demo Building
-- ============================================================
INSERT INTO buildings (id, "tenantId", "branchId", name, code, "floorCount") VALUES
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Main Building', 'MB', 3)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Demo Floors
-- ============================================================
INSERT INTO floors (id, "tenantId", "buildingId", label, "floorNumber") VALUES
  ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Ground Floor', 0),
  ('80000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Second Floor', 1),
  ('80000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Third Floor', 2)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Demo Rooms
-- ============================================================
INSERT INTO rooms (id, "tenantId", "branchId", "floorId", name, "roomType", capacity) VALUES
  ('90000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 'Room 101', 'classroom', 40),
  ('90000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 'Room 102', 'classroom', 40),
  ('90000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000002', 'Computer Lab', 'laboratory', 30)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Workflow definitions (platform tenant templates)
-- ============================================================
-- Grade change/appeal workflow
INSERT INTO workflow_definitions (id, "tenantId", "entityType", name, description, steps, "slaHours", "escalationTo") VALUES
  ('c1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'grade_change', 'Grade Change Request', 'Teacher requests grade change, coordinator reviews, registrar approves', '[{"role":"Teacher","action":"request"},{"role":"SubjectCoordinator","action":"review"},{"role":"Registrar","action":"approve"}]', 48, 'Principal')
ON CONFLICT DO NOTHING;

-- Discount/scholarship approval
INSERT INTO workflow_definitions (id, "tenantId", "entityType", name, description, steps, "slaHours", "escalationTo") VALUES
  ('c1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'discount', 'Discount/Scholarship Approval', 'Finance officer reviews, tenant admin approves', '[{"role":"Accounting/Finance Officer","action":"review"},{"role":"Tenant Admin","action":"approve"}]', 72, NULL)
ON CONFLICT DO NOTHING;

-- Refund approval
INSERT INTO workflow_definitions (id, "tenantId", "entityType", name, description, steps, "slaHours", "escalationTo") VALUES
  ('c1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'refund', 'Refund Approval', 'Cashier requests, finance reviews, admin approves', '[{"role":"Cashier","action":"request"},{"role":"Accounting/Finance Officer","action":"review"},{"role":"Tenant Admin","action":"approve"}]', 168, NULL)
ON CONFLICT DO NOTHING;

-- Document release
INSERT INTO workflow_definitions (id, "tenantId", "entityType", name, description, steps, "slaHours", "escalationTo") VALUES
  ('c1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'document_release', 'Document Release', 'Registrar releases documents', '[{"role":"Registrar","action":"release"}]', 24, NULL)
ON CONFLICT DO NOTHING;
