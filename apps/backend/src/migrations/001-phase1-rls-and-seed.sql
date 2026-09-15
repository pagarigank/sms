-- ============================================================
-- 001 — Pilot permission catalog + lookup lists
-- ============================================================
-- RECONCILED (see 000-create-all-tables.sql header for the full context).
--
-- This file used to contain three things, none of which could run against a
-- fresh database:
--
--   1. RLS enablement + policies written against snake_case columns
--      (`tenant_id`), duplicating 000 and colliding with its policy names
--      (`tenant_isolation_<table>`, created without DROP POLICY IF EXISTS).
--      RLS now lives in 000 (core tables) and 017-rls-coverage.sql (the rest).
--   2. Role and tenant_plan seeds that used IDs shared with
--      004-phase1-fixes.sql but different, legacy names ("Platform Super
--      Admin"/"Branch Admin"/"Teacher" vs "Super Admin"/"Registrar"/"Faculty").
--      Because 001 runs first, its names won and every permission grant in
--      015-role-permission-grants.sql — keyed on the canonical names — matched
--      no row. 004 owns those rows.
--   3. The last statement was missing its terminating semicolon (the `;` sat on
--      a commented-out line), so the file could not parse.
--
-- What remains is seed data no other migration provides. Idempotent.
-- ============================================================

-- ============================================================
-- Base Permission Catalog
-- ============================================================
-- Format: resource.action (e.g., billing.invoice:create).
-- 004/013/015/016 add to this; duplicates are harmless (the guard uses a
-- resource+action match, and there is no unique constraint on the pair).
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
-- Pilot Lookup Lists
-- ============================================================
-- Columns are the entity names ("entityType", "lookupListId", …). The previous
-- snake_case versions (entity_type, lookup_list_id, sort_order, is_active) do
-- not exist in the schema.
INSERT INTO lookup_lists (id, "tenantId", name, "entityType", "isActive") VALUES
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
INSERT INTO lookup_items (id, "tenantId", "lookupListId", label, value, "sortOrder", "isActive") VALUES
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
INSERT INTO lookup_items (id, "tenantId", "lookupListId", label, value, "sortOrder", "isActive") VALUES
  ('e0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000003', 'Mother', 'mother', 1, true),
  ('e0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000003', 'Father', 'father', 2, true),
  ('e0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000003', 'Guardian', 'guardian', 3, true),
  ('e0000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000003', 'Sibling', 'sibling', 4, true),
  ('e0000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000003', 'Spouse', 'spouse', 5, true)
ON CONFLICT DO NOTHING;

-- Payment Methods items
INSERT INTO lookup_items (id, "tenantId", "lookupListId", label, value, "sortOrder", "isActive") VALUES
  ('e0000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000010', 'Cash', 'cash', 1, true),
  ('e0000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000010', 'Check', 'check', 2, true),
  ('e0000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000010', 'GCash', 'gcash', 3, true),
  ('e0000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000010', 'Maya', 'maya', 4, true),
  ('e0000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000010', 'QR Ph', 'qrph', 5, true),
  ('e0000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000010', 'Card', 'card', 6, true),
  ('e0000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000010', 'Bank Deposit', 'bank_deposit_ref', 7, true),
  ('e0000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000010', 'Online', 'online', 8, true)
ON CONFLICT DO NOTHING;
