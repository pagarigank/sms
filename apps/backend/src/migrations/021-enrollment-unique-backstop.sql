-- 021: Backstop uniqueness for enrollments.
--
-- The enrollment flow (single create + batch re-enrollment) is transactional
-- with a student-row lock, so application-level duplicate checks can no
-- longer race. This partial unique index is the DB-level safety net: the
-- same student may hold at most one non-terminal enrollment per school year.
--
-- NOTE: this index is ALSO declared on the Enrollment entity (@Index) under
-- the same name. It must stay there: dev servers boot with
-- synchronize:true, which drops any index not present in entity metadata.
--
-- Terminal statuses are excluded: a student who withdrew/transferred/graduated
-- mid-year can legitimately be re-enrolled in the same school year.
-- Active statuses: enrolled | pending.

CREATE UNIQUE INDEX IF NOT EXISTS uq_enrollments_active_per_year
  ON "enrollments" ("tenantId", "studentId", "schoolYearId")
  WHERE "status" IN ('enrolled', 'pending');
