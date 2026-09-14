-- ============================================================
-- Migration 004: Phase 1 fixes — G-20/G-23/G-25 + seed data
-- ============================================================
-- NOTES:
--  * The live database was created by TypeORM `synchronize` (camelCase
--    columns). The earlier snake_case migrations (000/001/003) were
--    authored for a different naming convention and never applied.
--    This migration matches the ACTUAL schema (quoted camelCase).
--  * All statements are idempotent (IF NOT EXISTS / ON CONFLICT).
--  * RLS deployment note: to make RLS policies enforceable, run the app
--    under a NON-owner role (owners bypass RLS):
--      CREATE ROLE sms_app LOGIN PASSWORD '...';
--      GRANT USAGE ON SCHEMA public TO sms_app;
--      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sms_app;
--      ALTER DEFAULT PRIVILEGES IN SCHEMA public
--        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sms_app;
--    then connect with DB_USERNAME=sms_app.

-- ============================================================
-- 1. Schema fixes
-- ============================================================

-- [G-20] users lacks first_name/last_name (topbar shows "?")
ALTER TABLE users ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastName" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "middleName" TEXT;

-- [G-25] branches lacks contact info (FR-TEN-3, frontend forms collect it)
ALTER TABLE branches ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS "contactPhone" TEXT;

-- [G-23] idempotency_keys — required by common/idempotency.guard.ts (raw SQL,
-- snake_case column names match that file exactly)
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key            TEXT PRIMARY KEY,
  request_method TEXT NOT NULL,
  request_path   TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires
  ON idempotency_keys (expires_at);

-- [G-23] applicants — admissions pipeline persistence (FR-ADM-1/2)
CREATE TABLE IF NOT EXISTS applicants (
  "id"                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"           UUID NOT NULL,
  "branchId"           UUID,
  "firstName"          TEXT NOT NULL,
  "lastName"           TEXT NOT NULL,
  "middleName"         TEXT,
  "email"              TEXT,
  "phone"              TEXT,
  "birthDate"          DATE,
  "gender"             TEXT,
  "address"            TEXT,
  "previousSchool"     TEXT,
  "gradeLevelAppliedFor" TEXT,
  "source"             TEXT DEFAULT 'portal',
  "status"             TEXT NOT NULL DEFAULT 'new',
  "stageId"            UUID,
  "notes"              TEXT,
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_applicants_tenant ON applicants ("tenantId");
CREATE INDEX IF NOT EXISTS idx_applicants_stage ON applicants ("tenantId", "stageId", "status");

-- [G-fix] tenants table had RLS enabled but NO policy (deny-all for
-- non-owner roles) — create it idempotently
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tenants' AND policyname = 'tenant_isolation_tenants'
  ) THEN
    CREATE POLICY tenant_isolation_tenants ON tenants
      USING (id::text = current_setting('app.current_tenant_id', true));
  END IF;
END $$;

-- ============================================================
-- 2. Seed data — Phase 1 baseline (idempotent)
-- ============================================================
-- Fixed UUIDs keep seeds referential and re-runnable.
-- Password for every seeded user below: admin123 (change in prod!)

-- 2a. Tenant plans (global catalog)
INSERT INTO tenant_plans ("id", "planKey", "name", "maxBranches", "maxStudents", "modules", "isActive") VALUES
  ('a0000000-0000-0000-0000-000000000001', 'starter', 'Starter', 1, 500,
   '{"sis":true,"billing":true,"cashiering":true,"scheduling":false,"hr":false,"reports":true}', true),
  ('a0000000-0000-0000-0000-000000000002', 'standard', 'Standard', 3, 5000,
   '{"sis":true,"billing":true,"cashiering":true,"scheduling":true,"hr":true,"reports":true}', true),
  ('a0000000-0000-0000-0000-000000000003', 'enterprise', 'Enterprise', NULL, NULL,
   '{"sis":true,"billing":true,"cashiering":true,"scheduling":true,"hr":true,"reports":true,"communications":true,"documents":true}', true)
ON CONFLICT ("id") DO NOTHING;

-- 2b. Tenants — 000…000 is the platform/system tenant
INSERT INTO tenants ("id", "name", "slug", "planId", "status", "branding") VALUES
  ('00000000-0000-0000-0000-000000000000', 'Platform Operations', 'platform', 'a0000000-0000-0000-0000-000000000003', 'active', '{}'),
  ('10000000-0000-0000-0000-000000000001', 'Demo School', 'demo-school', 'a0000000-0000-0000-0000-000000000002', 'active', '{"primaryColor":"#2563eb"}')
ON CONFLICT ("id") DO NOTHING;

-- 2c. Branches
INSERT INTO branches ("id", "tenantId", "name", "code", "address", "tin", "birBranchCode", "levelsOffered", "status", "contactEmail", "contactPhone") VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Main Campus', 'MAIN', '123 Education St, Manila', '123-456-789-000', '000',
   '{elementary,jhs,shs,college}', 'active', 'main@demo-school.ph', '+63 2 8123 4567'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'North Campus', 'NORTH', '456 North Ave, Quezon City', '123-456-789-000', '001',
   '{elementary,jhs,shs}', 'active', 'north@demo-school.ph', '+63 2 8123 4568')
ON CONFLICT ("id") DO NOTHING;

-- 2d. Roles (tenant 000…000 = global/system roles)
INSERT INTO roles ("id", "tenantId", "name", "description", "isSystem") VALUES
  ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'Super Admin', 'Full platform access', true),
  ('b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'Tenant Admin', 'Full access within one tenant', true),
  ('b0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'Registrar', 'Students, enrollments, sections, records', true),
  ('b0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'Finance', 'Billing, invoices, discounts', true),
  ('b0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'Cashier', 'Payments, ORs, sessions', true),
  ('b0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'Faculty', 'Gradebook, attendance', true),
  ('b0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'Principal', 'Approvals, reports, oversight', true),
  ('b0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'HR Officer', 'Employees, payroll, DTR', true),
  ('b0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', 'Admissions', 'Applicants, pipeline', true),
  ('b0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'Nurse', 'Health records, clinic', true),
  ('b0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'Guardian', 'Parent/guardian portal', true),
  ('b0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'Student', 'Student portal', true),
  ('b0000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000000', 'Platform Support', 'Audited cross-tenant impersonation', true),
  ('b0000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000000', 'DPO', 'Data Protection Officer', true)
ON CONFLICT ("id") DO NOTHING;

-- 2e. Permission catalog (matches tables.md §13 canonical list)
INSERT INTO permissions ("id", "resource", "action", "description") VALUES
  -- Tenancy
  ('c0000000-0000-0000-0000-000000000001', 'tenancy.tenant', 'view', 'View tenants'),
  ('c0000000-0000-0000-0000-000000000002', 'tenancy.tenant', 'create', 'Create tenants'),
  ('c0000000-0000-0000-0000-000000000003', 'tenancy.tenant', 'edit', 'Edit tenants'),
  ('c0000000-0000-0000-0000-000000000004', 'tenancy.branch', 'view', 'View branches'),
  ('c0000000-0000-0000-0000-000000000005', 'tenancy.branch', 'create', 'Create branches'),
  ('c0000000-0000-0000-0000-000000000006', 'tenancy.branch', 'edit', 'Edit branches'),
  ('c0000000-0000-0000-0000-000000000007', 'tenancy.department', 'view', 'View departments'),
  ('c0000000-0000-0000-0000-000000000008', 'tenancy.department', 'create', 'Create departments'),
  -- Academic
  ('c0000000-0000-0000-0000-000000000010', 'academic.school_year', 'view', 'View school years'),
  ('c0000000-0000-0000-0000-000000000011', 'academic.school_year', 'create', 'Create school years'),
  ('c0000000-0000-0000-0000-000000000012', 'academic.term', 'view', 'View terms'),
  ('c0000000-0000-0000-0000-000000000013', 'academic.term', 'create', 'Create terms'),
  ('c0000000-0000-0000-0000-000000000014', 'academic.curriculum', 'view', 'View curricula'),
  ('c0000000-0000-0000-0000-000000000015', 'academic.curriculum', 'create', 'Create curricula'),
  ('c0000000-0000-0000-0000-000000000016', 'academic.curriculum', 'edit', 'Edit curricula'),
  ('c0000000-0000-0000-0000-000000000017', 'academic.curriculum', 'publish', 'Publish curricula'),
  ('c0000000-0000-0000-0000-000000000018', 'academic.subject', 'view', 'View subjects'),
  ('c0000000-0000-0000-0000-000000000019', 'academic.subject', 'create', 'Create subjects'),
  -- SIS
  ('c0000000-0000-0000-0000-000000000020', 'sis.student', 'view', 'View students'),
  ('c0000000-0000-0000-0000-000000000021', 'sis.student', 'create', 'Create students'),
  ('c0000000-0000-0000-0000-000000000022', 'sis.student', 'edit', 'Edit students'),
  ('c0000000-0000-0000-0000-000000000023', 'sis.enrollment', 'view', 'View enrollments'),
  ('c0000000-0000-0000-0000-000000000024', 'sis.enrollment', 'create', 'Create enrollments'),
  ('c0000000-0000-0000-0000-000000000025', 'sis.applicant', 'view', 'View applicants'),
  ('c0000000-0000-0000-0000-000000000026', 'sis.applicant', 'edit', 'Edit/move applicants'),
  -- Billing
  ('c0000000-0000-0000-0000-000000000030', 'billing.fee_type', 'view', 'View fee types'),
  ('c0000000-0000-0000-0000-000000000031', 'billing.fee_type', 'create', 'Create fee types'),
  ('c0000000-0000-0000-0000-000000000032', 'billing.invoice', 'view', 'View invoices'),
  ('c0000000-0000-0000-0000-000000000033', 'billing.invoice', 'create', 'Create invoices'),
  ('c0000000-0000-0000-0000-000000000034', 'billing.discount', 'view', 'View discounts'),
  ('c0000000-0000-0000-0000-000000000035', 'billing.discount', 'approve', 'Approve discounts'),
  -- Cashiering
  ('c0000000-0000-0000-0000-000000000040', 'cashiering.session', 'view', 'View cashier sessions'),
  ('c0000000-0000-0000-0000-000000000041', 'cashiering.session', 'open', 'Open/close cashier sessions'),
  ('c0000000-0000-0000-0000-000000000042', 'cashiering.payment', 'create', 'Process payments'),
  ('c0000000-0000-0000-0000-000000000043', 'cashiering.receipt', 'view', 'View receipts'),
  -- Grading
  ('c0000000-0000-0000-0000-000000000050', 'grading.system', 'view', 'View grading systems'),
  ('c0000000-0000-0000-0000-000000000051', 'grading.system', 'create', 'Create grading systems'),
  ('c0000000-0000-0000-0000-000000000052', 'grading.gradebook', 'view', 'View gradebook'),
  ('c0000000-0000-0000-0000-000000000053', 'grading.gradebook', 'edit', 'Enter grades'),
  -- Attendance
  ('c0000000-0000-0000-0000-000000000060', 'attendance.record', 'view', 'View attendance'),
  ('c0000000-0000-0000-0000-000000000061', 'attendance.record', 'edit', 'Record attendance'),
  -- Facility
  ('c0000000-0000-0000-0000-000000000070', 'facility.building', 'view', 'View buildings'),
  ('c0000000-0000-0000-0000-000000000071', 'facility.building', 'create', 'Create buildings'),
  ('c0000000-0000-0000-0000-000000000072', 'facility.room', 'view', 'View rooms'),
  ('c0000000-0000-0000-0000-000000000073', 'facility.room', 'create', 'Create rooms'),
  -- Config
  ('c0000000-0000-0000-0000-000000000080', 'config.lookup', 'view', 'View lookup lists'),
  ('c0000000-0000-0000-0000-000000000081', 'config.lookup', 'edit', 'Edit lookup lists'),
  ('c0000000-0000-0000-0000-000000000082', 'config.custom_field', 'view', 'View custom fields'),
  ('c0000000-0000-0000-0000-000000000083', 'config.custom_field', 'edit', 'Edit custom fields'),
  ('c0000000-0000-0000-0000-000000000084', 'config.audit_log', 'view', 'View audit log'),
  ('c0000000-0000-0000-0000-000000000085', 'config.audit_log', 'export', 'Export audit log'),
  -- IAM
  ('c0000000-0000-0000-0000-000000000090', 'iam.role', 'view', 'View roles'),
  ('c0000000-0000-0000-0000-000000000091', 'iam.role', 'create', 'Create roles'),
  ('c0000000-0000-0000-0000-000000000092', 'iam.role', 'assign', 'Assign roles to users'),
  ('c0000000-0000-0000-0000-000000000093', 'iam.permission', 'view', 'View permissions'),
  -- Communications / Documents / HR
  ('c0000000-0000-0000-0000-000000000100', 'communications.announcement', 'view', 'View announcements'),
  ('c0000000-0000-0000-0000-000000000101', 'communications.announcement', 'create', 'Create announcements'),
  ('c0000000-0000-0000-0000-000000000102', 'document.template', 'view', 'View document templates'),
  ('c0000000-0000-0000-0000-000000000103', 'document.request', 'view', 'View document requests'),
  ('c0000000-0000-0000-0000-000000000104', 'hr.employee', 'view', 'View employees'),
  ('c0000000-0000-0000-0000-000000000105', 'hr.employee', 'create', 'Create employees'),
  -- Reporting / platform
  ('c0000000-0000-0000-0000-000000000110', 'reporting.dashboard', 'view', 'View dashboards'),
  ('c0000000-0000-0000-0000-000000000111', 'reporting.export', 'export', 'Export reports'),
  ('c0000000-0000-0000-0000-000000000120', 'platform.dashboard', 'view', 'View platform dashboard'),
  ('c0000000-0000-0000-0000-000000000121', 'platform.config', 'view', 'View platform config'),
  ('c0000000-0000-0000-0000-000000000122', 'platform.impersonation', 'use', 'Request/use impersonation'),
  -- Frontend route-map codes (ROUTE_PERMISSION_MAP) — keep in sync
  ('c0000000-0000-0000-0000-000000000130', 'facility.floor', 'view', 'View floors'),
  ('c0000000-0000-0000-0000-000000000131', 'sis.guardian', 'view', 'View guardians'),
  ('c0000000-0000-0000-0000-000000000132', 'sis.section', 'view', 'View sections'),
  ('c0000000-0000-0000-0000-000000000133', 'scheduling.timetable', 'view', 'View timetable'),
  ('c0000000-0000-0000-0000-000000000134', 'scheduling.facultyload', 'view', 'View faculty load'),
  ('c0000000-0000-0000-0000-000000000135', 'grading.component', 'view', 'View grade components'),
  ('c0000000-0000-0000-0000-000000000136', 'grading.honorroll', 'view', 'View honor roll config'),
  ('c0000000-0000-0000-0000-000000000137', 'billing.feestructure', 'view', 'View fee structures'),
  ('c0000000-0000-0000-0000-000000000138', 'cashiering.payment', 'view', 'View payments'),
  ('c0000000-0000-0000-0000-000000000139', 'cashiering.adhoc', 'view', 'View ad-hoc sales'),
  ('c0000000-0000-0000-0000-000000000140', 'cashiering.report', 'view', 'View cashier reports'),
  ('c0000000-0000-0000-0000-000000000141', 'communications.template', 'view', 'View notification templates'),
  ('c0000000-0000-0000-0000-000000000142', 'communications.message', 'view', 'View messages')
ON CONFLICT ("id") DO NOTHING;

-- 2f. role_permissions — Tenant Admin gets everything tenant-scoped;
--     Super Admin/Platform Support get platform + everything
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT 'b0000000-0000-0000-0000-000000000002', p."id" FROM permissions p
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions ("roleId", "permissionId")
SELECT 'b0000000-0000-0000-0000-000000000001', p."id" FROM permissions p
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions ("roleId", "permissionId")
SELECT 'b0000000-0000-0000-0000-000000000013', p."id" FROM permissions p
WHERE p.resource LIKE 'platform.%'
ON CONFLICT DO NOTHING;

-- Registrar
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT 'b0000000-0000-0000-0000-000000000003', p."id" FROM permissions p
WHERE p.resource IN ('sis.student','sis.enrollment','sis.applicant','academic.school_year','academic.term')
   OR p.resource = 'tenancy.branch' AND p.action = 'view'
ON CONFLICT DO NOTHING;

-- Finance
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT 'b0000000-0000-0000-0000-000000000004', p."id" FROM permissions p
WHERE p.resource LIKE 'billing.%' OR (p.resource = 'reporting.dashboard' AND p.action = 'view')
ON CONFLICT DO NOTHING;

-- Cashier
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT 'b0000000-0000-0000-0000-000000000005', p."id" FROM permissions p
WHERE p.resource LIKE 'cashiering.%' OR (p.resource = 'billing.invoice' AND p.action = 'view')
ON CONFLICT DO NOTHING;

-- Faculty
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT 'b0000000-0000-0000-0000-000000000006', p."id" FROM permissions p
WHERE p.resource IN ('grading.gradebook','attendance.record')
  OR (p.resource = 'sis.student' AND p.action = 'view')
ON CONFLICT DO NOTHING;

-- 2g. Users (password: admin123)
-- bcrypt hash for 'admin123' cost 10 — verified with bcryptjs
INSERT INTO users ("id", "tenantId", "email", "phone", "passwordHash", "firstName", "lastName", "status", "mfaEnabled") VALUES
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'admin@demo-school.ph', '+63 917 000 0001',
   '$2b$10$FpIm5LpCw8JdyIL0FdYTxe3Of.PaagHgBZbpJfadwgmYDwwuXRU8C', 'Demo', 'Admin', 'active', false),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'registrar@demo-school.ph', '+63 917 000 0002',
   '$2b$10$FpIm5LpCw8JdyIL0FdYTxe3Of.PaagHgBZbpJfadwgmYDwwuXRU8C', 'Rina', 'Reyes', 'active', false),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'cashier@demo-school.ph', '+63 917 000 0003',
   '$2b$10$FpIm5LpCw8JdyIL0FdYTxe3Of.PaagHgBZbpJfadwgmYDwwuXRU8C', 'Carlo', 'Cruz', 'active', false),
  ('40000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'admin@platform.local', NULL,
   '$2b$10$FpIm5LpCw8JdyIL0FdYTxe3Of.PaagHgBZbpJfadwgmYDwwuXRU8C', 'Platform', 'Admin', 'active', false)
ON CONFLICT ("id") DO NOTHING;

-- 2h. user_roles (composite-key join table: userId+roleId, no id column)
INSERT INTO user_roles ("userId", "roleId", "tenantId", "branchId")
VALUES
  ('40000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', NULL),
  ('40000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', NULL),
  ('40000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', NULL),
  ('40000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', NULL)
ON CONFLICT DO NOTHING;

-- 2i. Default admissions pipeline stages for the demo tenant (so the
--     Kanban + apply form work out of the box). Matches the
--     applicant_stage_configs entity: stageName, stageCode, config NOT NULL.
INSERT INTO applicant_stage_configs ("id", "tenantId", "stageName", "stageCode", "sortOrder", "isDefault", "isActive", "config")
VALUES
  ('e0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'New', 'new', 1, true, true, '{}'),
  ('e0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Documents Review', 'docs', 2, false, true, '{}'),
  ('e0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Assessment', 'assessment', 3, false, true, '{}'),
  ('e0000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Interview', 'interview', 4, false, true, '{}'),
  ('e0000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'Accepted', 'accepted', 5, false, true, '{}'),
  ('e0000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 'Enrolled', 'enrolled', 6, false, true, '{}')
ON CONFLICT ("id") DO NOTHING;
