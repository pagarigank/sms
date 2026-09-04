-- ============================================================
-- SMS Database Migration — All Phase 1-3 Tables
-- ============================================================
-- Generated: 2026-09-04
-- Usage: Run against a clean Postgres database
-- psql -U kpagarigan2 -d sms -f 000-create-all-tables.sql
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PHASE 1: Tenancy & IAM
-- ============================================================

-- 1. Tenant Plans (global catalog, not tenant-scoped)
CREATE TABLE IF NOT EXISTS tenant_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  max_branches INT,
  max_students INT,
  modules JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tenants
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan_id UUID REFERENCES tenant_plans(id),
  status TEXT NOT NULL DEFAULT 'active',
  branding JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Branches
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  address TEXT,
  tin TEXT,
  bir_branch_code TEXT,
  levels_offered TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

-- 4. Departments
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  education_level_ids UUID[] DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  password_hash TEXT,
  mfa_secret TEXT,
  mfa_enabled BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Roles
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Permissions (global catalog)
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  UNIQUE(resource, action)
);

-- 8. Role-Permissions junction
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE(role_id, permission_id)
);

-- 9. User-Roles junction
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role_id, tenant_id)
);

-- 10. ReBAC Edges
CREATE TABLE IF NOT EXISTS rebac_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subject_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relation TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PHASE 1: Config Engine
-- ============================================================

-- 11. Lookup Lists
CREATE TABLE IF NOT EXISTS lookup_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

-- 12. Lookup Items
CREATE TABLE IF NOT EXISTS lookup_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  list_id UUID NOT NULL REFERENCES lookup_lists(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Custom Field Definitions
CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL,
  label TEXT NOT NULL,
  options JSONB DEFAULT '{}',
  is_required BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. Numbering Schemes
CREATE TABLE IF NOT EXISTS numbering_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  format TEXT NOT NULL,
  current_sequence INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. Feature Flags
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, key)
);

-- 16. Audit Events
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_user_id UUID,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  before_state JSONB,
  after_state JSONB,
  correlation_id TEXT,
  ip_address TEXT,
  request_id TEXT,
  occurred_at TIMESTAMPTZ DEFAULT now()
);

-- 17. Education Levels
CREATE TABLE IF NOT EXISTS education_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PHASE 2: Facility Management
-- ============================================================

-- 18. Buildings
CREATE TABLE IF NOT EXISTS buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  address TEXT,
  floor_count INT,
  contact TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 19. Floors
CREATE TABLE IF NOT EXISTS floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  floor_number INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(building_id, floor_number)
);

-- 20. Rooms
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  room_type TEXT NOT NULL,
  capacity INT,
  seating_layout TEXT,
  status TEXT DEFAULT 'active',
  equipment_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 21. Room Assets
CREATE TABLE IF NOT EXISTS room_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  asset_tag TEXT,
  asset_type TEXT NOT NULL,
  description TEXT,
  condition TEXT,
  maintenance_flag BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PHASE 3: Academic Structure
-- ============================================================

-- 22. Grade Levels
CREATE TABLE IF NOT EXISTS grade_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  education_level_id UUID NOT NULL REFERENCES education_levels(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 23. School Years
CREATE TABLE IF NOT EXISTS school_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 24. Terms
CREATE TABLE IF NOT EXISTS terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  school_year_id UUID NOT NULL REFERENCES school_years(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sequence INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  grading_deadline DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 25. Tracks (SHS)
CREATE TABLE IF NOT EXISTS tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 26. Strands (SHS)
CREATE TABLE IF NOT EXISTS strands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 27. Programs (College)
CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'college',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 28. Subjects
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  units NUMERIC(4,1) DEFAULT 0,
  hours_per_week NUMERIC(4,1),
  lecture_hours NUMERIC(4,1),
  lab_hours NUMERIC(4,1),
  is_core BOOLEAN DEFAULT true,
  is_elective BOOLEAN DEFAULT false,
  learning_area TEXT,
  co_requisite_subject_id UUID REFERENCES subjects(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 29. Curricula
CREATE TABLE IF NOT EXISTS curricula (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  education_level_id UUID NOT NULL REFERENCES education_levels(id),
  grade_level_id UUID REFERENCES grade_levels(id),
  strand_id UUID REFERENCES strands(id),
  program_id UUID REFERENCES programs(id),
  school_year_id UUID NOT NULL REFERENCES school_years(id),
  status TEXT DEFAULT 'draft',
  version_label TEXT,
  cloned_from_curriculum_id UUID REFERENCES curricula(id),
  cloned_at TIMESTAMPTZ,
  cloned_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 30. Curriculum Subjects
CREATE TABLE IF NOT EXISTS curriculum_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  curriculum_id UUID NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  term_id UUID REFERENCES terms(id),
  prerequisite_subject_id UUID REFERENCES subjects(id),
  effective_grading_system_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 31. Grading Systems
CREATE TABLE IF NOT EXISTS grading_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  education_level_id UUID NOT NULL REFERENCES education_levels(id),
  school_year_id UUID NOT NULL REFERENCES school_years(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'numeric',
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, education_level_id, school_year_id, branch_id)
);

-- 32. Grade Components
CREATE TABLE IF NOT EXISTS grade_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  grading_system_id UUID NOT NULL REFERENCES grading_systems(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight NUMERIC(5,2) NOT NULL,
  "order" INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 33. Honor Roll Configs
CREATE TABLE IF NOT EXISTS honor_roll_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  education_level_id UUID NOT NULL REFERENCES education_levels(id),
  school_year_id UUID NOT NULL REFERENCES school_years(id),
  with_honors_threshold NUMERIC(5,2) DEFAULT 90,
  with_high_honors_threshold NUMERIC(5,2) DEFAULT 93,
  with_highest_honors_threshold NUMERIC(5,2) DEFAULT 96,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, education_level_id, school_year_id, branch_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Tenancy
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_branches_tenant_id ON branches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_departments_tenant_branch ON departments(tenant_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_departments_is_default ON departments(is_default);

-- IAM
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_roles_tenant_id ON roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rebac_edges_subject ON rebac_edges(subject_user_id);
CREATE INDEX IF NOT EXISTS idx_rebac_edges_object ON rebac_edges(object_type, object_id);

-- Config Engine
CREATE INDEX IF NOT EXISTS idx_lookup_lists_tenant ON lookup_lists(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lookup_items_list ON lookup_items(list_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_tenant_entity ON custom_field_definitions(tenant_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_numbering_schemes_tenant ON numbering_schemes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_tenant ON feature_flags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_tenant ON audit_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_occurred ON audit_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_education_levels_tenant ON education_levels(tenant_id);

-- Facility
CREATE INDEX IF NOT EXISTS idx_buildings_tenant_branch ON buildings(tenant_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_floors_building ON floors(building_id);
CREATE INDEX IF NOT EXISTS idx_rooms_tenant_branch ON rooms(tenant_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_rooms_floor ON rooms(floor_id);
CREATE INDEX IF NOT EXISTS idx_room_assets_room ON room_assets(room_id);

-- Academic
CREATE INDEX IF NOT EXISTS idx_grade_levels_tenant ON grade_levels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_grade_levels_education ON grade_levels(education_level_id);
CREATE INDEX IF NOT EXISTS idx_school_years_tenant ON school_years(tenant_id);
CREATE INDEX IF NOT EXISTS idx_terms_school_year ON terms(school_year_id);
CREATE INDEX IF NOT EXISTS idx_tracks_tenant ON tracks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_strands_track ON strands(track_id);
CREATE INDEX IF NOT EXISTS idx_programs_tenant ON programs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subjects_tenant ON subjects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_curricula_tenant ON curricula(tenant_id);
CREATE INDEX IF NOT EXISTS idx_curricula_school_year ON curricula(school_year_id);
CREATE INDEX IF NOT EXISTS idx_curricula_education ON curricula(education_level_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_subjects_curriculum ON curriculum_subjects(curriculum_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_subjects_subject ON curriculum_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_grading_systems_tenant ON grading_systems(tenant_id);
CREATE INDEX IF NOT EXISTS idx_grading_systems_resolve ON grading_systems(tenant_id, education_level_id, school_year_id, is_active);
CREATE INDEX IF NOT EXISTS idx_grade_components_system ON grade_components(grading_system_id);
CREATE INDEX IF NOT EXISTS idx_honor_roll_configs_tenant ON honor_roll_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_honor_roll_configs_resolve ON honor_roll_configs(tenant_id, education_level_id, school_year_id);

-- ============================================================
-- ROW-LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tenant-scoped tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rebac_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE lookup_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE lookup_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE numbering_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE education_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE strands ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE curricula ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE honor_roll_configs ENABLE ROW LEVEL SECURITY;

-- Create tenant isolation policies
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'tenants', 'branches', 'departments', 'users', 'roles',
      'user_roles', 'rebac_edges', 'lookup_lists', 'lookup_items',
      'custom_field_definitions', 'numbering_schemes', 'feature_flags',
      'audit_events', 'education_levels', 'buildings', 'floors',
      'rooms', 'room_assets', 'grade_levels', 'school_years',
      'terms', 'tracks', 'strands', 'programs', 'subjects',
      'curricula', 'curriculum_subjects', 'grading_systems',
      'grade_components', 'honor_roll_configs'
    ])
  LOOP
    -- Drop existing policy if any
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_%s ON %s', t, t);
    -- Create new policy
    IF t = 'tenants' THEN
      -- Tenants: special policy - users see their own tenant
      EXECUTE format('
        CREATE POLICY tenant_isolation_%s ON %s
        USING (id = current_setting(''app.current_tenant_id'')::uuid)
      ', t, t);
    ELSE
      -- All other tables: standard tenant_id filter
      EXECUTE format('
        CREATE POLICY tenant_isolation_%s ON %s
        USING (tenant_id = current_setting(''app.current_tenant_id'')::uuid)
      ', t, t);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Tenant Plans
INSERT INTO tenant_plans (id, plan_key, name, max_branches, max_students, modules) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'starter', 'Starter', 2, 500, '{"college":false,"offline_pos":false,"reporting":true}'),
  ('a0000000-0000-0000-0000-000000000002', 'professional', 'Professional', 5, 3000, '{"college":true,"offline_pos":true,"reporting":true}'),
  ('a0000000-0000-0000-0000-000000000003', 'enterprise', 'Enterprise', NULL, NULL, '{"college":true,"offline_pos":true,"reporting":true}')
ON CONFLICT (plan_key) DO NOTHING;

-- Default Roles (template for new tenants)
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
  ('b0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'Student', 'Student portal access', true),
  ('b0000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000000', 'Platform Support', 'Cross-tenant support (audited impersonation)', true),
  ('b0000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000000', 'DPO', 'Data Protection Officer', true)
ON CONFLICT DO NOTHING;

-- Permission Catalog
INSERT INTO permissions (id, resource, action, description) VALUES
  -- Tenancy
  ('c0000000-0000-0000-0000-000000000001', 'tenancy.tenant', 'view', 'View tenants'),
  ('c0000000-0000-0000-0000-000000000002', 'tenancy.tenant', 'create', 'Create tenants'),
  ('c0000000-0000-0000-0000-000000000003', 'tenancy.tenant', 'edit', 'Edit tenants'),
  ('c0000000-0000-0000-0000-000000000004', 'tenancy.branch', 'view', 'View branches'),
  ('c0000000-0000-0000-0000-000000000005', 'tenancy.branch', 'create', 'Create branches'),
  ('c0000000-0000-0000-0000-000000000006', 'tenancy.branch', 'edit', 'Edit branches'),
  ('c0000000-0000-0000-0000-000000000007', 'tenancy.department', 'view', 'View departments'),
  ('c0000000-0000-0000-0000-000000000008', 'tenancy.department', 'create', 'Create departments'),
  -- Academic
  ('c0000000-0000-0000-0000-000000000010', 'academic.school_year', 'view', 'View school years'),
  ('c0000000-0000-0000-0000-000000000011', 'academic.school_year', 'create', 'Create school years'),
  ('c0000000-0000-0000-0000-000000000012', 'academic.term', 'view', 'View terms'),
  ('c0000000-0000-0000-0000-000000000013', 'academic.term', 'create', 'Create terms'),
  ('c0000000-0000-0000-0000-000000000014', 'academic.curriculum', 'view', 'View curricula'),
  ('c0000000-0000-0000-0000-000000000015', 'academic.curriculum', 'create', 'Create curricula'),
  ('c0000000-0000-0000-0000-000000000016', 'academic.curriculum', 'edit', 'Edit curricula'),
  ('c0000000-0000-0000-0000-000000000017', 'academic.curriculum', 'publish', 'Publish curricula'),
  ('c0000000-0000-0000-0000-000000000018', 'academic.subject', 'view', 'View subjects'),
  ('c0000000-0000-0000-0000-000000000019', 'academic.subject', 'create', 'Create subjects'),
  -- SIS
  ('c0000000-0000-0000-0000-000000000020', 'sis.student', 'view', 'View students'),
  ('c0000000-0000-0000-0000-000000000021', 'sis.student', 'create', 'Create students'),
  ('c0000000-0000-0000-0000-000000000022', 'sis.student', 'edit', 'Edit students'),
  ('c0000000-0000-0000-0000-000000000023', 'sis.enrollment', 'view', 'View enrollments'),
  ('c0000000-0000-0000-0000-000000000024', 'sis.enrollment', 'create', 'Create enrollments'),
  -- Billing
  ('c0000000-0000-0000-0000-000000000030', 'billing.fee_type', 'view', 'View fee types'),
  ('c0000000-0000-0000-0000-000000000031', 'billing.fee_type', 'create', 'Create fee types'),
  ('c0000000-0000-0000-0000-000000000032', 'billing.invoice', 'view', 'View invoices'),
  -- Cashiering
  ('c0000000-0000-0000-0000-000000000040', 'cashiering.session', 'view', 'View cashier sessions'),
  ('c0000000-0000-0000-0000-000000000041', 'cashiering.session', 'open', 'Open cashier session'),
  ('c0000000-0000-0000-0000-000000000042', 'cashiering.payment', 'create', 'Process payments'),
  ('c0000000-0000-0000-0000-000000000043', 'cashiering.receipt', 'view', 'View receipts'),
  -- Grading
  ('c0000000-0000-0000-0000-000000000050', 'grading.system', 'view', 'View grading systems'),
  ('c0000000-0000-0000-0000-000000000051', 'grading.system', 'create', 'Create grading systems'),
  ('c0000000-0000-0000-0000-000000000052', 'grading.gradebook', 'view', 'View gradebook'),
  ('c0000000-0000-0000-0000-000000000053', 'grading.gradebook', 'edit', 'Enter grades'),
  -- Facility
  ('c0000000-0000-0000-0000-000000000060', 'facility.building', 'view', 'View buildings'),
  ('c0000000-0000-0000-0000-000000000061', 'facility.building', 'create', 'Create buildings'),
  ('c0000000-0000-0000-0000-000000000062', 'facility.room', 'view', 'View rooms'),
  ('c0000000-0000-0000-0000-000000000063', 'facility.room', 'create', 'Create rooms'),
  -- Config
  ('c0000000-0000-0000-0000-000000000070', 'config.lookup', 'view', 'View lookup lists'),
  ('c0000000-0000-0000-0000-000000000071', 'config.lookup', 'edit', 'Edit lookup lists'),
  ('c0000000-0000-0000-0000-000000000072', 'config.custom_field', 'view', 'View custom fields'),
  ('c0000000-0000-0000-0000-000000000073', 'config.custom_field', 'edit', 'Edit custom fields'),
  ('c0000000-0000-0000-0000-000000000074', 'config.audit_log', 'view', 'View audit log'),
  ('c0000000-0000-0000-0000-000000000075', 'config.audit_log', 'export', 'Export audit log'),
  -- IAM
  ('c0000000-0000-0000-0000-000000000080', 'iam.role', 'view', 'View roles'),
  ('c0000000-0000-0000-0000-000000000081', 'iam.role', 'create', 'Create roles'),
  ('c0000000-0000-0000-0000-000000000082', 'iam.role', 'assign', 'Assign roles to users'),
  ('c0000000-0000-0000-0000-000000000083', 'iam.permission', 'view', 'View permissions')
ON CONFLICT (resource, action) DO NOTHING;

-- Education Levels (DepEd K-12 + College)
INSERT INTO education_levels (id, tenant_id, code, name, sort_order) VALUES
  ('f0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'kindergarten', 'Kindergarten', 1),
  ('f0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'elementary', 'Elementary', 2),
  ('f0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'jhs', 'Junior High School', 3),
  ('f0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'shs', 'Senior High School', 4),
  ('f0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'college', 'College', 5),
  ('f0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'techvoc', 'Technical-Vocational', 6)
ON CONFLICT DO NOTHING;

-- Grade Levels
INSERT INTO grade_levels (id, tenant_id, education_level_id, code, name, sort_order) VALUES
  ('g0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'f0000000-0000-0000-0000-000000000001', 'K', 'Kindergarten', 1),
  ('g0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'f0000000-0000-0000-0000-000000000002', '1', 'Grade 1', 1),
  ('g0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'f0000000-0000-0000-0000-000000000002', '2', 'Grade 2', 2),
  ('g0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'f0000000-0000-0000-0000-000000000002', '3', 'Grade 3', 3),
  ('g0000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000000', 'f0000000-0000-0000-0000-000000000002', '4', 'Grade 4', 4),
  ('g0000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000000', 'f0000000-0000-0000-0000-000000000002', '5', 'Grade 5', 5),
  ('g0000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000000', 'f0000000-0000-0000-0000-000000000002', '6', 'Grade 6', 6),
  ('g0000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000000', 'f0000000-0000-0000-0000-000000000003', '7', 'Grade 7', 1),
  ('g0000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000000', 'f0000000-0000-0000-0000-000000000003', '8', 'Grade 8', 2),
  ('g0000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000000', 'f0000000-0000-0000-0000-000000000003', '9', 'Grade 9', 3),
  ('g0000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000000', 'f0000000-0000-0000-0000-000000000003', '10', 'Grade 10', 4),
  ('g0000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000000', 'f0000000-0000-0000-0000-000000000004', '11', 'Grade 11', 1),
  ('g0000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000000', 'f0000000-0000-0000-0000-000000000004', '12', 'Grade 12', 2)
ON CONFLICT DO NOTHING;

-- Lookup Lists (pilot)
INSERT INTO lookup_lists (id, tenant_id, name, code) VALUES
  ('d0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'Room Types', 'room_types'),
  ('d0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'Document Types', 'document_types'),
  ('d0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'Fee Types', 'fee_types'),
  ('d0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'Relationship Types', 'relationship_types'),
  ('d0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'Discount Types', 'discount_types'),
  ('d0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'Hold Types', 'hold_types'),
  ('d0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'Payment Methods', 'payment_methods'),
  ('d0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'Employment Status', 'employment_status'),
  ('d0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', 'Asset Types', 'asset_types'),
  ('d0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'Notification Channels', 'notification_channels')
ON CONFLICT DO NOTHING;

-- Lookup Items
INSERT INTO lookup_items (id, tenant_id, list_id, value, label, sort_order) VALUES
  -- Room Types
  ('e0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000001', 'classroom', 'Classroom', 1),
  ('e0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000001', 'laboratory', 'Laboratory', 2),
  ('e0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000001', 'office', 'Office', 3),
  ('e0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000001', 'clinic', 'Clinic', 4),
  ('e0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000001', 'cashier', 'Cashier Window', 5),
  ('e0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000001', 'library', 'Library', 6),
  ('e0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000001', 'gym', 'Gymnasium', 7),
  -- Payment Methods
  ('e0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000007', 'cash', 'Cash', 1),
  ('e0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000007', 'check', 'Check', 2),
  ('e0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000007', 'gcash', 'GCash', 3),
  ('e0000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000007', 'maya', 'Maya', 4),
  ('e0000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000007', 'bank_transfer', 'Bank Transfer', 5),
  ('e0000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000007', 'card', 'Card', 6),
  -- Relationship Types
  ('e0000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000004', 'mother', 'Mother', 1),
  ('e0000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000004', 'father', 'Father', 2),
  ('e0000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000004', 'guardian', 'Guardian', 3),
  ('e0000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000004', 'sibling', 'Sibling', 4),
  -- Hold Types
  ('e0000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000006', 'finance', 'Unpaid Balance', 1),
  ('e0000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000006', 'discipline', 'Disciplinary', 2),
  ('e0000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000006', 'requirements', 'Incomplete Requirements', 3)
ON CONFLICT DO NOTHING;

-- ============================================================
-- DEMO DATA (for testing)
-- ============================================================

-- Demo Tenant
INSERT INTO tenants (id, name, slug, plan_id, status) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Demo School', 'demo-school', 'a0000000-0000-0000-0000-000000000002', 'active')
ON CONFLICT DO NOTHING;

-- Demo Branches
INSERT INTO branches (id, tenant_id, name, code, address, levels_offered) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Main Campus', 'MAIN', '123 Education St, Manila', '{elementary,jhs,shs,college}'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'North Campus', 'NORTH', '456 North Ave, Quezon City', '{elementary,jhs,shs}')
ON CONFLICT DO NOTHING;

-- Demo Departments
INSERT INTO departments (id, tenant_id, branch_id, name, education_level_ids, is_default) VALUES
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Elementary', '{f0000000-0000-0000-0000-000000000002}', true),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Junior High School', '{f0000000-0000-0000-0000-000000000003}', false),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Senior High School', '{f0000000-0000-0000-0000-000000000004}', false),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'College', '{f0000000-0000-0000-0000-000000000005}', false)
ON CONFLICT DO NOTHING;

-- Demo User (password: admin123)
INSERT INTO users (id, tenant_id, email, password_hash, status) VALUES
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'admin@demo-school.ph', '$2b$10$YourHashedPasswordHere', 'active')
ON CONFLICT DO NOTHING;

-- Assign Tenant Admin role to demo user
INSERT INTO user_roles (id, user_id, role_id, tenant_id, branch_id) VALUES
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', NULL)
ON CONFLICT DO NOTHING;

-- Demo School Year
INSERT INTO school_years (id, tenant_id, name, start_date, end_date, status) VALUES
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'SY 2026-2027', '2026-06-01', '2027-03-31', 'active')
ON CONFLICT DO NOTHING;

-- Demo Building
INSERT INTO buildings (id, tenant_id, branch_id, name, code, floor_count) VALUES
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Main Building', 'MB', 3)
ON CONFLICT DO NOTHING;

-- Demo Floors
INSERT INTO floors (id, tenant_id, building_id, label, floor_number) VALUES
  ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Ground Floor', 0),
  ('80000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Second Floor', 1),
  ('80000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Third Floor', 2)
ON CONFLICT DO NOTHING;

-- Demo Rooms
INSERT INTO rooms (id, tenant_id, branch_id, floor_id, name, room_type, capacity) VALUES
  ('90000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 'Room 101', 'classroom', 40),
  ('90000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 'Room 102', 'classroom', 40),
  ('90000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000002', 'Computer Lab', 'laboratory', 30)
ON CONFLICT DO NOTHING;

-- ============================================================
-- PHASE 1: Workflow Engine
-- ============================================================

-- 34. Workflow Definitions
CREATE TABLE IF NOT EXISTS workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB DEFAULT '[]',
  sla_hours INT DEFAULT 48,
  escalation_to TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 35. Workflow Instances
CREATE TABLE IF NOT EXISTS workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workflow_definition_id UUID NOT NULL REFERENCES workflow_definitions(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  current_step INT DEFAULT 0,
  status TEXT DEFAULT 'pending',
  requested_by UUID REFERENCES users(id),
  requested_at TIMESTAMPTZ,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 36. Workflow Approvals
CREATE TABLE IF NOT EXISTS workflow_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES workflow_instances(id),
  approver_user_id UUID NOT NULL REFERENCES users(id),
  step_index INT NOT NULL,
  decision TEXT NOT NULL,
  reason TEXT,
  decided_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 37. Idempotency Keys
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  request_method TEXT,
  request_path TEXT,
  response JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Indexes for workflow tables
CREATE INDEX IF NOT EXISTS idx_workflow_defs_tenant ON workflow_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_defs_entity ON workflow_definitions(entity_type);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_tenant ON workflow_instances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_entity ON workflow_instances(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_workflow_approvals_instance ON workflow_approvals(instance_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key ON idempotency_keys(key);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires ON idempotency_keys(expires_at);

-- Enable RLS on workflow tables
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Workflow RLS policies
CREATE POLICY tenant_isolation_workflow_definitions ON workflow_definitions
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_workflow_instances ON workflow_instances
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY tenant_isolation_workflow_approvals ON workflow_approvals
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ============================================================
-- Workflow Seed Data
-- ============================================================

-- Grade change/appeal workflow
INSERT INTO workflow_definitions (id, tenant_id, entity_type, name, description, steps, sla_hours, escalation_to) VALUES
  ('w0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'grade_change', 'Grade Change Request', 'Teacher requests grade change, coordinator reviews, registrar approves', '[{"role":"Teacher","action":"request"},{"role":"SubjectCoordinator","action":"review"},{"role":"Registrar","action":"approve"}]', 48, 'Principal')
ON CONFLICT DO NOTHING;

-- Discount/scholarship approval
INSERT INTO workflow_definitions (id, tenant_id, entity_type, name, description, steps, sla_hours, escalation_to) VALUES
  ('w0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'discount', 'Discount/Scholarship Approval', 'Finance officer reviews, tenant admin approves', '[{"role":"Accounting/Finance Officer","action":"review"},{"role":"Tenant Admin","action":"approve"}]', 72, NULL)
ON CONFLICT DO NOTHING;

-- Refund approval
INSERT INTO workflow_definitions (id, tenant_id, entity_type, name, description, steps, sla_hours, escalation_to) VALUES
  ('w0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'refund', 'Refund Approval', 'Cashier requests, finance reviews, admin approves', '[{"role":"Cashier","action":"request"},{"role":"Accounting/Finance Officer","action":"review"},{"role":"Tenant Admin","action":"approve"}]', 168, NULL)
ON CONFLICT DO NOTHING;

-- Document release
INSERT INTO workflow_definitions (id, tenant_id, entity_type, name, description, steps, sla_hours, escalation_to) VALUES
  ('w0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'document_release', 'Document Release', 'Registrar releases documents', '[{"role":"Registrar","action":"release"}]', 24, NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- DONE
-- ============================================================
