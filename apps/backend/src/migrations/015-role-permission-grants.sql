-- ============================================================
-- 015 — Role permission grants for enforced API permissions
-- ============================================================
-- After the global JwtAuthGuard + PermissionsGuard (API→permission map) landed,
-- three gaps surfaced:
--   1. A handful of @RequirePermission codes used by the platform controllers
--      did not exist in the catalog, so those endpoints 403'd for everyone.
--   2. Roles that had never been granted anything (HR Officer, Admissions)
--      could not reach their own modules.
--   3. Roles that previously relied on unguarded reads (Faculty loading the
--      gradebook dropdowns, Cashier loading the student picker, …) need the
--      corresponding read permissions or their pages break.
--
-- NOTE: role names are matched to the LIVE catalog (`roles` table):
--   Super Admin, Tenant Admin, Registrar, Finance, Cashier, Faculty,
--   Principal, HR Officer, Admissions, Nurse, Guardian, Student,
--   Platform Support, DPO
-- (the older `001` seed used different labels — Branch Admin/Teacher/…).
--
-- Guardian/Student self-service endpoints are intentionally auth-only (see
-- `apps/backend/src/auth/api-permissions.ts` SELF_SERVICE_RULES) — those roles
-- need no staff permissions to use their portals.
--
-- Idempotent: safe to re-run.

-- ------------------------------------------------------------
-- 1. Missing permissions referenced by existing controller guards
-- ------------------------------------------------------------
INSERT INTO permissions (id, resource, action, description) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'tenancy.branch',        'delete',       'Delete branches'),
  ('e0000000-0000-0000-0000-000000000002', 'tenancy.department',    'edit',         'Edit departments'),
  ('e0000000-0000-0000-0000-000000000003', 'tenancy.department',    'delete',       'Delete departments'),
  ('e0000000-0000-0000-0000-000000000004', 'iam.role',              'edit',         'Edit roles'),
  ('e0000000-0000-0000-0000-000000000005', 'iam.role',              'delete',       'Delete roles'),
  ('e0000000-0000-0000-0000-000000000006', 'platform.user',         'assign_role',  'Assign/replace user roles (platform admin)')
ON CONFLICT DO NOTHING;

-- Grant the new permissions to the full-access roles (their original
-- "grant everything" SELECT ran before these rows existed).
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.resource IN (
  'tenancy.branch', 'tenancy.department', 'iam.role', 'platform.user'
)
WHERE r.name IN ('Super Admin', 'Tenant Admin')
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 2. Per-role grants
-- ------------------------------------------------------------

-- Principal — everything tenant-scoped (all non-platform modules)
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT r.id, p.id
FROM roles r JOIN permissions p ON p.resource NOT LIKE 'platform.%'
WHERE r.name = 'Principal'
ON CONFLICT DO NOTHING;

-- Registrar — SIS, admissions, academic setup, document release, reports
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT r.id, p.id
FROM roles r JOIN permissions p ON p.resource IN (
  'sis.student', 'sis.enrollment', 'sis.applicant', 'sis.guardian', 'sis.section',
  'academic.school_year', 'academic.term', 'academic.curriculum', 'academic.subject',
  'document.template', 'document.request',
  'reporting.dashboard', 'communications.message', 'communications.announcement'
)
WHERE r.name = 'Registrar'
ON CONFLICT DO NOTHING;

-- Admissions — applicant pipeline, student/enrollment reads, document requests
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT r.id, p.id
FROM roles r JOIN permissions p ON p.resource IN (
  'sis.applicant', 'sis.student', 'sis.enrollment', 'sis.section',
  'academic.school_year', 'academic.term', 'academic.curriculum',
  'document.request', 'reporting.dashboard', 'communications.message'
)
WHERE r.name = 'Admissions'
ON CONFLICT DO NOTHING;

-- Cashier — cashiering, invoice view/collect, student picker reads
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT r.id, p.id
FROM roles r JOIN permissions p ON
  p.resource LIKE 'cashiering.%'
  OR p.resource IN (
    'billing.invoice', 'billing.fee_type', 'billing.feestructure', 'billing.discount',
    'sis.student', 'sis.enrollment', 'academic.school_year', 'academic.term',
    'reporting.dashboard'
  )
WHERE r.name = 'Cashier'
ON CONFLICT DO NOTHING;

-- Finance — billing + financial reporting
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT r.id, p.id
FROM roles r JOIN permissions p ON
  p.resource LIKE 'billing.%'
  OR p.resource LIKE 'reporting.%'
  OR p.resource IN (
    'cashiering.receipt', 'cashiering.report', 'cashiering.payment',
    'sis.student', 'sis.enrollment', 'academic.school_year', 'academic.term',
    'document.request'
  )
WHERE r.name = 'Finance'
ON CONFLICT DO NOTHING;

-- Faculty — gradebook/attendance plus the read dropdowns those pages load
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT r.id, p.id
FROM roles r JOIN permissions p ON p.resource IN (
  'grading.gradebook', 'grading.system', 'grading.component', 'grading.honorroll',
  'attendance.record', 'sis.student', 'sis.section',
  'academic.school_year', 'academic.term', 'academic.curriculum', 'academic.subject',
  'scheduling.timetable', 'scheduling.facultyload',
  'communications.message', 'communications.announcement',
  'document.request', 'reporting.dashboard'
)
WHERE r.name = 'Faculty'
ON CONFLICT DO NOTHING;

-- HR Officer — employee records, DTR, teaching loads
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT r.id, p.id
FROM roles r JOIN permissions p ON p.resource IN (
  'hr.employee', 'document.request', 'reporting.dashboard',
  'sis.student', 'communications.message'
)
WHERE r.name = 'HR Officer'
ON CONFLICT DO NOTHING;

-- Nurse — student/guardian records, document requests
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT r.id, p.id
FROM roles r JOIN permissions p ON p.resource IN (
  'sis.student', 'sis.guardian', 'document.request'
)
WHERE r.name = 'Nurse'
ON CONFLICT DO NOTHING;

-- DPO — audit log + reporting (Data Privacy Act oversight)
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT r.id, p.id
FROM roles r JOIN permissions p ON p.resource IN (
  'config.audit_log', 'sis.student', 'reporting.dashboard', 'reporting.export'
)
WHERE r.name = 'DPO'
ON CONFLICT DO NOTHING;
