-- 011: guardian-portal reconciliation + Phase 9 demo seed.
--
-- Schema:
--   * guardians.userId (uuid, nullable) — links a guardian profile to its
--     portal login user. Phase 9 audit found NO link existed, making
--     "my children" unresolvable (the portal fell back to listing ALL
--     students tenant-wide — a privacy leak).
--   * message_threads.participantIds (jsonb array of users.id) — implements
--     tables.md gap B9.2 (message_thread_participants) in-application so
--     getThreads can scope threads per user instead of leaking all tenant
--     threads to every guardian.
--   * message_threads.subject/createdBy asserted varchar to match entities
--     (entity previously typed subject as uuid — would crash synchronize).
--
-- Seed (all fixed ids, idempotent):
--   guardian login user guardian@demo-school.ph / admin123
--   guardian profile + 2 children (Ava & Noah Villanueva, Grade 8)
--   1 section, 4 class offerings, 2 enrollments + section assignments
--   24 grade entries (2 students x 4 subjects x 3 components)
--   20 attendance records (Term 1, August 2026)
--   2 invoices + 4 invoice items (one partially paid)
--   2 message threads with replies

-- ============================================================
-- 1. Schema reconciliation
-- ============================================================
ALTER TABLE guardians ADD COLUMN IF NOT EXISTS "userId" uuid;
CREATE INDEX IF NOT EXISTS idx_guardians_user ON guardians ("userId");

ALTER TABLE message_threads ADD COLUMN IF NOT EXISTS "participantIds" jsonb NOT NULL DEFAULT '[]';
ALTER TABLE message_threads ALTER COLUMN "subject" TYPE varchar;
ALTER TABLE message_threads ALTER COLUMN "createdBy" TYPE varchar;

-- ============================================================
-- 2. Guardian login user + profile
-- (password: admin123 — same bcrypt hash as migration 004 users)
-- ============================================================
INSERT INTO users ("id", "tenantId", "email", "phone", "passwordHash", "firstName", "lastName", "status", "mfaEnabled")
VALUES (
  '40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001',
  'guardian@demo-school.ph', '+63 917 000 0004',
  '$2b$10$FpIm5LpCw8JdyIL0FdYTxe3Of.PaagHgBZbpJfadwgmYDwwuXRU8C',
  'Patricia', 'Villanueva', 'active', false
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO guardians ("id", "tenantId", "userId", "firstName", "lastName", "email", "contactNumber", "relationshipToStudent")
VALUES (
  '99000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000004',
  'Patricia', 'Villanueva', 'guardian@demo-school.ph', '+63 917 000 0004', 'Mother'
) ON CONFLICT ("id") DO NOTHING;

-- ============================================================
-- 3. Students (2 children)
-- ============================================================
INSERT INTO students ("id", "tenantId", "branchId", "lrn", "studentNumber", "firstName", "middleName", "lastName", "sex", "birthDate", "status") VALUES
  ('55000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   '136000100001', '2026-0001', 'Ava', 'P.', 'Villanueva', 'Female', '2012-05-14', 'active'),
  ('55000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   '136000100002', '2026-0002', 'Noah', 'P.', 'Villanueva', 'Male', '2013-09-02', 'active')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO student_guardians ("id", "tenantId", "studentId", "guardianId", "relationship", "isPrimary", "isEmergencyContact", "canReceiveNotifications") VALUES
  ('99000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', '55000000-0000-0000-0000-000000000001', '99000000-0000-0000-0000-000000000001', 'Mother', true, true, true),
  ('99000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000001', '55000000-0000-0000-0000-000000000002', '99000000-0000-0000-0000-000000000001', 'Mother', true, true, true)
ON CONFLICT ("id") DO NOTHING;

-- ============================================================
-- 4. Section + enrollments + section assignments
-- Grade 8 (grade level b0...0021, curriculum ec0...0005), SY 2026-2027
-- NOTE: gradeLevelId must be a grade_levels row (b0...0021 = Grade 8).
-- f0...0003 is an EDUCATION-LEVEL id (Junior High School) — using it here
-- silently broke every grade-name join for these rows (fixed in 024).
-- ============================================================
INSERT INTO sections ("id", "tenantId", "branchId", "schoolYearId", "gradeLevelId", "name", "capacity", "isActive", "adviserEmployeeId", "homeroom") VALUES
  ('77000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000021', 'Grade 8 - Sampaguita', 40, true,
   'd8300000-0000-0000-0000-000000000001', 'Room 101')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO enrollments ("id", "tenantId", "branchId", "studentId", "schoolYearId", "curriculumId", "sectionId", "gradeLevelId", "status") VALUES
  ('66000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   '55000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'ec000000-0000-0000-0000-000000000005',
   '77000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000021', 'enrolled'),
  ('66000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   '55000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'ec000000-0000-0000-0000-000000000005',
   '77000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000021', 'enrolled')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO student_section_assignments ("id", "tenantId", "enrollmentId", "sectionId", "studentId", "isActive") VALUES
  ('98000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', '66000000-0000-0000-0000-000000000001', '77000000-0000-0000-0000-000000000001', '55000000-0000-0000-0000-000000000001', true),
  ('98000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000001', '66000000-0000-0000-0000-000000000002', '77000000-0000-0000-0000-000000000001', '55000000-0000-0000-0000-000000000002', true)
ON CONFLICT ("id") DO NOTHING;

-- ============================================================
-- 5. Class offerings (4 subjects, Term 1)
-- ============================================================
INSERT INTO class_offerings ("id", "tenantId", "branchId", "schoolYearId", "termId", "sectionId", "subjectId", "facultyEmployeeId", "units", "hoursPerWeek") VALUES
  ('88000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000101', '77000000-0000-0000-0000-000000000001',
   'b1000000-0000-0000-0000-000000000002', 'd8300000-0000-0000-0000-000000000002', 3, 4),
  ('88000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000101', '77000000-0000-0000-0000-000000000001',
   'b1000000-0000-0000-0000-000000000003', 'd8300000-0000-0000-0000-000000000003', 3, 4),
  ('88000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000101', '77000000-0000-0000-0000-000000000001',
   'b1000000-0000-0000-0000-000000000023', 'd8300000-0000-0000-0000-000000000003', 3, 4),
  ('88000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000101', '77000000-0000-0000-0000-000000000001',
   'b1000000-0000-0000-0000-000000000001', 'd8300000-0000-0000-0000-000000000002', 3, 4)
ON CONFLICT ("id") DO NOTHING;

-- ============================================================
-- 6. Grade entries (student x offering x 3 components)
-- percentage -> transmuted per component; matching the school's 3-component
-- grading system seeded as d0...0011/0012/0013.
-- ============================================================
INSERT INTO grade_entries ("id", "tenantId", "studentId", "enrollmentId", "classOfferingId", "gradingSystemId", "gradeComponentId", "termId", "rawScore", "maxScore", "percentage", "transmutedGrade", "isFinalized")
SELECT
  gen_random_uuid(),
  '10000000-0000-0000-0000-000000000001',
  v.student_id::uuid, v.enroll_id::uuid, v.offering_id::uuid,
  'd0000000-0000-0000-0000-000000000001', gc.id,
  'a0000000-0000-0000-0000-000000000101',
  v.pct, 100, v.pct, v.transmuted, true
FROM (VALUES
  ('55000000-0000-0000-0000-000000000001', '66000000-0000-0000-0000-000000000001', '88000000-0000-0000-0000-000000000001', 90, 93),
  ('55000000-0000-0000-0000-000000000001', '66000000-0000-0000-0000-000000000001', '88000000-0000-0000-0000-000000000002', 85, 89),
  ('55000000-0000-0000-0000-000000000001', '66000000-0000-0000-0000-000000000001', '88000000-0000-0000-0000-000000000003', 88, 91),
  ('55000000-0000-0000-0000-000000000001', '66000000-0000-0000-0000-000000000001', '88000000-0000-0000-0000-000000000004', 92, 95),
  ('55000000-0000-0000-0000-000000000002', '66000000-0000-0000-0000-000000000002', '88000000-0000-0000-0000-000000000001', 93, 96),
  ('55000000-0000-0000-0000-000000000002', '66000000-0000-0000-0000-000000000002', '88000000-0000-0000-0000-000000000002', 78, 85),
  ('55000000-0000-0000-0000-000000000002', '66000000-0000-0000-0000-000000000002', '88000000-0000-0000-0000-000000000003', 82, 88),
  ('55000000-0000-0000-0000-000000000002', '66000000-0000-0000-0000-000000000002', '88000000-0000-0000-0000-000000000004', 87, 92)
) AS v(student_id, enroll_id, offering_id, pct, transmuted)
CROSS JOIN grade_components gc
WHERE gc."gradingSystemId" = 'd0000000-0000-0000-0000-000000000001'
  AND NOT EXISTS (
    SELECT 1 FROM grade_entries ge
    WHERE ge."studentId" = v.student_id::uuid
      AND ge."classOfferingId" = v.offering_id::uuid
      AND ge."gradeComponentId" = gc.id
      AND ge."termId" = 'a0000000-0000-0000-0000-000000000101'
  );

-- ============================================================
-- 7. Attendance records (10 school days, Term 1 August 2026)
-- Ava: 7 present, 1 late, 1 absent, 1 excused -> 80%
-- Noah: 9 present, 1 absent -> 90%
-- ============================================================
INSERT INTO attendance_records ("id", "tenantId", "studentId", "enrollmentId", "sectionId", "classOfferingId", "attendanceDate", "status", "minutesLate")
SELECT
  gen_random_uuid(),
  '10000000-0000-0000-0000-000000000001',
  v.student_id::uuid, v.enroll_id::uuid,
  '77000000-0000-0000-0000-000000000001', '88000000-0000-0000-0000-000000000001',
  v.att_date::date, v.status, v.minutes_late
FROM (VALUES
  ('55000000-0000-0000-0000-000000000001', '66000000-0000-0000-0000-000000000001', '2026-08-03', 'present',  NULL),
  ('55000000-0000-0000-0000-000000000001', '66000000-0000-0000-0000-000000000001', '2026-08-04', 'present',  NULL),
  ('55000000-0000-0000-0000-000000000001', '66000000-0000-0000-0000-000000000001', '2026-08-05', 'present',  NULL),
  ('55000000-0000-0000-0000-000000000001', '66000000-0000-0000-0000-000000000001', '2026-08-06', 'late',     10),
  ('55000000-0000-0000-0000-000000000001', '66000000-0000-0000-0000-000000000001', '2026-08-07', 'present',  NULL),
  ('55000000-0000-0000-0000-000000000001', '66000000-0000-0000-0000-000000000001', '2026-08-10', 'present',  NULL),
  ('55000000-0000-0000-0000-000000000001', '66000000-0000-0000-0000-000000000001', '2026-08-11', 'present',  NULL),
  ('55000000-0000-0000-0000-000000000001', '66000000-0000-0000-0000-000000000001', '2026-08-12', 'absent',   NULL),
  ('55000000-0000-0000-0000-000000000001', '66000000-0000-0000-0000-000000000001', '2026-08-13', 'present',  NULL),
  ('55000000-0000-0000-0000-000000000001', '66000000-0000-0000-0000-000000000001', '2026-08-14', 'excused',  NULL),
  ('55000000-0000-0000-0000-000000000002', '66000000-0000-0000-0000-000000000002', '2026-08-03', 'present',  NULL),
  ('55000000-0000-0000-0000-000000000002', '66000000-0000-0000-0000-000000000002', '2026-08-04', 'present',  NULL),
  ('55000000-0000-0000-0000-000000000002', '66000000-0000-0000-0000-000000000002', '2026-08-05', 'present',  NULL),
  ('55000000-0000-0000-0000-000000000002', '66000000-0000-0000-0000-000000000002', '2026-08-06', 'present',  NULL),
  ('55000000-0000-0000-0000-000000000002', '66000000-0000-0000-0000-000000000002', '2026-08-07', 'present',  NULL),
  ('55000000-0000-0000-0000-000000000002', '66000000-0000-0000-0000-000000000002', '2026-08-10', 'present',  NULL),
  ('55000000-0000-0000-0000-000000000002', '66000000-0000-0000-0000-000000000002', '2026-08-11', 'absent',   NULL),
  ('55000000-0000-0000-0000-000000000002', '66000000-0000-0000-0000-000000000002', '2026-08-12', 'present',  NULL),
  ('55000000-0000-0000-0000-000000000002', '66000000-0000-0000-0000-000000000002', '2026-08-13', 'present',  NULL),
  ('55000000-0000-0000-0000-000000000002', '66000000-0000-0000-0000-000000000002', '2026-08-14', 'present',  NULL)
) AS v(student_id, enroll_id, att_date, status, minutes_late)
WHERE NOT EXISTS (
  SELECT 1 FROM attendance_records ar
  WHERE ar."studentId" = v.student_id::uuid AND ar."attendanceDate" = v.att_date::date
);

-- ============================================================
-- 8. Invoices + items (Ava partially paid, Noah open)
-- ============================================================
INSERT INTO invoices ("id", "tenantId", "branchId", "studentId", "enrollmentId", "termId", "invoiceNumber", "totalAmount", "discountAmount", "paidAmount", "balance", "status", "dueDate") VALUES
  ('62000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   '55000000-0000-0000-0000-000000000001', '66000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000101',
   'INV-2026-0001', 12400, 0, 12400, 0, 'paid', '2026-08-31'),
  ('62000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   '55000000-0000-0000-0000-000000000002', '66000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000101',
   'INV-2026-0002', 12400, 0, 5000, 7400, 'partial', '2026-08-31')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO invoice_items ("id", "tenantId", "invoiceId", "feeTypeId", "description", "amount", "discountAmount") VALUES
  ('63000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'Tuition Fee — Grade 8, Term 1', 10000, 0),
  ('63000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000002', 'Miscellaneous Fee', 2400, 0),
  ('63000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', 'Tuition Fee — Grade 8, Term 1', 10000, 0),
  ('63000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000002', 'Miscellaneous Fee', 2400, 0)
ON CONFLICT ("id") DO NOTHING;

-- ============================================================
-- 9. Message threads + messages (guardian <-> staff)
-- ============================================================
INSERT INTO message_threads ("id", "tenantId", "branchId", "subject", "studentId", "createdBy", "participantIds") VALUES
  ('91000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'Question about Ava''s Math grade', '55000000-0000-0000-0000-000000000001',
   '40000000-0000-0000-0000-000000000004', '["40000000-0000-0000-0000-000000000004","40000000-0000-0000-0000-000000000001"]'::jsonb),
  ('91000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'Noah''s excuse letter for Aug 11', '55000000-0000-0000-0000-000000000002',
   '40000000-0000-0000-0000-000000000004', '["40000000-0000-0000-0000-000000000004","40000000-0000-0000-0000-000000000002"]'::jsonb)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO messages ("id", "tenantId", "threadId", "senderUserId", "body") VALUES
  ('92000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001',
   '40000000-0000-0000-0000-000000000004', 'Good day! I noticed Ava''s Math grade dropped this term. Is there anything we can practice at home?'),
  ('92000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001',
   '40000000-0000-0000-0000-000000000001', 'Hi Ms. Villanueva! She''s doing well overall — extra practice on fractions would help. I''ll send worksheets home this week.'),
  ('92000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000002',
   '40000000-0000-0000-0000-000000000004', 'Hello, Noah was sick last Aug 11 — I''ll submit the doctor''s note to the registrar.'),
  ('92000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000002',
   '40000000-0000-0000-0000-000000000002', 'Thank you for letting us know. The absence will be marked excused once the note is received.')
ON CONFLICT ("id") DO NOTHING;
