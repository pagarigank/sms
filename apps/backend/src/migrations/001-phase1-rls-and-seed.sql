-- ============================================================
-- Phase 1: Row-Level Security Policies
-- ============================================================
-- Run this AFTER TypeORM synchronize creates the tables.
-- Every tenant-scoped table gets the same RLS pattern.

-- Helper: set tenant context at start of each transaction
-- The application sets this via: SET LOCAL app.current_tenant_id = '<uuid>'

-- === Tenancy ===
ALTER TABLE tenant_plans ENABLE ROW LEVEL SECURITY;
-- tenant_plans is NOT tenant-scoped (global catalog), no RLS needed.

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_tenants ON tenants
  USING (id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_branches ON branches
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_departments ON departments
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- === IAM ===
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_users ON users
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_roles ON roles
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- permissions is global catalog, no RLS.

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_user_roles ON user_roles
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE rebac_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_rebac_edges ON rebac_edges
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- === Config Engine ===
ALTER TABLE lookup_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_lookup_lists ON lookup_lists
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE lookup_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_lookup_items ON lookup_items
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_custom_field_definitions ON custom_field_definitions
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE numbering_schemes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_numbering_schemes ON numbering_schemes
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_feature_flags ON feature_flags
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_audit_events ON audit_events
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- === Education Levels (global per tenant) ===
ALTER TABLE education_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_education_levels ON education_levels
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ============================================================
-- Seed Data: Tenant Plans
-- ============================================================
INSERT INTO tenant_plans (id, plan_key, name, max_branches, max_students, modules, is_active) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'starter', 'Starter', 2, 500, '{"college":false,"offline_pos":false,"reporting":true}', true),
  ('a0000000-0000-0000-0000-000000000002', 'professional', 'Professional', 5, 3000, '{"college":true,"offline_pos":true,"reporting":true}', true),
  ('a0000000-0000-0000-0000-000000000003', 'enterprise', 'Enterprise', NULL, NULL, '{"college":true,"offline_pos":true,"reporting":true}', true)
ON CONFLICT (plan_key) DO NOTHING;

-- ============================================================
-- Seed Data: Default Roles
-- ============================================================
-- These are template roles. Each tenant gets copies on creation.
-- is_system = true means they cannot be deleted by tenant admin.

INSERT INTO roles (id, tenant_id, name, description, is_system) VALUES
  ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'Platform Super Admin', 'Cross-tenant platform administration', true),
  ('b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'Tenant Admin', 'Full tenant administration', true),
  ('b0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'Branch Admin', 'Branch-level administration', true),
  ('b0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'Registrar', 'Admissions, enrollment, records', true),
  ('b0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'Cashier', 'Payment collection and receipting', true),
  ('b0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'Teacher', 'Attendance, gradebook, class records', true),
  ('b0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'Accounting/Finance Officer', 'Fee setup, discounts, AR aging, GL export', true),
  ('b0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'Subject/Program Coordinator', 'Curriculum, class offerings, load assignment', true),
  ('b0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', 'Guidance Counselor', 'Behavior/incident records, referrals', true),
  ('b0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'Nurse', 'Health records, immunization, clinic', true),
  ('b0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'Guardian', 'Parent/guardian portal access', true),
  ('b0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'Student', 'Student self-service portal', true),
  ('b0000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000000', 'Platform Support', 'Cross-tenant support access', true),
  ('b0000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000000', 'DPO', 'Data Protection Officer', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Seed Data: Base Permission Catalog
-- ============================================================
-- Format: resource.action (e.g., billing.invoice:create)

INSERT INTO permissions (id, resource, action, description) VALUES
  -- Tenancy
  ('c0000000-0000-0000-0000-000000000001', 'tenancy.tenant', 'view', 'View tenants'),
  ('c0000000-0000-0000-0000-000000000002', 'tenancy.tenant', 'create', 'Create tenants'),
  ('c0000000-0000-0000-0000-000000000003', 'tenancy.tenant', 'edit', 'Edit tenants'),
  ('c0000000-0000-0000-0000-000000000004', 'tenancy.branch', 'view', 'View branches'),
  ('c0000000-0000-0000-0000-000000000005', 'tenancy.branch', 'create', 'Create branches'),
  ('c0000000-0000-0000-0000-000000000006', 'tenancy.branch', 'edit', 'Edit branches'),
  -- Academic
  ('c0000000-0000-0000-0000-000000000010', 'academic.curriculum', 'view', 'View curricula'),
  ('c0000000-0000-0000-0000-000000000011', 'academic.curriculum', 'create', 'Create curricula'),
  ('c0000000-0000-0000-0000-000000000012', 'academic.curriculum', 'edit', 'Edit curricula'),
  ('c0000000-0000-0000-0000-000000000013', 'academic.subject', 'view', 'View subjects'),
  ('c0000000-0000-0000-0000-000000000014', 'academic.subject', 'create', 'Create subjects'),
  -- SIS
  ('c0000000-0000-0000-0000-000000000020', 'sis.student', 'view', 'View students'),
  ('c0000000-0000-0000-0000-000000000021', 'sis.student', 'create', 'Create students'),
  ('c0000000-0000-0000-0000-000000000022', 'sis.student', 'edit', 'Edit students'),
  ('c0000000-0000-0000-0000-000000000023', 'sis.enrollment', 'view', 'View enrollments'),
  ('c0000000-0000-0000-0000-000000000024', 'sis.enrollment', 'create', 'Create enrollments'),
  -- Billing
  ('c0000000-0000-0000-0000-000000000030', 'billing.invoice', 'view', 'View invoices'),
  ('c0000000-0000-0000-0000-000000000031', 'billing.invoice', 'create', 'Create invoices'),
  ('c0000000-0000-0000-0000-000000000032', 'billing.invoice', 'approve', 'Approve invoices'),
  ('c0000000-0000-0000-0000-000000000033', 'billing.discount', 'view', 'View discounts'),
  ('c0000000-0000-0000-0000-000000000034', 'billing.discount', 'approve', 'Approve discounts'),
  -- Cashiering
  ('c0000000-0000-0000-0000-000000000040', 'cashiering.payment', 'view', 'View payments'),
  ('c0000000-0000-0000-0000-000000000041', 'cashiering.payment', 'create', 'Create payments'),
  ('c0000000-0000-0000-0000-000000000042', 'cashiering.session', 'view', 'View sessions'),
  ('c0000000-0000-0000-0000-000000000043', 'cashiering.session', 'create', 'Open/close sessions'),
  -- Grading
  ('c0000000-0000-0000-0000-000000000050', 'grading.gradebook', 'view', 'View gradebook'),
  ('c0000000-0000-0000-0000-000000000051', 'grading.gradebook', 'edit', 'Enter/edit grades'),
  ('c0000000-0000-0000-0000-000000000052', 'grading.report_card', 'view', 'View report cards'),
  ('c0000000-0000-0000-0000-000000000053', 'grading.report_card', 'approve', 'Approve/finalize report cards'),
  -- Attendance
  ('c0000000-0000-0000-0000-000000000060', 'attendance.record', 'view', 'View attendance'),
  ('c0000000-0000-0000-0000-000000000061', 'attendance.record', 'edit', 'Record attendance'),
  -- Documents
  ('c0000000-0000-0000-0000-000000000070', 'document.template', 'view', 'View templates'),
  ('c0000000-0000-0000-0000-000000000071', 'document.template', 'create', 'Create templates'),
  ('c0000000-0000-0000-0000-000000000072', 'document.request', 'view', 'View document requests'),
  ('c0000000-0000-0000-0000-000000000073', 'document.request', 'approve', 'Release/approve documents'),
  -- Config
  ('c0000000-0000-0000-0000-000000000080', 'config.lookup', 'view', 'View lookup lists'),
  ('c0000000-0000-0000-0000-000000000081', 'config.lookup', 'edit', 'Edit lookup lists'),
  ('c0000000-0000-0000-0000-000000000082', 'config.role', 'view', 'View roles'),
  ('c0000000-0000-0000-0000-000000000083', 'config.role', 'create', 'Create/edit roles'),
  -- Reporting
  ('c0000000-0000-0000-0000-000000000090', 'reporting.dashboard', 'view', 'View dashboards'),
  ('c0000000-0000-0000-0000-000000000091', 'reporting.export', 'export', 'Export reports'),
  -- HR
  ('c0000000-0000-0000-0000-000000000100', 'hr.employee', 'view', 'View employees'),
  ('c0000000-0000-0000-0000-000000000101', 'hr.employee', 'create', 'Create employees'),
  -- Facility
  ('c0000000-0000-0000-0000-000000000110', 'facility.room', 'view', 'View rooms'),
  ('c0000000-0000-0000-0000-000000000111', 'facility.room', 'create', 'Create rooms')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Seed Data: Pilot Lookup Lists
-- ============================================================
-- Room Types
INSERT INTO lookup_lists (id, tenant_id, name, entity_type, is_active) VALUES
  ('d0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'Room Types', 'room_type', true),
  ('d0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'Document Types', 'document_type', true),
  ('d0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'Relationship Types', 'relationship_type', true),
  ('d0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'Discount Types', 'discount_type', true),
  ('d0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'Hold Types', 'hold_type', true),
  ('d0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'Incident Types', 'incident_type', true),
  ('d0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'Health Record Types', 'health_record_type', true),
  ('d0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'Employment Status', 'employment_status', true),
  ('d0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', 'Asset Types', 'asset_type', true),
  ('d0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'Payment Methods', 'payment_method', true)
ON CONFLICT DO NOTHING;

-- Room Types items
INSERT INTO lookup_items (id, tenant_id, lookup_list_id, label, value, sort_order, is_active) VALUES
  ('e0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000001', 'Classroom', 'classroom', 1, true),
  ('e0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000001', 'Laboratory', 'laboratory', 2, true),
  ('e0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000001', 'Gym', 'gym', 3, true),
  ('e0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000001', 'Clinic', 'clinic', 4, true),
  ('e0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000001', 'Office', 'office', 5, true),
  ('e0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000001', 'Cashier Window', 'cashier', 6, true),
  ('e0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000001', 'Canteen', 'canteen', 7, true),
  ('e0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000001', 'Library', 'library', 8, true),
  ('e0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000001', 'Stockroom', 'stockroom', 9, true)
ON CONFLICT DO NOTHING;

-- Relationship Types items
INSERT INTO lookup_items (id, tenant_id, lookup_list_id, label, value, sort_order, is_active) VALUES
  ('e0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000003', 'Mother', 'mother', 1, true),
  ('e0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000003', 'Father', 'father', 2, true),
  ('e0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000003', 'Guardian', 'guardian', 3, true),
  ('e0000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000003', 'Sibling', 'sibling', 4, true),
  ('e0000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000003', 'Spouse', 'spouse', 5, true)
ON CONFLICT DO NOTHING;

-- Payment Methods items
INSERT INTO lookup_items (id, tenant_id, lookup_list_id, label, value, sort_order, is_active) VALUES
  ('e0000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000010', 'Cash', 'cash', 1, true),
  ('e0000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000010', 'Check', 'check', 2, true),
  ('e0000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000010', 'GCash', 'gcash', 3, true),
  ('e0000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000010', 'Maya', 'maya', 4, true),
  ('e0000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000010', 'QR Ph', 'qrph', 5, true),
  ('e0000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000010', 'Card', 'card', 6, true),
  ('e0000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000010', 'Bank Deposit', 'bank_deposit_ref', 7, true),
  ('e0000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000010', 'Online', 'online', 8, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Phase 2: Facility RLS
-- ============================================================
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_buildings ON buildings
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE floors ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_floors ON floors
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_rooms ON rooms
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE room_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_room_assets ON room_assets
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ============================================================
-- Phase 3: Academic Structure RLS
-- ============================================================
ALTER TABLE grade_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_grade_levels ON grade_levels
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE school_years ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_school_years ON school_years
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_terms ON terms
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_tracks ON tracks
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE strands ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_strands ON strands
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_programs ON programs
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_subjects ON subjects
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE curricula ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_curricula ON curricula
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE curriculum_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_curriculum_subjects ON curriculum_subjects
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE grading_systems ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_grading_systems ON grading_systems
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE grade_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_grade_components ON grade_components
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE honor_roll_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_honor_roll_configs ON honor_roll_configs
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ============================================================
-- Phase 4: SIS / Enrollment RLS (ACTIVE)
-- ============================================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_students ON students
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_guardians ON guardians
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE student_guardians ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_student_guardians ON student_guardians
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_enrollments ON enrollments
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_sections ON sections
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE enrollment_holds ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_enrollment_holds ON enrollment_holds
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_student_documents ON student_documents
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE student_section_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_student_section_assignments ON student_section_assignments
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE promotion_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_promotion_decisions ON promotion_decisions
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE student_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_student_transfers ON student_transfers
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE student_merge_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_student_merge_audit ON student_merge_audit
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE behavior_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_behavior_incidents ON behavior_incidents
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_health_records ON health_records
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE applicant_stage_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_applicant_stage_configs ON applicant_stage_configs
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE applicant_stage_transitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_applicant_stage_transitions ON applicant_stage_transitions
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE section_assignment_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_section_assignment_rules ON section_assignment_rules
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
--   USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
