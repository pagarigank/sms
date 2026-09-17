-- ============================================================
-- 032 — Faculty Permissions for Data Segregation
-- ============================================================
-- Add missing permissions for Faculty role so they can view
-- Sections, Gradebook, Students, Timetable, and Attendance.

INSERT INTO role_permissions ("roleId", "permissionId")
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Faculty'
  AND p.resource IN ('sis.student', 'sis.section', 'grading.gradebook', 'attendance.record', 'scheduling.timetable', 'sis.promotion')
  AND p.action = 'view'
ON CONFLICT DO NOTHING;
