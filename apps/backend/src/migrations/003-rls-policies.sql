-- ============================================================
-- 003 — Tenant isolation RLS policies
-- ============================================================
-- One `tenant_isolation_<table>` policy per tenant-scoped table.
--
-- Rewritten as a loop. The previous version spelled out 103
-- ALTER TABLE … ENABLE ROW LEVEL SECURITY / CREATE POLICY pairs by hand with no
-- DROP POLICY IF EXISTS, so it was not re-runnable, and it aborted part-way
-- through on three tables that have no `"tenantId"` column:
--
--   role_permissions  (join table: roleId + permissionId)
--   tenant_plans      (global plan catalog)
--   tenants           (scoped by `id`)
--
-- Because the file aborted at `role_permissions` — alphabetically midway — only
-- 80 of the 103 policies ever existed in a deployed database; 013 had to
-- backfill them. Those three tables are handled below.
--
-- 012-hardening-rls-and-or-race.sql, 013-platform-admin-rls.sql and
-- 014-rls-platform-admin-role-gate.sql refine a subset of these policies by
-- dropping and recreating them with the platform-admin role gate; this file must
-- keep running first. Idempotent.
-- ============================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'ad_hoc_sale_items', 'ad_hoc_sales', 'announcements',
      'applicant_stage_configs', 'applicant_stage_transitions', 'atp_series',
      'attendance_config', 'attendance_excuses',
      'attendance_notification_thresholds', 'attendance_records', 'audit_events',
      'behavior_incidents', 'branches', 'buildings', 'calendar_events',
      'cashier_sessions', 'cashier_stations', 'channel_configs',
      'class_offerings', 'curricula', 'curriculum_subjects',
      'custom_field_definitions', 'denomination_sets', 'departments',
      'discount_types', 'document_requests', 'document_templates', 'dtr_records',
      'education_levels', 'employees', 'enrollment_holds', 'enrollments',
      'faculty_load_limits', 'feature_flags', 'fee_structure_items',
      'fee_structures', 'fee_types', 'floors', 'generated_documents',
      'grade_change_requests', 'grade_components', 'grade_entries',
      'grade_levels', 'grading_systems', 'guardians', 'health_records',
      'honor_roll_configs', 'installment_schedules', 'invoice_items',
      'invoices', 'lookup_items', 'lookup_lists', 'message_threads', 'messages',
      'notification_logs', 'notification_rules', 'notification_templates',
      'numbering_schemes', 'official_receipts', 'payment_allocations',
      'payment_methods', 'payment_plans', 'payments', 'penalty_rules',
      'permanent_records', 'programs', 'promotion_decisions', 'rebac_edges',
      'refunds', 'report_templates', 'roles', 'room_assets', 'rooms',
      'scheduled_reports', 'school_calendars', 'school_years',
      'section_assignment_rules', 'sections', 'series_counters', 'strands',
      'student_discount_grants', 'student_documents', 'student_guardians',
      'student_merge_audit', 'student_schedules',
      'student_section_assignments', 'student_transfers', 'students',
      'subjects', 'teaching_loads', 'terms', 'tracks', 'user_person_links',
      'user_roles', 'user_sessions', 'users', 'withdrawal_policies',
      'workflow_approvals', 'workflow_definitions', 'workflow_instances'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_%s ON %I', t, t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation_%s ON %I AS PERMISSIVE '
      || 'USING ((("tenantId")::text = current_setting(''app.current_tenant_id''::text)))',
      t,
      t
    );
  END LOOP;
END $$;

-- ------------------------------------------------------------------
-- RLS without a `"tenantId"`-scoped policy
-- ------------------------------------------------------------------
-- These tables cannot express a tenant filter, so RLS is enabled with no
-- policy: only the table owner and the application role read them. This matches
-- the deployed schema.
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_plans ENABLE ROW LEVEL SECURITY;

-- `tenants` is scoped by `id`. The policy itself is created by
-- 004-phase1-fixes.sql (guarded) and replaced by 013-platform-admin-rls.sql
-- with the platform-admin gate.
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
