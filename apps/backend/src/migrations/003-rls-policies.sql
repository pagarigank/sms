-- ============================================================
-- Migration 003: Create RLS policies for all tables
-- ============================================================

-- Enable RLS on all tenant-scoped tables and create policies

-- ad_hoc_sale_items
ALTER TABLE ad_hoc_sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_ad_hoc_sale_items ON ad_hoc_sale_items
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- ad_hoc_sales
ALTER TABLE ad_hoc_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_ad_hoc_sales ON ad_hoc_sales
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- announcements
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_announcements ON announcements
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- applicant_stage_configs
ALTER TABLE applicant_stage_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_applicant_stage_configs ON applicant_stage_configs
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- applicant_stage_transitions
ALTER TABLE applicant_stage_transitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_applicant_stage_transitions ON applicant_stage_transitions
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- atp_series
ALTER TABLE atp_series ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_atp_series ON atp_series
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- attendance_config
ALTER TABLE attendance_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_attendance_config ON attendance_config
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- attendance_excuses
ALTER TABLE attendance_excuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_attendance_excuses ON attendance_excuses
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- attendance_notification_thresholds
ALTER TABLE attendance_notification_thresholds ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_attendance_notification_thresholds ON attendance_notification_thresholds
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- attendance_records
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_attendance_records ON attendance_records
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- audit_events
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_audit_events ON audit_events
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- behavior_incidents
ALTER TABLE behavior_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_behavior_incidents ON behavior_incidents
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- branches
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_branches ON branches
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- buildings
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_buildings ON buildings
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- calendar_events
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_calendar_events ON calendar_events
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- cashier_sessions
ALTER TABLE cashier_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_cashier_sessions ON cashier_sessions
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- cashier_stations
ALTER TABLE cashier_stations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_cashier_stations ON cashier_stations
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- channel_configs
ALTER TABLE channel_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_channel_configs ON channel_configs
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- class_offerings
ALTER TABLE class_offerings ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_class_offerings ON class_offerings
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- curricula
ALTER TABLE curricula ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_curricula ON curricula
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- curriculum_subjects
ALTER TABLE curriculum_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_curriculum_subjects ON curriculum_subjects
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- custom_field_definitions
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_custom_field_definitions ON custom_field_definitions
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- denomination_sets
ALTER TABLE denomination_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_denomination_sets ON denomination_sets
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- departments
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_departments ON departments
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- discount_types
ALTER TABLE discount_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_discount_types ON discount_types
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- document_requests
ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_document_requests ON document_requests
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- document_templates
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_document_templates ON document_templates
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- dtr_records
ALTER TABLE dtr_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_dtr_records ON dtr_records
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- education_levels
ALTER TABLE education_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_education_levels ON education_levels
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- employees
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_employees ON employees
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- enrollment_holds
ALTER TABLE enrollment_holds ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_enrollment_holds ON enrollment_holds
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- enrollments
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_enrollments ON enrollments
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- faculty_load_limits
ALTER TABLE faculty_load_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_faculty_load_limits ON faculty_load_limits
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- feature_flags
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_feature_flags ON feature_flags
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- fee_structure_items
ALTER TABLE fee_structure_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_fee_structure_items ON fee_structure_items
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- fee_structures
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_fee_structures ON fee_structures
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- fee_types
ALTER TABLE fee_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_fee_types ON fee_types
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- floors
ALTER TABLE floors ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_floors ON floors
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- generated_documents
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_generated_documents ON generated_documents
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- grade_change_requests
ALTER TABLE grade_change_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_grade_change_requests ON grade_change_requests
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- grade_components
ALTER TABLE grade_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_grade_components ON grade_components
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- grade_entries
ALTER TABLE grade_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_grade_entries ON grade_entries
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- grade_levels
ALTER TABLE grade_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_grade_levels ON grade_levels
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- grading_systems
ALTER TABLE grading_systems ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_grading_systems ON grading_systems
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- guardians
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_guardians ON guardians
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- health_records
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_health_records ON health_records
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- honor_roll_configs
ALTER TABLE honor_roll_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_honor_roll_configs ON honor_roll_configs
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- installment_schedules
ALTER TABLE installment_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_installment_schedules ON installment_schedules
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- invoice_items
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_invoice_items ON invoice_items
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_invoices ON invoices
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- lookup_items
ALTER TABLE lookup_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_lookup_items ON lookup_items
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- lookup_lists
ALTER TABLE lookup_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_lookup_lists ON lookup_lists
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- message_threads
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_message_threads ON message_threads
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_messages ON messages
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- notification_logs
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_notification_logs ON notification_logs
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- notification_rules
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_notification_rules ON notification_rules
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- notification_templates
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_notification_templates ON notification_templates
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- numbering_schemes
ALTER TABLE numbering_schemes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_numbering_schemes ON numbering_schemes
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- official_receipts
ALTER TABLE official_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_official_receipts ON official_receipts
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- payment_allocations
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_payment_allocations ON payment_allocations
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- payment_methods
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_payment_methods ON payment_methods
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- payment_plans
ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_payment_plans ON payment_plans
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_payments ON payments
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- penalty_rules
ALTER TABLE penalty_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_penalty_rules ON penalty_rules
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- permanent_records
ALTER TABLE permanent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_permanent_records ON permanent_records
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- programs
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_programs ON programs
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- promotion_decisions
ALTER TABLE promotion_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_promotion_decisions ON promotion_decisions
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- rebac_edges
ALTER TABLE rebac_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_rebac_edges ON rebac_edges
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- refunds
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_refunds ON refunds
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- report_templates
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_report_templates ON report_templates
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- role_permissions
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_role_permissions ON role_permissions
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- roles
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_roles ON roles
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- room_assets
ALTER TABLE room_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_room_assets ON room_assets
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- rooms
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_rooms ON rooms
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- scheduled_reports
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_scheduled_reports ON scheduled_reports
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- school_calendars
ALTER TABLE school_calendars ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_school_calendars ON school_calendars
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- school_years
ALTER TABLE school_years ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_school_years ON school_years
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- section_assignment_rules
ALTER TABLE section_assignment_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_section_assignment_rules ON section_assignment_rules
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- sections
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_sections ON sections
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- series_counters
ALTER TABLE series_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_series_counters ON series_counters
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- strands
ALTER TABLE strands ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_strands ON strands
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- student_discount_grants
ALTER TABLE student_discount_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_student_discount_grants ON student_discount_grants
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- student_documents
ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_student_documents ON student_documents
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- student_guardians
ALTER TABLE student_guardians ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_student_guardians ON student_guardians
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- student_merge_audit
ALTER TABLE student_merge_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_student_merge_audit ON student_merge_audit
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- student_schedules
ALTER TABLE student_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_student_schedules ON student_schedules
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- student_section_assignments
ALTER TABLE student_section_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_student_section_assignments ON student_section_assignments
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- student_transfers
ALTER TABLE student_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_student_transfers ON student_transfers
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_students ON students
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- subjects
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_subjects ON subjects
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- teaching_loads
ALTER TABLE teaching_loads ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_teaching_loads ON teaching_loads
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- tenant_plans
ALTER TABLE tenant_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_tenant_plans ON tenant_plans
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_tenants ON tenants
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- terms
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_terms ON terms
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- tracks
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_tracks ON tracks
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- user_person_links
ALTER TABLE user_person_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_user_person_links ON user_person_links
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_user_roles ON user_roles
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_user_sessions ON user_sessions
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_users ON users
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- withdrawal_policies
ALTER TABLE withdrawal_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_withdrawal_policies ON withdrawal_policies
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- workflow_approvals
ALTER TABLE workflow_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_workflow_approvals ON workflow_approvals
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- workflow_definitions
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_workflow_definitions ON workflow_definitions
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));

-- workflow_instances
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_workflow_instances ON workflow_instances
  USING ("tenantId"::text = current_setting('app.current_tenant_id'));
