-- ============================================================
-- 013: Platform Admin RLS bypass + platform permissions
-- ============================================================
-- Adds `app.is_platform_admin` GUC support to all tenant_isolation_*
-- policies so Platform Super Admin can see/manage all tenants.
-- Also seeds platform-level permissions (platform.tenant:*) and
-- assigns them to the Platform Super Admin role.
--
-- PostgreSQL does not support CREATE OR REPLACE POLICY, so we DROP
-- then CREATE. This is safe because we're re-creating the same policy
-- name with an expanded USING clause.

-- Helper macro: each policy gets the platform admin bypass appended.
-- Pattern: USING (original_condition OR current_setting('app.is_platform_admin', true)::boolean = true)

-- ============================================================
-- 1. Tenancy tables
-- ============================================================

DROP POLICY IF EXISTS tenant_isolation_tenants ON tenants;
CREATE POLICY tenant_isolation_tenants ON tenants
  USING (
    id = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_branches ON branches;
CREATE POLICY tenant_isolation_branches ON branches
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_departments ON departments;
CREATE POLICY tenant_isolation_departments ON departments
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

-- ============================================================
-- 2. IAM tables
-- ============================================================

DROP POLICY IF EXISTS tenant_isolation_users ON users;
CREATE POLICY tenant_isolation_users ON users
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_roles ON roles;
CREATE POLICY tenant_isolation_roles ON roles
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_user_roles ON user_roles;
CREATE POLICY tenant_isolation_user_roles ON user_roles
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_rebac_edges ON rebac_edges;
CREATE POLICY tenant_isolation_rebac_edges ON rebac_edges
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

-- ============================================================
-- 3. Config tables
-- ============================================================

DROP POLICY IF EXISTS tenant_isolation_lookup_lists ON lookup_lists;
CREATE POLICY tenant_isolation_lookup_lists ON lookup_lists
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_lookup_items ON lookup_items;
CREATE POLICY tenant_isolation_lookup_items ON lookup_items
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_custom_field_definitions ON custom_field_definitions;
CREATE POLICY tenant_isolation_custom_field_definitions ON custom_field_definitions
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_feature_flags ON feature_flags;
CREATE POLICY tenant_isolation_feature_flags ON feature_flags
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_numbering_schemes ON numbering_schemes;
CREATE POLICY tenant_isolation_numbering_schemes ON numbering_schemes
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_audit_events ON audit_events;
CREATE POLICY tenant_isolation_audit_events ON audit_events
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

-- ============================================================
-- 4. Facility tables
-- ============================================================

DROP POLICY IF EXISTS tenant_isolation_buildings ON buildings;
CREATE POLICY tenant_isolation_buildings ON buildings
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_floors ON floors;
CREATE POLICY tenant_isolation_floors ON floors
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_rooms ON rooms;
CREATE POLICY tenant_isolation_rooms ON rooms
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_room_assets ON room_assets;
CREATE POLICY tenant_isolation_room_assets ON room_assets
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

-- ============================================================
-- 5. Academic tables
-- ============================================================

DROP POLICY IF EXISTS tenant_isolation_grade_levels ON grade_levels;
CREATE POLICY tenant_isolation_grade_levels ON grade_levels
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_school_years ON school_years;
CREATE POLICY tenant_isolation_school_years ON school_years
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_terms ON terms;
CREATE POLICY tenant_isolation_terms ON terms
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_tracks ON tracks;
CREATE POLICY tenant_isolation_tracks ON tracks
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_strands ON strands;
CREATE POLICY tenant_isolation_strands ON strands
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_programs ON programs;
CREATE POLICY tenant_isolation_programs ON programs
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_subjects ON subjects;
CREATE POLICY tenant_isolation_subjects ON subjects
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_curricula ON curricula;
CREATE POLICY tenant_isolation_curricula ON curricula
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_curriculum_subjects ON curriculum_subjects;
CREATE POLICY tenant_isolation_curriculum_subjects ON curriculum_subjects
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_grading_systems ON grading_systems;
CREATE POLICY tenant_isolation_grading_systems ON grading_systems
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_grade_components ON grade_components;
CREATE POLICY tenant_isolation_grade_components ON grade_components
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_honor_roll_configs ON honor_roll_configs;
CREATE POLICY tenant_isolation_honor_roll_configs ON honor_roll_configs
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

-- ============================================================
-- 6. SIS tables
-- ============================================================

DROP POLICY IF EXISTS tenant_isolation_students ON students;
CREATE POLICY tenant_isolation_students ON students
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_guardians ON guardians;
CREATE POLICY tenant_isolation_guardians ON guardians
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_student_guardians ON student_guardians;
CREATE POLICY tenant_isolation_student_guardians ON student_guardians
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_enrollments ON enrollments;
CREATE POLICY tenant_isolation_enrollments ON enrollments
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_sections ON sections;
CREATE POLICY tenant_isolation_sections ON sections
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_enrollment_holds ON enrollment_holds;
CREATE POLICY tenant_isolation_enrollment_holds ON enrollment_holds
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_student_documents ON student_documents;
CREATE POLICY tenant_isolation_student_documents ON student_documents
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_student_section_assignments ON student_section_assignments;
CREATE POLICY tenant_isolation_student_section_assignments ON student_section_assignments
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_promotion_decisions ON promotion_decisions;
CREATE POLICY tenant_isolation_promotion_decisions ON promotion_decisions
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_student_transfers ON student_transfers;
CREATE POLICY tenant_isolation_student_transfers ON student_transfers
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_student_merge_audit ON student_merge_audit;
CREATE POLICY tenant_isolation_student_merge_audit ON student_merge_audit
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_behavior_incidents ON behavior_incidents;
CREATE POLICY tenant_isolation_behavior_incidents ON behavior_incidents
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_health_records ON health_records;
CREATE POLICY tenant_isolation_health_records ON health_records
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_applicant_stage_configs ON applicant_stage_configs;
CREATE POLICY tenant_isolation_applicant_stage_configs ON applicant_stage_configs
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_applicant_stage_transitions ON applicant_stage_transitions;
CREATE POLICY tenant_isolation_applicant_stage_transitions ON applicant_stage_transitions
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS tenant_isolation_section_assignment_rules ON section_assignment_rules;
CREATE POLICY tenant_isolation_section_assignment_rules ON section_assignment_rules
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

-- ============================================================
-- 7. Business tables (double-quoted names from newer migrations)
-- ============================================================

DROP POLICY IF EXISTS "tenant_isolation_cashier_sessions" ON "cashier_sessions";
CREATE POLICY "tenant_isolation_cashier_sessions" ON "cashier_sessions"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_ad_hoc_sales" ON "ad_hoc_sales";
CREATE POLICY "tenant_isolation_ad_hoc_sales" ON "ad_hoc_sales"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_ad_hoc_sale_items" ON "ad_hoc_sale_items";
CREATE POLICY "tenant_isolation_ad_hoc_sale_items" ON "ad_hoc_sale_items"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_discount_types" ON "discount_types";
CREATE POLICY "tenant_isolation_discount_types" ON "discount_types"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_announcements" ON "announcements";
CREATE POLICY "tenant_isolation_announcements" ON "announcements"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_atp_series" ON "atp_series";
CREATE POLICY "tenant_isolation_atp_series" ON "atp_series"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_channel_configs" ON "channel_configs";
CREATE POLICY "tenant_isolation_channel_configs" ON "channel_configs"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_attendance_config" ON "attendance_config";
CREATE POLICY "tenant_isolation_attendance_config" ON "attendance_config"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_attendance_excuses" ON "attendance_excuses";
CREATE POLICY "tenant_isolation_attendance_excuses" ON "attendance_excuses"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_attendance_records" ON "attendance_records";
CREATE POLICY "tenant_isolation_attendance_records" ON "attendance_records"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_attendance_notification_thresholds" ON "attendance_notification_thresholds";
CREATE POLICY "tenant_isolation_attendance_notification_thresholds" ON "attendance_notification_thresholds"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_applicants" ON "applicants";
CREATE POLICY "tenant_isolation_applicants" ON "applicants"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_education_levels" ON "education_levels";
CREATE POLICY "tenant_isolation_education_levels" ON "education_levels"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_invoices" ON "invoices";
CREATE POLICY "tenant_isolation_invoices" ON "invoices"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_fee_types" ON "fee_types";
CREATE POLICY "tenant_isolation_fee_types" ON "fee_types"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_fee_structures" ON "fee_structures";
CREATE POLICY "tenant_isolation_fee_structures" ON "fee_structures"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_payment_plans" ON "payment_plans";
CREATE POLICY "tenant_isolation_payment_plans" ON "payment_plans"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_penalty_rules" ON "penalty_rules";
CREATE POLICY "tenant_isolation_penalty_rules" ON "penalty_rules"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_withdrawal_policies" ON "withdrawal_policies";
CREATE POLICY "tenant_isolation_withdrawal_policies" ON "withdrawal_policies"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_scheduled_reports" ON "scheduled_reports";
CREATE POLICY "tenant_isolation_scheduled_reports" ON "scheduled_reports"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_document_templates" ON "document_templates";
CREATE POLICY "tenant_isolation_document_templates" ON "document_templates"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_document_requests" ON "document_requests";
CREATE POLICY "tenant_isolation_document_requests" ON "document_requests"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_employee" ON "employees";
CREATE POLICY "tenant_isolation_employee" ON "employees"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_dtr_records" ON "dtr_records";
CREATE POLICY "tenant_isolation_dtr_records" ON "dtr_records"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_teaching_loads" ON "teaching_loads";
CREATE POLICY "tenant_isolation_teaching_loads" ON "teaching_loads"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_class_offerings" ON "class_offerings";
CREATE POLICY "tenant_isolation_class_offerings" ON "class_offerings"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_calendar_events" ON "calendar_events";
CREATE POLICY "tenant_isolation_calendar_events" ON "calendar_events"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_grade_change_requests" ON "grade_change_requests";
CREATE POLICY "tenant_isolation_grade_change_requests" ON "grade_change_requests"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_grade_entries" ON "grade_entries";
CREATE POLICY "tenant_isolation_grade_entries" ON "grade_entries"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_message_threads" ON "message_threads";
CREATE POLICY "tenant_isolation_message_threads" ON "message_threads"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_notification_templates" ON "notification_templates";
CREATE POLICY "tenant_isolation_notification_templates" ON "notification_templates"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_invoice_items" ON "invoice_items";
CREATE POLICY "tenant_isolation_invoice_items" ON "invoice_items"
  USING (
    "tenantId"::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_workflow_definitions" ON "workflow_definitions";
CREATE POLICY "tenant_isolation_workflow_definitions" ON "workflow_definitions"
  USING (
    "tenantId" = current_setting('app.current_tenant_id')::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_workflow_instances" ON "workflow_instances";
CREATE POLICY "tenant_isolation_workflow_instances" ON "workflow_instances"
  USING (
    "tenantId" = current_setting('app.current_tenant_id')::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

DROP POLICY IF EXISTS "tenant_isolation_workflow_approvals" ON "workflow_approvals";
CREATE POLICY "tenant_isolation_workflow_approvals" ON "workflow_approvals"
  USING (
    "tenantId" = current_setting('app.current_tenant_id')::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );

-- ============================================================
-- 8. Seed platform-level permissions
-- ============================================================

INSERT INTO permissions (id, resource, action, description) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'platform.tenant', 'view', 'View all tenants (platform)'),
  ('f0000000-0000-0000-0000-000000000002', 'platform.tenant', 'create', 'Create new tenants (platform)'),
  ('f0000000-0000-0000-0000-000000000003', 'platform.tenant', 'edit', 'Edit any tenant (platform)'),
  ('f0000000-0000-0000-0000-000000000004', 'platform.tenant', 'delete', 'Delete tenants (platform)'),
  ('f0000000-0000-0000-0000-000000000005', 'platform.tenant', 'clone', 'Clone a tenant (platform)'),
  ('f0000000-0000-0000-0000-000000000006', 'platform.user', 'view', 'View all users across tenants (platform)'),
  ('f0000000-0000-0000-0000-000000000007', 'platform.user', 'create', 'Create users in any tenant (platform)'),
  ('f0000000-0000-0000-0000-000000000008', 'platform.user', 'edit', 'Edit users in any tenant (platform)'),
  ('f0000000-0000-0000-0000-000000000009', 'platform.user', 'assign_role', 'Assign roles to users across tenants (platform)'),
  ('f0000000-0000-0000-0000-000000000010', 'platform.impersonate', 'impersonate', 'Impersonate any tenant (platform)'),
  ('f0000000-0000-0000-0000-000000000011', 'platform.dashboard', 'view', 'View platform dashboard (cross-tenant summary)')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 9. Assign platform permissions to Platform Super Admin + Support roles
-- ============================================================

INSERT INTO role_permissions ("roleId", "permissionId") VALUES
  ('b0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002'),
  ('b0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000003'),
  ('b0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000004'),
  ('b0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000005'),
  ('b0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000006'),
  ('b0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000007'),
  ('b0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000008'),
  ('b0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000009'),
  ('b0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000010'),
  ('b0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000011'),
  ('b0000000-0000-0000-0000-000000000013', 'f0000000-0000-0000-0000-000000000006'),
  ('b0000000-0000-0000-0000-000000000013', 'f0000000-0000-0000-0000-000000000010')
ON CONFLICT DO NOTHING;
