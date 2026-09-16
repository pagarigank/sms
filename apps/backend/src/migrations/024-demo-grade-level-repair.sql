-- 024: Repair demo seed drift — gradeLevelId pointing at an education level.
--
-- Migration 011 seeded the demo section (Grade 8 - Sampaguita) and the two
-- demo enrollments with gradeLevelId = f0000000-0000-0000-0000-000000000003,
-- which is the EDUCATION-LEVEL id for Junior High School (migration 005), not
-- a grade level. Real grade_levels rows use the b0000000-... id space
-- (b0...0021 = Grade 8). Any join resolving grade names for these rows
-- silently resolved to NULL (masked by the education-level fallback in the
-- reporting endpoints). 011 itself is corrected in source; this migration
-- repairs databases where the drifted rows were already applied.

-- Only touch rows that actually point at an education level (idempotent).
UPDATE sections
SET "gradeLevelId" = 'b0000000-0000-0000-0000-000000000021'
WHERE "id" = '77000000-0000-0000-0000-000000000001'
  AND "gradeLevelId" = 'f0000000-0000-0000-0000-000000000003'
  AND EXISTS (SELECT 1 FROM grade_levels WHERE "id" = 'b0000000-0000-0000-0000-000000000021');

UPDATE enrollments
SET "gradeLevelId" = 'b0000000-0000-0000-0000-000000000021'
WHERE "id" IN ('66000000-0000-0000-0000-000000000001', '66000000-0000-0000-0000-000000000002')
  AND "gradeLevelId" = 'f0000000-0000-0000-0000-000000000003'
  AND EXISTS (SELECT 1 FROM grade_levels WHERE "id" = 'b0000000-0000-0000-0000-000000000021');
