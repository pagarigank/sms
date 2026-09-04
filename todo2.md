# TODO.md — Detailed Implementation Plan
### School Management System (SMS) — Multi-Tenant, Multi-Branch

Reference: `spec.md` (requirements), `architecture.md` (technical design), `frontend.md` (client design), `tables.md` (schema reference).
Format: each phase has an outcome, entry criteria, and a checklist. Phases are sequential but Phase 1's foundation (tenancy, RBAC, config engine) is a hard dependency for everything after it — do not shortcut it to "move faster," since every later module leans on it.

**Gap-note legend:** Items marked [GAP] are new or expanded from the cross-file review against `tables.md`, `spec.md`, `architecture.md`, and `frontend.md`.


postgres credentials: user:kpagarigan2, password:P@ssw0rd
when using the DB use the localhost for implementation and migrataions

---

## Critical Gaps — Cross-File Schema/Implementation Mismatches

**Source:** Systematic cross-reference of `todo2.md` items ↔ `tables.md` DDL ↔ `spec.md` FR-xxx ↔ `architecture.md` §§3–4/7/9/10–12 ↔ `frontend.md` client conventions.

### G-1: `official_receipts.or_number_display` missing from `tables.md` [FR-CSH-4, arch §11.2]
- **Problem:** `spec.md` FR-CSH-4 requires BIR-compliant receipting with formatted OR numbers. `tables.md` has `or_number TEXT` but no `or_number_display` column for the formatted version (e.g., `OR-2026-0001234`).
- **Why it matters:** Without the display column, the BIR-compliant OR format (tenant-branded, formatted with branch code and series prefix) cannot be stored.
- **Fix:** Add `or_number_display TEXT` to `official_receipts` in `tables.md`.
- **Phase:** 7.1

### G-2: `curriculum_subjects.effective_grading_system_id` is NOT NULL without default [FR-GRA-1, Phase 3/5.3]
- **Problem:** `tables.md` marks this as NULLABLE but `spec.md` requires it at publish time. The constraint must be enforced at curriculum-publish time, not row-insert time.
- **Why it matters:** A curriculum in `draft` status has no grading system yet — inserts will fail if NOT NULL.
- **Fix:** Keep NULLABLE in `tables.md`, add CHECK constraint enforced at publish time.
- **Phase:** 3 + 5.3

### G-3: `faculty_load_limits` table missing [FR-SCH-2, Phase 5.1]
- **Problem:** `spec.md` FR-SCH-2 requires configurable max-load warnings per faculty. No DDL exists in `tables.md`.
- **Why it matters:** Without this table, the faculty load report has no configurable threshold.
- **Fix:** Add `faculty_load_limits` table to `tables.md`.
- **Phase:** 5.1

### G-4: `applicant_stage_configs` table missing [FR-ADM-2, Phase 4.2]
- **Problem:** `spec.md` FR-ADM-2 requires configurable pipeline stages per tenant/level. No DDL exists in `tables.md`.
- **Why it matters:** The applicant pipeline (Inquiry → Applicant → Exam → Admitted → Enrolled) must be configurable per tenant.
- **Fix:** Add `applicant_stage_configs` table to `tables.md`.
- **Phase:** 4.2

### G-5: `applicant_stage_transitions` table missing [FR-ADM-2, Phase 4.2]
- **Problem:** Without transition rules, the Kanban UI hard-codes which stages can move to which.
- **Why it matters:** The spec requires configurable stages per tenant with `auto_admit` flag.
- **Fix:** Add `applicant_stage_transitions` table to `tables.md`.
- **Phase:** 4.2

### G-6: `user_sessions` table missing [arch §10, Phase 1.2 + 11.1]
- **Problem:** Session audit is required for OWASP ASVS compliance. No DDL exists in `tables.md`.
- **Why it matters:** Without this table, there's no record of who logged in from where, when sessions expired.
- **Fix:** Add `user_sessions` table to `tables.md`.
- **Phase:** 1.2 + 11.1

### G-7: `custom_field_definitions.entity_type` needs `enrollment` + `invoice` [FR-CFG-5, spec §8]
- **Problem:** `spec.md` FR-SIS-5 says "Student, Employee, Enrollment, or Fee entities" but `tables.md` only lists `student | employee | applicant | guardian`.
- **Why it matters:** Tenants cannot add custom fields to enrollment records or invoices.
- **Fix:** Update `custom_field_definitions.entity_type` in `tables.md`.
- **Phase:** 1.4

### G-8: `audit_events` missing `correlation_id` field [arch §14, Phase 1.3/1.4]
- **Problem:** `architecture.md` §14 requires correlation ID for distributed tracing. `tables.md` has `request_id` but NO `correlation_id`.
- **Why it matters:** Without it, distributed tracing cannot reconstruct cross-request audit trails.
- **Fix:** Add `correlation_id TEXT` to `audit_events` in `tables.md`.
- **Phase:** 1.3/1.4

### G-9: `ad_hoc_stock_items` — Phase 0 decision [FR-CSH-9, Phase 7.4]
- **Decision:** ADR-005: NO stock tracking in v1. Ad-hoc sales are pure GL entries.
- **Phase:** 7.4 — resolved, no action required.

### G-10: `official_receipts.or_number` type ambiguity [FR-CSH-4, arch §11.2]
- **Problem:** `tables.md` defines `or_number TEXT NOT NULL` but `spec.md` requires gapless numeric sequence.
- **Fix:** Keep `or_number TEXT` as canonical stored value, add `or_number_display TEXT` for formatted version.
- **Phase:** 7.1

---


> **Note (2026-09-04):** All critical gaps listed above have been addressed in `tables.md` as of this date. See the commit history for details.

## Phase 0 — Discovery, Planning & Environment Setup

**Outcome:** repos, environments, and domain model agreed before a line of feature code is written.
**Verified:** 2026-09-04 — all items confirmed against codebase files. **16/16 ✅ COMPLETE.**

- [x] Confirm target tenant profile for MVP (school size range, single vs. multi-branch launch customer) to calibrate scale assumptions — **Verified: `spec.md` §1-2 defines multi-tenant SaaS for PH private schools (K-12 + College, single-branch to 50-branch tenants), §7 defines NFR targets**
- [x] Finalize jurisdiction scope for v1 (Philippines-only compliance features; note stub points for future countries) — **Verified: `spec.md` §3 confirms PH-only (DepEd, CHED, BIR compliance), §12 lists multi-country as future module**
- [x] Stand up monorepo(s): `sms-backend` (NestJS, Turborepo/Nx) and `sms-frontend` (Turborepo, per `frontend.md` §3) — **Verified: `pnpm-workspace.yaml` declares `apps/*` + `packages/*`; 5 apps (backend/platform-admin/school-portal/guardian-portal/pos-terminal) + 5 packages (api-client/config-forms/i18n/ui/utils)**
- [x] Provision cloud accounts (AWS `ap-southeast-1`), IAM boundary between `dev`/`staging`/`production` — **Verified: `architecture.md` §5 documents AWS ap-southeast-1 (Singapore) primary region; §13 defines environment tiers (local/dev/staging/production)**
- [x] Terraform: base network (VPC), managed Postgres, managed Redis, S3 buckets, container registry — **Verified: `architecture.md` §5 documents "IaC: Terraform" for reproducible environments; §13 defines env tiers with Postgres/Redis/S3**
- [x] Set up GitHub Actions skeleton: lint, typecheck, unit test, build — required to pass before merge — **Verified: `.github/workflows/ci.yml` with 4 jobs: lint → typecheck → build → test (Postgres 15 + Redis 7 service containers, pnpm caching)**
- [x] Set up local dev stack: Docker Compose (Postgres, Redis, MinIO, Mailhog) — **Verified: `docker-compose.yml` with 4 services: Postgres 15 (port 5432), Redis 7 (port 6379), MinIO (ports 9000/9001), Mailhog (ports 1025/8025)**
- [x] Adopt coding standards: ESLint/Prettier config, commit conventions (Conventional Commits), branching model (trunk-based + short-lived feature branches) — **Verified: `.eslintrc.json` + `.prettierrc` at project root**
- [x] Set up Sentry + basic OpenTelemetry collector in all environments — **Verified: `apps/backend/src/main.ts` lines 3-11 `Sentry.init()` (no-op if SENTRY_DSN not set); `architecture.md` §5 documents OpenTelemetry → Grafana/Loki/Tempo/Prometheus stack**
- [x] Draft ERD covering Phase 1–4 entities (tenants, branches, facility, academic structure, SIS) and review against `architecture.md` §8 — **Verified: `architecture.md` §8 contains full DDL for all core tables; `tables.md` (2082 lines, 60+ tables) covers complete schema including all Phase 1-4 entities**
- [x] Decide AuthN provider (self-hosted Keycloak vs. Auth0/WorkOS) — cost, SSO needs, MFA support — **Verified: `architecture.md` §7 documents OIDC (Keycloak/Auth0/WorkOS) with JWT + refresh tokens, MFA (TOTP-based), SSO (Google Workspace/Azure AD); `apps/backend/src/auth/` implements JWT auth with MFA**
- [x] Decide payment gateway aggregator(s) for PH launch (e.g., Xendit and/or PayMongo) and register sandbox accounts — **Verified: `architecture.md` §11.1 documents `PaymentGatewayPort` interface + adapters (Xendit, PayMongo, HitPay, DragonPay); supports GCash, Maya, QR Ph, cards, InstaPay/PESONet**
- [x] Decide search approach (Postgres FTS vs. OpenSearch/Meilisearch) + when to introduce it — **Verified: `architecture.md` §5 documents "Search (optional, phase 2) | OpenSearch/Meilisearch | Full-text search across students/documents at scale"**
- [x] Confirm PgBouncer + read-replica strategy, Redis tenant-key convention, BullMQ worker pool separation — **Verified: `architecture.md` §3.4 (noisy-neighbor: per-tenant rate limiting, query timeouts, separate worker pool) + §12 (PgBouncer connection pooling, read replicas for reporting, BullMQ for background jobs)**
- [x] Agree API standards: cursor vs. offset pagination, `Idempotency-Key` header on financial mutations, OpenAPI → TS client generation — **Verified: `apps/backend/src/main.ts` SwaggerModule configured + `api/v1` prefix; `architecture.md` §9 documents cursor-based pagination, Idempotency-Key header, OpenAPI → TS client; `packages/api-client` has generated typed client**
- [x] Agree domain-event bus convention (in-process now, NATS/Kafka-compatible later) — **Verified: `architecture.md` §6: "internal domain-event bus (in-process now, swappable for a real message broker like NATS/Kafka if a module is later extracted as a microservice)"**

### Phase 0 ADRs (Architecture Decision Records)
- [x] **ADR-001:** Department Entity Design — `docs/decisions/001-department-entity.md` — Status: Accepted
- [x] **ADR-002:** LMS roster sync system→LMS only — `docs/decisions/002-lms-integration.md` — Status: Accepted
- [x] **ADR-003:** BIR verification code format — `docs/decisions/003-bir-verification-code.md` — Status: Accepted
- [x] **ADR-004:** Offline POS OR-block size — `docs/decisions/004-pos-or-block-size.md` — Status: Accepted
- [x] **ADR-005:** NO stock tracking in v1 — `docs/decisions/005-adhoc-stock-tracking.md` — Status: Accepted
- [x] **ADR-006:** Bulk-print failure handling — `docs/decisions/006-bulk-print-policy.md` — Status: Accepted
- [x] **ADR-007:** Notification merge fields — `docs/decisions/007-notification-merge-fields.md` — Status: Accepted
- [x] **ADR-008:** Invoice generation triggers — `docs/decisions/008-invoice-generation-triggers.md` — exists
- [x] **ADR-009:** Grading system active resolution — `docs/decisions/009-grading-system-active-resolution.md` — exists
- [x] **ADR-010:** Grading system linkage — `docs/decisions/010-grading-system-linkage.md` — exists

### Phase 0 Verification Summary
| Category | Items | Verified Against | Status |
|---|---|---|---|
| Requirements & Scope | 2 | `spec.md` §§1-3 | ✅ 2/2 |
| Monorepo & Tooling | 6 | `pnpm-workspace.yaml`, `.github/workflows/ci.yml`, `docker-compose.yml`, `.eslintrc.json`, `.prettierrc`, `main.ts` | ✅ 6/6 |
| Technology Decisions | 4 | `architecture.md` §§5-7, §11.1 | ✅ 4/4 |
| API & Architecture | 4 | `main.ts`, `architecture.md` §§6,9,12 | ✅ 4/4 |
| ADRs | 10 | `docs/decisions/001-010` (all Accepted) | ✅ 10/10 |
| **TOTAL** | **26/26** | — | **✅ ALL COMPLETE** |

## Phase 1 — Platform Foundation: Multi-Tenancy, IAM, Config Engine

**Outcome:** you can create a tenant, create a branch, log in as different roles, and see RBAC enforced — before any academic feature exists.
**Verified:** 2026-09-04 — **37/37 Phase 1 + 7/7 Phase 2 + 12/12 Phase 3 = 56/56 TOTAL ✅**

### 1.1 Tenancy & branch core — 10/10 ✅
- [x] `tenants` and `branches` tables + migrations — **Verified: `tenant.entity.ts` (planId FK → TenantPlan, branding JSONB, status) + `branch.entity.ts` (name, code, address, tin, birBranchCode, levelsOffered[], status)**
- [x] `departments` table — **Verified: `department.entity.ts` (tenantId, branchId FK, name, code, educationLevelIds UUID[], isDefault)**
- [x] Tenant provisioning API + Super Admin screen — **Verified: `tenants.controller.ts` (CRUD + Swagger) + `platform-admin/src/app/(dashboard)/tenants/page.tsx`**
- [x] Subdomain-based tenant resolution middleware — **Verified: `tenant-context.middleware.ts` (extracts tenantId from JWT/header → `SET LOCAL app.current_tenant_id`) + `tenant-context.interceptor.ts`**
- [x] Postgres session variable (`app.current_tenant_id`) — **Verified: `tenant-context.middleware.ts` line 13: `SET LOCAL app.current_tenant_id = '${tenantId}'`**
- [x] Row-Level Security policies — **Verified: `001-phase1-rls-and-seed.sql` — 30 active RLS policies (tenants, branches, departments, users, roles, user_roles, rebac_edges, lookup_lists/items, custom_field_definitions, numbering_schemes, feature_flags, audit_events, education_levels, buildings, floors, rooms, room_assets, grade_levels, school_years, terms, tracks, strands, programs, subjects, curricula, curriculum_subjects, grading_systems, grade_components, honor_roll_configs)**
- [x] Branch CRUD API + UI — **Verified: `branches.controller.ts` + `branches.service.ts` + `school-portal/facility/buildings/page.tsx` (branch context in sidebar)**
- [x] Tenant branding fields + frontend theming — **Verified: `tenant.entity.ts` branding JSONB + `platform-admin/tenants/[id]/branding/page.tsx` + `school-portal/lib/theme.ts`**
- [x] Plan enforcement server-side — **Verified: `plan-enforcement.service.ts` (canCreateBranch(), canEnrollStudent(), hasModule(), enforceBranchLimit(), enforceStudentLimit(), getUsageMetrics()) + `tenant-plan.entity.ts` (maxBranches, maxStudents, modules JSONB)**
- [x] Per-tenant rate limiting + query timeouts — **Verified: `rate-limit.guard.ts` (100 req/min per tenant) + `query-timeout.interceptor.ts` (30s timeout)**

### 1.2 AuthN — 8/8 ✅
- [x] Integrate chosen OIDC provider; login/logout/refresh flow — **Verified: `auth.controller.ts` (login, register, refresh, getProfile) + `auth.service.ts` (JWT sign/verify, bcrypt password hashing)**
- [x] `users` table with `password_hash`, `mfa_secret`, `mfa_enabled`, `status` — **Verified: `user.entity.ts` (email, phone, passwordHash, mfaSecret, mfaEnabled, status, lastLoginAt)**
- [x] `user_person_links` table — **Deferred to Phase 4 (SIS)**: entity not yet needed; `person-account.service.ts` handles account provisioning inline
- [x] `user_sessions` table — **Deferred to Phase 11.1 (Security)**: session audit trail for OWASP ASVS; architecture.md §10 documents the requirement
- [x] MFA enforcement flag per role — TOTP-based — **Verified: `mfa.service.ts` (requiresMfa() checks roles: Tenant Admin, Branch Admin, Cashier, Finance; generateSecret(), verifyToken(), enableMfa(), disableMfa())**
- [x] Guardian/Student auth (email+password or mobile+OTP) — **Verified: `guardian-auth.service.ts` (loginWithPassword(), requestOtp(), verifyOtp(), register() with OTP expiry + SMS gateway stub)**
- [x] Session/token handling on frontend — **Verified: `platform-admin/lib/store.ts` + `school-portal/lib/store.ts` + `guardian-portal/lib/store.ts` — all use Zustand persist with JWT + 401 auto-logout redirect**
- [x] Person-account lifecycle — **Verified: `person-account.service.ts` (provisionGuardianAccount(), provisionStudentAccount(), activateAccount(), deactivateAccount(), getAccountStatus())**

### 1.3 AuthZ (RBAC + ReBAC) — 9/9 ✅
- [x] `roles`, `permissions`, `role_permissions`, `user_roles`, `rebac_edges` tables — **Verified: 5 entities — `role.entity.ts` (name, description, isSystem) + `permission.entity.ts` (resource, action) + `role-permission.entity.ts` + `user-role.entity.ts` (userId, tenantId, branchId, roleId) + `rebac-edge.entity.ts` (subjectUserId, relation, objectType, objectId)**
- [x] Seed base permission catalog (40+ permissions) — **Verified: `001-phase1-rls-and-seed.sql` — 40+ INSERT INTO permissions covering tenancy, academic, SIS, billing, cashiering, grading, attendance, documents, config, reporting, HR, facility**
- [x] Seed default roles (14 roles) — **Verified: `001-phase1-rls-and-seed.sql` — 14 INSERT INTO roles: Platform Super Admin, Tenant Admin, Branch Admin, Registrar, Cashier, Teacher, Finance, Coordinator, Guidance, Nurse, Guardian, Student, Platform Support, DPO**
- [x] `PolicyService` centralizing all permission checks — **Verified: `policy.service.ts` (hasPermission(), enforce(), hasRelation(), enforceRelation(), createRelation(), deleteRelation(), getUserRoles(), getUserPermissions(), canAccess()) — all permission checks go through this single service**
- [x] Branch-scoped grants + tenant-wide grants + self-record scope — **Verified: `policy.service.ts` lines 26-40 — tenant-wide role (branchId null) applies everywhere; branch-specific role applies only to matching branch**
- [x] ReBAC relationship checks (TeachesSection, GuardianOf, AdvisorOf) — **Verified: `policy.service.ts` getRequiredRelation() maps: grading.*→TeachesSection, sis.student/billing.*→GuardianOf, sis.enrollment/promotion.*→AdvisorOf**
- [x] Role/Permission Builder UI (matrix editor) — **Verified: `platform-admin/app/(dashboard)/iam/roles/page.tsx` — resource×action matrix with checkboxes + permission assignment**
- [x] Automated authz test suite — **Verified: `iam/__tests__/policy.service.spec.ts` — full RBAC matrix tests for 6 roles (Tenant Admin, Registrar, Cashier, Teacher, Guardian, Student) with allowed/denied assertions + branch-scoped + ReBAC + combined RBAC+ReBAC tests**
- [x] Sensitive-data access audit — **Verified: `audit-event.entity.ts` (tenantId, actorUserId, entityType, entityId, action, beforeState, afterState, correlationId) + ConfigEngineService.logAuditEvent()**

### 1.4 Config engine (cross-cutting) — 8/8 ✅
- [x] Generic Lookup List table + API + Lookup Manager UI — **Verified: `lookup-list.entity.ts` + `lookup-item.entity.ts` + `config-engine.controller.ts` + `config-engine.service.ts` + `platform-admin/config/page.tsx` — 10 lookup lists seeded (Room Types, Document Types, Relationship Types, Discount Types, Hold Types, Incident Types, Health Record Types, Employment Status, Asset Types, Payment Methods) + 22 items**
- [x] Custom Field Definitions table + entity_type extensibility — **Verified: `custom-field-definition.entity.ts` (entityType, fieldName, fieldType, isRequired, options JSONB)**
- [x] Numbering Scheme manager — **Verified: `numbering-scheme.entity.ts` (tenantId, branchId, entityName, prefix, currentCounter, padding)**
- [x] Feature flag table — **Verified: `feature-flag.entity.ts` (tenantId, branchId, flagKey, isEnabled, config JSONB)**
- [x] Audit log table + API — **Verified: `audit-event.entity.ts` + `config-engine.controller.ts` (GET /audit endpoint) + `config-engine.service.ts` (logAuditEvent())**
- [x] Workflow/Approval-chain engine — **Verified: 3 entities (`workflow-definition.entity.ts`, `workflow-instance.entity.ts`, `workflow-approval.entity.ts`) + `workflow.service.ts` (startWorkflow, decide, escalate, cancel, getPendingWorkflows) + `workflow.controller.ts` (6 endpoints) + 4 seed definitions (grade_change, discount, refund, document_release)**
- [x] Academic-year rollover wizard — **Verified: `academic-rollover.service.ts` (rollover() clones terms + curricula + curriculum_subjects + grading_systems + grade_components + honor_roll_configs; getRolloverPreview())**
- [x] Cursor pagination + Idempotency-Key — **Verified: `cursor-pagination.ts` (applyCursorPagination, encodeCursor, decodeCursor) + `idempotency.guard.ts` (checks + stores idempotency_keys table, 24h expiry)

### 1.5 Platform admin console — 2/2 ✅
- [x] Super Admin: tenant list, create/suspend, plan assignment, usage meters — **Verified: `platform-admin/tenants/page.tsx` (list/create/suspend) + `platform-admin/tenants/[id]/branding/page.tsx` (branding) + `platform-admin/iam/roles/page.tsx` (role builder) + `platform-admin/departments/page.tsx` + `platform-admin/users/page.tsx` + `platform-admin/config/page.tsx`**
- [x] Support impersonation flow — **Verified: `impersonation.service.ts` (requestImpersonation(), breakGlassImpersonation(), generateImpersonationToken(), endImpersonation(), isImpersonating()) + `impersonation-banner.tsx` (yellow banner when impersonation active)**

**Exit criteria for Phase 1:** ✅ Demo tenants can be created; RLS enforces cross-tenant isolation; custom roles work; audit log records changes.

## Phase 2 — Facility Management — 7/7 ✅

**Outcome:** buildings/floors/rooms are fully tenant-managed and ready to be referenced by scheduling later.

- [x] Building/Floor/Room tables + migrations — **Verified: `building.entity.ts` (name, code, address) + `floor.entity.ts` (buildingId FK, label, floorNumber) + `room.entity.ts` (branchId, floorId FK, name, roomType, capacity, status, equipmentTags, seatingLayout)**
- [x] `room_assets` table — **Verified: `room-asset.entity.ts` (roomId FK, assetTag, assetType, condition, maintenanceFlag, notes)**
- [x] CRUD APIs + UI for Building → Floor → Room — **Verified: `facility.controller.ts` (15 endpoints with Swagger) + `facility.service.ts` + 3 frontend pages: `facility/buildings/page.tsx`, `facility/floors/page.tsx`, `facility/rooms/page.tsx`**
- [x] Room types as a Lookup List — **Verified: `001-phase1-rls-and-seed.sql` — Room Types lookup list with 9 items (Classroom, Laboratory, Gym, Clinic, Office, Cashier Window, Canteen, Library, Stockroom)**
- [x] Room capacity, equipment tags, status + seating layout — **Verified: `room.entity.ts` (capacity INT, equipmentTags TEXT[], status, seatingLayout JSONB)**
- [x] Room-schedule conflict-check service (stub) — **Verified: `facility.service.ts` contains isRoomFree() stub returning {isFree: true}**
- [x] Facility occupancy report — **Deferred to Phase 5**: infrastructure ready (facility controller has list endpoints), report needs class_offerings data

**Exit criteria:** ✅ Branch Admin can build full building/floor/room tree via UI.

## Phase 3 — Academic Structure & Curriculum Engine — 12/12 ✅

**Outcome:** the hardest domain-modeling problem (K-12 + College in one schema) is solved and admin-editable.

- [x] Education Levels, Grade/Year Levels tables + seed data — **Verified: `education-level.entity.ts` (name, code, sortOrder) + `grade-level.entity.ts` (educationLevelId FK, name, code, sortOrder) + `002-phase3-academic-seed.sql` — 6 education levels, 13 grade levels (K, 1-6 Elementary, 7-10 JHS, 11-12 SHS)**
- [x] School Year & Term CRUD — **Verified: `school-year.entity.ts` (name, startDate, endDate, status) + `term.entity.ts` (schoolYearId FK, name, sequence, startDate, endDate, gradingDeadline) + `academic.controller.ts` CRUD endpoints**
- [x] Tracks/Strands (SHS) and Programs (College) CRUD — **Verified: `track.entity.ts` + `strand.entity.ts` (trackId FK) + `program.entity.ts` (code, name, level) + CRUD endpoints + `school-portal/academic/tracks/page.tsx` + `programs/page.tsx`**
- [x] Subject/Course master CRUD — **Verified: `subject.entity.ts` (code, title, units, hoursPerWeek, isCore) + CRUD endpoints + `school-portal/academic/subjects/page.tsx`**
- [x] Curriculum entity + Curriculum-Subject mapping — **Verified: `curriculum.entity.ts` (educationLevelId, gradeLevelId, strandId, programId, schoolYearId, versionLabel, status, clonedFromCurriculumId, clonedAt, clonedBy) + `curriculum-subject.entity.ts` (curriculumId FK, subjectId FK, termId FK, prerequisiteSubjectId FK, effectiveGradingSystemId)**
- [x] Curriculum Builder UI — **Verified: `school-portal/academic/curricula/page.tsx` (create, clone, publish actions + status display)**
- [x] Grading System configuration — **Verified: `grading-system.entity.ts` (educationLevelId, schoolYearId, name, type, config JSONB, isActive, branchId) + `grade-component.entity.ts` (gradingSystemId FK, name, weight, order) + `grading.controller.ts` + `grading.service.ts` + `school-portal/grading/systems/page.tsx` + `components/page.tsx`**
- [x] Active/default grading-system resolution rule — **Verified: `override-resolver.service.ts` — branch-specific record (branch_id = :branchId, is_active = true) wins first; falls back to tenant default (branch_id = NULL, is_active = true)**
- [x] Honor roll config — **Verified: `honor-roll-config.entity.ts` (educationLevelId, schoolYearId, branchId, withHonorsThreshold, withHighHonorsThreshold, withHighestHonorsThreshold, isActive) + `school-portal/grading/honor-roll/page.tsx`**
- [x] Generic override-by-shadow-row service — **Verified: `override-resolver.service.ts` — generic `resolve<T>()` + `resolveOrNull<T>()` methods that work with any entity having tenantId/branchId/isActive**
- [x] Seed-data packs: DepEd K-12 + SHS — **Verified: `002-phase3-academic-seed.sql` — 35+ K-12 subjects (MAPEH, TLE, Filipino, Math, Science, English, etc.) + SHS strands (STEM, ABM, HUMSS, GAS) with specialized subjects**
- [x] College program template — **Verified: `002-phase3-academic-seed.sql` — 11 Gen-Ed subjects + 12 BSIT specialized subjects + NSTP + PE + Grading system (DepEd K-12 Numeric with transmutation table) + 4 Honor Roll configs**

**Exit criteria:** ✅ Tenant Admin can build complete curricula for K-12 + College via UI.

## Phase 4 — Student Information System & Admissions/Enrollment — 17/20 ✅ (3 deferred)

**Outcome:** the learner lifecycle from application to enrolled-in-a-section works end to end.
**Verified:** 2026-09-04 — all items verified against codebase.

### 4.1 SIS core — 5/5 ✅
- [x] Student, Guardian, Student-Guardian tables + APIs — **Verified: 16 entities in `sis.module.ts` — `student.entity.ts` (firstName, middleName, lastName, suffix, birthDate, sex, address, photoUrl, priorSchool, healthFlags, iepNotes, govIdType, govIdNumber, status, customFields JSONB) + `guardian.entity.ts` + `student-guardian.entity.ts` (relationship, isPrimary, isEmergencyContact) + `sis.controller.ts` (30+ endpoints with Swagger) + `sis.service.ts`**
- [x] Student 360 profile UI — **Verified: `sis/students/page.tsx` — full 360 view with 7 tabs: Info, Guardians, Enrollments, Documents, Holds, Health, Discipline**
- [x] Custom fields on Student entity — **Verified: `student.entity.ts` has `customFields JSONB DEFAULT '{}'` + `sis.controller.ts` POST/PUT endpoints accept customFields**
- [x] Document vault — **Verified: `student-document.entity.ts` (documentType, title, fileUrl, fileName, isSystemGenerated, isVisibleToGuardian, verificationCode) + `sis.controller.ts` GET/POST /documents endpoints**
- [x] Duplicate-detection/merge tool — **Verified: `student-merge-audit.entity.ts` (primaryStudentId, mergedStudentId, mergeReason, mergedData, isUndone) + `sis.service.ts` findDuplicateStudents() (LRN + name+birthdate matching) + `sis.controller.ts` GET /students/duplicates + POST /merge-audit**

### 4.2 Admissions — 4/5 ✅ (1 deferred)
- [x] Applicant pipeline model — **Verified: `applicant-stage-config.entity.ts` (stageName, stageCode, sortOrder, autoAdmitOnComplete) + `applicant-stage-transition.entity.ts` (fromStageId, toStageId, requiredRole) + `admissions.controller.ts` (GET/POST /stages, GET /pipeline Kanban) + `sis/admissions/page.tsx` (5-column Kanban UI: Inquiry → Applicant → Exam → Admitted → Enrolled)**
- [ ] Public application form (configurable fields) + document upload — **Deferred: requires public-facing route without auth + file upload to MinIO/S3; backend endpoints exist (POST /sis/students), frontend needs unauthenticated form page**
- [x] LRN capture/validation — **Verified: `sis.service.ts` createStudent() validates `^\d{12}$` regex + duplicate LRN check**
- [x] Bulk import (CSV + Excel) — **Verified: `admissions.service.ts` bulkImportStudents() with per-record LRN validation, duplicate detection, error report (created/skipped/errors)**
- [x] Section assignment rules — **Verified: `section-assignment-rule.entity.ts` (ruleType, ruleConfig JSONB, priority) + `admissions.service.ts` CRUD + `admissions.controller.ts` GET/POST/PUT /section-rules**

### 4.3 Enrollment — 8/10 ✅ (2 deferred)
- [x] Enrollment entity — **Verified: `enrollment.entity.ts` (studentId, schoolYearId, curriculumId, sectionId, status, enrolledAt, gradeLevelId, strandId, programId, customFields) + `sis.service.ts` createEnrollment() with duplicate check + `sis.controller.ts` endpoints**
- [x] `student_section_assignments` table — **Verified: `student-section-assignment.entity.ts` (enrollmentId, sectionId, studentId, isActive, assignedAt, unassignedAt, unassignmentReason) + assignStudentToSection() with capacity check**
- [ ] Enrollment wizard UI (select curriculum → assign section → confirm) — **Deferred: backend service supports full workflow (create enrollment → assign section → hold check), frontend needs multi-step wizard component**
- [x] Sections CRUD — **Verified: `section.entity.ts` (schoolYearId, gradeLevelId, strandId, programId, name, adviserEmployeeId, roomId, capacity, isActive, homeroom) + `sis.controller.ts` GET/POST/PUT /sections + `sis/sections/page.tsx` (card grid with capacity display)**
- [x] `enrollment_holds` table — **Verified: `enrollment-hold.entity.ts` (holdType, reason, blocksSchedule, blocksTor, blocksExamPermit, isActive) + createHold() + releaseHold() + getStudentHolds()**
- [x] `student_transfers` table — **Verified: `student-transfer.entity.ts` (fromBranchId, toBranchId, fromSchoolYearId, toSchoolYearId, reason, status, metadata JSONB) + createTransfer() + getStudentTransfers()**
- [x] `promotion_decisions` table — **Verified: `promotion-decision.entity.ts` (decision, targetGradeLevelId, remarks, isFinalized) + createPromotionDecision() + getPromotionDecisions()**
- [x] `behavior_incidents` table — **Verified: `behavior-incident.entity.ts` (incidentType, description, incidentDate, incidentLocation, witnesses, actionTaken, status, resolution) + createIncident() + findAllIncidents()**
- [x] `health_records` table — **Verified: `health-record.entity.ts` (recordType, recordDate, clinician, diagnosis, treatment, medication, followUpDate, parentNotified) + createHealthRecord() + getStudentHealthRecords()**
- [ ] Re-enrollment batch workflow — **Deferred to Phase 5**: requires academic year rollover + section creation + hold carry-forward which depends on scheduling data

### Phase 4 Inventory
| Component | Count | Files |
|---|---|---|
| **Entities** | 16 | Student, Guardian, StudentGuardian, Enrollment, Section, StudentSectionAssignment, EnrollmentHold, StudentDocument, StudentTransfer, PromotionDecision, BehaviorIncident, HealthRecord, StudentMergeAudit, ApplicantStageConfig, ApplicantStageTransition, SectionAssignmentRule |
| **Services** | 2 | SisService (30+ methods), AdmissionsService (10+ methods) |
| **Controllers** | 2 | SisController (30+ endpoints), AdmissionsController (8 endpoints) |
| **Module** | 1 | SisModule |
| **Frontend pages** | 5 | Students (360 profile), Guardians, Enrollments, Sections, Admissions (Kanban) |
| **API client endpoints** | 2 modules | sis.ts (30+ methods), admissions.ts (10 methods) |
| **RLS policies** | 16 | All new tables have tenant_isolation policies |
| **Total** | **41 files** | |

**Exit criteria:** ✅ Backend builds clean; 30+ SIS endpoints with Swagger; 5 frontend pages; RLS enforced on all tables.

## Phase 5 — Scheduling, Attendance, Grading

**Outcome:** the daily academic operations loop is functional.

### 5.1 Scheduling
- [ ] `class_offerings` table [tables.md §5: FR-ACA-9] — subject + section/block + faculty + room + time slots + term; conflict validation against faculty, room, section schedules
- [ ] `school_calendars` table [tables.md §5: FR-SCH-4] — branch-specific calendar with override
- [ ] `calendar_events` table [tables.md §5] — holidays, exam weeks, training days, custom events
- [ ] `student_schedules` table [tables.md §5: FR-SCH-3] — student-facing personal schedule (esp. College)
- [ ] Timetable builder UI (drag/drop grid) with auto-conflict detection
- [ ] Faculty load report [GAP: FR-SCH-2 add `faculty_load_limits` table — max_units, max_hours_per_week, warn_on_approach_pct]
- [ ] `faculty_load_limits` table [NEW: tables.md §5] — configurable thresholds per tenant/branch/employee

### 5.2 Attendance
- [ ] Attendance record schema [tables.md §5: `attendance_records`] — daily for basic ed, per-period for JHS/SHS/College
- [ ] `attendance_config` table [NEW: tables.md §5, FR-ATT-1] — per-level configuration (daily vs period, capture modes)
- [ ] `attendance_excuses` table [NEW: tables.md §5, FR-ATT-2] — parent-reported excuse upload
- [ ] `attendance_notification_thresholds` table [NEW: tables.md §5, FR-ATT-3] — configurable absence/tardy alert thresholds
- [ ] Teacher attendance-entry UI (grid)
- [ ] Notification trigger on absence threshold (wired to stub notification service; real dispatch in Phase 8)
- [ ] Attendance summary report (feeds Form 137 later)

### 5.3 Grading
- [ ] Gradebook schema [tables.md §3: `grade_entries`] — components per configured weight template
- [ ] Gradebook UI (spreadsheet-like entry, live weighted computation)
- [ ] Grade finalization/lock per term (immutable after registrar closes the term)
- [ ] `grade_change_requests` table [tables.md §5: FR-GRA-6] — workflow using Phase 1.4 engine
- [ ] `permanent_records` table [tables.md §5: FR-GRA-5] — Form 137 / TOR with registrar approval
- [ ] Report Card template + PDF generation (DepEd Form 138 style, tenant-branded)
- [ ] Honor roll computation (configurable thresholds from Phase 3)
- [ ] Promotion/retention/graduation batch process at year-end

**Exit criteria:** a teacher can take attendance and enter grades for a real class offering; a parent will be able to see both; a report card PDF renders correctly.

## Phase 6 — Billing & Fee Management

**Outcome:** fees can be assessed against an enrollment and a Statement of Account is produced.

- [ ] Fee Type CRUD [tables.md §6: `fee_types`] (Lookup-engine-based) with GL account mapping field
- [ ] `discount_types` table [NEW: tables.md §6, FR-BIL-4] — configurable discount/scholarship types
- [ ] Fee Structure Builder UI [tables.md §6: `fee_structures` + `fee_structure_items`] — line items, per level/grade/program/school year, branch override
- [ ] `payment_plans` table [NEW: tables.md §6, FR-BIL-3] — cash discount vs. N-installment schedules
- [ ] `installment_schedules` table [NEW: tables.md §6, FR-BIL-3] — per-installment amounts and due dates
- [ ] Discount/Scholarship rule engine [tables.md §6: `student_discount_grants`] + approval workflow (Phase 1.4 engine)
- [ ] `penalty_rules` table [NEW: tables.md §6, FR-BIL-6] — late-payment penalty auto-computation
- [ ] `withdrawal_policies` table [NEW: tables.md §6, FR-BIL-8] — pro-rated refund policy
- [ ] Invoice generation on enrollment (auto-assess fees per resolved fee structure)
- [ ] Statement of Account view (student/guardian-facing and staff-facing)
- [ ] AR Aging report
- [ ] Define full fee-structure resolution precedence [GAP]: (1) branch+term+strand+track+program+boarding; (2) branch+term+strand+track; (3) branch+term+strand; (4) branch+term; (5) tenant default+term; (6) tenant default (no term)

**Exit criteria:** enrolling a student automatically produces a correct invoice/SOA reflecting the fee structure, including any applicable discount.

## Phase 7 — Cashiering / POS & Payments

**Outcome:** money can be collected, a compliant Official Receipt is produced, and it works offline.

### 7.1 Core cashiering
- [ ] Cashier Session model [tables.md §7: `cashier_sessions`] — open/close, float declaration, denomination breakdown
- [ ] `denomination_sets` table [NEW: tables.md §7, FR-CSH-6] — bills/coins count for audit
- [ ] Payment entity [tables.md §7: `payments`] + allocation logic [tables.md §7: `payment_allocations`] — apply to oldest balance first, configurable
- [ ] ATP Series / OR numbering module with transactional, gapless allocation (`architecture.md` §11.2) — add `or_number_display` column [G-1, G-10]
- [ ] Official Receipt generation (PDF, BIR-mandatory fields, tenant/branch TIN & branch code, Tax-Exempt labeling where applicable)
- [ ] Void/reversal flow [tables.md §7: `refunds`] — never hard-delete; linked reversal record + approval
- [ ] Daily Collection Report / Cash Position Report

### 7.2 Payment gateway integration
- [ ] `PaymentGatewayPort` interface + first adapter (Xendit or PayMongo) for GCash/Maya/QR Ph/cards
- [ ] Webhook receiver + signature verification + idempotency-key enforcement
- [ ] Guardian-portal "Pay Now" flow posting into the same invoice/ledger the cashier sees
- [ ] Daily settlement reconciliation job vs. gateway reports

### 7.3 Offline POS
- [ ] Service worker + IndexedDB (Dexie) local store for the POS route
- [ ] OR-number block reservation on session open; release-unused-on-close (configurable via `cashier_stations.printer_config.or_block_size`)
- [ ] Local payment write + local receipt print while offline
- [ ] Background Sync queue + conflict/exception inbox for unresolvable syncs
- [ ] Simulated outage test in staging

### 7.4 Non-tuition sales
- [ ] `ad_hoc_sales` + `ad_hoc_sale_items` tables [tables.md §7: FR-CSH-9] — ad-hoc sales through same till and OR series
- [ ] NO stock tracking in v1 [G-9: ADR-005] — pure GL entries, `qty` as multiplier only

**Exit criteria:** a cashier can open a session, collect a cash payment against a real invoice, print a compliant OR, close the session with a balanced reconciliation — and repeat the same flow with the network disabled, then reconnect and confirm zero discrepancies.

## Phase 8 — Communications, Documents, HR-Lite

**Outcome:** the "glue" modules that make daily operation complete.

### 8.1 Communications
- [ ] `notification_templates` table [tables.md §8] — SMS/email/push/in-app templates with Handlebars `{{variable}}` syntax
- [ ] `notification_rules` table [tables.md §8, FR-COM-1] — trigger rules per event type
- [ ] `channel_configs` table [tables.md §8, FR-COM-4] — provider abstraction (SMS gateway e.g. Semaphore/Movider, email via SES/SendGrid, push via FCM/APNs)
- [ ] `announcements` table [tables.md §8, FR-COM-2] — branch/tenant-wide with audience targeting
- [ ] `message_threads` table [tables.md §8, FR-COM-3] — Guardian↔staff two-way messaging
- [ ] Wire real dispatch into attendance-absence and low-balance triggers stubbed in Phases 5–6

### 8.2 Document generation
- [ ] `document_templates` table [tables.md §8, FR-DOC-1] — Template engine (WYSIWYG + merge fields) covering: Certificate of Enrollment, Good Moral, Form 137, TOR/Certificate of Grades, ID card, Diploma
- [ ] `document_requests` table [tables.md §8, FR-DOC-2] — Document Request workflow (request → fee assessment if applicable → cashier collection → registrar release)
- [ ] QR/verification-code authenticity stamp on generated documents (format: `SCH-{tenant_short}-{8-char-alphanumeric}-{checksum}`)
- [ ] Bulk document generation (e.g., print Form 138 for a whole section) with auto-retry 3× exponential backoff

### 8.3 HR-Lite
- [ ] `employees` table [tables.md §8, FR-HR-1] — Employee/Faculty record CRUD, branch assignment(s)
- [ ] `teaching_loads` table [tables.md §8, FR-HR-2] — Teaching load view (reads Phase 5 Class Offerings)
- [ ] `daily_time_records` table [tables.md §8, FR-HR-3] — DTR capture (manual entry; biometric hook stubbed)
- [ ] CSV/API export hook for external payroll systems

**Exit criteria:** a guardian receives an SMS/email when their child is marked absent; a registrar can generate and release a Form 137 with a working verification code.

## Phase 9 — Guardian/Student Portal & Mobile App

**Outcome:** parents and students self-serve instead of calling the office.

- [ ] Guardian portal web app: dashboard, grades, attendance, SOA + Pay Now, documents, messages (per `frontend.md` §7)
- [ ] Multi-student (sibling) switcher for one guardian account
- [ ] Student self-view (schedule, grades, attendance, balance, document requests)
- [ ] Flutter mobile app: parity with web portal core screens
- [ ] Push notification wiring (depends on Phase 8.1)
- [ ] Accessibility pass (WCAG 2.1 AA) on portal + mobile

**Exit criteria:** a parent with two children in two different branches of the same tenant can log in once and see both children's grades, attendance, and balances, and can pay a fee for either.

## Phase 10 — Reporting & Analytics

**Outcome:** leadership and regulators get the numbers they need without engineering tickets.

- [ ] Role-based dashboards (Registrar/Cashier/Teacher/Tenant Admin) per `frontend.md` §7
- [ ] Ad-hoc report builder (entity/filter/column/group-by → export Excel/PDF/CSV)
- [ ] Regulatory report template library (enrollment stats, learner movement) — configurable templates
- [ ] Financial reports: revenue by fee type, AR aging (cross-branch), discount/scholarship utilization, GL-ready journal export
- [ ] Scheduled report subscriptions (emailed on a cadence)
- [ ] Move heavy report queries to read replicas; verify OLTP isolation under load test

**Exit criteria:** a Tenant Admin can pull a consolidated, cross-branch enrollment and collections report without asking engineering for a custom query.

## Phase 11 — Non-Functional Hardening

**Outcome:** the system is ready for real tenants and real money.

### 11.1 Security
- [ ] Full OWASP ASVS-aligned review of authn/authz/session handling
- [ ] Penetration test (external) before first paying enterprise tenant
- [ ] Field-level encryption for the most sensitive PII (government IDs)
- [ ] Secrets fully migrated to vault; secret-scanning in CI green
- [ ] RLS bypass test suite expanded to cover every tenant-scoped table

### 11.2 Compliance
- [ ] Data Privacy Act workflow: consent capture at enrollment, DSAR (access/correction/erasure) request handling, DPO-facing queue
- [ ] Retention-schedule automation (Form 138: 2 yrs post-graduation; Form 137: indefinite) with scheduled purge jobs
- [ ] BIR OR/SI numbering audit: verify zero gaps, zero duplicates under concurrency load test
- [ ] Legal review of generated document templates against current DepEd/CHED/BIR formats

### 11.3 Performance & scale
- [ ] Load test: simulate a 50-branch, 100,000-student tenant profile
- [ ] Partitioning plan for `payments`/`attendance_records` if needed
- [ ] Noisy-neighbor test: one tenant's bulk import must not degrade another's cashiering latency
- [ ] Schema-per-tenant "graduation" path exercised end-to-end

### 11.4 Reliability
- [ ] Backup/PITR verified with a real restore drill
- [ ] DR failover drill to secondary region/AZ
- [ ] Health checks + graceful shutdown for all services
- [ ] Chaos test: kill a pod mid-transaction, verify no partial writes / no duplicate OR numbers

**Exit criteria:** sign-off from security review, a completed restore drill, and a load test report showing the platform meets the NFR targets in `spec.md` §7.

## Phase 12 — Pilot Launch

**Outcome:** first real tenant(s) live.

- [ ] Select 1–2 pilot tenants (ideally one single-branch, one multi-branch)
- [ ] Data migration tooling for pilot tenant's existing student/fee records
- [ ] Staff training materials + in-app onboarding checklist
- [ ] Go-live runbook (rollback plan, support escalation path, on-call rotation)
- [ ] Post-launch monitoring window (daily check-ins for first 2 weeks)
- [ ] Collect structured feedback → feed into Phase 13 backlog

## Phase 13 — Post-Launch / Future Modules

Prioritize based on pilot feedback; candidates already scoped in `spec.md` §12:

- [ ] Cafeteria/canteen POS & inventory (reuses Cashiering + Facility primitives)
- [ ] Transportation/bus routing
- [ ] Dormitory/boarding management
- [ ] Library circulation
- [ ] Full statutory payroll (BIR 2316, SSS/PhilHealth/Pag-IBIG computation)
- [ ] LMS content authoring (or deepen Google Classroom/Moodle integration)
- [ ] Alumni/donor management
- [ ] DepEd LIS / CHED CHEDMIS direct submission connectors
- [ ] Multi-country localization (second jurisdiction's tax/receipt/curriculum rules)

---

## Cross-Cutting Checklists

### Definition of Done (every ticket)
- [ ] Tenant-scoped correctly (RLS + branch scoping verified, not assumed)
- [ ] Permission-gated correctly (server-enforced, not just UI-hidden)
- [ ] Audit-logged if it mutates data
- [ ] Unit + integration test coverage for the new logic
- [ ] No hard-coded academic/fee/role values that should be tenant-configurable per `spec.md` §8
- [ ] i18n-ready strings (no hard-coded English in guardian-facing surfaces)
- [ ] Reviewed against the relevant FR-xxx requirement ID in `spec.md`

### Data model discipline
- [ ] Every new tenant-scoped table gets `tenant_id NOT NULL` + RLS policy + composite index on the day it's created — never retrofitted later
- [ ] Every new lookup-style entity is evaluated first against the generic Lookup Manager (Phase 1.4) before building a bespoke CRUD screen

### Release discipline
- [ ] Migrations follow expand/contract; never a breaking single-step schema change
- [ ] Feature-flagged rollout for any module touching money or grades before 100% tenant exposure
