-- ============================================================
-- 033 — RBAC Rebuild for SF Forms, Rooms, and Faculty Segregation
-- ============================================================

-- 1. Insert new permissions for SF Forms and Rooms
INSERT INTO permissions (id, resource, action, description)
VALUES 
  ('c0000000-0000-0000-0000-000000000300', 'reporting.sf_forms', 'view', 'View DepEd SF Forms'),
  ('c0000000-0000-0000-0000-000000000301', 'reporting.sf_forms', 'generate', 'Generate DepEd SF Forms'),
  ('c0000000-0000-0000-0000-000000000302', 'facility.room', 'view', 'View facility rooms'),
  ('c0000000-0000-0000-0000-000000000303', 'facility.room', 'create', 'Create facility rooms'),
  ('c0000000-0000-0000-0000-000000000304', 'facility.room', 'edit', 'Edit facility rooms'),
  ('c0000000-0000-0000-0000-000000000305', 'facility.room', 'delete', 'Delete facility rooms')
ON CONFLICT (id) DO NOTHING;

-- 2. Grant SF Forms permissions to School Admin, Registrar, Faculty
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('School Admin', 'Registrar', 'Faculty')
  AND p.resource = 'reporting.sf_forms'
ON CONFLICT DO NOTHING;

-- 3. Grant Rooms CRUD permissions to School Admin and Facilities Manager
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('School Admin', 'Facilities Manager')
  AND p.resource = 'facility.room'
ON CONFLICT DO NOTHING;

-- 4. Re-assert Faculty permissions for SIS modules (Data Segregation/Navigation Fix)
-- Ensure Faculty can access their students, sections, attendance, timetable, and gradebook.
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Faculty'
  AND p.resource IN ('sis.student', 'sis.section', 'grading.gradebook', 'attendance.record', 'scheduling.timetable', 'sis.promotion', 'reporting.dashboard')
  AND p.action = 'view'
ON CONFLICT DO NOTHING;
