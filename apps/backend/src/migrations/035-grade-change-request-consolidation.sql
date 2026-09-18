-- 035-grade-change-request-consolidation.sql
-- Reconciles the franken grade_change_requests table created by the old
-- camelCase scheduling entity onto the single snake_case canonical shape
-- (tables.md §grade_change_requests / 030 intended DDL), and makes the
-- grading_systems unique index branch-aware for ADR-009.
--
-- Pre-consolidation live shape (0 rows):
--   id, status, tenant_id, branch_id, student_id, class_offering_id,
--   term_id, old_grade, new_grade, grade_entry_id, old_score, new_score,
--   requested_by, approved_by, approved_by_user_id, approved_at, created_at, reason
--
-- target shape (entity grading/entities/grade-change-request.entity.ts):
--   id, tenant_id, branch_id, student_id, class_offering_id, term_id,
--   grade_entry_id, old_grade, new_grade, reason, status, requested_by,
--   approved_by, approved_at, created_at

-- 1. Drop the stale camelCase-era numeric/user-id columns (redundant with
--    old_grade/new_grade JSONB and approved_by/requested_by UUIDs).
ALTER TABLE "grade_change_requests" DROP COLUMN IF EXISTS "old_score";
ALTER TABLE "grade_change_requests" DROP COLUMN IF EXISTS "new_score";
ALTER TABLE "grade_change_requests" DROP COLUMN IF EXISTS "approved_by_user_id";

-- 2. Enforce NOT NULL on the canonical FK columns (was correctly NOT NULL;
--    reaffirmed here so a future TypeORM synchronize pass keeps them).
ALTER TABLE "grade_change_requests"
  ALTER COLUMN "tenant_id" SET NOT NULL,
  ALTER COLUMN "branch_id" SET NOT NULL,
  ALTER COLUMN "student_id" SET NOT NULL,
  ALTER COLUMN "class_offering_id" SET NOT NULL,
  ALTER COLUMN "term_id" SET NOT NULL,
  ALTER COLUMN "reason" SET NOT NULL,
  ALTER COLUMN "new_grade" SET NOT NULL;

-- 3. FK for grade_entry_id (grade entries may be deleted → SET NULL).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_gcr_grade_entry') THEN
    ALTER TABLE "grade_change_requests"
      ADD CONSTRAINT "fk_gcr_grade_entry" FOREIGN KEY ("grade_entry_id")
      REFERENCES "grade_entries"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Make idx_grading_systems_unique branch-aware per ADR-009 so a
--    tenant-default (branch_id NULL) and its branch shadow row can coexist.
--    TypeORM's @Unique('idx_grading_systems_unique') created this as a
--    constraint-backed index, so drop the constraint (drops the index too).
--    (NULLs are distinct in Postgres unique indexes, so multiple tenant
--    defaults for the same edu-level + SY are still guarded at the service
--    layer by resolveGradingSystem's multiple-active error.)
ALTER TABLE "grading_systems" DROP CONSTRAINT IF EXISTS "idx_grading_systems_unique";
DROP INDEX IF EXISTS "idx_grading_systems_unique";
CREATE UNIQUE INDEX "idx_grading_systems_unique"
  ON "grading_systems" ("tenant_id", "education_level_id", "school_year_id", "branch_id");