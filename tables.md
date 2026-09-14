# TABLES.md — Field-Level Schema Reference
### School Management System (SMS) — Every table, every field, every constraint
**Version:** 1.2 (2026-09-06 Round-2 implementation-audit review)

**Companion to:** `spec.md` (requirements), `architecture.md` (DDL), `todo.md` (build plan)

**Round-2 changelog (v1.2):** gaps G-20…G-29 raised in `todo2.md` "Round-2 Gaps" — added `applicants` + `idempotency_keys` tables, canonical permission catalog, BIR-mandatory OR fields, users/branches/tenants field parity, and entity-drift reconciliation notes ([G-21]/[G-22]/[G-29]) for billing, cashiering, attendance, grading, and reporting.

**Convention:** Every tenant-scoped table carries `tenant_id UUID NOT NULL` and a Row-Level Security policy. Every table gets a composite index on `(tenant_id, ...)` on creation. Fields marked `*` are added or corrected beyond the base DDL in `architecture.md` §8. Tables marked **[NEW]** are added from the 2026-09-04 cross-file gap review (see `todo.md` Appendix B). Fields tagged *[G-n]* come from the Round-2 audit. RLS policies are noted per table; the base pattern for every tenant-scoped table is:

```sql
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_<table_name> ON <table_name>
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

## 1. Tenancy

### `tenants`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `name` | TEXT | NOT NULL | — | Legal entity name |
|| `slug` | TEXT | NOT NULL | — | Unique; used for subdomain |
|| `plan_id` | UUID | NOT NULL | — | FK → `tenant_plans(id)`; replaces free-text `plan` |
|| `status` | TEXT | NOT NULL | `'active'` | `active` | `suspended` | `archived` |
|| `branding` | JSONB | — | `'{}'` | logo url, colors, favicon |
|| `created_at` | TIMESTAMPTZ | — | `now()` | |
|| `updated_at` | TIMESTAMPTZ | — | `now()` | *[G-24]* present on entity + api-client `Tenant` type; documented for parity |

*Index: UNIQUE(slug) · idx_tenants_plan_id ON tenants (plan_id)*

*RLS: `tenant_isolation_tenants`*

### `tenant_plans`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `plan_key` | TEXT | NOT NULL | — | `starter` | `professional` | `enterprise` — UNIQUE |
|| `name` | TEXT | NOT NULL | — | Display name |
|| `max_branches` | INT | — | — | NULL = unlimited |
|| `max_students` | INT | — | — | NULL = unlimited |
|| `modules` | JSONB | — | `'{}'` | `{"college":true,"offline_pos":true,"reporting":true}` |
|| `is_active` | BOOLEAN | — | `true` | |

*Index: UNIQUE(plan_key)*

### `branches`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | FK → `tenants(id)` |
|| `name` | TEXT | NOT NULL | — | |
|| `code` | TEXT | NOT NULL | — | Unique per tenant |
|| `address` | TEXT | — | — | |
|| `tin` | TEXT | — | — | Tax Identification Number |
|| `bir_branch_code` | TEXT | — | — | BIR branch registration code |
|| `levels_offered` | TEXT[] | — | `'{}'` | **ADR:** Department is a per-branch entity (see `departments`); values: `elementary`, `jhs`, `shs`, `college`, `techvoc`, `kindergarten` |
|| `contact_email` | TEXT | — | — | *[G-25]* FR-TEN-3 "contact info"; branch forms collect it |
|| `contact_phone` | TEXT | — | — | *[G-25]* FR-TEN-3 |
|| `status` | TEXT | — | `'active'` | `active` | `inactive` |
|| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: UNIQUE(tenant_id, code) · idx_branches_tenant_id · idx_branches_tenant_levels on branches USING GIN(levels_offered)*

---

## 1A. Departments (new — spec §5; bridges per-branch levels_offered to academic structure)

A **Department** is a per-branch logical grouping that determines which Education Levels are active at that branch and provides a scope for staff assignment, fee structure templates, and curriculum ownership. It exists because `spec.md` §5 lists Department as a peer of Building/Floor/Room under Branch, and `frontend.md` §5 navigation shows "Department (Elementary/JHS/SHS/College)" as a tenant-admin concept. Department is NOT EducationLevel — EducationLevel is the global taxonomy (`education_levels`); Department is the per-branch activation + local configuration layer.

### `departments`

|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | FK → `tenants(id)` |
|| `branch_id` | UUID | NOT NULL | — | FK → `branches(id)` |
|| `name` | TEXT | NOT NULL | — | e.g. "Elementary Department", "College of Computer Studies" |
|| `code` | TEXT | NOT NULL | — | e.g. `ELEM`, `JHS`, `SHS`, `COL` — unique per branch |
|| `education_level_ids` | UUID[] | NOT NULL | `'{}'` | FK → `education_levels(id)`; subset of branch `levels_offered` |
|| `is_default` | BOOLEAN | — | `false` | Exactly one default per (tenant, branch) pair |
|| `contact_email` | TEXT | — | — | |
|| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: UNIQUE(tenant_id, branch_id, code) · idx_departments_tenant_branch ON departments (tenant_id, branch_id) · idx_departments_is_default ON departments (tenant_id, branch_id) WHERE is_default = true*

*RLS: `tenant_isolation_departments`*

---

## 1B. IAM — AuthN / AuthZ (new — architecture.md §7; Phase 1.2–1.3)

These tables are the foundation for every module after Phase 1. They were entirely absent from the prior version of this file.

### `users`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | FK → `tenants(id)` |
|| `email` | TEXT | — | — | UNIQUE per tenant (partial idx) |
|| `phone` | TEXT | — | — | UNIQUE per tenant (partial idx) |
|| `first_name` | TEXT | — | — | *[G-20]* display name lives on the account, not only in `user_person_links`; login topbar/initials read it |
|| `middle_name` | TEXT | — | — | *[G-20]* |
|| `last_name` | TEXT | — | — | *[G-20]* |
|| `password_hash` | TEXT | — | — | bcrypt/argon2; NULL for SSO accounts |
|| `mfa_secret` | TEXT | — | — | TOTP; encrypted at rest |
|| `mfa_enabled` | BOOLEAN | — | `false` | |
|| `status` | TEXT | NOT NULL | `'active'` | `active` | `suspended` | `locked` |
|| `last_login_at` | TIMESTAMPTZ | — | — | |
|| `created_at` | TIMESTAMPTZ | — | `now()` | |
|| `updated_at` | TIMESTAMPTZ | — | `now()` | |

*Index: UNIQUE(tenant_id, email) WHERE email IS NOT NULL · UNIQUE(tenant_id, phone) WHERE phone IS NOT NULL · idx_users_tenant_status ON users (tenant_id, status)*

*RLS: `tenant_isolation_users`*

### `user_person_links` (new — Phase 1.2; account → person determinism)

Every user account maps to exactly one person record (student, guardian, or employee). Required so AuthN, ReBAC, and the Phase 9 sibling switcher resolve account → person → data deterministically.

|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `user_id` | UUID | NOT NULL | — | FK → `users(id)`; PK |
|| `person_type` | TEXT | NOT NULL | — | `student` | `guardian` | `employee` |
|| `person_id` | UUID | NOT NULL | — | FK to respective table |
|| `tenant_id` | UUID | NOT NULL | — | FK → `tenants(id)` |
|| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: UNIQUE(user_id) · UNIQUE(person_type, person_id) · idx_user_person_links_tenant ON user_person_links (tenant_id, person_type, person_id)*

*RLS: `tenant_isolation_user_person_links`*

### `roles`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | FK → `tenants(id)` |
|| `name` | TEXT | NOT NULL | — | e.g. Branch Admin, Registrar, Cashier |
|| `description` | TEXT | — | — | |
|| `is_system` | BOOLEAN | — | `false` | System roles cannot be deleted |
|| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: UNIQUE(tenant_id, name) · idx_roles_tenant_id ON roles (tenant_id)*

*RLS: `tenant_isolation_roles`*

### `permissions` (global catalog — NOT tenant-scoped)

|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `resource` | TEXT | NOT NULL | — | e.g. `billing.invoice`, `academic.curriculum` |
|| `action` | TEXT | NOT NULL | — | `view` | `create` | `edit` | `delete` | `approve` | `export` |
|| `description` | TEXT | — | — | |

*Index: UNIQUE(resource, action)*

**Canonical permission catalog (seeded in `001-phase1-rls-and-seed.sql`).** Frontend route-permission maps must reference *these* codes — the seed defines **no** `iam.*` or `platform.*` resources (see [G-18] in `todo2.md`):

| Resource | Actions | |
|---|---|---|
| `tenancy.tenant` | view, create, edit | Platform/tenant management |
| `tenancy.branch` | view, create, edit | Branch management |
| `tenancy.department` | view, create | Departments |
| `academic.curriculum` | view, create, edit | Curricula |
| `academic.subject` | view, create | Subjects |
| `academic.structure` | view, edit | Education/grade levels, SY/terms, tracks/strands/programs |
| `sis.student` | view, create, edit | Student records |
| `sis.guardian` | view | Guardian directory |
| `sis.enrollment` | view, create | Enrollment |
| `sis.section` | view | Sections |
| `sis.admission` | view | Admissions pipeline |
| `scheduling.timetable` | view | Timetable builder |
| `scheduling.facultyload` | view | Faculty load report |
| `attendance.record` | view, edit | Attendance entry |
| `grading.gradebook` | view, edit | Gradebook |
| `grading.system` | view | Grading systems |
| `grading.component` | view | Grade components |
| `grading.honorroll` | view | Honor roll config |
| `billing.feetype` | view | Fee types |
| `billing.feestructure` | view | Fee structures |
| `billing.discount` | view | Discounts |
| `billing.invoice` | view, create, approve | Invoices/SOA |
| `cashiering.session` | view, create | Cashier sessions |
| `cashiering.payment` | view, create | Payment collection |
| `cashiering.adhoc` | view | Ad-hoc sales |
| `cashiering.report` | view | Daily collection report |
| `communications.announcement` | view | Announcements |
| `communications.template` | view | Notification templates |
| `communications.message` | view | Message threads |
| `document.template` | view, create | Document templates |
| `document.request` | view, approve | Document requests |
| `hr.employee` | view, create | Employee records |
| `config.lookup` | view, edit | Lookup lists |
| `config.role` | view, create | Roles & permissions builder |
| `reporting.dashboard` | view | Dashboards |
| `reporting.export` | export | Report exports |
| `facility.building` | view | Buildings |
| `facility.floor` | view | Floors |
| `facility.room` | view, create | Rooms |

*Frontend maps that reference `platform.dashboard:view`, `iam.role:view`, `tenancy.department:view` etc. are stale and must be regenerated from this catalog.*

### `role_permissions`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `role_id` | UUID | NOT NULL | — | FK → `roles(id)`; comp PK |
|| `permission_id` | UUID | NOT NULL | — | FK → `permissions(id)`; comp PK |

*Index: idx_role_permissions_role ON role_permissions (role_id)*

*Note: role_permissions inherits tenancy through `roles` (RLS: `tenant_isolation_roles`). No direct tenant_id — tenant scope resolved via role_id FK.*

### `user_roles`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `user_id` | UUID | NOT NULL | — | FK → `users(id)`; comp PK |
|| `tenant_id` | UUID | NOT NULL | — | FK → `tenants(id)`; comp PK |
|| `branch_id` | UUID | — | — | NULL = tenant-wide; FK → `branches(id)` |
|| `role_id` | UUID | NOT NULL | — | FK → `roles(id)`; comp PK |
|| `granted_at` | TIMESTAMPTZ | — | `now()` | |
|| `granted_by` | UUID | — | — | FK → `users(id)` |

*Index: idx_user_roles_tenant_branch ON user_roles (tenant_id, branch_id) · idx_user_roles_user ON user_roles (user_id)*

*RLS: `tenant_isolation_user_roles`*

### `rebac_edges` (ReBAC polymorphic edges — architecture.md §7)

|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | FK → `tenants(id)` |
|| `subject_user_id` | UUID | NOT NULL | — | FK → `users(id)` |
|| `relation` | TEXT | NOT NULL | — | `TeachesSection` | `GuardianOf` | `AdvisorOf` |
|| `object_type` | TEXT | NOT NULL | — | `section` | `student` | `enrollment` |
|| `object_id` | UUID | NOT NULL | — | FK to respective table |
|| `created_at` | TIMESTAMPTZ | — | `now()` | |
|| `expires_at` | TIMESTAMPTZ | — | — | NULL = permanent |

*Index: idx_rebac_subject ON rebac_edges (tenant_id, subject_user_id, relation) · idx_rebac_object ON rebac_edges (tenant_id, object_type, object_id) · idx_rebac_subject_object ON rebac_edges (tenant_id, subject_user_id, relation, object_type, object_id)*

*RLS: `tenant_isolation_rebac_edges`*

### `user_sessions` (new — [G-6] arch §10, Phase 1.2 + 11.1)
Session audit trail for security compliance (OWASP ASVS, Data Privacy Act RA 10173).
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | FK → `tenants(id)` |
||| `user_id` | UUID | NOT NULL | — | FK → `users(id)` |
||| `session_token_hash` | TEXT | NOT NULL | — | Hashed session/JWT token (never store raw) |
||| `ip_address` | TEXT | — | — | Client IP at login |
||| `user_agent` | TEXT | — | — | Browser/device fingerprint |
||| `login_at` | TIMESTAMPTZ | — | `now()` | When session started |
||| `last_activity_at` | TIMESTAMPTZ | — | — | Last API call timestamp |
||| `logout_at` | TIMESTAMPTZ | — | — | NULL = still active |
||| `expires_at` | TIMESTAMPTZ | NOT NULL | — | Session expiry |
||| `is_force_terminated` | BOOLEAN | — | `false` | Admin-initiated termination |
||| `terminated_by` | UUID | — | — | FK → `users(id)` (admin who force-terminated) |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_user_sessions_tenant ON user_sessions (tenant_id) · idx_user_sessions_user ON user_sessions (user_id, login_at DESC) · idx_user_sessions_active ON user_sessions (user_id) WHERE logout_at IS NULL · idx_user_sessions_expires ON user_sessions (expires_at) WHERE logout_at IS NULL*

*RLS: `tenant_isolation_user_sessions`*

---

## 2. Facility

### `buildings`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
|| `branch_id` | UUID | NOT NULL | — | FK → `branches(id)` |
|| `name` | TEXT | NOT NULL | — | |
|| `code` | TEXT | — | — | |
|| `address` | TEXT | — | — | Address/wing |
|| `floor_count` | INT | — | — | Total floors |
|| `contact` | TEXT | — | — | Building contact |
|| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_buildings_tenant_branch ON buildings (tenant_id, branch_id) · idx_buildings_tenant ON buildings (tenant_id)*

*RLS: `tenant_isolation_buildings`*

### `floors`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
|| `building_id` | UUID | NOT NULL | — | FK → `buildings(id)` ON DELETE CASCADE |
|| `label` | TEXT | NOT NULL | — | |
|| `floor_number` | INT | — | — | |
|| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: UNIQUE(building_id, floor_number) · idx_floors_building ON floors (building_id)*

*RLS: `tenant_isolation_floors`*

### `rooms`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
|| `branch_id` | UUID | NOT NULL | — | FK → `branches(id)` |
|| `floor_id` | UUID | NOT NULL | — | FK → `floors(id)` |
|| `name` | TEXT | NOT NULL | — | |
|| `room_type` | TEXT | NOT NULL | — | FK → `lookup_items` |
||| `capacity` | INT | — | — | |
||| `seating_layout` | TEXT | — | — | Optional layout descriptor |
||| `status` | TEXT | — | `'active'` | active | under_maintenance | closed |
||| `equipment_tags` | TEXT[] | — | `'{}'` | Projector, aircon, etc. |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_rooms_tenant_branch ON rooms (tenant_id, branch_id) · idx_rooms_tenant_type ON rooms (tenant_id, room_type) · idx_rooms_floor ON rooms (floor_id)*

*RLS: `tenant_isolation_rooms`*

### `room_assets` (new — FR-FAC-6)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
|| `branch_id` | UUID | NOT NULL | — | FK → `branches(id)` |
||| `room_id` | UUID | NOT NULL | — | FK → `rooms(id)` |
||| `asset_tag` | TEXT | NOT NULL | — | Unique identifier |
||| `asset_type` | TEXT | NOT NULL | — | FK → `lookup_items` |
||| `condition` | TEXT | — | — | good | fair | poor |
||| `maintenance_flag` | BOOLEAN | — | `false` | |
||| `notes` | TEXT | — | — | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_room_assets_tenant_room ON room_assets (tenant_id, room_id) · idx_room_assets_tenant ON room_assets (tenant_id)*

*RLS: `tenant_isolation_room_assets`*

---

## 3. Academic Structure

### `education_levels`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `code` | TEXT | — | — | e.g. elementary, jhs, shs, college, kindergarten |
||| `name` | TEXT | NOT NULL | — | |
||| `sort_order` | INT | — | — | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_education_levels_tenant ON education_levels (tenant_id)*

*RLS: `tenant_isolation_education_levels`*

### `grade_levels`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `education_level_id` | UUID | NOT NULL | — | FK → `education_levels(id)` |
||| `code` | TEXT | — | — | e.g. 1, 2, ..., 11, 12, 1st_year, ... |
||| `name` | TEXT | NOT NULL | — | |
||| `sort_order` | INT | — | — | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_grade_levels_tenant ON grade_levels (tenant_id) · idx_grade_levels_ed_level ON grade_levels (education_level_id)*

*RLS: `tenant_isolation_grade_levels`*

### `school_years`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `name` | TEXT | NOT NULL | — | e.g. SY 2026-2027 |
||| `start_date` | DATE | — | — | |
||| `end_date` | DATE | — | — | |
||| `status` | TEXT | — | — | active | archived |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_school_years_tenant ON school_years (tenant_id) · idx_school_years_tenant_status ON school_years (tenant_id, status)*

*RLS: `tenant_isolation_school_years`*

### `terms`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `school_year_id` | UUID | NOT NULL | — | FK → `school_years(id)` |
||| `name` | TEXT | — | — | e.g. First Quarter, Semester 1 |
||| `sequence` | INT | — | — | |
||| `start_date` | DATE | — | — | |
||| `end_date` | DATE | — | — | |
||| `grading_deadline` | DATE | — | — | Last day to submit grades |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_terms_tenant ON terms (tenant_id) · idx_terms_school_year ON terms (school_year_id)*

*RLS: `tenant_isolation_terms`*

### `tracks` (SHS only)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `name` | TEXT | NOT NULL | — | e.g. Academic, TVL, Sports, Arts & Design |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_tracks_tenant ON tracks (tenant_id)*

*RLS: `tenant_isolation_tracks`*

### `strands` (SHS only)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `track_id` | UUID | — | — | FK → `tracks(id)` |
||| `name` | TEXT | NOT NULL | — | e.g. STEM, ABM, HUMSS, GAS, TVL |
||| `code` | TEXT | — | — | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_strands_tenant ON strands (tenant_id) · idx_strands_track ON strands (track_id)*

*RLS: `tenant_isolation_strands`*

### `programs` (College only)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `code` | TEXT | NOT NULL | — | e.g. BSIT, BSA |
||| `name` | TEXT | NOT NULL | — | |
||| `level` | TEXT | — | — | e.g. 4th_year, 5th_year |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_programs_tenant ON programs (tenant_id)*

*RLS: `tenant_isolation_programs`*

### `curricula`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | — | — | NULL = tenant default |
||| `education_level_id` | UUID | NOT NULL | — | FK → `education_levels(id)` |
||| `grade_level_id` | UUID | — | — | FK → `grade_levels(id)` |
||| `strand_id` | UUID | — | — | FK → `strands(id)` |
||| `program_id` | UUID | — | — | FK → `programs(id)` |
||| `school_year_id` | UUID | NOT NULL | — | FK → `school_years(id)` |
||| `version_label` | TEXT | — | — | e.g. v1, 2026-2027 |
||| `status` | TEXT | — | `'draft'` | draft | active | archived |
||| `cloned_from_curriculum_id` | UUID | — | — | *NEW: lineage trace (FR-ACA-6)* FK → curricula(id) |
||| `cloned_at` | TIMESTAMPTZ | — | — | *NEW: clone timestamp* |
||| `cloned_by` | UUID | — | — | *NEW: FK → users(id)* |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_curricula_tenant ON curricula (tenant_id) · idx_curricula_tenant_branch ON curricula (tenant_id, branch_id) · idx_curricula_school_year ON curricula (school_year_id) · idx_curricula_cloned_from ON curricula (cloned_from_curriculum_id)*

*RLS: `tenant_isolation_curricula`*

### `subjects`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `code` | TEXT | NOT NULL | — | e.g. MAT1, ENG1, MAPEH1 |
||| `title` | TEXT | NOT NULL | — | |
||| `description` | TEXT | — | — | |
||| `units` | NUMERIC(4,1) | — | — | College credit units |
||| `hours_per_week` | NUMERIC(4,1) | — | — | Basic ed hours |
||| `lecture_hours` | NUMERIC(4,1) | — | — | *NEW: lecture split (FR-ACA-5)* |
||| `lab_hours` | NUMERIC(4,1) | — | — | *NEW: lab split (FR-ACA-5)* |
||| `is_core` | BOOLEAN | — | `true` | |
||| `is_elective` | BOOLEAN | — | `false` | |
||| `learning_area` | TEXT | — | — | *NEW: MAPEH, TLE, etc. (FR-ACA-5)* FK → lookup_items |
||| `co_requisite_subject_id` | UUID | — | — | *NEW: FK → subjects* |
||| `version_label` | TEXT | — | — | Version history per FR-ACA-5 |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_subjects_tenant ON subjects (tenant_id) · idx_subjects_tenant_code ON subjects (tenant_id, code) · idx_subjects_corequisite ON subjects (co_requisite_subject_id)*

*RLS: `tenant_isolation_subjects`*

### `curriculum_subjects`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | *FIX: RLS isolation per arch §3* |
||| `curriculum_id` | UUID | NOT NULL | — | FK → `curricula(id)` |
||| `subject_id` | UUID | NOT NULL | — | FK → `subjects(id)` |
||| `term_id` | UUID | — | — | FK → `terms(id)` |
||| `prerequisite_subject_id` | UUID | — | — | FK → `subjects(id)` |
||| `co_requisite_subject_id` | UUID | — | — | *NEW: FK → subjects* |
||| `order` | INT | — | — | Sequence in curriculum |
||| `effective_grading_system_id` | UUID | — | — | *FIX [G-2]:* NULLABLE — only resolved at curriculum-publish time (draft→active). NULL in draft status; NOT NULL enforced by CHECK constraint when `curricula.status = 'active'`. FK → `grading_systems(id)` — the grading system that applies to this curriculum subject (see Phase 5.3 TODO gap B6.2) |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_curriculum_subjects_tenant ON curriculum_subjects (tenant_id) · idx_curriculum_subjects_curriculum ON curriculum_subjects (curriculum_id) · idx_curriculum_subjects_subject ON curriculum_subjects (subject_id) · idx_curriculum_subjects_term ON curriculum_subjects (term_id) · idx_curriculum_subjects_grading ON curriculum_subjects (effective_grading_system_id)*

*RLS: `tenant_isolation_curriculum_subjects`*

### `grading_systems` (new — FR-ACA-7 SY-versioned)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | — | — | *FIX: NULL = tenant default (override-by-shadow-row)* FK → `branches(id)` |
||| `education_level_id` | UUID | NOT NULL | — | FK → `education_levels(id)` |
||| `school_year_id` | UUID | NOT NULL | — | *FIX: versioned per SY* FK → `school_years(id)` |
||| `name` | TEXT | NOT NULL | — | e.g. DepEd K-12, College GPA |
||| `type` | TEXT | NOT NULL | — | `numeric` | `descriptive` | `gpa` | `pass_fail` |
||| `config` | JSONB | — | `'{}'` | Transmutation table, weight templates, thresholds |
||| `is_active` | BOOLEAN | — | `true` | *FIX: active/default resolution rule (Phase 3 TODO)* |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: UNIQUE(tenant_id, education_level_id, school_year_id) · idx_grading_systems_tenant_branch ON grading_systems (tenant_id, branch_id) · idx_grading_systems_edu_level ON grading_systems (education_level_id) · idx_grading_systems_active ON grading_systems (tenant_id, education_level_id, school_year_id, branch_id) WHERE is_active = true*

*RLS: `tenant_isolation_grading_systems`*

### `grade_components` (new — FR-GRA-1)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `grading_system_id` | UUID | NOT NULL | — | FK → `grading_systems(id)` |
||| `name` | TEXT | NOT NULL | — | e.g. Written Work, Performance Task, Quarterly Exam |
||| `weight` | NUMERIC(5,2) | NOT NULL | — | |
||| `order` | INT | — | — | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_grade_components_tenant ON grade_components (tenant_id) · idx_grade_components_grading ON grade_components (grading_system_id)*

*RLS: `tenant_isolation_grade_components`*

### `grade_entries` (new — FR-GRA-1/2)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → `branches(id)` |
||| `student_id` | UUID | NOT NULL | — | FK → `students(id)` |
||| `class_offering_id` | UUID | NOT NULL | — | FK → `class_offerings(id)` |
||| `term_id` | UUID | NOT NULL | — | FK → `terms(id)` |
||| `grade_component_id` | UUID | NOT NULL | — | FK → `grade_components(id)` |
||| `grading_system_id` | UUID | — | — | *[G-29]* entity-only, absorb: FK → `grading_systems(id)` — pins the transmutation used at entry time (the active system may change later) |
||| `enrollment_id` | UUID | — | — | *[G-29]* entity-only, absorb: FK → `enrollments(id)` |
||| `score` | NUMERIC(5,2) | — | — | Raw score. *[G-29]* entity adds `max_score` + `percentage` — absorb both (`max_score NUMERIC(5,2)`, `percentage NUMERIC(5,2)` = raw/max × 100) |
||| `max_score` | NUMERIC(5,2) | — | — | *[G-29]* entity-only |
||| `percentage` | NUMERIC(5,2) | — | — | *[G-29]* entity-only |
||| `transmuted_score` | NUMERIC(5,2) | — | — | Transmuted grade. *[G-29]* entity names it `transmuted_grade` — entity wins (matches `grading_systems.config` transmutation vocabulary) |
||| `remarks` | TEXT | — | — | *[G-29]* entity-only, absorb |
||| `is_finalized` | BOOLEAN | — | `false` | *[G-29]* entity-only: set by `finalizeGrades()`. Keep ONE column — entity must map finalize → `locked = true` and drop `isFinalized` |
||| `entered_by` | UUID | — | — | FK → `employees(id)`. *[G-29]* entity uses `entered_by_user_id` (users) |
||| `is_manual_override` | BOOLEAN | — | `false` | *NEW: flag (FR-GRA-2)* |
||| `override_reason` | TEXT | — | — | *NEW: required when override* |
||| `overridden_by` | UUID | — | — | *NEW: FK → employees* |
||| `overridden_at` | TIMESTAMPTZ | — | — | |
||| `locked` | BOOLEAN | — | `false` | Immutable after term close |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |
||| `updated_at` | TIMESTAMPTZ | — | `now()` | *[G-29]* present on entity |

*Index: idx_grade_entries_tenant ON grade_entries (tenant_id) · idx_grade_entries_student_term ON grade_entries (tenant_id, student_id, term_id) · idx_grade_entries_class_component ON grade_entries (class_offering_id, grade_component_id) · idx_grade_entries_term_locked ON grade_entries (term_id, locked)*

*RLS: `tenant_isolation_grade_entries`*

### `honor_roll_configs` (new — FR-GRA-4 FIXED)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | — | — | NULL = tenant default |
||| `education_level_id` | UUID | NOT NULL | — | FK → `education_levels(id)` |
||| `school_year_id` | UUID | NOT NULL | — | FK → `school_years(id)` |
||| `with_honors_threshold` | NUMERIC(5,2) | — | — | e.g. 90.00 |
||| `with_high_honors_threshold` | NUMERIC(5,2) | — | — | e.g. 93.00 |
||| `with_highest_honors_threshold` | NUMERIC(5,2) | — | — | *FIX: was duplicate with_high_honors_threshold; e.g. 96.00* |
||| `is_active` | BOOLEAN | — | `true` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: UNIQUE(tenant_id, education_level_id, school_year_id) · idx_honor_roll_active ON honor_roll_configs (tenant_id, branch_id, education_level_id, school_year_id) WHERE is_active = true*

*RLS: `tenant_isolation_honor_roll_configs`*


## 4. SIS / Enrollment

### `students` (FR-SIS-1 expanded)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `lrn` | TEXT | — | — | CHECK `^\d{12}$` + UNIQUE(tenant_id,lrn) where NOT NULL |
||| `student_number` | TEXT | — | — | Auto-generated via Numbering Scheme, UNIQUE(tenant_id,student_number) |
||| `first_name` | TEXT | NOT NULL | — | |
||| `middle_name` | TEXT | — | — | *FIX: FR-SIS-1* |
||| `last_name` | TEXT | NOT NULL | — | |
||| `suffix` | TEXT | — | — | e.g. Jr, III |
||| `birth_date` | DATE | — | — | |
||| `sex` | TEXT | — | — | |
||| `address` | TEXT | — | — | *FIX: FR-SIS-1* |
||| `photo_url` | TEXT | — | — | S3 private + presigned URL |
||| `prior_school` | TEXT | — | — | *FIX: FR-SIS-1* |
||| `health_flags` | TEXT | — | — | Allergies/conditions summary |
||| `iep_notes` | TEXT | — | — | Special needs / IEP |
||| `gov_id_type` | TEXT | — | — | Encrypted per arch §10 |
||| `gov_id_number` | TEXT | — | — | Encrypted per arch §10 |
||| `status` | TEXT | — | `'active'` | active \ | inactive \ | graduated \ | transferred |
||| `custom_fields` | JSONB | — | `'{}'` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_students_tenant ON students (tenant_id) · idx_students_tenant_lrn ON students (tenant_id, lrn) · idx_students_tenant_number ON students (tenant_id, student_number)*

*RLS: `tenant_isolation_students`*

### `guardians`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `first_name` | TEXT | NOT NULL | — | |
||| `last_name` | TEXT | NOT NULL | — | |
||| `user_id` | UUID | — | — | *NEW (migration 011):* FK → users — links the guardian profile to its portal login; resolves "my children" via students my-children endpoint |
||| `contact_number` | TEXT | — | — | |
||| `email` | TEXT | — | — | |
||| `address` | TEXT | — | — | *FIX: FR-SIS-1* |
||| `photo_url` | TEXT | — | — | S3 |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_guardians_tenant ON guardians (tenant_id) · idx_guardians_tenant_email ON guardians (tenant_id, email)*

*RLS: `tenant_isolation_guardians`*

### `student_guardians`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `tenant_id` | UUID | NOT NULL | — | *FIX: RLS per arch §3* |
||| `student_id` | UUID | NOT NULL | — | FK → students, composite PK |
||| `guardian_id` | UUID | NOT NULL | — | FK → guardians, composite PK |
||| `relationship` | TEXT | — | — | FK → lookup_items (Relationship Types) — RENAMED from `relationships` to avoid collision with rebac_edges |
||| `is_primary` | BOOLEAN | — | — | |
||| `custody_flag` | BOOLEAN | — | `false` | *FIX: FR-SIS-1 custody* |
||| `emergency_priority` | INT | — | — | 1 = first call |
||| `consent_to_fetch` | BOOLEAN | — | `false` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_student_guardians_tenant ON student_guardians (tenant_id) · idx_student_guardians_student ON student_guardians (student_id) · idx_student_guardians_guardian ON student_guardians (guardian_id)*

*RLS: `tenant_isolation_student_guardians`*

### `enrollment_holds` (new — FR-ADM-6)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → `branches(id)` |
||| `student_id` | UUID | NOT NULL | — | FK → `students(id)` |
||| `enrollment_id` | UUID | — | — | FK → `enrollments(id)` NULL |
||| `hold_type` | TEXT | NOT NULL | — | FK → lookup_items (Hold Types) finance/discipline/requirements |
||| `reason` | TEXT | — | — | |
||| `blocks_schedule` | BOOLEAN | — | `false` | |
||| `blocks_tor` | BOOLEAN | — | `false` | |
||| `blocks_exam_permit` | BOOLEAN | — | `false` | |
||| `is_active` | BOOLEAN | — | `true` | |
||| `released_by` | UUID | — | — | FK → users |
||| `released_at` | TIMESTAMPTZ | — | — | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_enrollment_holds_tenant ON enrollment_holds (tenant_id) · idx_enrollment_holds_student ON enrollment_holds (student_id, is_active) · idx_enrollment_holds_enrollment ON enrollment_holds (enrollment_id)*

*RLS: `tenant_isolation_enrollment_holds`*

### `student_documents` (vault — FR-SIS-4)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → `branches(id)` |
||| `student_id` | UUID | NOT NULL | — | FK → `students(id)` |
||| `file_url` | TEXT | NOT NULL | — | S3 private |
||| `doc_type` | TEXT | NOT NULL | — | FK → lookup_items (Document Types) |
||| `is_guardian_visible` | BOOLEAN | — | `false` | Sharing flag |
||| `uploaded_by` | UUID | — | — | FK → users |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_student_documents_tenant ON student_documents (tenant_id) · idx_student_documents_student ON student_documents (student_id) · idx_student_documents_type ON student_documents (tenant_id, doc_type)*

*RLS: `tenant_isolation_student_documents`*

### `sections` (FR-ACA-8 fixed)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | |
||| `school_year_id` | UUID | NOT NULL | — | |
||| `grade_level_id` | UUID | — | — | FK → grade_levels |
||| `strand_id` | UUID | — | — | FK → strands |
||| `program_id` | UUID | — | — | FK → programs |
||| `name` | TEXT | NOT NULL | — | |
||| `adviser_employee_id` | UUID | — | — | FK → employees |
||| `room_id` | UUID | — | — | FK → rooms |
||| `capacity` | INT | — | — | *FIX: FR-ADM-5 quota* |
||| `homeroom` | TEXT | — | — | *FIX: FR-ACA-8* |
||| `is_active` | BOOLEAN | — | `true` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_sections_tenant ON sections (tenant_id) · idx_sections_tenant_branch ON sections (tenant_id, branch_id) · idx_sections_school_year ON sections (school_year_id) · idx_sections_grade ON sections (grade_level_id) · idx_sections_strand ON sections (strand_id) · idx_sections_program ON sections (program_id)*

*RLS: `tenant_isolation_sections`*

### `student_section_assignments` (new — explicit enrollment→section link, supports re-enrollment + multiple SY)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `student_id` | UUID | NOT NULL | — | FK → students |
||| `section_id` | UUID | NOT NULL | — | FK → sections |
||| `school_year_id` | UUID | NOT NULL | — | |
||| `enrollment_id` | UUID | — | — | FK → enrollments NULL |
||| `assigned_by` | UUID | — | — | FK → users |
||| `assigned_at` | TIMESTAMPTZ | — | `now()` | |
||| `assignment_rule` | TEXT | — | — | manual | strand | standing | alphabetical | quota |

*Index: idx_student_section_tenant ON student_section_assignments (tenant_id) · idx_student_section_student ON student_section_assignments (student_id, school_year_id) · idx_student_section_section ON student_section_assignments (section_id)*

*RLS: `tenant_isolation_student_section_assignments`*

### `section_assignment_rules` (new — TODO gap B5.4; FR-ADM-5 decomposable rules)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | — | — | NULL = tenant default |
||| `school_year_id` | UUID | NOT NULL | — | |
||| `rule_type` | TEXT | NOT NULL | — | strand | standing | alphabetical | quota |
||| `config` | JSONB | — | `'{}'` | e.g. {"max_capacity":40,"quota_balance":true,"alphabetical_by":"last_name"} |
||| `sort_order` | INT | — | `0` | |
||| `is_active` | BOOLEAN | — | `true` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_section_assignment_rules_tenant ON section_assignment_rules (tenant_id) · idx_section_assignment_rules_branch ON section_assignment_rules (tenant_id, branch_id, school_year_id, is_active) WHERE is_active = true*

*RLS: `tenant_isolation_section_assignment_rules`*

### `promotion_decisions` (new — FR-GRA-7)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → branches |
||| `student_id` | UUID | NOT NULL | — | FK → students |
||| `school_year_id` | UUID | NOT NULL | — | FK → school_years |
||| `from_grade_level_id` | UUID | — | — | FK → grade_levels |
||| `to_grade_level_id` | UUID | — | — | FK → grade_levels NULL if graduated |
||| `decision` | TEXT | NOT NULL | — | promoted \ | retained \ | graduated |
||| `decided_by` | UUID | — | — | FK → users |
||| `decided_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_promotion_decisions_tenant ON promotion_decisions (tenant_id) · idx_promotion_decisions_student ON promotion_decisions (student_id, school_year_id)*

*RLS: `tenant_isolation_promotion_decisions`*

### `enrollments`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | |
||| `student_id` | UUID | NOT NULL | — | FK → students |
||| `school_year_id` | UUID | NOT NULL | — | |
||| `curriculum_id` | UUID | NOT NULL | — | FK → curricula |
||| `section_id` | UUID | — | — | FK → sections |
||| `status` | TEXT | — | `'enrolled'` | enrolled | waitlisted | rejected | graduated | transferred | withdrawn |
||| `enrolled_at` | TIMESTAMPTZ | — | `now()` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: UNIQUE(student_id, school_year_id) · idx_enrollments_tenant ON enrollments (tenant_id) · idx_enrollments_tenant_branch ON enrollments (tenant_id, branch_id) · idx_enrollments_sy_branch_status ON enrollments (tenant_id, branch_id, school_year_id, status) · idx_enrollments_curriculum ON enrollments (curriculum_id)*

*RLS: `tenant_isolation_enrollments`*

### `student_transfers` (new — TODO gap B5.3; FR-ADM-8 cross-branch transfer artifact)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `destination_branch_id` | UUID | NOT NULL | — | FK → branches |
||| `student_id` | UUID | NOT NULL | — | FK → students |
||| `from_enrollment_id` | UUID | — | — | FK → enrollments |
||| `to_enrollment_id` | UUID | — | — | FK → enrollments |
||| `from_school_year_id` | UUID | — | — | |
||| `to_school_year_id` | UUID | — | — | |
||| `transfer_date` | DATE | NOT NULL | — | |
||| `reason` | TEXT | — | — | |
||| `transferred_by` | UUID | — | — | FK → users |
||| `academic_history_preserved` | BOOLEAN | — | `true` | |
||| `financial_balance_transfer` | BOOLEAN | — | `true` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_student_transfers_tenant ON student_transfers (tenant_id) · idx_student_transfers_student ON student_transfers (student_id, transfer_date)*

*RLS: `tenant_isolation_student_transfers`*

### `student_merge_audit` (new — TODO gap B5.2; FR-SIS-6 merge tool audit trail)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `merged_from_student_id` | UUID | NOT NULL | — | FK → students (the duplicate) |
||| `merged_into_student_id` | UUID | NOT NULL | — | FK → students (the survivor) |
||| `merged_by` | UUID | — | — | FK → users |
||| `merged_at` | TIMESTAMPTZ | — | `now()` | |
||| `field_map` | JSONB | — | `'{}'` | What happened to each field during merge |

*Index: idx_student_merge_tenant ON student_merge_audit (tenant_id) · idx_student_merge_from ON student_merge_audit (merged_from_student_id) · idx_student_merge_into ON student_merge_audit (merged_into_student_id)*

*RLS: `tenant_isolation_student_merge_audit`*

### `applicant_stage_configs` (new — [G-4] FR-ADM-2, Phase 4.2)
Configurable pipeline stages per tenant/level for the admissions Kanban.
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | FK → `tenants(id)` |
||| `branch_id` | UUID | — | — | NULL = tenant default; FK → `branches(id)` |
||| `education_level_id` | UUID | — | — | NULL = all levels; FK → `education_levels(id)` |
||| `stage_name` | TEXT | NOT NULL | — | e.g. inquiry, applicant, exam, admitted, enrolled, waitlisted, rejected |
||| `sort_order` | INT | — | `0` | Display order in Kanban |
||| `is_terminal` | BOOLEAN | — | `false` | Terminal stages (rejected/waitlisted) cannot transition further |
||| `is_active` | BOOLEAN | — | `true` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_applicant_stage_configs_tenant ON applicant_stage_configs (tenant_id) · idx_applicant_stage_configs_branch_level ON applicant_stage_configs (tenant_id, branch_id, education_level_id, is_active) WHERE is_active = true*

*RLS: `tenant_isolation_applicant_stage_configs`*

### `applicant_stage_transitions` (new — [G-5] FR-ADM-2, Phase 4.2 [GAP])
Defines which stages can transition to which; the Kanban UI reads allowed transitions from this table.
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | FK → `tenants(id)` |
||| `branch_id` | UUID | — | — | NULL = tenant default; FK → `branches(id)` |
||| `from_stage` | TEXT | NOT NULL | — | FK → `applicant_stage_configs.stage_name` |
||| `to_stage` | TEXT | NOT NULL | — | FK → `applicant_stage_configs.stage_name` |
||| `requires_docs` | BOOLEAN | — | `false` | Whether documents must be verified before transition |
||| `auto_admit` | BOOLEAN | — | `false` | Auto-admit on transition (e.g. exam pass → admitted) |
||| `is_active` | BOOLEAN | — | `true` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_applicant_stage_transitions_tenant ON applicant_stage_transitions (tenant_id) · idx_applicant_stage_transitions_from ON applicant_stage_transitions (tenant_id, from_stage, is_active) WHERE is_active = true*

*RLS: `tenant_isolation_applicant_stage_transitions`*

### `applicants` (new — [G-23] FR-ADM-1/2, Phase 4.2)
The admissions pipeline operates on applicants; without this table the Kanban and `applicant_stage_configs`/`applicant_stage_transitions` have no records to move. An applicant becomes a `students` row (and optionally an enrollment) when promoted to the `enrolled` stage.
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | FK → `tenants(id)` |
||| `branch_id` | UUID | NOT NULL | — | FK → `branches(id)` |
||| `applicant_number` | TEXT | — | — | Auto-generated via `numbering_schemes` (entity_type `applicant_number`); UNIQUE(tenant_id, applicant_number) |
||| `first_name` | TEXT | NOT NULL | — | |
||| `middle_name` | TEXT | — | — | |
||| `last_name` | TEXT | NOT NULL | — | |
||| `suffix` | TEXT | — | — | |
||| `birth_date` | DATE | — | — | |
||| `sex` | TEXT | — | — | |
||| `email` | TEXT | — | — | Applicant/guardian contact |
||| `contact_number` | TEXT | — | — | |
||| `address` | TEXT | — | — | |
||| `lrn` | TEXT | — | — | *[FR-ADM-3]* CHECK `^\d{12}$` when NOT NULL; prior LRN for transferring college applicants |
||| `education_level_id` | UUID | — | — | FK → `education_levels(id)` — level applying for |
||| `grade_level_id` | UUID | — | — | FK → `grade_levels(id)` |
||| `strand_id` | UUID | — | — | FK → `strands(id)` (SHS) |
||| `program_id` | UUID | — | — | FK → `programs(id)` (College) |
||| `school_year_id` | UUID | NOT NULL | — | FK → `school_years(id)` — intake year |
||| `prior_school` | TEXT | — | — | |
||| `current_stage` | TEXT | NOT NULL | — | FK → `applicant_stage_configs.stage_name` (default first active stage, e.g. `inquiry`) |
||| `stage_entered_at` | TIMESTAMPTZ | — | `now()` | For pipeline SLA/aging |
||| `custom_fields` | JSONB | — | `'{}'` | Driven by `custom_field_definitions.entity_type = 'applicant'` |
||| `source_channel` | TEXT | — | — | `online_form` | `walk_in` | `referral` | `bulk_import` |
||| `converted_student_id` | UUID | — | — | FK → `students(id)` — set when stage reaches `enrolled` |
||| `converted_at` | TIMESTAMPTZ | — | — | |
||| `created_by` | UUID | — | — | FK → `users(id)`; NULL = self-submitted online form |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |
||| `updated_at` | TIMESTAMPTZ | — | `now()` | |

*Index: UNIQUE(tenant_id, applicant_number) WHERE applicant_number IS NOT NULL · idx_applicants_tenant ON applicants (tenant_id) · idx_applicants_tenant_branch_stage ON applicants (tenant_id, branch_id, current_stage) · idx_applicants_school_year ON applicants (school_year_id) · idx_applicants_lrn ON applicants (tenant_id, lrn) WHERE lrn IS NOT NULL · idx_applicants_email ON applicants (tenant_id, email) WHERE email IS NOT NULL · idx_applicants_converted ON applicants (converted_student_id) WHERE converted_student_id IS NOT NULL*

*RLS: `tenant_isolation_applicants`*

*Note: applicant documents (birth certificate, Form 138/137, TOR, ID photo — FR-ADM-1) reuse `student_documents` with `student_id` replaced by a polymorphic `(owner_type, owner_id)` OR a sibling `applicant_documents` table; decide at implementation — default recommendation is a sibling `applicant_documents` table mirroring `student_documents` columns with `applicant_id UUID NOT NULL FK → applicants(id)` to keep FK integrity.*

### `behavior_incidents` (new — Guidance/Discipline)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → branches |
||| `student_id` | UUID | NOT NULL | — | FK → students |
||| `incident_date` | DATE | NOT NULL | — | |
||| `incident_type` | TEXT | NOT NULL | — | FK → lookup_items (Incident Types) |
||| `description` | TEXT | — | — | |
||| `status` | TEXT | — | `'open'` | open \ | resolved \ | escalated |
||| `referral_to` | UUID | — | — | FK → employees |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_behavior_incidents_tenant ON behavior_incidents (tenant_id) · idx_behavior_incidents_student ON behavior_incidents (student_id, incident_date) · idx_behavior_incidents_branch_status ON behavior_incidents (tenant_id, branch_id, status)*

*RLS: `tenant_isolation_behavior_incidents`*

### `health_records` (new — Clinic/Nurse)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → branches |
||| `student_id` | UUID | NOT NULL | — | FK → students |
||| `record_date` | DATE | NOT NULL | — | |
||| `record_type` | TEXT | NOT NULL | — | FK → lookup_items (Health Record Types) |
||| `description` | TEXT | — | — | |
||| `immunization_date` | DATE | — | — | |
||| `next_due_date` | DATE | — | — | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_health_records_tenant ON health_records (tenant_id) · idx_health_records_student ON health_records (student_id, record_date)*

*RLS: `tenant_isolation_health_records`*

---

## 5. Scheduling

### `class_offerings`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | |
||| `subject_id` | UUID | NOT NULL | — | FK → subjects |
||| `section_id` | UUID | NOT NULL | — | FK → sections |
||| `employee_id` | UUID | NOT NULL | — | FK → employees |
||| `room_id` | UUID | — | — | FK → rooms |
||| `school_year_id` | UUID | NOT NULL | — | |
||| `term_id` | UUID | NOT NULL | — | FK → terms — *FIX: conflicts scoped per-term* |
||| `day_of_week` | TEXT | NOT NULL | — | Mon | Tue | Wed | Thu | Fri | Sat |
|| `start_time` | TIME | NOT NULL | — | |
|| `end_time` | TIME | NOT NULL | — | |
|| `is_block` | BOOLEAN | — | `false` | College block-style offering |
|| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_class_offerings_tenant ON class_offerings (tenant_id) · idx_class_offerings_tenant_branch ON class_offerings (tenant_id, branch_id) · idx_class_offerings_section ON class_offerings (section_id) · idx_class_offerings_employee ON class_offerings (employee_id) · idx_class_offerings_room ON class_offerings (room_id) · idx_class_offerings_term ON class_offerings (term_id) · idx_class_offerings_conflict ON class_offerings (tenant_id, branch_id, term_id, day_of_week, start_time, end_time) — for conflict checks*

*RLS: `tenant_isolation_class_offerings`*

### `school_calendars` (new — FR-SCH-4)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → branches |
||| `school_year_id` | UUID | NOT NULL | — | FK → school_years |
||| `name` | TEXT | NOT NULL | — | |
||| `is_default` | BOOLEAN | — | `false` | Branch-specific override |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_school_calendars_tenant ON school_calendars (tenant_id) · idx_school_calendars_branch_default ON school_calendars (tenant_id, branch_id, is_default) WHERE is_default = true*

*RLS: `tenant_isolation_school_calendars`*

### `calendar_events` (new)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → branches |
||| `school_calendar_id` | UUID | NOT NULL | — | FK → school_calendars |
||| `title` | TEXT | NOT NULL | — | |
||| `event_type` | TEXT | NOT NULL | — | holiday \ | exam_week \ | training_day \ | custom |
||| `start_date` | DATE | NOT NULL | — | |
||| `end_date` | DATE | — | — | |
||| `is_attendance_day` | BOOLEAN | — | `true` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_calendar_events_tenant ON calendar_events (tenant_id) · idx_calendar_events_calendar ON calendar_events (school_calendar_id) · idx_calendar_events_date_range ON calendar_events (tenant_id, branch_id, start_date, end_date)*

*RLS: `tenant_isolation_calendar_events`*

### `student_schedules` (new — FR-SCH-3)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → branches |
||| `student_id` | UUID | NOT NULL | — | FK → students |
||| `school_year_id` | UUID | NOT NULL | — | |
||| `class_offering_id` | UUID | NOT NULL | — | FK → class_offerings |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_student_schedules_tenant ON student_schedules (tenant_id) · idx_student_schedules_student ON student_schedules (student_id, school_year_id) · idx_student_schedules_class ON student_schedules (class_offering_id)*

*RLS: `tenant_isolation_student_schedules`*

---

## 6. Attendance

### `attendance_records`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → branches |
||| `student_id` | UUID | NOT NULL | — | FK → students |
||| `class_offering_id` | UUID | NOT NULL | — | FK → class_offerings |||| `attendance_date` | DATE | NOT NULL | — | |
||| `period` | TEXT | — | — | Period identifier. *[G-29]* entity uses `period_number INT` — normalize the entity to TEXT `period` (matches `attendance_config.default_periods` JSONB keys) |
||| `enrollment_id` | UUID | — | — | *[G-29]* entity-only, absorb: FK → enrollments — daily homeroom attendance taken without a class offering needs enrollment scope |
||| `section_id` | UUID | — | — | *[G-29]* entity-only, absorb: FK → sections — daily mode has a section but no class_offering_id |
||| `minutes_late` | INT | — | — | *[G-29]* entity-only, absorb (FR-ATT-3 tardy thresholds) |
||| `excuse_reason` | TEXT | — | — | *[G-29]* entity-only, absorb — inline excuse note; formal review lives in `attendance_excuses` |
||| `verified_by` | UUID | — | — | *[G-29]* entity-only (`verified_by_user_id`), absorb — registrar/coordinator verification |
||| `status` | TEXT | NOT NULL | — | present \| absent \| tardy \| excused |
||| `recorded_by` | UUID | — | — | FK → employees. *[G-29]* entity uses `recorded_by_user_id` (users) — entity wins per `cashier_sessions` precedent (FR-CSH-1) |
||| `capture_mode` | TEXT | — | — | manual \| qr_scan \| biometric \| parent_upload (FR-ATT-2). *[G-29]* entity lacks this — add |
||| `notes` | TEXT | — | — | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

> *[G-29] Note:* `class_offering_id` is NOT NULL in this file but the entity allows daily-mode rows where only `section_id` is set. Relax to NULL-able with CHECK `(class_offering_id IS NOT NULL OR section_id IS NOT NULL)` to support FR-ATT-1 daily vs period modes.

*Index: idx_attendance_tenant ON attendance_records (tenant_id) · idx_attendance_student_date ON attendance_records (tenant_id, student_id, attendance_date) · idx_attendance_class_date ON attendance_records (tenant_id, class_offering_id, attendance_date)*

*RLS: `tenant_isolation_attendance_records`*

### `attendance_config` (new — TODO gap B6.1; FR-ATT-1 daily vs period per level)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | — | — | NULL = tenant default |
||| `education_level_id` | UUID | NOT NULL | — | FK → education_levels |
||| `mode` | TEXT | NOT NULL | — | daily \ | period |
||| `default_periods` | JSONB | — | `'[]'` | e.g. ["7:30-8:20","8:30-9:20"] for period mode |
||| `is_active` | BOOLEAN | — | `true` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: UNIQUE(tenant_id, branch_id, education_level_id) WHERE branch_id IS NULL · idx_attendance_config_active ON attendance_config (tenant_id, branch_id, education_level_id) WHERE is_active = true*

*RLS: `tenant_isolation_attendance_config`*

### `attendance_excuses` (new — FR-ATT-2)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → branches |
||| `student_id` | UUID | NOT NULL | — | FK → students |
||| `attendance_record_id` | UUID | — | — | FK → attendance_records NULL |
||| `excuse_file_url` | TEXT | — | — | S3 |
||| `reason` | TEXT | — | — | |
||| `status` | TEXT | — | `'pending'` | pending \ | approved \ | rejected |
||| `reviewed_by` | UUID | — | — | FK → users |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_attendance_excuses_tenant ON attendance_excuses (tenant_id) · idx_attendance_excuses_student ON attendance_excuses (student_id, status)*

*RLS: `tenant_isolation_attendance_excuses`*

### `attendance_notification_thresholds` (new — TODO gap B6.1; FR-ATT-3)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | — | — | NULL = tenant default |
||| `education_level_id` | UUID | — | — | NULL = all levels |
||| `trigger_type` | TEXT | NOT NULL | — | consecutive_absences \ | percent_missed \ | tardy_count |
||| `threshold_value` | NUMERIC(5,2) | NOT NULL | — | |
||| `action` | TEXT | NOT NULL | — | notify_parent \ | notify_counselor \ | escalate |
||| `audience` | JSONB | — | `'{}'` | Who to notify: {"role":"counselor","send_to_guardian":true} |
||| `is_active` | BOOLEAN | — | `true` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_attendance_thresholds_tenant ON attendance_notification_thresholds (tenant_id) · idx_attendance_thresholds_active ON attendance_notification_thresholds (tenant_id, branch_id, trigger_type) WHERE is_active = true*

*RLS: `tenant_isolation_attendance_notification_thresholds`*

---

## 7. Grading (continued from Academic Structure)

### `grade_change_requests` (new — FR-GRA-6)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → branches |
||| `student_id` | UUID | NOT NULL | — | FK → students |
||| `class_offering_id` | UUID | NOT NULL | — | FK → class_offerings |
||| `term_id` | UUID | NOT NULL | — | FK → terms |
||| `old_grade` | JSONB | — | — | |
||| `new_grade` | JSONB | NOT NULL | — | |
||| `reason` | TEXT | NOT NULL | — | |
||| `status` | TEXT | — | `'pending'` | pending \ | approved \ | rejected |
||| `requested_by` | UUID | — | — | FK → employees |
||| `approved_by` | UUID | — | — | FK → employees |
||| `approved_at` | TIMESTAMPTZ | — | — | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_grade_change_tenant ON grade_change_requests (tenant_id) · idx_grade_change_student ON grade_change_requests (student_id, status) · idx_grade_change_workflow ON grade_change_requests (id) — links to workflow_instances.entity_id*

*RLS: `tenant_isolation_grade_change_requests`*

### `permanent_records` (new — FR-GRA-5)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → branches |
||| `student_id` | UUID | NOT NULL | — | FK → students |
||| `record_type` | TEXT | NOT NULL | — | form_137 \ | tor |
||| `content` | JSONB | — | `'{}'` | Structured record data |
||| `pdf_url` | TEXT | — | — | |
||| `registrar_approved` | BOOLEAN | — | `false` | |
||| `approved_by` | UUID | — | — | FK → employees |
||| `approved_at` | TIMESTAMPTZ | — | — | |
||| `e_signature_data` | JSONB | — | — | |
||| `verification_code` | TEXT | — | — | QR/code for authenticity |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: UNIQUE(tenant_id, student_id, record_type, approved_at) · idx_permanent_records_tenant ON permanent_records (tenant_id) · idx_permanent_records_verification ON permanent_records (verification_code)*

*RLS: `tenant_isolation_permanent_records`*

---

## 8. Billing / Fee Management

### `fee_types`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `code` | TEXT | NOT NULL | — | e.g. tuition, misc, lab |
||| `name` | TEXT | NOT NULL | — | |
||| `description` | TEXT | — | — | *[G-21]* present on entity |
||| `is_taxable` | BOOLEAN | — | `false` | |
||| `tax_rate` | NUMERIC(5,2) | — | — | *[G-21]* applies when `is_taxable = true` |
||| `gl_account` | TEXT | — | — | FR-BIL-1 GL mapping. *[G-21]* entity column is `gl_account_code` — normalize the entity to `gl_account` (two-release expand/contract) |
||| `education_level_ids` | UUID[] | — | `'{}'` | *[G-21]* entity-only field, absorbed into schema (FR-BIL-1 tenant-defined level scoping) |
||| `is_active` | BOOLEAN | — | `true` | *[G-21]* present on entity |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_fee_types_tenant ON fee_types (tenant_id) · idx_fee_types_tenant_code ON fee_types (tenant_id, code) · idx_fee_types_levels ON fee_types USING GIN(education_level_ids) WHERE education_level_ids IS NOT NULL*

*RLS: `tenant_isolation_fee_types`*

### `discount_types` (new — FR-BIL-4)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `code` | TEXT | NOT NULL | — | e.g. sibling, employee, early_bird, esc_qvr, scholarship |
||| `name` | TEXT | NOT NULL | — | |
||| `discount_type` | TEXT | NOT NULL | — | percentage \ | fixed_amount |
||| `value` | NUMERIC(5,2) | NOT NULL | — | |
||| `is_stackable` | BOOLEAN | — | `true` | |
||| `requires_approval` | BOOLEAN | — | `false` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_discount_types_tenant ON discount_types (tenant_id) · idx_discount_types_tenant_code ON discount_types (tenant_id, code)*

*RLS: `tenant_isolation_discount_types`*

### `fee_structures` (FR-BIL-2 fixed)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | — | — | NULL = tenant default |
||| `template_key` | TEXT | NOT NULL | — | e.g. grade7-2026-2027 |
||| `education_level_id` | UUID | — | — | |
||| `grade_level_id` | UUID | — | — | |
||| `strand_id` | UUID | — | — | *FIX: per-strand override* FK → strands |
||| `track_id` | UUID | — | — | *FIX: per-track override* FK → tracks |||| `program_id` | UUID | — | — | FK → programs |
||| `boarding_type` | TEXT | — | — | *FIX: day/boarding* day \| boarding. *[G-21]* entity lacks this — add to entity (fee resolution precedence per spec §5) |
||| `term_id` | UUID | — | — | *FIX: per-term* FK → terms |
||| `school_year_id` | UUID | NOT NULL | — | FK → school_years |
||| `status` | TEXT | — | `'active'` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

> *[G-21] Note:* the implemented entity stores no `template_key`; the 6-level resolution precedence in `billing.service.ts` (branch+term+strand+track+program → … → tenant default) relies on the scoping columns above. Either generate `template_key` deterministically from those columns at insert time (recommended — keeps the UNIQUE(tenant_id, template_key, school_year_id) index meaningful) or drop the column from this file. Do not leave the entity and this file disagreeing.

*Index: idx_fee_structures_tenant ON fee_structures (tenant_id) · idx_fee_structures_tenant_branch ON fee_structures (tenant_id, branch_id) · idx_fee_structures_template ON fee_structures (tenant_id, template_key, school_year_id) · idx_fee_structures_resolution ON fee_structures (tenant_id, branch_id, education_level_id, grade_level_id, strand_id, track_id, program_id, boarding_type, term_id, school_year_id)*

*RLS: `tenant_isolation_fee_structures`*

### `fee_structure_items`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | *FIX: RLS* |
||| `fee_structure_id` | UUID | NOT NULL | — | FK → fee_structures |
||| `fee_type_id` | UUID | NOT NULL | — | FK → fee_types |
||| `discount_type_id` | UUID | — | — | FK → discount_types |
||| `amount` | NUMERIC(12,2) | NOT NULL | — | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_fee_structure_items_tenant ON fee_structure_items (tenant_id) · idx_fee_structure_items_structure ON fee_structure_items (fee_structure_id) · idx_fee_structure_items_fee_type ON fee_structure_items (fee_type_id)*

*RLS: `tenant_isolation_fee_structure_items`*

### `payment_plans` (new — FR-BIL-3)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | — | — | NULL = tenant default; *FIX: NULL-able* |||| `name` | TEXT | NOT NULL | — | e.g. 10-Month Installment, Full Payment |
||| `plan_type` | TEXT | NOT NULL | — | cash \| installment. *[G-21]* entity's `installments` INT + boolean-free model is NOT adopted — keep `plan_type` |
||| `num_installments` | INT | — | — | NULL for cash plan. *[G-21]* replaces entity field `installments` |
||| `discount_percent` | NUMERIC(5,2) | — | — | Cash full-payment discount %. *[G-21]* replaces entity pair `hasEarlyPaymentDiscount`/`earlyPaymentDiscountPct` (NULL/0 = no discount) |
||| `is_active` | BOOLEAN | — | `true` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_payment_plans_tenant ON payment_plans (tenant_id) · idx_payment_plans_tenant_branch ON payment_plans (tenant_id, branch_id) · idx_payment_plans_active ON payment_plans (tenant_id, branch_id, is_active) WHERE is_active = true*

*RLS: `tenant_isolation_payment_plans`*

### `installment_schedules` (new — FR-BIL-3)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | *FIX: RLS* |
||| `payment_plan_id` | UUID | NOT NULL | — | FK → payment_plans |
||| `installment_number` | INT | NOT NULL | — | 1, 2, 3, ... |
||| `due_date` | DATE | NOT NULL | — | *[G-21]* wins over entity's `dueDayOfMonth` — plans may be assessed mid-year, so an absolute date is required; entity should derive it from enrollment date + day-of-month at generation time and store the resolved date here |
||| `amount` | NUMERIC(12,2) | NOT NULL | — | *[G-21]* wins over entity's `percentageAmount` (a template % may live on the *plan* row; the schedule stores resolved pesos) |
||| `is_custom_amount` | BOOLEAN | — | `false` | |
||| `grace_period_days` | INT | — | `0` | *[G-21]* entity-only field, absorbed (penalty grace starts after this, overriding `penalty_rules.grace_days` per installment) |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_installment_schedules_tenant ON installment_schedules (tenant_id) · idx_installment_schedules_plan ON installment_schedules (payment_plan_id)*

*RLS: `tenant_isolation_installment_schedules`*

### `penalty_rules` (new — FR-BIL-6)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | — | — | NULL = tenant default |||| `grace_days` | INT | NOT NULL | `0` | |
||| `penalty_type` | TEXT | NOT NULL | — | flat \| percent_per_month. *[G-21]* entity's `dailyRatePct` is a THIRD mode — extend enum to `flat \| percent_per_month \| percent_per_day` |
||| `value` | NUMERIC(12,2) | NOT NULL | — | |
||| `max_pct` | NUMERIC(5,2) | — | — | *[G-21]* entity-only: cap on accumulated % penalties |
||| `cap_amount` | NUMERIC(12,2) | — | — | *[G-21]* entity-only: absolute peso cap |
||| `waivable` | BOOLEAN | — | `true` | FR-BIL-6: waiver requires approval + reason |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_penalty_rules_tenant ON penalty_rules (tenant_id) · idx_penalty_rules_tenant_branch ON penalty_rules (tenant_id, branch_id) · idx_penalty_rules_default ON penalty_rules (tenant_id) WHERE branch_id IS NULL*

*RLS: `tenant_isolation_penalty_rules`*

### `student_discount_grants` (new — FR-BIL-4 approval)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → branches |
||| `student_id` | UUID | NOT NULL | — | FK → students |
||| `invoice_id` | UUID | — | — | FK → invoices NULL = pre-invoice |||| `discount_type_id` | UUID | NOT NULL | — | FK → discount_types |
||| `effective_term_id` | UUID | — | — | *[G-21]* entity-only: term the grant starts (FK → terms) |
||| `expiry_term_id` | UUID | — | — | *[G-21]* entity-only: term the grant ends (FK → terms) |
||| `amount_computed` | NUMERIC(12,2) | NOT NULL | — | |
||| `status` | TEXT | — | `'pending'` | pending \| approved \| rejected via workflow_instances |
||| `approval_workflow_instance_id` | UUID | — | — | *[G-21]* entity-only: FK → workflow_instances(id) — links the FR-CFG-4 approval chain |
||| `approved_by` | UUID | — | — | FK → users |
||| `approved_at` | TIMESTAMPTZ | — | — | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_student_discount_grants_tenant ON student_discount_grants (tenant_id) · idx_student_discount_grants_student ON student_discount_grants (student_id) · idx_student_discount_grants_invoice ON student_discount_grants (invoice_id) · idx_student_discount_grants_status ON student_discount_grants (tenant_id, status)*

* RLS: `tenant_isolation_student_discount_grants`*

### `withdrawal_policies` (new — FR-BIL-8 pro-rated refund)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `education_level_id` | UUID | — | — | *[G-21]* entity-only: policies may differ per level (FK → education_levels) |
||| `effective_term_id` | UUID | — | — | *[G-21]* entity-only (FK → terms) |
||| `expiry_term_id` | UUID | — | — | *[G-21]* entity-only (FK → terms) |
||| `days_band` | TEXT | NOT NULL | — | e.g. 0-7, 8-30, 31+. *[G-21]* entity models bands inside `rules JSONB` — keep the explicit columns as canonical, treat JSONB as an accelerator only |
||| `refund_pct` | NUMERIC(5,2) | NOT NULL | — | |
||| `is_active` | BOOLEAN | — | `true` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_withdrawal_policies_tenant ON withdrawal_policies (tenant_id) · idx_withdrawal_policies_active ON withdrawal_policies (tenant_id, is_active) WHERE is_active = true*

*RLS: `tenant_isolation_withdrawal_policies`*

### `invoices`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → branches |
||| `student_id` | UUID | NOT NULL | — | FK → students |
||| `enrollment_id` | UUID | NOT NULL | — | FK → enrollments |
||| `term_id` | UUID | — | — | |||| `total_amount` | NUMERIC(12,2) | — | — | |
||| `paid_amount` | NUMERIC(12,2) | — | `'0'` | *[G-21]* AR-aging + dashboard queries reference it; keep `balance` in sync (`balance = total_amount − paid_amount − discount_amount`), computed on payment allocation |
||| `balance` | NUMERIC(12,2) | — | — | |
||| `due_date` | DATE | — | — | *[G-21]* required by AR-aging buckets (current/30/60/90+) and `idx_invoices_status` below — derived from the enrollment's payment-plan `installment_schedules.due_date` at generation |
||| `status` | TEXT | — | `'open'` | open \| partially_paid \| paid \| overdue |
||| `payment_plan_id` | UUID | — | — | FK → payment_plans |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |
||| `updated_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_invoices_tenant ON invoices (tenant_id) · idx_invoices_tenant_branch ON invoices (tenant_id, branch_id) · idx_invoices_student ON invoices (student_id, status) · idx_invoices_enrollment ON invoices (enrollment_id) · idx_invoices_status ON invoices (tenant_id, status, due_date) — needs due_date field or computed*

*RLS: `tenant_isolation_invoices`*

### `invoice_items`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | *FIX: RLS* |
||| `invoice_id` | UUID | NOT NULL | — | FK → invoices |
||| `fee_type_id` | UUID | NOT NULL | — | FK → fee_types |
||| `discount_type_id` | UUID | — | — | *NEW: FK → discount_types* |
||| `description` | TEXT | — | — | |
||| `quantity` | INT | — | `1` | *[G-21]* present on entity — multiplies `amount` for per-unit fees |
||| `amount` | NUMERIC(12,2) | NOT NULL | — | |
||| `discount_amount` | NUMERIC(12,2) | — | `0` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

> **Note:** `invoice_items` previously had no `tenant_id`. Added `tenant_id NOT NULL` + RLS + composite index. The `tenant_id` is denormalized from the parent `invoices` row for RLS enforcement — the application must populate it on insert (never trust a client-supplied tenant_id on a child table insert; always derive from the authenticated tenant context).

*Index: idx_invoice_items_tenant ON invoice_items (tenant_id) · idx_invoice_items_invoice ON invoice_items (invoice_id) · idx_invoice_items_fee_type ON invoice_items (fee_type_id)*

*RLS: `tenant_isolation_invoice_items`*

> **Phase 8 audit implementation notes (2026-09-06):**
> - `notification_rules.event_type`, `document_templates.document_type`, `employees.tin_no` were created as **JSONB** in the live DB (entity copy-paste drift) while holding plain strings — all converted to VARCHAR in migration 010. `document_type` as jsonb silently broke every `documentType === code` match in the documents UI.
> - `document_requests.status` transitions are enforced server-side (`requested → fee_assessed → paid → released`, with `rejected` allowed until release) via `PUT documents/requests/:id/status`; release remains `PUT requests/:id/approve`.
> - Seeded reference data (migration 010): 6 document templates with fees, 4 notification templates, 6 employees, 1 sample announcement.

---

## 9. Cashiering

### `idempotency_keys` (new — [G-23] arch §9; Phase 7.1 blocking)
Makes financial mutations retry-safe, including offline-POS sync replays. `idempotency.guard.ts` already reads/writes this table; it existed in no migration until [G-23] was raised.
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | FK → `tenants(id)` |
||| `key` | TEXT | NOT NULL | — | Client-supplied `Idempotency-Key` header value |
||| `endpoint` | TEXT | NOT NULL | — | e.g. `POST /api/v1/cashiering/payments` |
||| `request_hash` | TEXT | — | — | SHA-256 of the request body — a reused key with a *different* body is rejected (422) |
||| `response_status` | INT | — | — | HTTP status of the original response |
||| `response_body` | JSONB | — | — | Stored response replayed on retry |
||| `created_at` | TIMESTAMPTZ | — | `now()` | Purge job deletes rows older than 24h |
||| `expires_at` | TIMESTAMPTZ | NOT NULL | — | `created_at + 24h` per arch §9 |

*Index: UNIQUE(tenant_id, key, endpoint) · idx_idempotency_keys_expires ON idempotency_keys (expires_at) — for the purge job*

*RLS: `tenant_isolation_idempotency_keys`*

### `cashier_stations` (new — spec §8 catalogue)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → branches |
||| `station_code` | TEXT | NOT NULL | — | Unique per branch |
||| `printer_config` | JSONB | — | `'{}'` | ESC/POS agent/WebUSB + or_block_size, max_float |
||| `is_active` | BOOLEAN | — | `true` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: UNIQUE(branch_id, station_code) · idx_cashier_stations_tenant ON cashier_stations (tenant_id) · idx_cashier_stations_branch ON cashier_stations (branch_id, is_active) WHERE is_active = true*

*RLS: `tenant_isolation_cashier_stations`*

### `payment_methods` (new — spec §8 catalogue)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `code` | TEXT | NOT NULL | — | `cash` | `check` | `bank_deposit_ref` | `gcash` | `maya` | `qrph` | `card` | `online` |
||| `name` | TEXT | NOT NULL | — | Display |
||| `requires_gateway_ref` | BOOLEAN | — | `false` | |
||| `is_cash` | BOOLEAN | — | `false` | *Implemented 2026-09-06 (migration 009):* counts toward the physical drawer on session close — only `is_cash` methods are summed into `cashier_sessions` expected amounts |
||| `is_active` | BOOLEAN | — | `true` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_payment_methods_tenant ON payment_methods (tenant_id) · idx_payment_methods_tenant_code ON payment_methods (tenant_id, code)*

*RLS: `tenant_isolation_payment_methods`*

### `denomination_sets` (new — FR-CSH-6)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `currency` | TEXT | NOT NULL | `'PHP'` | |
||| `denominations` | INT[] | NOT NULL | — | e.g. {1000,500,200,100,50,20,10,5,1} |
||| `is_active` | BOOLEAN | — | `true` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_denomination_sets_tenant ON denomination_sets (tenant_id) · idx_denomination_active ON denomination_sets (tenant_id, is_active) WHERE is_active = true*

*RLS: `tenant_isolation_denomination_sets`*

### `cashier_sessions`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → branches |
||| `station_id` | UUID | — | — | *FIX: FK → cashier_stations* |
||| `cashier_user_id` | UUID | NOT NULL | — | *FIX: FK → users.id not employees* |
||| `opening_float` | NUMERIC(12,2) | — | — | |
||| `denomination_breakdown` | JSONB | — | `'{}'` | Validated vs denomination_sets |
||| `opened_at` | TIMESTAMPTZ | — | `now()` | |
||| `closing_actual` | NUMERIC(12,2) | — | — | |
||| `closed_at` | TIMESTAMPTZ | — | — | |
||| `status` | TEXT | — | `'open'` | open \ | closed \ | forced_closed |
||| `variance_amount` | NUMERIC(12,2) | — | — | Actual minus expected |
||| `variance_approved_by` | UUID | — | — | FK → users (supervisor) |
||| `variance_approved_at` | TIMESTAMPTZ | — | — | |
||| `shift_report_url` | TEXT | — | — | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_cashier_sessions_tenant ON cashier_sessions (tenant_id) · idx_cashier_sessions_tenant_branch_status ON cashier_sessions (tenant_id, branch_id, status) · idx_cashier_sessions_user ON cashier_sessions (cashier_user_id, status) · idx_cashier_sessions_open ON cashier_sessions (branch_id, status) WHERE status = 'open'*

*RLS: `tenant_isolation_cashier_sessions`*

### `series_counters` (new — architecture.md §11.2)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → branches |
||| `atp_series_id` | UUID | NOT NULL | — | FK → atp_series |
||| `counter_value` | BIGINT | NOT NULL | `0` | Last issued OR number |
||| `reserved_block_start` | BIGINT | — | — | Block reserved for offline POS |
||| `reserved_block_end` | BIGINT | — | — | |
||| `session_id` | UUID | — | — | *FIX: multi-terminal* FK → cashier_sessions NULL |
||| `reserved_at` | TIMESTAMPTZ | — | — | *FIX* |
||| `expires_at` | TIMESTAMPTZ | — | — | *FIX* |
||| `updated_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_series_counters_tenant ON series_counters (tenant_id) · idx_series_counters_series ON series_counters (atp_series_id) · idx_series_counters_session ON series_counters (session_id) WHERE session_id IS NOT NULL · idx_series_counters_reservation ON series_counters (tenant_id, branch_id, session_id) WHERE session_id IS NOT NULL AND expires_at > now()*

*RLS: `tenant_isolation_series_counters`*

### `atp_series` (new — architecture.md §11.2)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → branches |
||| `name` | TEXT | NOT NULL | — | |
||| `range_start` | BIGINT | NOT NULL | — | |
||| `range_end` | BIGINT | NOT NULL | — | |
||| `prefix` | TEXT | — | — | *[G-22]* e.g. `OR` — first segment of `or_number_display` |
||| `format_template` | TEXT | — | — | *[G-22]* renders `or_number_display` (source for [G-1]). **Implemented tokens: `{year}` and `{number}`** (e.g. `OR-{year}-{number}` → `OR-2026-0001000001`); `{number}` is the 10-digit zero-padded value |
||| `valid_from` | DATE | NOT NULL | — | |
||| `valid_to` | DATE | NOT NULL | — | |
||| `is_active` | BOOLEAN | — | `true` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_atp_series_tenant ON atp_series (tenant_id) · idx_atp_series_branch ON atp_series (branch_id) · idx_atp_series_active ON atp_series (tenant_id, branch_id, is_active) WHERE is_active = true AND valid_to >= current_date*

*RLS: `tenant_isolation_atp_series`*

### `payments`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → branches |
||| `invoice_id` | UUID | — | — | *FIX: NULL-able for ad-hoc* FK → invoices |
||| `ad_hoc_sale_id` | UUID | — | — | *FIX: FK → ad_hoc_sales* |
||| `cashier_session_id` | UUID | — | — | FK → cashier_sessions |
||| `amount` | NUMERIC(12,2) | NOT NULL | — | |
||| `method` | TEXT | NOT NULL | — | FK → payment_methods.code |
||| `gateway_reference` | TEXT | — | — | |||| `idempotency_key` | TEXT | UNIQUE | — | |
||| `reference_no` | TEXT | — | — | *[G-22]* human check/slip/deposit reference (distinct from `gateway_reference`) |
||| `status` | TEXT | — | `'completed'` | completed \| pending \| failed \| refunded |
||| `paid_at` | TIMESTAMPTZ | — | `now()` | |
||| `offline_origin` | BOOLEAN | — | `false` | |
||| `synced_at` | TIMESTAMPTZ | — | — | |
||| `denomination_breakdown` | JSONB | — | `'{}'` | Cash breakdown |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

> **Note:** `payments.invoice_id` is now nullable to support ad-hoc sales (FR-CSH-9). The CHECK constraint enforces that either `invoice_id` or `ad_hoc_sale_id` is NOT NULL.

*CHECK: (invoice_id IS NOT NULL OR ad_hoc_sale_id IS NOT NULL)*

*Index: idx_payments_tenant ON payments (tenant_id) · idx_payments_tenant_branch ON payments (tenant_id, branch_id) · idx_payments_invoice ON payments (invoice_id) · idx_payments_session ON payments (cashier_session_id) · idx_payments_idempotency ON payments (idempotency_key) · idx_payments_method ON payments (method)*

*RLS: `tenant_isolation_payments`*

### `payment_allocations` (new — FR-CSH-2)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `payment_id` | UUID | NOT NULL | — | FK → payments |
||| `invoice_id` | UUID | NOT NULL | — | FK → invoices |
||| `amount_applied` | NUMERIC(12,2) | NOT NULL | — | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_payment_allocations_tenant ON payment_allocations (tenant_id) · idx_payment_allocations_payment ON payment_allocations (payment_id) · idx_payment_allocations_invoice ON payment_allocations (invoice_id)*

*RLS: `tenant_isolation_payment_allocations`*

### `official_receipts`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → branches |
||| `payment_id` | UUID | NOT NULL | — | FK → payments |
||| `or_number` | TEXT | NOT NULL | — | *FIX [G-1/G-10]:* Gapless sequential numeric part (stored as numeric-string, e.g. `1234`); UNIQUE(branch_id, or_number) enforces gapless sequence. Cast to BIGINT for sequence operations |
||| `or_number_display` | TEXT | — | — | *NEW [G-1]:* Formatted display version (e.g. `OR-2026-0001234`) from `atp_series.format_template`; for human readability + PDF rendering only |
||| `payor_name` | TEXT | — | — | *[G-22] BIR-mandatory (FR-CSH-4)* — implemented 2026-09-06 as `payorName` (nullable; derived from the student for invoice payments, buyer name for ad-hoc sales, `Walk-in` fallback). Nullable until TIN capture lands in the pay flow |
||| `payor_tin` | TEXT | — | — | *[G-22] BIR-mandatory (FR-CSH-4)* — implemented as `payorTin` |
||| `amount` | NUMERIC(12,2) | NOT NULL | — | *[G-22] BIR-mandatory* — implemented (denormalized from the payment for the receipt record) |
||| `tax_exempt` | BOOLEAN | — | `false` | *[G-22] BIR-mandatory (FR-CSH-4)* — implemented as `isTaxExempt`. `is_offline` is NOT yet implemented (deferred with offline POS, §7.3) |
||| `atp_series_id` | UUID | NOT NULL | — | FK → atp_series |
||| `is_voided` | BOOLEAN | — | `false` | |
||| `void_reason` | TEXT | — | — | |
||| `reversed_by` | UUID | — | — | FK → official_receipts |
||| `issued_at` | TIMESTAMPTZ | — | `now()` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: UNIQUE(branch_id, or_number) · idx_official_receipts_tenant ON official_receipts (tenant_id) · idx_official_receipts_branch ON official_receipts (branch_id) · idx_official_receipts_payment ON official_receipts (payment_id) · idx_official_receipts_atp ON official_receipts (atp_series_id)*

*RLS: `tenant_isolation_official_receipts`*

### `refunds` (new — FR-CSH-10 / FR-BIL-8)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → branches |
||| `original_or_id` | UUID | NOT NULL | — | FK → official_receipts |
||| `payment_id` | UUID | — | — | FK → payments |
||| `invoice_id` | UUID | NOT NULL | — | FK → invoices |
||| `amount` | NUMERIC(12,2) | NOT NULL | — | |
||| `reason` | TEXT | NOT NULL | — | |
||| `approved_by` | UUID | — | — | FK → users via workflow_instances |
||| `status` | TEXT | — | `'pending'` | pending \ | approved \ | completed |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_refunds_tenant ON refunds (tenant_id) · idx_refunds_original_or ON refunds (original_or_id) · idx_refunds_payment ON refunds (payment_id)*

*RLS: `tenant_isolation_refunds`*

### `ad_hoc_sales` (new — FR-CSH-9)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → branches |
||| `session_id` | UUID | NOT NULL | — | FK → cashier_sessions |
||| `buyer_name` | TEXT | — | — | Walk-in buyer |
||| `total_amount` | NUMERIC(12,2) | NOT NULL | — | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_ad_hoc_sales_tenant ON ad_hoc_sales (tenant_id) · idx_ad_hoc_sales_session ON ad_hoc_sales (session_id)*

*RLS: `tenant_isolation_ad_hoc_sales`*

### `ad_hoc_sale_items` (new — FR-CSH-9)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | *FIX: RLS* |
||| `ad_hoc_sale_id` | UUID | NOT NULL | — | FK → ad_hoc_sales |
||| `fee_type_id` | UUID | NOT NULL | — | FK → fee_types (uniforms/books/ID) |
||| `qty` | INT | — | `1` | |
||| `amount` | NUMERIC(12,2) | NOT NULL | — | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_ad_hoc_sale_items_tenant ON ad_hoc_sale_items (tenant_id) · idx_ad_hoc_sale_items_sale ON ad_hoc_sale_items (ad_hoc_sale_id)*

*RLS: `tenant_isolation_ad_hoc_sale_items`*

---

## 10. Communications

### `notification_templates`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `name` | TEXT | NOT NULL | — | |
||| `event_type` | TEXT | NOT NULL | — | FK → lookup_items |
||| `channel` | TEXT | NOT NULL | — | sms \ | email \ | push \ | in_app |
||| `subject` | TEXT | — | — | |
||| `body_template` | TEXT | NOT NULL | — | Template with merge fields (catalog: {student_name}, {guardian_name}, {amount_due}, {due_date}, {student_number}, {date}, {status}, {section_name}, etc.) |
||| `is_active` | BOOLEAN | — | `true` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_notification_templates_tenant ON notification_templates (tenant_id) · idx_notification_templates_event ON notification_templates (tenant_id, event_type, channel)*

*RLS: `tenant_isolation_notification_templates`*

### `notification_rules` (new — FR-COM-1)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `event_type` | TEXT | NOT NULL | — | absence/low_balance/grade_posted/document_ready |
||| `threshold` | JSONB | — | `'{}'` | e.g. {"consecutive_absences":3} |
||| `template_id` | UUID | NOT NULL | — | FK → notification_templates |
||| `is_active` | BOOLEAN | — | `true` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_notification_rules_tenant ON notification_rules (tenant_id) · idx_notification_rules_event ON notification_rules (tenant_id, event_type, is_active) WHERE is_active = true*

*RLS: `tenant_isolation_notification_rules`*

### `channel_configs` (new — FR-COM-4)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | — | — | NULL = tenant-wide |
||| `channel` | TEXT | NOT NULL | — | sms \ | email \ | push |
||| `provider` | TEXT | NOT NULL | — | Semaphore/Movider/SES/SendGrid/FCM/APNs |
||| `credentials_ref` | TEXT | NOT NULL | — | Vault ref, never in logs |
||| `sender_id` | TEXT | — | — | |
||| `is_active` | BOOLEAN | — | `true` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_channel_configs_tenant ON channel_configs (tenant_id) · idx_channel_configs_active ON channel_configs (tenant_id, branch_id, channel, is_active) WHERE is_active = true*

*RLS: `tenant_isolation_channel_configs`*

### `notification_logs` (new — FR-COM-1 dispatch audit)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → branches |
||| `template_id` | UUID | — | — | FK → notification_templates |
||| `channel` | TEXT | NOT NULL | — | |
||| `recipient_user_id` | UUID | — | — | FK → users |
||| `recipient_contact` | TEXT | — | — | Resolved phone/email |
||| `payload` | JSONB | — | `'{}'` | Template variables + resolved values |
||| `status` | TEXT | — | `'queued'` | queued \ | sent \ | failed |
||| `provider_msg_id` | TEXT | — | — | |
||| `sent_at` | TIMESTAMPTZ | — | — | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_notification_logs_tenant ON notification_logs (tenant_id) · idx_notification_logs_status ON notification_logs (tenant_id, status) · idx_notification_logs_recipient ON notification_logs (tenant_id, recipient_user_id, sent_at)*

*RLS: `tenant_isolation_notification_logs`*

### `announcements`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | — | — | NULL = tenant-wide |
||| `title` | TEXT | NOT NULL | — | |
||| `body` | TEXT | NOT NULL | — | |
||| `audience_type` | TEXT | NOT NULL | — | all \ | grade_level \ | section \ | branch \ | custom |
||| `audience_ids` | UUID[] | — | `'{}'` | |
||| `channel` | TEXT[] | — | `'{sms,email,push}'` | |
||| `created_by` | UUID | — | — | FK → users |
||| `sent_at` | TIMESTAMPTZ | — | — | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_announcements_tenant ON announcements (tenant_id) · idx_announcements_branch ON announcements (branch_id)*

*RLS: `tenant_isolation_announcements`*

### `message_threads` (new — FR-COM-3)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → branches |
||| `subject` | TEXT | — | — | |
||| `student_id` | UUID | — | — | FK → students NULL |
||| `created_by` | UUID | NOT NULL | — | FK → users |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |
||| `updated_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_message_threads_tenant ON message_threads (tenant_id) · idx_message_threads_student ON message_threads (student_id) · idx_message_threads_created_by ON message_threads (created_by)*

*RLS: `tenant_isolation_message_threads`*

### `messages`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | *FIX: RLS* |
||| `thread_id` | UUID | NOT NULL | — | FK → message_threads |
||| `sender_user_id` | UUID | NOT NULL | — | FK → users |
||| `body` | TEXT | NOT NULL | — | |
||| `attachment_url` | TEXT | — | — | S3 |
||| `read_at` | TIMESTAMPTZ | — | — | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

> **Note:** `messages` previously had no `tenant_id`. Added for RLS enforcement. The `tenant_id` is derived from the parent `message_threads` row (which has `tenant_id NOT NULL`); the application populates it on insert.

*Index: idx_messages_tenant ON messages (tenant_id) · idx_messages_thread ON messages (thread_id, created_at DESC) · idx_messages_unread ON messages (thread_id, read_at) WHERE read_at IS NULL*

*RLS: `tenant_isolation_messages`*

### `message_thread_participants` (new — TODO gap B9.2)
> **Phase 9 audit implementation note (2026-09-06):** not created as a physical table. Participant membership is implemented as `message_threads.participantIds` (JSONB array of `users.id`, default `[]`) — migration 011. Thread listing scopes via `participantIds @> '["<userId>"]'::jsonb` containment (same per-user visibility without an extra join); read state remains on `messages.read_at` via `markRead`. Senders are auto-added as participants on first message.
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `thread_id` | UUID | NOT NULL | — | FK → message_threads; comp PK |
|| `user_id` | UUID | NOT NULL | — | FK → users; comp PK |
||| `last_read_message_id` | UUID | — | — | FK → messages |
||| `last_read_at` | TIMESTAMPTZ | — | — | When participant last read the thread |
||| `joined_at` | TIMESTAMPTZ | — | `now()` | |

*Index: UNIQUE(thread_id, user_id) · idx_thread_participants_user ON message_thread_participants (user_id, thread_id)*

*RLS: `tenant_isolation_message_thread_participants`*

---

## 11. Documents

### `document_templates`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `name` | TEXT | NOT NULL | — | |
||| `document_type` | TEXT | NOT NULL | — | FK → lookup_items |
||| `content` | JSONB | — | `'{}'` | Template definition (WYSIWYG editor state + merge fields) |
||| `version_label` | TEXT | — | — | |
||| `signatory_required` | BOOLEAN | — | `false` | |
||| `is_active` | BOOLEAN | — | `true` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |
||| `updated_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_document_templates_tenant ON document_templates (tenant_id) · idx_document_templates_type ON document_templates (tenant_id, document_type)*

*RLS: `tenant_isolation_document_templates`*

### `signatories` (new — FR-DOC-1)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | — | — | NULL = tenant-wide |
||| `name` | TEXT | NOT NULL | — | |
||| `title` | TEXT | — | — | e.g. Registrar, Principal |
||| `employee_id` | UUID | — | — | FK → employees |
||| `signature_image_url` | TEXT | — | — | |
||| `is_active` | BOOLEAN | — | `true` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_signatories_tenant ON signatories (tenant_id) · idx_signatories_branch ON signatories (tenant_id, branch_id) · idx_signatories_active ON signatories (tenant_id, branch_id, is_active) WHERE is_active = true*

*RLS: `tenant_isolation_signatories`*

### `document_requests`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → branches |
||| `student_id` | UUID | NOT NULL | — | FK → students |
||| `document_template_id` | UUID | NOT NULL | — | FK → document_templates |
||| `status` | TEXT | — | `'requested'` | requested \ | fee_assessed \ | paid \ | released \ | rejected |
||| `fee_amount` | NUMERIC(12,2) | — | `0` | |
||| `payment_id` | UUID | — | — | FK → payments |
||| `released_by` | UUID | — | — | FK → users |
||| `released_at` | TIMESTAMPTZ | — | — | |
||| `verification_code` | TEXT | — | — | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_document_requests_tenant ON document_requests (tenant_id) · idx_document_requests_student ON document_requests (student_id) · idx_document_requests_status ON document_requests (tenant_id, status)*

*RLS: `tenant_isolation_document_requests`*

### `generated_documents` (new — FR-DOC-2)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → branches |
||| `student_id` | UUID | NOT NULL | — | FK → students |
||| `template_id` | UUID | NOT NULL | — | FK → document_templates |
||| `request_id` | UUID | — | — | FK → document_requests NULL (bulk) |
||| `file_url` | TEXT | NOT NULL | — | S3 PDF |
||| `verification_code` | TEXT | NOT NULL | — | UNIQUE |
||| `qr_payload` | TEXT | — | — | |
||| `released_by` | UUID | — | — | FK → users |
||| `released_at` | TIMESTAMPTZ | — | — | |
||| `is_voided` | BOOLEAN | — | `false` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: UNIQUE(verification_code) · idx_generated_docs_tenant ON generated_documents (tenant_id) · idx_generated_docs_student ON generated_documents (student_id)*

*RLS: `tenant_isolation_generated_documents`*

### `bulk_print_jobs` (new — FR-DOC-3)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|------|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → branches |
||| `section_id` | UUID | — | — | FK → sections |
||| `template_id` | UUID | NOT NULL | — | FK → document_templates |
||| `total` | INT | NOT NULL | `0` | |
||| `done` | INT | — | `0` | |
||| `failed` | INT | — | `0` | |
||| `status` | TEXT | — | `'queued'` | queued \ | running \ | done \ | failed \ | manual_retry_required |
||| `created_by` | UUID | — | — | FK → users |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |
||| `completed_at` | TIMESTAMPTZ | — | — | |

*Index: idx_bulk_print_jobs_tenant ON bulk_print_jobs (tenant_id) · idx_bulk_print_jobs_section ON bulk_print_jobs (section_id)*

*RLS: `tenant_isolation_bulk_print_jobs`*

### `bulk_print_job_failures` (new — TODO gap B9.6)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `job_id` | UUID | NOT NULL | — | FK → bulk_print_jobs |
||| `student_id` | UUID | NOT NULL | — | FK → students |
||| `error_message` | TEXT | NOT NULL | — | |
||| `retry_count` | INT | — | `0` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_bulk_print_failures_job ON bulk_print_job_failures (job_id) · idx_bulk_print_failures_student ON bulk_print_job_failures (student_id)*

*RLS: derived from parent bulk_print_jobs row*

---

## 12. HR-Lite

### `employees` (FR-HR-1 fixed)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | — | — | NULL-able; multi-branch staff via employee_branch_assignments |
||| `first_name` | TEXT | NOT NULL | — | |
||| `last_name` | TEXT | NOT NULL | — | |
||| `email` | TEXT | — | — | |
||| `contact_number` | TEXT | — | — | |
||| `photo_url` | TEXT | — | — | S3 |
||| `hire_date` | DATE | — | — | |
||| `position` | TEXT | — | — | FK → lookup_items |
||| `department` | Text | — | — | FK → lookup_items |
||| `employment_status` | TEXT | — | — | FK → lookup_items |
||| `sss_no` | TEXT | — | — | Encrypted |
||| `philhealth_no` | TEXT | — | — | Encrypted |
||| `pagibig_no` | TEXT | — | — | Encrypted |
||| `tin_no` | TEXT | — | — | Encrypted |
||| `custom_fields` | JSONB | — | `'{}'` | |
||| `is_active` | BOOLEAN | — | `true` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_employees_tenant ON employees (tenant_id) · idx_employees_tenant_branch ON employees (tenant_id, branch_id)*

*RLS: `tenant_isolation_employees`*

### `employee_branch_assignments` (new — spec §5 multi-branch staff)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `employee_id` | UUID | NOT NULL | — | FK → employees(id); comp PK |
|| `tenant_id` | UUID | NOT NULL | — | comp PK |
||| `branch_id` | UUID | NOT NULL | — | FK → branches(id); comp PK |
||| `is_primary` | BOOLEAN | — | `false` | |
||| `assigned_at` | TIMESTAMPTZ | — | `now()` | |

*Index: UNIQUE(employee_id, tenant_id, branch_id) · idx_emp_branch_emp ON employee_branch_assignments (employee_id)*

*RLS: `tenant_isolation_employee_branch_assignments`*

### `teaching_loads`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → branches |
||| `employee_id` | UUID | NOT NULL | — | FK → employees |
||| `class_offering_id` | UUID | NOT NULL | — | FK → class_offerings |
||| `school_year_id` | UUID | NOT NULL | — | |
||| `term_id` | UUID | NOT NULL | — | FK → terms |
||| `is_substitute` | BOOLEAN | — | `false` | |
||| `substitute_for_employee_id` | UUID | — | — | FK → employees |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_teaching_loads_tenant ON teaching_loads (tenant_id) · idx_teaching_loads_employee ON teaching_loads (employee_id, term_id) · idx_teaching_loads_class ON teaching_loads (class_offering_id)*

*RLS: `tenant_isolation_teaching_loads`*

### `faculty_load_limits` (new — [G-3] FR-SCH-2, Phase 5.1)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | FK → `tenants(id)` |
||| `branch_id` | UUID | — | — | NULL = tenant default; FK → `branches(id)` |
||| `employee_id` | UUID | — | — | NULL = tenant/branch default for all faculty; FK → `employees(id)` |
||| `max_units` | NUMERIC(5,2) | — | — | Max credit units per term |
||| `max_hours_per_week` | NUMERIC(5,2) | — | — | Max teaching hours per week |
||| `warn_on_approach_pct` | NUMERIC(5,2) | — | `90` | Warning threshold percentage (e.g. 90 = warn at 90% of max) |
||| `is_active` | BOOLEAN | — | `true` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_faculty_load_limits_tenant ON faculty_load_limits (tenant_id) · idx_faculty_load_limits_branch ON faculty_load_limits (tenant_id, branch_id) · idx_faculty_load_limits_employee ON faculty_load_limits (employee_id) WHERE employee_id IS NOT NULL · idx_faculty_load_limits_default ON faculty_load_limits (tenant_id, branch_id) WHERE employee_id IS NULL AND is_active = true*

*RLS: `tenant_isolation_faculty_load_limits`*

### `dtr_records` (new — FR-HR-3)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → branches |
||| `employee_id` | UUID | NOT NULL | — | FK → employees |
||| `attendance_date` | DATE | NOT NULL | — | |
||| `time_in` | TIME | — | — | |
||| `time_out` | TIME | — | — | |
||| `source` | TEXT | — | `'manual'` | manual \ | biometric |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: UNIQUE(employee_id, attendance_date) · idx_dtr_tenant ON dtr_records (tenant_id) · idx_dtr_employee_date ON dtr_records (employee_id, attendance_date)*

*RLS: `tenant_isolation_dtr_records`*

---

## 13. Configuration Engine

### `lookup_lists`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `name` | TEXT | NOT NULL | — | e.g. Room Types, Document Types, Relationship Types, Discount Types |
||| `entity_type` | TEXT | NOT NULL | — | Code identifier |
||| `is_active` | BOOLEAN | — | `true` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_lookup_lists_tenant ON lookup_lists (tenant_id) · idx_lookup_lists_entity ON lookup_lists (tenant_id, entity_type)*

*RLS: `tenant_isolation_lookup_lists`*

### `lookup_items`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `lookup_list_id` | UUID | NOT NULL | — | FK → lookup_lists |
||| `label` | TEXT | NOT NULL | — | |
||| `value` | TEXT | NOT NULL | — | Storage key |
||| `sort_order` | INT | — | — | |
||| `is_active` | BOOLEAN | — | `true` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_lookup_items_tenant ON lookup_items (tenant_id) · idx_lookup_items_list ON lookup_items (lookup_list_id, sort_order)*

*RLS: `tenant_isolation_lookup_items`*

### `custom_field_definitions`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `entity_type` | TEXT | NOT NULL | — | student \ | employee \ | applicant \ | guardian \ | enrollment \ | invoice [G-7: FR-CFG-5/FR-SIS-5 — extended per spec §8] |
||| `field_key` | TEXT | NOT NULL | — | |
||| `field_type` | TEXT | NOT NULL | — | text \ | select \ | date \ | number \ | currency \ | file \ | relation \ | boolean |
||| `label` | TEXT | NOT NULL | — | |
||| `required` | BOOLEAN | — | `false` | |
||| `validation_rules` | JSONB | — | `'{}'` | |
||| `options` | JSONB | — | `'[]'` | |
||| `visibility_rules` | JSONB | — | `'{}'` | |
||| `sort_order` | INT | — | `0` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_custom_fields_tenant ON custom_field_definitions (tenant_id) · idx_custom_fields_entity ON custom_field_definitions (tenant_id, entity_type)*

*RLS: `tenant_isolation_custom_field_definitions`*

### `numbering_schemes` (new — FR-CFG-3)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | — | — | NULL = tenant default; row-lock per (tenant, branch, scheme) |
||| `name` | TEXT | NOT NULL | — | |
||| `entity_type` | TEXT | NOT NULL | — | student_number/employee_id/or_series/doc_ref |
||| `format` | TEXT | NOT NULL | — | e.g. {branch}-{SY}-{sequence} |
||| `counter_value` | BIGINT | — | `0` | |
||| `is_active` | BOOLEAN | — | `true` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_numbering_schemes_tenant ON numbering_schemes (tenant_id) · idx_numbering_schemes_tenant_branch ON numbering_schemes (tenant_id, branch_id) · idx_numbering_schemes_entity ON numbering_schemes (tenant_id, entity_type, is_active) WHERE is_active = true*

*RLS: `tenant_isolation_numbering_schemes`*

### `workflow_definitions` (new — FR-CFG-4)
|| Field | Type | NULLable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `entity_type` | TEXT | NOT NULL | — | discount/grade_change/refund/document |
||| `steps` | JSONB | NOT NULL | — | [{role, sla_hours, escalation_to}] |
||| `sla_hours` | INT | — | — | |
||| `escalation_to` | UUID | — | — | FK → users |
||| `is_active` | BOOLEAN | — | `true` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_workflow_defs_tenant ON workflow_definitions (tenant_id) · idx_workflow_defs_entity ON workflow_definitions (tenant_id, entity_type, is_active) WHERE is_active = true*

*RLS: `tenant_isolation_workflow_definitions`*

### `workflow_instances` (new)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | NOT NULL | — | FK → branches |
||| `entity_type` | TEXT | NOT NULL | — | |
||| `entity_id` | UUID | NOT NULL | — | Polymorphic |
||| `current_step` | INT | — | `0` | |
||| `status` | TEXT | — | `'pending'` | pending \ | approved \ | rejected \ | escalated |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |
||| `updated_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_workflow_instances_tenant ON workflow_instances (tenant_id) · idx_workflow_instances_entity ON workflow_instances (tenant_id, entity_type, entity_id)*

*RLS: `tenant_isolation_workflow_instances`*

### `workflow_approvals` (new)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | *FIX: RLS* |
||| `instance_id` | UUID | NOT NULL | — | FK → workflow_instances |
||| `approver_user_id` | UUID | NOT NULL | — | FK → users |
||| `decision` | TEXT | NOT NULL | — | approved \ | rejected |
||| `reason` | TEXT | — | — | Required if rejected |
||| `decided_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_workflow_approvals_tenant ON workflow_approvals (tenant_id) · idx_workflow_approvals_instance ON workflow_approvals (instance_id) · idx_workflow_approvals_approver ON workflow_approvals (approver_user_id)*

*RLS: `tenant_isolation_workflow_approvals`*

### `feature_flags`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | — | — | NULL = tenant-wide |
||| `flag_key` | TEXT | NOT NULL | — | e.g. college_module, offline_pos |
||| `enabled` | BOOLEAN | — | `false` | |
||| `rollout_percentage` | INT | — | `100` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_feature_flags_tenant ON feature_flags (tenant_id) · idx_feature_flags_branch ON feature_flags (tenant_id, branch_id) · idx_feature_flags_active ON feature_flags (tenant_id, branch_id, flag_key, enabled) WHERE enabled = true*

*RLS: `tenant_isolation_feature_flags`*

### `audit_events`
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | — | — | *FIX: arch §14 filter* FK → branches |
||| `actor_user_id` | UUID | — | — | FK → users |
||| `entity_type` | TEXT | NOT NULL | — | |
||| `entity_id` | UUID | NOT NULL | — | |
||| `action` | TEXT | NOT NULL | — | *[G-27]* canonical values: `create` | `update` | `delete` | `view` (entity/seed write short forms; `created/updated/deleted/viewed` are legacy aliases — normalize on read if present) |
||| `before_state` | JSONB | — | — | |
||| `after_state` | JSONB | — | — | |
||| `ip_address` | TEXT | — | — | *FIX* |
||| `request_id` | TEXT | — | — | HTTP request ID |
||| `correlation_id` | TEXT | — | — | *NEW [G-8]:* Business-operation trace ID across multiple requests (e.g. enrollment wizard spanning 3 API calls); used by OpenTelemetry distributed tracing per arch §14 |
||| `occurred_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_audit_events_tenant ON audit_events (tenant_id) · idx_audit_events_tenant_branch ON audit_events (tenant_id, branch_id) · idx_audit_events_entity ON audit_events (tenant_id, entity_type, entity_id) · idx_audit_events_actor ON audit_events (tenant_id, actor_user_id) · idx_audit_events_occurred ON audit_events (tenant_id, occurred_at DESC)*

*RLS: `tenant_isolation_audit_events`*

---

## 14. Compliance / Retention

### `retention_rules` (new — arch §10)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `document_type` | TEXT | NOT NULL | — | form_138 \ | form_137 \ | tor \ | or \ | certificate \ | id_card \ | other |
||| `retention_period_years` | INT | — | — | NULL = indefinite (e.g., Form 137) |
||| `soft_delete_after_days` | INT | — | — | |
||| `hard_purge_after_days` | INT | — | — | |
||| `is_active` | BOOLEAN | — | `true` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_retention_rules_tenant ON retention_rules (tenant_id) · idx_retention_rules_type ON retention_rules (tenant_id, document_type, is_active) WHERE is_active = true*

*RLS: `tenant_isolation_retention_rules`*

---

## 15. Integration / API

### `webhook_endpoints` (new)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `name` | TEXT | NOT NULL | — | |
||| `url` | TEXT | NOT NULL | — | |
||| `events` | TEXT[] | NOT NULL | — | e.g. payment.completed, enrollment.created |
||| `secret` | TEXT | NOT NULL | — | HMAC signing secret |
||| `is_active` | BOOLEAN | — | `true` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_webhook_endpoints_tenant ON webhook_endpoints (tenant_id) · idx_webhook_endpoints_active ON webhook_endpoints (tenant_id, is_active) WHERE is_active = true*

*RLS: `tenant_isolation_webhook_endpoints`*

### `webhook_deliveries` (new — outbound webhook audit log)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `endpoint_id` | UUID | NOT NULL | — | FK → webhook_endpoints |
||| `event_type` | TEXT | NOT NULL | — | |
||| `payload` | JSONB | NOT NULL | — | |
||| `status` | TEXT | — | `'pending'` | pending \ | sent \ | failed \ | retrying |
||| `response_status` | INT | — | — | HTTP status from endpoint |
||| `provider_msg_id` | TEXT | — | — | |
||| `next_retry_at` | TIMESTAMPTZ | — | — | For retry/backoff |
||| `attempt` | INT | — | `1` | |
||| `sent_at` | TIMESTAMPTZ | — | — | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_webhook_deliveries_tenant ON webhook_deliveries (tenant_id) · idx_webhook_deliveries_endpoint ON webhook_deliveries (endpoint_id) · idx_webhook_deliveries_status ON webhook_deliveries (tenant_id, status) · idx_webhook_deliveries_next_retry ON webhook_deliveries (next_retry_at) WHERE next_retry_at IS NOT NULL*

*RLS: `tenant_isolation_webhook_deliveries`*

---

## 16. Reporting

> *[G-19/G-21] Reconciliation note:* the implemented entities are `report_templates` (name, reportType, config JSONB, isSystem, isActive) and `scheduled_reports` (reportTemplateId, name, frequency, recipients, isActive, lastRunAt, lastRunStatus). This file's `report_definitions` and `report_subscriptions` were never created. **Decision:** keep the `tables.md` names as canonical (richer model), and treat `report_templates` → `report_definitions` and `scheduled_reports` → `report_subscriptions` as renames in the next expand/contract migration. Field mapping: `reportType` → `template_type`+`entity`; `config JSONB` → `filters`/`columns`/`group_by`; `frequency` → `cron`; `lastRunAt/lastRunStatus` → join to `report_runs` (do NOT denormalize run state onto the subscription).

### `report_definitions` (new — arch §6 aggregates)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `branch_id` | UUID | — | — | NULL = tenant-wide |
||| `name` | TEXT | NOT NULL | — | |
||| `entity` | TEXT | NOT NULL | — | students \ | invoices \ | payments \ | grades |
||| `filters` | JSONB | — | `'{}'` | |
||| `columns` | JSONB | — | `'[]'` | [{field, label, type, format, formula}] |
||| `group_by` | TEXT | — | — | |
||| `template_type` | TEXT | — | — | regulatory \ | operational |
||| `is_active` | BOOLEAN | — | `true` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_report_definitions_tenant ON report_definitions (tenant_id) · idx_report_definitions_branch ON report_definitions (tenant_id, branch_id)*

*RLS: `tenant_isolation_report_definitions`*

### `report_runs` (new)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `definition_id` | UUID | NOT NULL | — | FK → report_definitions |
||| `status` | TEXT | — | `'queued'` | queued \ | running \ | done \ | failed |
||| `file_url` | TEXT | — | — | S3 Excel/PDF/CSV |
||| `row_count` | INT | — | `0` | |
||| `run_by` | UUID | — | — | FK → users |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |
||| `completed_at` | TIMESTAMPTZ | — | — | |

*Index: idx_report_runs_tenant ON report_runs (tenant_id) · idx_report_runs_definition ON report_runs (definition_id) · idx_report_runs_status ON report_runs (tenant_id, status)*

*RLS: `tenant_isolation_report_runs`*

### `report_subscriptions` (new)
|| Field | Type | Nullable | Default | Notes |
||---|---|---|---|---|---|
|| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
|| `tenant_id` | UUID | NOT NULL | — | |
||| `definition_id` | UUID | NOT NULL | — | FK → report_definitions |
||| `cron` | TEXT | NOT NULL | — | e.g. 0 6 * * 1 |
||| `recipients` | TEXT[] | NOT NULL | — | Emails |
||| `channel` | TEXT | — | `'email'` | email |
||| `is_active` | BOOLEAN | — | `true` | |
||| `created_at` | TIMESTAMPTZ | — | `now()` | |

*Index: idx_report_subscriptions_tenant ON report_subscriptions (tenant_id) · idx_report_subscriptions_definition ON report_subscriptions (definition_id)*

*RLS: `tenant_isolation_report_subscriptions`*

---

## Cross-Table Relationship Summary (corrected from prior version)

The prior version had several relationship gaps. Key relationships now explicitly modeled:

- `users` ↔ `user_person_links` ↔ `{students|guardians|employees}` (1:1 account-to-person)
- `users` → `user_roles` → `roles` → `role_permissions` → `permissions` (RBAC)
- `users` → `rebac_edges` → `{sections|students|enrollments}` (ReBAC resource checks)
- `users` → `message_threads` (created_by), `message_threads` → `message_thread_participants` → `users` (many-to-many)
- `tenants` → `tenant_plans`; `branches` → `departments` (per-branch level activation)
- `education_levels` → `grade_levels`; `grade_levels` → `curricula`; `curricula` → `curriculum_subjects` → `subjects`
- `school_years` → `terms`; `grading_systems` → `grade_components`; `grade_components` ↔ `grade_entries`
- `fee_structures` → `fee_structure_items` → `fee_types` + `discount_types`; `invoices` → `invoice_items` → `fee_types` + `discount_types`; `invoices` → `payment_allocations` → `payments`
- `cashier_sessions` → `cashier_stations`, `payments`; `payments` → `payment_allocations`; `official_receipts` → `payments` + `atp_series`; `series_counters` → `atp_series` + `cashier_sessions`
- `document_templates` → `document_requests` → `payments`; `document_templates` → `generated_documents`; `generated_documents` → `document_requests` (nullable for bulk)
- `workflow_definitions` → `workflow_instances` → `workflow_approvals`; `workflow_instances` entity_type/entity_id is polymorphic (links to the specific workflow consumer: grade_change_requests, student_discount_grants, refunds, document_requests)

**Note on polymorphic FKs:** Several tables use polymorphic foreign keys (e.g., `workflow_instances.entity_id` → the entity table named by `workflow_instances.entity_type`; `rebac_edges.object_id` → the table named by `object_type`). PostgreSQL does not enforce cross-table FKs via a single column. These are enforced by the application layer + integration tests. The `entity_type`/`object_type` values are constrained to a known set via CHECK constraints or lookup validation.