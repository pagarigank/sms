-- 030-grading-module.sql
-- Implements the grading schema: grading_systems, grade_components, grade_entries, and honor_roll_configs.

CREATE TABLE "grading_systems" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "branch_id" UUID,
  "education_level_id" UUID NOT NULL,
  "school_year_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "config" JSONB DEFAULT '{}',
  "is_active" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE "grading_systems"
  ADD CONSTRAINT "fk_grading_systems_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "fk_grading_systems_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "fk_grading_systems_edulevel" FOREIGN KEY ("education_level_id") REFERENCES "education_levels"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "fk_grading_systems_sy" FOREIGN KEY ("school_year_id") REFERENCES "school_years"("id") ON DELETE CASCADE;

CREATE UNIQUE INDEX "idx_grading_systems_unique" ON "grading_systems" ("tenant_id", "education_level_id", "school_year_id");
CREATE INDEX "idx_grading_systems_tenant_branch" ON "grading_systems" ("tenant_id", "branch_id");
CREATE INDEX "idx_grading_systems_edu_level" ON "grading_systems" ("education_level_id");
CREATE INDEX "idx_grading_systems_active" ON "grading_systems" ("tenant_id", "education_level_id", "school_year_id", "branch_id") WHERE is_active = true;

CREATE TABLE "grade_components" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "grading_system_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "weight" NUMERIC(5,2) NOT NULL,
  "order" INT,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE "grade_components"
  ADD CONSTRAINT "fk_grade_components_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "fk_grade_components_system" FOREIGN KEY ("grading_system_id") REFERENCES "grading_systems"("id") ON DELETE CASCADE;

CREATE INDEX "idx_grade_components_tenant" ON "grade_components" ("tenant_id");
CREATE INDEX "idx_grade_components_grading" ON "grade_components" ("grading_system_id");

CREATE TABLE "grade_entries" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "student_id" UUID NOT NULL,
  "class_offering_id" UUID NOT NULL,
  "term_id" UUID NOT NULL,
  "grade_component_id" UUID NOT NULL,
  "grading_system_id" UUID,
  "enrollment_id" UUID,
  "score" NUMERIC(5,2),
  "max_score" NUMERIC(5,2),
  "percentage" NUMERIC(5,2),
  "transmuted_grade" NUMERIC(5,2),
  "remarks" TEXT,
  "is_manual_override" BOOLEAN DEFAULT false,
  "override_reason" TEXT,
  "overridden_by" UUID,
  "overridden_at" TIMESTAMPTZ,
  "entered_by_user_id" UUID,
  "locked" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE "grade_entries"
  ADD CONSTRAINT "fk_grade_entries_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "fk_grade_entries_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "fk_grade_entries_student" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "fk_grade_entries_class_offering" FOREIGN KEY ("class_offering_id") REFERENCES "class_offerings"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "fk_grade_entries_term" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "fk_grade_entries_component" FOREIGN KEY ("grade_component_id") REFERENCES "grade_components"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "fk_grade_entries_system" FOREIGN KEY ("grading_system_id") REFERENCES "grading_systems"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "fk_grade_entries_enrollment" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "fk_grade_entries_entered_by" FOREIGN KEY ("entered_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "fk_grade_entries_overridden_by" FOREIGN KEY ("overridden_by") REFERENCES "employees"("id") ON DELETE SET NULL;

CREATE INDEX "idx_grade_entries_tenant" ON "grade_entries" ("tenant_id");
CREATE INDEX "idx_grade_entries_student_term" ON "grade_entries" ("tenant_id", "student_id", "term_id");
CREATE INDEX "idx_grade_entries_class_component" ON "grade_entries" ("class_offering_id", "grade_component_id");
CREATE INDEX "idx_grade_entries_term_locked" ON "grade_entries" ("term_id", "locked");

CREATE TABLE "honor_roll_configs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "branch_id" UUID,
  "education_level_id" UUID NOT NULL,
  "school_year_id" UUID NOT NULL,
  "with_honors_threshold" NUMERIC(5,2),
  "with_high_honors_threshold" NUMERIC(5,2),
  "with_highest_honors_threshold" NUMERIC(5,2),
  "is_active" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE "honor_roll_configs"
  ADD CONSTRAINT "fk_honor_roll_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "fk_honor_roll_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "fk_honor_roll_edulevel" FOREIGN KEY ("education_level_id") REFERENCES "education_levels"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "fk_honor_roll_sy" FOREIGN KEY ("school_year_id") REFERENCES "school_years"("id") ON DELETE CASCADE;

CREATE UNIQUE INDEX "idx_honor_roll_unique" ON "honor_roll_configs" ("tenant_id", "education_level_id", "school_year_id");
CREATE INDEX "idx_honor_roll_active" ON "honor_roll_configs" ("tenant_id", "branch_id", "education_level_id", "school_year_id") WHERE is_active = true;

-- Ensure RLS is applied to all new tables
ALTER TABLE "grading_systems" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "grade_components" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "grade_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "honor_roll_configs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_grading_systems ON "grading_systems" USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_grade_components ON "grade_components" USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_grade_entries ON "grade_entries" USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_honor_roll_configs ON "honor_roll_configs" USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);

CREATE TABLE ""grade_change_requests"" (
  ""id"" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ""tenant_id"" UUID NOT NULL,
  ""branch_id"" UUID NOT NULL,
  ""student_id"" UUID NOT NULL,
  ""class_offering_id"" UUID NOT NULL,
  ""term_id"" UUID NOT NULL,
  ""old_grade"" JSONB,
  ""new_grade"" JSONB NOT NULL,
  ""reason"" TEXT NOT NULL,
  ""status"" TEXT DEFAULT 'pending',
  ""requested_by"" UUID,
  ""approved_by"" UUID,
  ""approved_at"" TIMESTAMPTZ,
  ""created_at"" TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ""grade_change_requests""
  ADD CONSTRAINT ""fk_gcr_tenant"" FOREIGN KEY (""tenant_id"") REFERENCES ""tenants""(""id"") ON DELETE CASCADE,
  ADD CONSTRAINT ""fk_gcr_branch"" FOREIGN KEY (""branch_id"") REFERENCES ""branches""(""id"") ON DELETE CASCADE,
  ADD CONSTRAINT ""fk_gcr_student"" FOREIGN KEY (""student_id"") REFERENCES ""students""(""id"") ON DELETE CASCADE,
  ADD CONSTRAINT ""fk_gcr_class_offering"" FOREIGN KEY (""class_offering_id"") REFERENCES ""class_offerings""(""id"") ON DELETE CASCADE,
  ADD CONSTRAINT ""fk_gcr_term"" FOREIGN KEY (""term_id"") REFERENCES ""terms""(""id"") ON DELETE CASCADE,
  ADD CONSTRAINT ""fk_gcr_req_by"" FOREIGN KEY (""requested_by"") REFERENCES ""employees""(""id"") ON DELETE SET NULL,
  ADD CONSTRAINT ""fk_gcr_app_by"" FOREIGN KEY (""approved_by"") REFERENCES ""employees""(""id"") ON DELETE SET NULL;

CREATE INDEX ""idx_grade_change_tenant"" ON ""grade_change_requests"" (""tenant_id"");
CREATE INDEX ""idx_grade_change_student"" ON ""grade_change_requests"" (""student_id"", ""status"");

ALTER TABLE ""grade_change_requests"" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_grade_change_requests ON ""grade_change_requests"" USING (""tenant_id"" = current_setting('app.current_tenant_id', true)::uuid);
