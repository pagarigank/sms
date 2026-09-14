-- 010: comms/documents/HR reconciliation + reference seed (Phase 8 audit).
--
-- Schema fixes (all three tables empty — trivially safe):
--   * notification_rules.eventType: jsonb -> varchar (it holds a string event
--     code; jsonb broke the dispatch rule matching and any equality filter)
--   * document_templates.documentType: jsonb -> varchar (frontend matches
--     documentType against lookup codes; jsonb made every type "unconfigured")
--   * employees.tinNo: jsonb -> varchar (copy-paste drift; it holds a TIN string)
--
-- Seed (idempotent): the six registrar document templates, standard
-- notification templates for the attendance/low-balance triggers, one draft
-- announcement, and sample employees so the HR pages (and the Phase 5
-- faculty-load picker) have data.

BEGIN;

-- ===== schema reconciliation =====
ALTER TABLE "notification_rules" ALTER COLUMN "eventType" TYPE varchar USING "eventType"::text;
ALTER TABLE "document_templates" ALTER COLUMN "documentType" TYPE varchar USING "documentType"::text;
ALTER TABLE "employees" ALTER COLUMN "tinNo" TYPE varchar USING "tinNo"::text;

-- ===== seed =====
-- Document templates — one per registrar document type
INSERT INTO "document_templates" ("id", "tenantId", "name", "documentType", "content", "versionLabel", "signatoryRequired", "isActive")
SELECT * FROM (VALUES
  ('d8100000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'Certificate of Enrollment', 'cert_enrollment', '{"header": "CERTIFICATE OF ENROLLMENT", "mergeFields": ["studentName", "gradeLevel", "schoolYear", "date"]}'::jsonb, '1.0', false, true),
  ('d8100000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'Good Moral Character', 'good_moral', '{"header": "CERTIFICATE OF GOOD MORAL CHARACTER", "mergeFields": ["studentName", "gradeLevel", "schoolYear", "date"]}'::jsonb, '1.0', true, true),
  ('d8100000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'Form 137 (Permanent Record)', 'form_137', '{"header": "LEARNER''S PERMANENT ACADEMIC RECORD", "mergeFields": ["studentName", "lrn", "schoolYear", "grades"]}'::jsonb, '1.0', true, true),
  ('d8100000-0000-0000-0000-000000000004'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'Transcript of Records', 'tor', '{"header": "OFFICIAL TRANSCRIPT OF RECORDS", "mergeFields": ["studentName", "program", "schoolYear", "grades"]}'::jsonb, '1.0', true, true),
  ('d8100000-0000-0000-0000-000000000005'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'Student ID Card', 'id_card', '{"header": "STUDENT IDENTIFICATION", "mergeFields": ["studentName", "photo", "gradeLevel", "schoolYear"]}'::jsonb, '1.0', false, true),
  ('d8100000-0000-0000-0000-000000000006'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'Diploma', 'diploma', '{"header": "DIPLOMA", "mergeFields": ["studentName", "program", "schoolYear", "date"]}'::jsonb, '1.0', true, true)
) AS v
WHERE NOT EXISTS (SELECT 1 FROM "document_templates" WHERE "tenantId" = '10000000-0000-0000-0000-000000000001'::uuid);

-- Notification templates for the wired triggers (attendance_absence, low_balance)
INSERT INTO "notification_templates" ("id", "tenantId", "name", "eventType", "channel", "subject", "bodyTemplate", "isActive")
SELECT * FROM (VALUES
  ('d8200000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'Absence Alert (SMS)', 'attendance_absence', 'sms', NULL, 'Dear Guardian, {{studentName}} was marked absent today, {{date}}. Please contact the registrar for excuses.', true),
  ('d8200000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'Absence Alert (Email)', 'attendance_absence', 'email', 'Absence Notice - {{studentName}}', 'Dear Guardian, This is to inform you that {{studentName}} was marked absent on {{date}}. Consecutive absences may trigger an advisory conference.', true),
  ('d8200000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'Low Balance Alert (SMS)', 'low_balance', 'sms', NULL, 'Dear Guardian, the account of {{studentName}} has an outstanding balance of {{balance}}. Please visit the cashier. Thank you.', true),
  ('d8200000-0000-0000-0000-000000000004'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'Low Balance Alert (Email)', 'low_balance', 'email', 'Outstanding Balance - {{studentName}}', 'Dear Guardian, Our records show an outstanding balance of {{balance}} for {{studentName}} as of {{date}}. Please settle at the cashier''s office.', true)
) AS v
WHERE NOT EXISTS (SELECT 1 FROM "notification_templates" WHERE "tenantId" = '10000000-0000-0000-0000-000000000001'::uuid);

-- Sample employees across branches (HR page + faculty-load picker)
INSERT INTO "employees" ("id", "tenantId", "branchId", "firstName", "lastName", "email", "position", "department", "employmentStatus", "hireDate", "isActive")
SELECT * FROM (VALUES
  ('d8300000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'Maria', 'Santos', 'm.santos@school.example', 'Principal', 'Administration', 'permanent', '2018-06-01'::date, true),
  ('d8300000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'Jose', 'Reyes', 'j.reyes@school.example', 'Math Teacher', 'Mathematics', 'permanent', '2019-06-03'::date, true),
  ('d8300000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'Ana', 'Cruz', 'a.cruz@school.example', 'Science Teacher', 'Science', 'permanent', '2020-08-10'::date, true),
  ('d8300000-0000-0000-0000-000000000004'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'Pedro', 'Bautista', 'p.bautista@school.example', 'English Teacher', 'English', 'probationary', '2025-06-02'::date, true),
  ('d8300000-0000-0000-0000-000000000005'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 'Grace', 'Lim', 'g.lim@school.example', 'Registrar', 'Registrar', 'permanent', '2017-05-15'::date, true),
  ('d8300000-0000-0000-0000-000000000006'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 'Ramon', 'Villanueva', 'r.villanueva@school.example', 'Filipino Teacher', 'Filipino', 'permanent', '2021-06-07'::date, true)
) AS v
WHERE NOT EXISTS (SELECT 1 FROM "employees" WHERE "tenantId" = '10000000-0000-0000-0000-000000000001'::uuid);

-- Draft welcome announcement
INSERT INTO "announcements" ("id", "tenantId", "title", "body", "audienceType", "channel", "createdBy")
SELECT 'd8400000-0000-0000-0000-000000000001'::uuid,
       '10000000-0000-0000-0000-000000000001'::uuid,
       'Welcome to S.Y. 2026-2027!',
       'Classes start on August 24. Please settle enrollment balances and claim your books at the Main Campus bookstore.',
       'all',
       'sms,email,push',
       'system'
WHERE NOT EXISTS (SELECT 1 FROM "announcements" WHERE "tenantId" = '10000000-0000-0000-0000-000000000001'::uuid);

COMMIT;
