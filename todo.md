# TODO.md — Detailed Implementation Plan
### School Management System (SMS) — Multi-Tenant, Multi-Branch, Multi-Level


postgres credentials user:kpagarigan2, password:P@ssw0rd
when building tables and schema, use localhost

**Reference:** `spec.md` (requirements), `architecture.md` (technical design), `frontend.md` (client design), `tables.md` (schema reference)

**Format:** Each phase has an outcome, entry criteria, and a checklist. Phases are sequential but Phase 1's foundation (tenancy, RBAC, config engine) is a hard dependency for everything after it — do not shortcut it to "move faster," since every later module leans on it.

**Gap-note legend:** Items marked [GAP] are new or expanded from the 2026-09-04 cross-file review. The prior version left ~18 decomposed checklist gaps and ~11 schema/index/RLS items unaddressed against spec.md FR-xxx and architecture.md §§3-4/7/10-11. This version adds them inline.


**Implementation Note:** When building frontend or backend features, always revisit `spec.md`, `architecture.md`, `frontend.md`, and `tables.md` to ensure alignment with requirements and design.
the login for postgres is user:kpagarigan2, password:P@ssw0rd
for testing directly use the localhost
---

## Critical Gaps — Cross-File Schema/Implementation Mismatches (2026-09-04 deep review)

**Source:** Systematic cross-reference of `todo.md` [GAP] items ↔ `tables.md` DDL ↔ `spec.md` FR-xxx ↔ `architecture.md` §§3–4/7/10–11 ↔ `frontend.md` client conventions.

**Impact:** These gaps, if unaddressed, will cause build failures (NOT NULL without default on draft rows), missing audit trails, broken offline POS, and spec non-compliance at UAT. Each item below is a checkbox in its consuming phase AND has a corresponding `tables.md` fix/addition.

### G-1: `official_receipts.or_number_display` missing from `tables.md` [FR-CSH-4, arch §11.2]
- **Problem:** `todo.md` Phase 7.1 explicitly requires `or_number BIGINT` (numeric part allocated from `series_counters.counter_value`) AND `or_number_display TEXT` (formatted version, e.g. `OR-2026-0001234`, based on `atp_series.format_template`). `tables.md` only defines `or_number TEXT` — no `or_number_display` column exists.
- **Why it matters:** Without the display column, the BIR-compliant OR format (tenant-branded, formatted with branch code and series prefix) cannot be stored. The UNIQUE constraint should be on `(branch_id, or_number)` the numeric part; `or_number_display` is for human readability and PDF rendering only.
- **Fix:** Add `or_number_display TEXT` to `official_receipts` in `tables.md`. Retain `or_number TEXT` as the stored numeric-string (BIGINT cast at allocation time) with `UNIQUE(branch_id, or_number)`.
- **Phase:** 7.1 (Cashiering core)

### G-2: `curriculum_subjects.effective_grading_system_id` is NOT NULL without default [FR-GRA-1, Phase 3/5.3]
- **Problem:** `tables.md` marks `effective_grading_system_id UUID NOT` (NOT NULL) on `curriculum_subjects`, but this field is only resolved at curriculum-publish time (draft → active). A curriculum in `draft` status has no grading system yet — inserts will fail.
- **Why it matters:** The Curriculum Builder (Phase 3) creates `curriculum_subjects` rows when a curriculum is in `draft` status. Making this NOT NULL blocks the entire curriculum authoring flow.
- **Fix:** Change `effective_grading_system_id` to `UUID NULL` with default `NULL`. Add a `NOT NULL` CHECK constraint enforced at curriculum-publish time (when `curricula.status` transitions from `draft` to `active`), not at row-insert time. Update `tables.md` to document this two-phase constraint.
- **Phase:** 3 (Academic Structure) + 5.3 (Grading linkage)

### G-3: `faculty_load_limits` table missing from `tables.md` [FR-SCH-2, Phase 5.1]
- **Problem:** `todo.md` Phase 5.1 explicitly calls for `faculty_load_limits` config: `id, tenant_id, branch_id NULL, employee_id NULL (NULL = tenant default), max_units NUMERIC, max_hours_per_week NUMERIC, warn_on_approach_pct NUMERIC(5,2) default 90`. No DDL exists in `tables.md`.
- **Why it matters:** Without this table, the faculty load report (FR-SCH-2) has no configurable threshold — it either hard-codes a max or omits warnings entirely. Per `spec.md` §8, max-load is tenant-configurable.
- **Fix:** Add `faculty_load_limits` table to `tables.md` §5 (Scheduling) with full DDL, RLS, and indexes.
- **Phase:** 5.1 (Scheduling)

### G-4: `applicant_stage_configs` table missing from `tables.md` [FR-ADM-2, Phase 4.2]
- **Problem:** `todo.md` Phase 4.2 references `applicant_stage_configs` per tenant/level for FR-ADM-2 configurability, and the Appendix B5 log says "Phase 4.2 `applicant_stage_configs/entrance_exams/applicant_documents`". No DDL exists in `tables.md`.
- **Why it matters:** The applicant pipeline (Inquiry → Applicant → Exam → Admitted → Enrolled) must be configurable per tenant/level per `spec.md` FR-ADM-2. Without this table, the Kanban UI has no data source for pipeline stages.
- **Fix:** Add `applicant_stage_configs` table to `tables.md` §4 (SIS/Enrollment) with full DDL.
- **Phase:** 4.2 (Admissions)

### G-5: `applicant_stage_transitions` table missing from `tables.md` [FR-ADM-2, Phase 4.2 GAP]
- **Problem:** `todo.md` Phase 4.2 [GAP] explicitly specifies: `applicant_stage_transitions (tenant_id, branch_id NULL, from_stage, to_stage, requires_docs BOOLEAN, auto_admit BOOLEAN)` — making the pipeline truly configurable. No DDL exists in `tables.md`.
- **Why it matters:** Without transition rules, the Kanban UI hard-codes which stages can move to which. The spec requires configurable stages per tenant. The `auto_admit` flag enables automated stage progression (e.g., exam-pass → admitted without manual review).
- **Fix:** Add `applicant_stage_transitions` table to `tables.md` §4 (SIS/Enrollment) with full DDL.
- **Phase:** 4.2 (Admissions)

### G-6: `user_sessions` table missing from `tables.md` [arch §10, Phase 11.1, Appendix B1/B11.3]
- **Problem:** `todo.md` Appendix B1 says "`user_sessions` + rename kinship `relationships`" and Appendix B11.3 says "`user_sessions` table for session audit (B11.3)". The architecture §10 requires session audit logging. No DDL exists in `tables.md`.
- **Why it matters:** Session audit is required for OWASP ASVS compliance (Phase 11.1). Without this table, there's no record of who logged in from where, when sessions expired, or which sessions were force-terminated — a compliance gap for Data Privacy Act (RA 10173) audit requirements.
- **Fix:** Add `user_sessions` table to `tables.md` §1B (IAM) with full DDL, RLS, and indexes.
- **Phase:** 1.2 (AuthN) + 11.1 (Security)

### G-7: `custom_field_definitions.entity_type` needs `enrollment` + `invoice` [FR-CFG-5, spec §8]
- **Problem:** `todo.md` Phase 1.4 says "extend `entity_type` enum to include `enrollment` and `invoice`" per FR-SIS-5 (spec says "Student, Employee, Enrollment, or Fee entities"). `tables.md` lists `student \ | employee \ | applicant \ | guardian` — missing `enrollment` and `invoice`.
- **Why it matters:** Without these entity types, tenants cannot add custom fields to enrollment records (e.g., "ESC subsidy applicant" flag) or invoices (e.g., "cost center" for multi-department schools), which are explicitly required by spec §8.
- **Fix:** Update `custom_field_definitions.entity_type` in `tables.md` to include `enrollment \ | invoice`.
- **Phase:** 1.4 (Config engine)

### G-8: `audit_events` missing `correlation_id` field [arch §14, Phase 1.3/1.4]
- **Problem:** `todo.md` Phase 1.4 specifies `audit_events` should have `branch_id, ip, request_id, correlation_id`. `tables.md` has `branch_id`, `ip_address`, `request_id TEXT` but NO `correlation_id`. The Appendix B2 log confirms "audit `branch_id+ip+correlation_id`".
- **Why it matters:** `correlation_id` is distinct from `request_id` — `request_id` identifies the HTTP request, while `correlation_id` traces a business operation across multiple requests (e.g., enrollment wizard spanning 3 API calls). Without it, distributed tracing (OpenTelemetry, arch §14) cannot reconstruct cross-request audit trails.
- **Fix:** Add `correlation_id TEXT` to `audit_events` in `tables.md` §13.
- **Phase:** 1.3/1.4 (Config engine + audit)

### G-9: `ad_hoc_stock_items` — Phase 0 decision recorded [FR-CSH-9, Phase 7.4]
- **Decision:** ADR-005 accepted: **NO stock tracking in v1.** Ad-hoc sales are pure GL entries with `qty` as a multiplier only. Stock tracking deferred to post-v1 cafeteria/inventory module (spec §12).
- **Impact:** `ad_hoc_sale_items.qty` is for GL calculation only, not for decrementing a stock count. No `ad_hoc_stock_items` table needed.
- **Phase:** 7.4 (Non-tuition sales) — resolved, no further action required.

### G-10: `official_receipts.or_number` type ambiguity [FR-CSH-4, arch §11.2]
- **Problem:** `todo.md` says `official_receipts.or_number` should store the "numeric part as BIGINT (auto-allocated from `series_counters.counter_value`)". `tables.md` defines `or_number TEXT NOT NULL`. The UNIQUE constraint is `UNIQUE(branch_id, or_number)`. This creates ambiguity: is `or_number` the raw BIGINT or the formatted display string?
- **Why it matters:** BIR audit requires a gapless numeric sequence. If `or_number` stores a formatted string like `SCH-2026-0001234`, the gapless-sequence guarantee depends on string comparison, which is fragile. If it stores `1234` as TEXT, the format template is lost.
- **Fix (recommended):** Keep `or_number TEXT` as the canonical stored value (numeric-string like `1234`), add `or_number_display TEXT` for the formatted version, and enforce `UNIQUE(branch_id, or_number)` on the numeric part. Document in `tables.md` that the application casts `or_number` to BIGINT for sequence operations.
- **Phase:** 7.1 (Cashiering core)

---

## Phase 0 — Discovery, Planning & Environment Setup

**Outcome:** Repos, environments, and domain model agreed before a line of feature code is written.

- [x] Confirm target tenant profile for MVP (school size range, single vs. multi-branch launch customer) to calibrate scale assumptions
- [x] Finalize jurisdiction scope for v1 (Philippines-only compliance features; note stub points for future countries)
- [x] Stand up monorepo(s): `sms-backend` (NestJS, Turborepo/Nx) and `sms-frontend` (Turborepo, per `frontend.md` §3)
- [x] Provision cloud accounts (AWS `ap-southeast-1`), IAM boundary between `dev`/`staging`/`production`
- [x] Terraform: base network (VPC), managed Postgres, managed Redis, S3 buckets, container registry
- [x] Set up GitHub Actions skeleton: lint, typecheck, unit test, build — required to pass before merge — **`.github/workflows/ci.yml` with 4 jobs: lint, typecheck, build, test (with Postgres + Redis services)**
- [x] Set up local dev stack: Docker Compose (Postgres, Redis, MinIO, Mailhog)
- [x] Adopt coding standards: ESLint/Prettier config, commit conventions (Conventional Commits), branching model (trunk-based + short-lived feature branches) — **`.eslintrc.json` + `.prettierrc` at root, `pnpm lint` + `pnpm format` scripts**
- [x] Set up Sentry + basic OpenTelemetry collector in all environments — **`@sentry/node` + `@opentelemetry/api` installed; `Sentry.init()` in `main.ts` (no-op if SENTRY_DSN not set)**
- [x] Draft ERD covering Phase 1–4 entities (tenants, branches, facility, academic structure, SIS) and review against `architecture.md` §8
- [x] Decide AuthN provider (self-hosted Keycloak vs. Auth0/WorkOS) — cost, SSO needs, MFA support
- [x] Decide payment gateway aggregator(s) for PH launch (e.g., Xendit and/or PayMongo) and register sandbox accounts
- [x] Decide search approach (Postgres FTS vs. OpenSearch/Meilisearch) + when to introduce it (defer to post-MVP unless enrollment/payment lists demand it)
- [x] Confirm PgBouncer + read-replica strategy, Redis tenant-key convention, BullMQ worker pool separation (OLTP vs. reports/notifications) per `architecture.md` §§3.4/12
- [x] Agree API standards up front: cursor vs. offset pagination, `Idempotency-Key` header on financial mutations, outbound webhook envelope (HMAC + retry/backoff), OpenAPI → TS client generation (`frontend.md` §3 `api-client`)
- [x] Agree domain-event bus convention (in-process now, NATS/Kafka-compatible later) + module boundary lint rule for NestJS modular monolith
- [x] Scaffold monorepo packages explicitly: `packages/ui` (tokens/primitives/patterns/domain/print), `packages/api-client`, `packages/config-forms`, `packages/i18n`, `packages/utils` (PHP ₱ + `Asia/Manila` helpers) + apps `platform-admin` / `school-portal` / `guardian-portal` / `pos-terminal`
- [x] Extend CI skeleton beyond lint/typecheck/unit/build: integration tests vs. ephemeral Postgres, container image scan (Trivy/Grype), Dependabot/Snyk + secret-scanning, staging deploy + manual gate → production (blue/green or rolling)
- [x] Clarify `Department` (Elementary/JHS/SHS/College per branch, `spec.md` §5) vs. `EducationLevel` entity — decide if departments table exists or is a view over levels_offered; capture per-branch `levels_offered` including Kindergarten — **ADR: Department is a per-branch entity (determines which levels_offered are active); EducationLevel is the global taxonomy. Both coexist.** → Add `departments` table to `tables.md` with `education_level_ids UUID[]` FK array (see §1A)
- [x] Plan Flutter shell timing (Phase 9) vs. PWA fallback; confirm ESC/POS print-agent approach for POS vs. WebUSB-only
- [x] **DECIDE LMS integration scope** [GAP] (spec §3 says "integrate, not rebuild"): **ADR-002: roster sync system→LMS only** (create/update sections + student enrollments in LMS from `class_offerings` + `student_section_assignments`). Triggered on curriculum publish + enrollment confirmation. No grade passback in v1 — LMS remains read-only for roster data. Google Classroom and/or Moodle as Phase 8.4 target.
- [x] **DECIDE BIR receipt verification-code format** [GAP] (FR-DOC-2): **ADR-003: `SCH-{tenant_short}-{8-char-alphanumeric}-{checksum}`** — tenant_short = first 4 chars of slug (uppercase), 8-char-alphanumeric = first 8 hex chars of `gen_random_uuid()`, checksum = mod-37 of (tenant_id + timestamp). UNIQUE constraint on `verification_code`. Public `GET /verify/:code` (no auth) returns `{valid, document_type, student_name_last_four, issued_at, tenant_name}`.
- [x] **DECIDE offline POS OR-block size policy** [GAP] (FR-CSH-8): **ADR-004: configurable via `cashier_stations.printer_config.or_block_size`** (default 50, min 10, max 500). Applied per cashier session on open, released unused on close. Uses ATP series architecture per arch §11.2.
- [x] **DECIDE ad-hoc stock tracking** [GAP] (FR-CSH-9): **ADR-005: NO stock tracking in v1.** Ad-hoc sales are pure GL entries with `qty` as a multiplier only. `ad_hoc_stock_items` table is NOT added. Stock tracking deferred to post-v1 cafeteria/inventory module (spec §12). If a future module needs it, add `ad_hoc_stock_items (fee_type_id, qty_on_hand, reorder_point, is_tracked)` and decrement on each sale.
- [x] **DECIDE bulk-print failure handling** [GAP] (FR-DOC-3): **ADR-006: auto-retry 3× with exponential backoff (1s, 5s, 15s)**, then mark job `status=manual_retry_required`. Populate `bulk_print_job_failures` for manual retry. UI shows "Retry Failed" button to re-run just failed items.
- [x] **DECIDE notification template merge-field catalog** [GAP] (FR-COM-1): **ADR-007: Handlebars-style `{{variable}}` syntax.** Catalog: absence → {student_name, guardian_name, date, status, section_name}; low_balance → {student_name, guardian_name, amount_due, due_date, student_number}; grade_posted → {student_name, guardian_name, subject_name, score, term}; document_ready → {student_name, document_type, download_url, verification_code}.

---

## Phase 1 — Platform Foundation: Multi-Tenancy, IAM, Config Engine

**Outcome:** You can create a tenant, create a branch, log in as different roles, and see RBAC enforced — before any academic feature exists. This is the riskiest architecture bet; validate it early.

### 1.1 Tenancy & branch core

- [x] `departments` table + migration (new §1A) — per-branch Department entity with `education_level_ids UUID[]`, `is_default`, FK → `branches(id)`; RLS + index `idx_departments_is_default` [FR-TEN-3, spec §5] — **entity + service + controller + DTO implemented**
- [x] `tenants` table: `plan_id FK` not free-text — `tenants.plan_id FK → tenant_plans(id)` [tables.md fix] — **Tenant entity updated with ManyToOne to TenantPlan**
- [x] `tenant_plans` table (new) with `plan_key`, `max_branches`, `max_students`, `modules JSONB` [FR-TEN-4, tables.md fix] — **entity + seed data (starter/professional/enterprise) implemented**
- [ ] Tenant provisioning API (create/suspend/archive) + Super Admin screen [FR-TEN-1]
- [ ] Subdomain-based tenant resolution middleware (`tenant-slug.schoolsuite.ph`) + custom-domain mapping + JWT-claim resolution path for mobile (`architecture.md` §3.1) [FR-TEN-2]
- [ ] Postgres session variable (`app.current_tenant_id`) set per request/transaction [FR-TEN-1, arch §3.1]
- [ ] Row-Level Security policies applied to a base set of tables; automated test that proves cross-tenant query returns zero rows even with a crafted request [FR-TEN-1, arch §3.2]
- [ ] Branch CRUD API + UI (Tenant Admin) incl. name/address/TIN/BIR branch code/contact + `levels_offered` (incl. Kindergarten) + default-department selection per branch — branch creation auto-creates a default Department per level in `levels_offered` [FR-TEN-3]
- [ ] Tenant branding fields (logo, colors, favicon) + custom-domain + frontend theming pipeline (`frontend.md` §4) [FR-TEN-2]
- [ ] Plan enforcement server-side (student/branch caps, module gating e.g. College tier) + usage meters; tenant data export (portability) + full purge/offboarding job (FR-TEN-4/5, arch §15) [FR-TEN-4, FR-TEN-5]
- [ ] Per-tenant rate limiting + query timeouts at gateway; tenant/branch switcher (Zustand + TanStack cache invalidation) + route-to-permission map driven by effective permissions + plan entitlements (`frontend.md` §§4–5) [FR-TEN-4, FR-CFG-8]

### 1.2 AuthN

- [x] Integrate chosen OIDC provider; login/logout/refresh flow [FR-CFG-1, arch §7] — **JWT-based AuthService + AuthController implemented (login, register, refresh)**
- [ ] MFA enforcement flag per role (Admin/Finance/Cashier mandatory) [FR-CFG-1, arch §10]
- [ ] Guardian/Student auth (email+password or mobile+OTP) as a separate, lower-friction flow from staff SSO [FR-CFG-1, spec §4 personas]
- [ ] Session/token handling on frontend (secure storage, silent refresh) [arch §7]
- [x] **Official `users` table + account↔person linkage:** create `users` + `user_person_links` (account → exactly one of student/guardian/employee) — required so AuthN (this phase), ReBAC resource checks, and the Phase 9 sibling switcher resolve account → person → data deterministically; `tables.md` currently has no IAM tables at all (see Appendix B) [FR-CFG-1, FR-SIS-2, arch §7] — **User entity updated with tenantId; UsersModule + Service + Controller implemented**
- [ ] Person-account lifecycle: auto-provision guardian/student accounts at enrollment (invite + OTP/first-login activation), staff accounts at onboarding; deactivate on transfer/withdrawal; never map two persons to one account [FR-SIS-2, FR-ADM-4]

### 1.3 AuthZ (RBAC + ReBAC)

- [x] IAM DDL complete in `tables.md` + migrations: `users`, `roles`, `permissions` (global catalog), `role_permissions`, `user_roles`, `rebac_edges` (renamed kinship `relationships` → Lookup seed for Relationship Types) — RENAME `tables.md §4 relationships` to `relationship_types` seed via Lookup to avoid collision with arch §7 `rebac_edges.object_type='relationship'` [FR-CFG-1, arch §7] — **All 5 IAM entities implemented + IamModule + IamController**
- [x] **Add `tenant_plans` + `tenant_entitlements` tables** [GAP] (tables.md fix): `tenants.plan` FK → `tenant_plans(id)`; back FR-TEN-4 server enforcement — **TenantPlan entity + seed data implemented**
- [x] Seed a base permission catalog (per module: view/create/edit/delete/approve/export) — **SQL seed: 40+ permissions across tenancy/academic/SIS/billing/cashiering/grading/attendance/docs/config/reporting/hr/facility**
- [x] Seed default roles: Platform Super Admin, Tenant Admin, Branch Admin, Accounting/Finance Officer, Subject/Program Coordinator, Registrar, Cashier, Teacher, Guidance, Nurse, Guardian, Student, Platform Support, DPO [FR-CFG-1, spec §4 personas] — **SQL seed: 14 default roles with is_system=true**
- [x] `PolicyService` centralizing all permission checks (no scattered ad-hoc checks) — **PolicyService implemented with hasPermission(), enforce(), hasRelation(), getUserRoles(), getUserPermissions()**
- [ ] Branch-scoped grants (`user_roles.branch_id`) + tenant-wide grants + self-record scope (FR-CFG-1)
- [ ] ReBAC relationship checks for at least: `TeachesSection`, `GuardianOf`, `AdvisorOf` — requires `rebac_edges` table holding polymorphic edges [arch §7]; seed helper + unit tests for each edge
- [ ] Role/Permission Builder UI (matrix editor) — `frontend.md` §6
- [ ] Automated authz test suite: for each role, assert allowed/denied actions
- [x] Sensitive-data access audit: every read of grades/health/discipline logged to `audit_events` with `branch_id` + `ip_address` + `request_id` [tables.md fix] [arch §10] — **AuditEvent entity + ConfigEngineService.logAuditEvent() implemented**

### 1.4 Config engine (cross-cutting)

- [x] Generic Lookup List table + API (`lookup_lists`, `lookup_items`) and the **Lookup Manager** UI, wired first to Room Types, Document Types, **Relationship Types**, and **Discount Types** as pilot lists — seed system lookup data for all `FR-xxx` requirement entities that are "small configurable lists" (room types, fee types, document types, hold types, incident types, health record types, employment status, asset types, notification channel, payment method codes) — **LookupList + LookupItem entities + ConfigEngineService + ConfigEngineController + SQL seed (10 pilot lists, 22 items)**
- [x] Custom Field Definitions table + JSONB `custom_fields` column pattern; Config-Forms schema renderer (frontend) proven on the **Student and Employee** entities — incl. validation + visibility rules + file/relation-picker field types (`frontend.md` §6); **extend entity_type enum to include `enrollment` and `invoice`** [GAP] (FR-SIS-5: spec says "Student, Employee, Enrollment, or Fee entities") — **CustomFieldDefinition entity implemented with full CRUD**
- [x] Numbering Scheme manager (student number, employee ID, OR/SI series, document refs) — add `branch_id NULL` + `current_counter per (tenant,branch,scheme)` row-lock; used later by Enrollment/HR/Cashiering — **NumberingScheme entity implemented**
- [x] Feature flag table + per-tenant/per-branch flag evaluation service — **FeatureFlag entity implemented**
- [x] Audit log table (`audit_events` + `branch_id`, ip, request_id, correlation_id) + write-path (interceptor/middleware that captures before/after state on mutating requests) + Audit Log viewer UI (exportable for compliance) — **AuditEvent entity + ConfigEngineService.logAuditEvent() + API endpoint implemented**
- [ ] Workflow/Approval-chain DDL + engine: `workflow_definitions` (tenant_id, entity_type: discount/grade_change/refund/document, steps JSONB, sla_hours, escalation_to), `workflow_instances` (entity_type, entity_id, current_step, status), `workflow_approvals` (instance_id, approver_user_id, decision, reason, decided_at) + Builder UI with escalation/SLA — build the generic engine now even though the first consumer arrives in Phase 5–6
- [ ] Academic-year rollover wizard (FR-CFG-6): clone SY structure (levels, curricula, fee templates, section skeletons) → edit deltas, as BullMQ job with progress tracking — spec explicitly requires this, currently unplanned
- [ ] Shared backend conventions: cursor pagination for students/payments, `Idempotency-Key` enforcement on financial mutations (stored on `payments.idempotency_key UNIQUE`, `invoices` idempotency via enrollment_id+term_id), outbound webhook emitter (HMAC-signed, retried) + `webhook_endpoints` + `webhook_deliveries` audit log, OpenAPI-published + generated `api-client`; frontend state conventions (TanStack key `[tenant,branch,resource,params]`, Zustand non-sensitive persist only, no optimistic financial mutations per `frontend.md` §9)
- [ ] **Seed default workflow definitions** [GAP] (FR-GRA-6, FR-BIL-4, FR-CSH-10, FR-DOC-2):
  - Grade change/appeal: steps = [{role: Teacher, action: request}, {role: SubjectCoordinator, action: review}, {role: Registrar, action: approve}], sla_hours=48, escalation_to=Principal
  - Discount/scholarship approval: steps = [{role: FinanceOfficer, action: review}, {role: TenantAdmin, action: approve}], sla_hours=72
  - Refund: steps = [{role: Cashier, action: request}, {role: FinanceOfficer, action: review}, {role: TenantAdmin, action: approve}], sla_hours=168 (7 days)
  - Document release: steps = [{role: Registrar, action: release}], sla_hours=24 (single approver)
  - Approval workflow engine must handle rejection with reason + escalation (auto-assign next step after SLA expiry, auto-notify via notification_rules)

### 1.5 Platform admin console

- [ ] Super Admin: tenant list, create/suspend, plan assignment, usage meters (student/branch counts vs. plan caps)
- [ ] Support impersonation flow: time-boxed grant with optional break-glass (emergency, no request needed but fully audited and banner-visible), per `architecture.md` §10

**Exit criteria for Phase 1:** two demo tenants exist, each with two branches; a Tenant Admin of Tenant A cannot see any data of Tenant B under automated test; a custom role can be created and enforced; the audit log records a config change end-to-end.

---

## Phase 2 — Facility Management

**Outcome:** Buildings/floors/rooms are fully tenant-managed and ready to be referenced by scheduling later.

- [x] Building/Floor/Room tables + migrations (tenant/branch scoped) — add to `tables.md buildings`: `address/wing TEXT`, `floor_count INT`, `contact TEXT`; `floors.building_id` cascade + UNIQUE(building_id, floor_number) — **Entity + CRUD + Swagger implemented**
- [x] `room_assets` table (light asset registry per FR-FAC-6): `room_id FK → rooms`, `asset_tag`, `asset_type FK → lookup_items (Asset Types)`, `condition`, `maintenance_flag`, `notes` + RLS + index `idx_room_assets_tenant_room` [tables.md new] — **RoomAsset entity + CRUD implemented**
- [x] CRUD APIs + UI for Building → Floor → Room (nested management screen) — **FacilityController with 15 endpoints implemented**
- [x] Room types as a Lookup List (reuses Phase 1.4 engine) — **Room types seeded in Phase 1 migration**
- [x] Room capacity, equipment tags, status (active/maintenance/closed) + seating layout field — **Room entity includes all fields**
- [x] Light asset registry per room (`room_assets`: room_id, tenant_id, branch_id, asset_tag, asset_type→lookup, condition, maintenance_flag) + maintenance-flag (FR-FAC-6, not full asset mgmt) — **RoomAsset entity with full CRUD**
- [x] Room-schedule conflict-check service (stub now, consumed by Scheduling in Phase 5/6) — signature `isRoomFree(branch_id, room_id, day, start, end, term_id, exclude_offering_id)` + DB exclusion constraint plan (uses `term_id` for Phase 5 conflict scoping [GAP]) — **Stub implemented, returns {isFree: true}**
- [ ] Facility occupancy report (basic version; refine once class offerings exist)

**Exit criteria:** A Branch Admin can build out a campus's full building/floor/room tree unassisted, and it's visible in a floor-by-floor UI.

---

## Phase 3 — Academic Structure & Curriculum Engine

**Outcome:** The hardest domain-modeling problem (K-12 + College in one schema) is solved and admin-editable.

- [x] Education Levels, Grade/Year Levels tables + seed data helper (not hard-coded — a "seed template" tenant admins can import: DepEd K-12 levels incl. Kindergarten, generic College year levels) + per-branch levels-offered selector linked to `departments.education_level_ids` — **EducationLevel (fixed tenantId) + GradeLevel entities + CRUD implemented**
- [x] School Year & Term CRUD (with configurable term count/type per department, start/end dates + grade-submission deadlines) — **SchoolYear + Term entities + CRUD implemented**
- [x] Tracks/Strands (SHS) and Programs (College) CRUD — **Track, Strand, Program entities + CRUD implemented**
- [x] Subject/Course master CRUD (units, hours/week, core/elective, prerequisites + co-requisites, lecture/lab split, learning-area tag e.g. MAPEH/TLE, version history per FR-ACA-5) — **Subject entity with all fields + CRUD implemented**
- [x] Curriculum entity + Curriculum-Subject mapping, scoped by education level/grade/strand/program + school year + curriculum version/year coexistence for College cohorts — **Curriculum + CurriculumSubject entities + CRUD + clone + publish implemented**
- [ ] Curriculum Builder UI: assign subjects to terms, prerequisite linking, clone-from-prior-year
- [x] Grading System configuration: `grading_systems` + `grade_components` (Written Work/Performance Task/Exam or Prelim/Midterm/Finals), weight templates, transmutation table editor — FIX `tables.md`: add `school_year_id FK + branch_id NULL` to `grading_systems` for SY-versioning per FR-ACA-7; add UNIQUE(tenant_id, education_level_id, school_year_id); add `is_active BOOLEAN` for active/default resolution — **GradingSystem + GradeComponent entities + CRUD implemented**
- [x] **Define active/default grading-system resolution rule** [GAP] (FR-ACA-7): per education level per school year, the `grading_systems` row with `is_active = true` and `branch_id = NULL` (tenant default) is the default; a `branch_id IS NOT NULL` row overrides the tenant default for that branch. The resolution order is: (1) branch-specific active, (2) tenant-default active. If multiple active rows exist for the same (tenant, education_level, school_year, branch), the service errors. This mirrors the override-by-shadow-row pattern from Phase 1. — **`resolveGradingSystem()` implemented with branch-first override**
- [ ] Generic override-by-shadow-row service (arch §4): `resolveTemplate(tenant_id, branch_id, template_key)` reused for curricula + fee_structures + grading_systems + document_templates; branch-level override pattern implemented and tested (tenant default curriculum vs. branch-specific variant)
- [ ] FIX `tables.md honor_roll_configs` duplicate `with_high_honors_threshold` → rename second to `with_highest_honors_threshold`; add `branch_id NULL`, UNIQUE(tenant_id, education_level_id, school_year_id)
- [ ] Seed-data packs: DepEd K-12 core subjects per grade band (Grades 1–3, 4–6, 7–10) and SHS core+specialized subjects per strand (STEM/ABM/HUMSS/GAS/TVL), loadable as an optional starter template, fully editable after import
- [ ] Sample College program template (generic BS program skeleton with Gen-Ed + major subjects) as a starter template
- [ ] **Add clone metadata to `curricula`** [GAP] (FR-ACA-6): `cloned_from_curriculum_id UUID NULL`, `cloned_at TIMESTAMPTZ`, `cloned_by UUID NULL` — so the Curriculum Builder can show "cloned from SY 2025-2026 v2 by Registrar on 2026-05-15" and the audit log can trace curriculum lineage [tables.md fix]
- [ ] **Add `effective_grading_system_id` to `curriculum_subjects`** [GAP] (Phase 5.3 linkage): resolved at curriculum-publish time (when a curriculum transitions from `status=draft` to `status=active`), this FK → `grading_systems(id)` captures which grading system applies to that specific curriculum subject, so the gradebook loads it without re-resolving the grading system lookup on every grade-entry read [tables.md fix]

**Exit criteria:** A Tenant Admin can, without engineering help, build a complete curriculum for Grade 7, for Grade 11 STEM, and for a College program, all within one school year.

---

## Phase 4 — Student Information System & Admissions/Enrollment

**Outcome:** The learner lifecycle from application to enrolled-in-a-section works end to end.

### 4.1 SIS core

- [ ] Expand `tables.md students`: add `middle_name, suffix, address TEXT, photo_url TEXT, prior_school TEXT, health_flags TEXT, iep_notes TEXT, gov_id_type TEXT, gov_id_number TEXT (encrypted per arch §10), status (active/inactive/graduated/transferred)` + CHECK LRN `^\d{12}$` + UNIQUE(tenant_id, lrn) + UNIQUE(tenant_id, student_number); `guardians`: add `address, photo_url`; `student_guardians`: add `tenant_id NOT NULL + RLS`, `custody_flag BOOLEAN`, `emergency_priority INT`, `consent_to_fetch BOOLEAN`
- [ ] Student, Guardian, Student-Guardian tables + APIs (incl. relationship + custody flags, is_primary, emergency contacts, photo, prior school, health flags / special-needs/IEP notes, gov IDs per FR-SIS-1)
- [ ] `enrollment_holds` DDL (MISSING): id, tenant_id, branch_id, student_id, enrollment_id NULL, hold_type→lookup (finance/discipline/requirements), reason, blocks_schedule BOOLEAN, blocks_tor BOOLEAN, blocks_exam_permit BOOLEAN, is_active, released_by/at; enforcement middleware checked in enrollment wizard + schedule release + TOR release + exam permit [tables.md new]
- [ ] `student_documents` vault DDL (MISSING): id, tenant_id, branch_id, student_id, file_url (S3), doc_type→lookup, is_guardian_visible BOOLEAN, uploaded_by/at; S3 private bucket + presigned URLs [tables.md new]
- [ ] **Cross-level academic history** per student across levels/branches within the tenant (Elementary → JHS → SHS → College continuity where applicable) — stored as a read view `v_student_academic_history` over enrollment + grade entries + promotion_decisions, not a separate table (`spec.md` FR-SIS-3); **the view joins `enrollments` → `promotion_decisions` (latest decision per student/SY) + `grade_entries` (term-level aggregates per curriculum_subject) + `permanent_records` (if Form 137/TOR exists); the view must be RLS-filtered via the same `app.current_tenant_id` session variable**
- [ ] Student 360 profile UI (Info/Guardians/Academic History/Documents/Finance/Health/Discipline tabs — finance/health/discipline tabs stubbed until their modules ship)
- [ ] Custom fields on Student entity (proves Phase 1.4 engine in a real screen)
- [ ] Document vault (upload + system-generated docs) with guardian-visible sharing flags
- [ ] Duplicate-detection/merge tool (incl. duplicate-LRN guard + 12-digit LRN format validation); **add `student_merge_audit` table** [GAP] (FR-SIS-6): id, tenant_id, merged_from_student_id (the duplicate), merged_into_student_id (the survivor), merged_by, merged_at, field_map JSONB — so the merge tool is auditable and the audit log records what happened to each field [tables.md new]
- [ ] Behavior/incident records (Guidance/Discipline: referrals) + Clinic health records (immunization/incident logs) tables + minimal UIs — personas exist in spec §4 but have zero build tasks; needed before Health/Discipline tabs can un-stub; add `behavior_incidents` + `health_records` tables to `tables.md`

### 4.2 Admissions

- [ ] Applicant pipeline model (`applicants` + `applicant_stage_configs` per tenant/level for FR-ADM-2 configurability + `entrance_exams`/`interviews`: applicant_id, tenant_id, branch_id, scheduled_at, venue/room_id, score, result) + Kanban UI
- [ ] `applicant_documents` DDL (MISSING): applicant_id, tenant_id, file_url, doc_type (birth_cert/form138/tor/id_photo), verified BOOLEAN [tables.md new]
- [ ] Public application form (configurable fields per level via custom_field_definitions entity_type=applicant, incl. ESC/QVR subsidy fields) + document upload
- [ ] LRN capture/validation field (basic ed `^\d{12}$`) / student-number auto-generation via Numbering Scheme
- [ ] Bulk import (CSV + Excel) with validation/error report + DPA consent capture at enrollment (arch §10); **specify error report categories** [GAP] (FR-ADM-7): duplicate LRN, duplicate student number, missing mandatory field (first_name/last_name/level), invalid curriculum reference, invalid section reference, LRN format violation (`^\d{12}$`), applicant_stage invalid, dpa_consent missing — each maps to a distinct error code the import UI surfaces per-row with row number + offending field
- [ ] **Define applicant stage transition rules** [GAP] (FR-ADM-2): which stages can transition to which (e.g., inquiry→applicant→exam→admitted→enrolled, with rejected/waitlisted as terminal)? Are transitions one-way? Can a rejected applicant be re-inquired? Add `applicant_stage_transitions` table (tenant_id, branch_id NULL, from_stage, to_stage, requires_docs BOOLEAN, auto_admit BOOLEAN) — this makes the pipeline truly configurable, not just a list of stage labels; the Kanban UI reads allowed transitions from this table rather than hard-coding the pipeline
- [ ] **Decompose section assignment rules into configurable rule objects** [GAP] (FR-ADM-5): `section_assignment_rules` (tenant_id, branch_id NULL, school_year_id, rule_type: strand/standing/alphabetical/quota, config JSONB e.g. {"max_capacity": 40, "quota_balance": true, "alphabetical_by": "last_name"}, sort_order, is_active) — so the enrollment wizard can offer "assign by strand then alphabetical within strand" as a composable rule, not a hard-coded strategy; the wizard evaluates rules in sort_order and applies the first matching rule [tables.md new]
- [ ] Re-enrollment batch workflow (carry-forward to next grade/year level + outstanding balances/holds)
- [ ] Enrollment holds (finance/discipline/incomplete-requirements) + hold-type Lookup List + enforcement checks (block schedule / TOR / exam-permit release)
- [ ] Cross-branch transfer workflow within same tenant (preserves academic + financial history with audit trail); **add `student_transfers` artifact table** [GAP] (FR-ADM-8): id, tenant_id, destination_branch_id, student_id, from_enrollment_id, to_enrollment_id, from_school_year_id, to_school_year_id, transfer_date, reason, transferred_by, academic_history_preserved BOOLEAN, financial_balance_transfer BOOLEAN — so the transfer is auditable and the cross-level academic history view can attribute the right branch per SY [tables.md new]

### 4.3 Enrollment

- [ ] Enrollment entity (student + school year + curriculum + section) + `promotion_decisions` stub table (student_id, from_grade, to_grade, decision: promoted/retained/graduated, decided_by/at) filled in Phase 5.3
- [ ] Enrollment wizard UI (select curriculum → assign section → confirm) with hold-blocking checks (`enrollment_holds.is_active` gate)
- [ ] Sections CRUD — FIX `tables.md sections`: add `capacity INT`, `homeroom TEXT`, `is_active BOOLEAN`; then adviser, room, capacity + manual + rule-based assignment (by strand/standing/alphabetical/quota per FR-ADM-5)
- [ ] Re-enrollment batch workflow (carry-forward to next grade/year level + outstanding balances/holds)
- [ ] Enrollment holds (finance/discipline/incomplete-requirements) + hold-type Lookup List + enforcement checks (block schedule / TOR / exam permit release)
- [ ] Cross-branch transfer workflow within same tenant (preserves academic + financial history with audit trail)

**Exit criteria:** A new applicant can be admitted, enrolled into a section built in Phase 3, and their profile shows correctly scoped academic history.

---

## Phase 5 — Scheduling, Attendance, Grading

**Outcome:** The daily academic operations loop is functional.

### 5.1 Scheduling

- [ ] Class Offering entity (subject + section/block + faculty + room + time slots)
- [ ] Conflict validation: room double-booking, faculty double-booking, section double-booking — **scope conflicts per-term** [GAP] (FR-SCH-1): a room conflict is invalid only within the same `term_id`; a faculty teaching at two branches in different terms is valid. The conflict check service signature becomes `isOfferingFree(branch_id, room_id, employee_id, section_id, day, start, end, term_id, exclude_offering_id)` and the DB exclusion constraint scope includes `term_id`. This requires `class_offerings.term_id NOT NULL` (already in tables.md) and a composite index `idx_class_offerings_conflict ON class_offerings (tenant_id, branch_id, term_id, day_of_week, start_time, end_time)`
- [ ] Timetable builder UI (drag/drop grid)
- [ ] Faculty load report (units/hours per term + configurable max-load warnings) + substitute-teacher assignment hook (feeds HR-Lite); **add `faculty_load_limits` config** [GAP] (FR-SCH-2): `id`, `tenant_id`, `branch_id NULL`, `employee_id NULL` (NULL = tenant default), `max_units` NUMERIC, `max_hours_per_week` NUMERIC, `warn_on_approach_pct` NUMERIC(5,2) default 90 — so the load report can flag "Faculty X is at 42/45 units" rather than a hard-coded threshold
- [ ] Branch school calendar (holidays/exam weeks/training days) affecting attendance-day computation (FR-SCH-4) + student personal schedule view (esp. College per FR-SCH-3) — add `school_calendars` + `calendar_events` tables to `tables.md`

### 5.2 Attendance

- [ ] Attendance record schema (daily for basic ed, per-period for JHS/SHS/College — configurable by level via `attendance_config` per education_level: mode daily/period); **add `attendance_config` table** [GAP] (FR-ATT-1): `id`, `tenant_id`, `branch_id NULL`, `education_level_id`, `mode` (daily/period), `default_periods JSONB` (e.g. ["7:30-8:20","8:30-9:20"] for period mode), `is_active` — so the attendance grid knows whether to render one row per day or one row per period per day [tables.md new]
- [ ] Teacher attendance-entry UI (grid) + QR/ID-scan kiosk + biometric webhook/API hook + parent-reported excuse upload via `attendance_excuses` (MISSING: attendance_record_id NULL, student_id, tenant_id, branch_id, excuse_file_url, reason, status pending/approved/rejected, reviewed_by) [tables.md new]
- [ ] Notification trigger on absence threshold (wired to a stub notification service; real dispatch in Phase 8) incl. counselor alert + ESC minimum-attendance% report input; **decompose threshold config** [GAP] (FR-ATT-3): `attendance_notification_thresholds` (tenant_id, branch_id NULL, education_level_id NULL, trigger_type: consecutive_absences/percent_missed/tardy_count, threshold_value NUMERIC, action: notify_parent/notify_counselor/escalate, audience JSONB, is_active) — so "3 consecutive absences → counselor alert" and "below 80% attendance → ESC report flag" are both configurable, not hard-coded [tables.md new]
- [ ] Attendance summary report (days_present/absent/tardy per term, feeds Form 137 later)

### 5.3 Grading

- [ ] Gradebook schema (components per configured weight template from Phase 3); **define curriculum_subject → grading_system linkage** [GAP] (FR-GRA-1): which grading system applies to which curriculum subject? The `curriculum_subjects.effective_grading_system_id` field (added in Phase 3) is resolved when the curriculum is published from draft → active, by looking up the active `grading_systems` row for that education_level + school_year (with branch override); if no override exists, use the tenant default. This means changing a grading system after a curriculum is published does NOT retroactively change existing grade entries — the grade entry's `grading_system_id` (captured at entry time) is authoritative for that student's grade computation
- [ ] Gradebook UI (spreadsheet-like entry, live weighted computation) + manual override with required reason + audit log (FR-GRA-2)
- [ ] Grade finalization/lock per term (immutable after registrar closes the term; append-only corrections thereafter per arch §1.5) — add `grade_entries.locked BOOLEAN` + `grade_change_requests` table for post-lock corrections [tables.md new]
- [ ] Grade-change/appeal workflow using the Phase 1.4 workflow engine; **seed the default grade-change workflow definition** [GAP] (FR-GRA-6): steps = [{role: Teacher, action: request}, {role: SubjectCoordinator, action: review}, {role: Registrar, action: approve}]; sla_hours = 48; escalation_to = Principal — so the workflow engine has a real consumer on day one, not a theoretical one
- [ ] Report Card template + PDF generation (DepEd Form 138 style, tenant-branded); **define report-card merge-field catalog** [GAP] (FR-GRA-3): the `document_templates.content` (JSONB) for report cards can reference variables: {student_name}, {student_number}, {lrn}, {school_year}, {term}, {grade_level}, {section_name}, {adviser_name}, {grades: {subject_code: {component: score}}}, {general_average}, {honors}, {signature_block}}. Specify the variable syntax (e.g., Handlebars-style `{{student_name}}` or Mustache) and the merge-engine contract so the template designer (Phase 8) can render without custom code per document type
- [ ] Honor roll + Latin-honors computation (reads fixed `honor_roll_configs` thresholds per level/SY); **add `honor_roll_configs` table** [GAP] (FR-GRA-4): `id`, `tenant_id`, `branch_id NULL`, `education_level_id`, `school_year_id`, `with_honors_threshold NUMERIC(5,2)`, `with_high_honors_threshold NUMERIC(5,2)`, `with_highest_honors_threshold NUMERIC(5,2)` (FIXED: was duplicate `with_high_honors_threshold`), `is_active`, UNIQUE(tenant_id, education_level_id, school_year_id) [tables.md new]
- [ ] Permanent records (Form 137 / TOR) with registrar approval + e-signature workflow before release (FR-GRA-5) — add `permanent_records` table (student_id, record_type form_137|tor, content JSONB, pdf_url, registrar_approved, approved_by/at, e_signature_data, verification_code UNIQUE, created_at) + `generated_documents` linkage [tables.md new]
- [ ] Promotion/retention/graduation batch process at year-end (level-aware; SHS→College eligibility flag) writing `promotion_decisions` + updating `enrollments.status` + BullMQ progress, never inline

**Exit criteria:** A teacher can take attendance and enter grades for a real class offering; a parent (once Phase 9 portal exists) will be able to see both; a report card PDF renders correctly.

---

## Phase 6 — Billing & Fee Management

**Outcome:** Fees can be assessed against an enrollment and a Statement of Account is produced — before cashiering can collect against it.

- [ ] Fee Type CRUD (Lookup-engine-based) with GL account mapping + taxable/non-taxable flag
- [ ] FIX `tables.md fee_structures`: add `strand_id FK NULL, track_id FK NULL, boarding_type TEXT (day/boarding) NULL, term_id FK NULL`; FIX `payment_plans.branch_id` NULL-able (NULL=tenant default); ADD `tenant_id` + RLS to child tables `fee_structure_items, curriculum_subjects, installment_schedules, invoice_items, student_guardians` (currently missing, breaks arch §3 pool isolation)
- [ ] Fee Structure Builder UI (line items, per level/grade/program/school year, branch override + track/strand/program + boarding vs. non-boarding overrides) + override-by-shadow-row resolution service + tests (arch §4)
- [ ] **Define full fee-structure resolution precedence** [GAP] (FR-BIL-2): document and test the order: (1) branch + term + strand + track + program + boarding match; (2) branch + term + strand + track match; (3) branch + term + strand match; (4) branch + term match; (5) tenant default + term match; (6) tenant default (no term). The `resolveTemplate()` service from Phase 3 is generalized to `resolveFeeStructure(tenant_id, branch_id, school_year_id, term_id, education_level_id, grade_level_id, strand_id, track_id, program_id, boarding_type)` and each precedence step is a test case. The `fee_structures` table gets a composite index `idx_fee_structures_resolution` covering all these columns for the resolution query
- [ ] Payment Plan/installment configuration (cash full-payment discount % vs. N-installment schedules with due dates + equal-split or custom per-installment amounts)
- [ ] `penalty_rules` DDL (MISSING for FR-BIL-6): tenant_id, branch_id NULL, grace_days INT, penalty_type flat/percent_per_month, value NUMERIC, waivable BOOLEAN [tables.md new]
- [ ] Discount/Scholarship rule engine (sibling, employee, early-bird, gov subsidy ESC/QVR/TES/TDP, academic full/partial; % or fixed; stackable rules) + `student_discount_grants` DDL (MISSING: student_id, invoice_id NULL, discount_type_id, amount_computed, status pending/approved/rejected, approved_by/at via workflow_instances) + approval workflow (Phase 1.4 engine); **add `discount_types` table** [GAP] (FR-BIL-4): `id`, `tenant_id`, `code`, `name`, `discount_type` (percentage/fixed_amount), `value`, `is_stackable`, `requires_approval` — so discounts are a first-class catalog entity, not ad-hoc strings; `fee_structure_items.discount_type_id FK → discount_types` + `invoice_items.discount_type_id FK → discount_types` [tables.md new]
- [ ] Invoice generation on enrollment (auto-assess fees per resolved fee structure) — idempotent on (enrollment_id, term_id), posts `invoice_items` + applied grants + penalties; **define invoice generation triggers** [GAP] (FR-BIL-5 — locked in Phase 0): invoices are generated (1) on enrollment confirmation, (2) on term start (creates installment schedule), (3) on fee structure change (if the new structure would change the assessed amount → generates an adjustment invoice, not a re-issue of the original). Each trigger is idempotent via the idempotency-key mechanism
- [ ] Statement of Account view (student/guardian-facing and staff-facing) per term with fees/payments/discounts/penalties/balance; **specify aging as-of date** [GAP] (FR-BIL-7): aging is computed "as of today" for the live AR Aging report, and "as of statement date" for the per-student SOA. The `invoices.balance` is the source of truth for both; the aging buckets are computed at report time from `payments.paid_at` vs. `invoice_items` due dates (from `installment_schedules.due_date`), not stored on the invoice
- [ ] Late-payment penalty auto-computation job (reads `penalty_rules`, grace period, flat or %/month, scheduled BullMQ nightly) + waive-with-approval + reason
- [ ] Refund / fee-adjustment workflow (pro-rated `withdrawal_policies` per tenant: days_band, refund_pct) + approval chain; **add `withdrawal_policies` table** [tables.md new]: `id`, `tenant_id`, `days_band` (e.g. "0-7", "8-30", "31+"), `refund_pct`, `is_active` — the withdrawal service looks up the band matching the days-between-enrollment-and-withdrawal and computes the pro-rated refund. The refund posts to `refunds` (linked to the original OR) and generates a Credit/Adjustment Receipt
- [ ] AR Aging report (current/30/60/90+ per student/section/branch/tenant-wide)

**Exit criteria:** Enrolling a student in Phase 4/5's flow automatically produces a correct invoice/SOA reflecting the fee structure built here, including any applicable discount.

---

## Phase 7 — Cashiering / POS & Payments

**Outcome:** Money can be collected, a compliant Official Receipt is produced, and it works offline.

### 7.1 Core cashiering

- [ ] `cashier_stations` table (new—spec §8 catalogue): `id`, `tenant_id`, `branch_id`, `station_code` (UNIQUE per branch), `printer_config JSONB` (ESC/POS agent/WebUSB + `or_block_size`, `max_float`), `is_active`; add FK `cashier_sessions.station_id → cashier_stations(id)` [tables.md fix]
- [ ] `payment_methods` table (new—spec §8 catalogue): `id`, `tenant_id`, `code` (cash|check|bank_deposit_ref|gcash|maya|qrph|card|online), `name`, `requires_gateway_ref`, `is_active`; seed initial payment methods per tenant from Phase 0 provider decision
- [ ] `denomination_sets` table (new—FR-CSH-6): `id`, `tenant_id`, `currency PHP`, `denominations INT[]`, `is_active`
- [ ] Cashier Session model — FIX: `cashier_sessions.station_id FK → cashier_stations` (was missing); `cashier_user_id FK → users.id` (was FK → employees.id — wrong, the cashier is a logged-in user, not just an employee record); add `opening_float` validated against configurable max (Phase 0 decision), `denomination_breakdown JSONB` validated against `denomination_sets`, `closing_actual`, `variance_amount` = closing_actual - (opening_float + total payments - total refunds), `variance_approved_by/at`, `shift_report_url`
- [ ] **Add float validation rules** [GAP] (FR-CSH-1): `opening_float` must be >= 0 and <= a configurable maximum (default ₱50,000, configurable per `cashier_stations.printer_config.max_float`). Session open is rejected if the float is outside range. Session close reconciliation computes `expected = opening_float + total_payments - total_refunds`; variance = `closing_actual - expected`; variance is auto-approved if abs(variance) < configurable threshold (default ₱500, configurable per `cashier_stations.printer_config.variance_threshold`), otherwise requires supervisor approval via workflow_instances
- [ ] Session close reconciliation (expected vs. actual) + variance supervisor approval + shift report; session left open >24h business alert (arch §14)
- [ ] Payment entity + allocation logic (`payment_allocations` MISSING: payment_id, invoice_id, amount_applied — supports split across invoices + oldest-first rule, configurable) + payment-method master + non-optimistic UI pending state (`frontend.md` §9); **add `payment_allocations` table** [Gap]: `id`, `tenant_id`, `payment_id FK → payments`, `invoice_id FK → invoices`, `amount_applied NUMERIC(12,2)` — supports split-payment across multiple invoices; the allocation rule (oldest-first, or proportionate, or specific) is configurable per `invoice.payment_plan_id` via a `payment_allocation_rule` field
- [ ] ATP Series / OR numbering module with transactional, gapless allocation (`architecture.md` §11.2) — `series_counters` row + `SELECT FOR UPDATE`/advisory lock, validity windows, per-branch/TIN-branch-code series — FIX: `series_counters.session_id FK NULL + reserved_at/expires_at` for multi-terminal blocks; add `atp_series` table (id, tenant_id, branch_id, name, range_start BIGINT, range_end BIGINT, valid_from, valid_to, is_active); **specify OR number alignment** [GAP] (FR-CSH-4/BIR): `official_receipts.or_number` stores the numeric part as BIGINT (auto-allocated from `series_counters.counter_value`), and a `or_number_display TEXT` column stores the formatted version (e.g. `OR-2026-0001234`) based on `atp_series.format_template`. The UNIQUE constraint is on `(branch_id, or_number)` the numeric part; the display format is for human readability only
- [ ] Official Receipt generation (PDF, BIR-mandatory fields, tenant/branch TIN & branch code, Tax-Exempt labeling where applicable) + BIR sales/collection-books export format (arch §10)
- [ ] Void/reversal flow (never hard-delete; linked reversal record + approval via workflow_instances) + Credit/Adjustment Receipt print referencing original OR (FR-CSH-10); **add `refunds` table** [GAP] (FR-CSH-10/FR-BIL-8): `id`, `tenant_id`, `branch_id`, `original_or_id FK → official_receipts`, `payment_id FK → payments`, `invoice_id FK → invoices`, `amount`, `reason`, `approved_by`, `status` (pending/approved/completed), `created_at` — a refund creates a Credit/Adjustment Receipt referencing the original OR; the refund posts to `refunds` and triggers a new `payment` (negative amount) + new `official_receipt` (next sequential number, not voiding the original)
- [ ] Daily Collection Report / Cash Position Report (per cashier/branch, exportable to GL); **specify report breakdown dimensions** [GAP] (FR-CSH-7): the Daily Collection Report breaks down by payment method AND by fee type (both), so finance can see "₱45,000 cash tuition + ₱12,000 GCash miscellaneous". The Cash Position Report shows opening float + inflows - outflows = closing expected, per cashier per branch, with variance highlighted
- [ ] **Make OR-block size configurable** [GAP] (FR-CSH-8 — locked in Phase 0): the reserved OR block size is read from `cashier_stations.printer_config.or_block_size` (default 50, min 10, max 500). The `series_counters.reserved_block_start/end` are allocated from this configurable block size on session open

### 7.2 Payment gateway integration

- [ ] `PaymentGatewayPort` interface + first adapter (Xendit or PayMongo) for GCash/Maya/QR Ph/cards + bank rails (InstaPay/PESONet); multi-provider per-tenant config + `refund()` path (arch §11.1); **lock provider-to-rail coverage** [GAP] (FR-CSH-3 — locked in Phase 0): if Phase 0 decides single-provider, document which rails that provider covers (e.g., Xendit: GCash, Maya, QR Ph, cards, InstaPay; PayMongo: GCash, Maya, QR Ph, cards) and which rails are "Phase 7.2, second adapter" (e.g. DragonPay for PESONet bank transfer). If multi-provider, document the per-tenant provider assignment UI and the fallback logic (primary → secondary on failure)
- [ ] Webhook receiver + signature verification + idempotency-key enforcement
- [ ] Guardian-portal "Pay Now" flow posting into the same invoice/ledger the cashier sees
- [ ] Daily settlement reconciliation job vs. gateway reports (mismatch queue for finance)

### 7.3 Offline POS

- [ ] Service worker + IndexedDB (Dexie) local store for the POS route
- [ ] On session open, **pre-fetch a reserved block of OR numbers AND cache student/balance snapshots** for likely lookups — offline queries must resolve without network (`architecture.md` §11.3)
- [ ] OR-number block reservation on session open; release-unused-on-close
- [ ] Local payment write + local receipt print while offline (ESC/POS agent/WebUSB + PDF fallback; "Provisional — OR #___ reserved" stamp)
- [ ] Persistent Online/Offline(queued:N)/Syncing status chip + pending-sync indicator (`frontend.md` §8.2)
- [ ] Background Sync queue + conflict/exception inbox for unresolvable syncs (never silent drop/double-apply)
- [ ] Simulated outage test in staging (kill network mid-session, verify recovery with zero double-charge/zero data loss)

### 7.4 Non-tuition sales

- [ ] `ad_hoc_sales` + `ad_hoc_sale_items` DDL (MISSING for FR-CSH-9): tenant_id, branch_id, session_id, buyer_name, fee_type_id→fee_types, amount, qty; FIX `payments.invoice_id` NULL-able + CHECK (invoice_id IS NOT NULL OR ad_hoc_sale_id IS NOT NULL); same till + same OR series + GL export
- [ ] **Decide whether ad-hoc sales need lightweight stock tracking** [GAP] (FR-CSH-9 — locked in Phase 0): spec says "uniform/books/ID sold at cashier" using the same fee-type/GL framework. If Phase 0 decides YES, add `ad_hoc_stock_items` (fee_type_id, qty_on_hand, reorder_point, is_tracked) and decrement on each sale. If NO, document that stock tracking is "future module" (spec §12 cafeteria/inventory) and ad-hoc sales are pure GL entries with `qty` as a multiplier only. This decision gates whether `ad_hoc_sale_items.qty` decrements a stock count
- [ ] Support ad-hoc/non-invoice sales (uniforms, books, IDs) through the same till and OR series

**Exit criteria:** A cashier can open a session, collect a cash payment against a real invoice, print a compliant OR, close the session with a balanced reconciliation — and repeat the same flow with the network disabled, then reconnect and confirm the ledger matches with zero discrepancies.

---

## Phase 8 — Communications, Documents, HR-Lite

**Outcome:** The "glue" modules that make daily operation complete.

### 8.1 Communications

- [ ] Notification template manager (SMS/email/push/in-app) + `notification_rules` (event_type→lookup: absence/low_balance/grade_posted/document_ready, threshold JSONB, template_id) + audience segments (grade/section/branch/tenant); **add `notification_templates`, `notification_rules`, `channel_configs`, `notification_logs`, `message_threads`, `messages`, `message_thread_participants`, `announcements` tables** to `tables.md` [GAP]
- [ ] **Define audience resolution at send time** [GAP] (FR-COM-2): when an announcement is sent with `audience_type=grade_level` and `audience_ids=[grade_level_id]`, the system resolves the audience to the set of guardian users linked to students in that grade level (via `student_guardians` → `guardians` → `user_person_links` → `users`), scoped to the announcement's `branch_id`. Document the resolution query and the fact that audience resolution happens at send time, not at compose time (so a new guardian linked after compose still receives)
- [ ] **Define notification template merge-field catalog** [GAP] (FR-COM-1 — locked in Phase 0): specify the variable syntax (e.g. `{{student_name}}`) and the catalog of available merge fields per event type (absence: {student_name, guardian_name, date, status, section_name}; low_balance: {student_name, guardian_name, amount_due, due_date, student_number}; grade_posted: {student_name, guardian_name, subject_name, score, term}; document_ready: {student_name, document_type, download_url, verification_code}). The `notification_templates.body_template` TEXT field stores the template with `{{variable}}` placeholders; the dispatch service resolves variables from the event payload before sending
- [ ] `channel_configs` + `notification_logs` DDL (MISSING): logs (tenant_id, branch_id, template_id, channel, recipient_user_id, recipient_contact, payload JSONB, status queued/sent/failed, provider_msg_id, sent_at); configs (tenant_id, branch_id NULL, channel, provider, credentials_ref vault, sender_id, is_active)
- [ ] Channel provider abstraction + config UI (SMS Semaphore/Movider, email SES/SendGrid, push FCM/APNs per FR-COM-4)
- [ ] SMS gateway integration (PH provider, e.g., Semaphore/Movider)
- [ ] Email integration (SES/SendGrid)
- [ ] Push integration (FCM/APNs) — depends on Phase 9 mobile shell existing
- [ ] Announcement composer with audience targeting
- [ ] Guardian↔staff message threads via `message_threads` + `messages` DDL (MISSING: thread (tenant_id, branch_id, subject, student_id NULL, created_by), message (thread_id, sender_user_id, body, attachment_url, read_at)) — lightweight, not full chat per FR-COM-3; **add `message_thread_participants` table** [GAP] (FR-COM-3): `(thread_id, user_id, last_read_message_id, last_read_at)` — so each participant has independent read state in a multi-participant thread (guardian + teacher + registrar). The `messages.read_at` column marks when any participant read that specific message; `message_thread_participants.last_read_message_id` marks the per-participant "last seen" pointer for "N unread" computation
- [ ] Wire real dispatch into attendance-absence and low-balance triggers stubbed in Phases 5–6 (BullMQ notification queue, per-tenant rate limit per arch §12)

### 8.2 Document generation

- [ ] Document Template engine (WYSIWYG + merge fields, versionable + signatories manager) covering: Certificate of Enrollment, Good Moral, Form 137, TOR/Certificate of Grades, ID card, Diploma; **decide WYSIWYG engine** [GAP] (FR-DOC-1 — locked in Phase 0): if Phase 0 decides "react-based template editor with merge-field chips", implement a React component in `packages/ui/print` that lets users drag merge-field chips into a WYSIWYG editor, storing the result as a JSONB AST in `document_templates.content`. If "handlebars markup editor", implement a Monaco-based editor with Handlebars syntax highlighting, storing the template string in `document_templates.content.template_string`. The choice affects `packages/ui/print` layouts and the server-side PDF render service contract
- [ ] Document Request workflow (request → fee assessment if applicable → cashier collection → registrar release + e-signature via workflow_instances)
- [ ] `generated_documents` DDL (MISSING): tenant_id, branch_id, student_id, template_id, request_id NULL, file_url (S3), verification_code UNIQUE, qr_payload, released_by/at, is_voided; QR/verification-code authenticity stamp (+ public verify endpoint `GET /verify/:code` no auth); **lock verification-code format** [GAP] (FR-DOC-2 — locked in Phase 0): format `DOC-{tenant_short}-{8-char-alphanumeric}-{checksum}`, e.g. `DOC-HAIS-3F7A9B2E-4`. Generated by `gen_random_uuid()` → take first 8 hex chars → append mod-37 checksum of tenant_id+timestamp. UNIQUE constraint on `verification_code`. The public `GET /verify/:code` endpoint (no auth) returns `{valid: true, document_type, student_name_last_four, issued_at, tenant_name}` if valid, or `{valid: false}` if not — deliberately minimal PII to avoid leaking full student data to a random scanner
- [ ] Bulk document generation (e.g., print Form 138 for a whole section) as BullMQ job with progress + `bulk_print_jobs` tracker (section_id, template_id, total/done/failed, status) + bulk print queue UI; **decide failed-item handling policy** [GAP] (FR-DOC-3 — locked in Phase 0): auto-retry failed items 3 times with exponential backoff (1s, 5s, 15s), then mark the job `status=manual_retry_required` and populate `bulk_print_job_failures` (job_id, student_id, error_message, retry_count) — the UI shows a "Retry Failed" button for the registrar to re-run just the failed items
- [ ] Print pipeline: HTML/CSS `@media print` → server-side PDF preserving tenant branding; `packages/ui/print` layouts (ReportCard/Receipt/ID/TOR) per `frontend.md` §§8.3/13

### 8.3 HR-Lite

- [ ] Employee/Faculty record CRUD — FIX `tables.md employees`: `branch_id` NULL-able + new `employee_branch_assignments` (employee_id, tenant_id, branch_id, is_primary) for multi-branch staff per spec §5; SPLIT `gov_id_type/number` into `sss_no, philhealth_no, pagibig_no, tin_no` (encrypted) + add `email, contact_number, photo_url, hire_date, position→lookup, department→lookup`
- [ ] Teaching load view (reads Phase 5 Class Offerings via `teaching_loads` incl. is_substitute flow) + substitute-teacher assignment workflow (FR-HR-2)
- [ ] DTR capture (`dtr_records` + UNIQUE(employee_id, attendance_date)) manual entry; biometric hook stubbed for future integration
- [ ] CSV/API export hook for external payroll systems (contract-tested format, FR-HR-4)

### 8.4 Integrations (spec non-goals say integrate, not rebuild)

- [ ] Public REST API + outbound webhooks (`payment.completed`, `enrollment.created`, `grade.finalized`, `document.ready`) with docs + `webhook_endpoints`/`webhook_deliveries` tables in `tables.md`
- [ ] LMS adapter (Google Classroom and/or Moodle) per Phase 0 decision — **implement the agreed direction** [GAP] (FR-INT-1): if "roster sync system→LMS only", implement roster sync (create/update sections + student enrollments in LMS from `class_offerings` + `student_section_assignments`, triggered on curriculum publish + enrollment confirmation). If "bidirectional", implement grade passback (push `grade_entries` to LMS gradebook) with conflict resolution (system wins for enrollment status, LMS wins for attendance if biometric integrated). The adapter contract is defined by the Phase 0 decision
- [ ] Payroll export contract test with at least one target format

**Exit criteria:** A guardian receives an SMS/email when their child is marked absent; a registrar can generate and release a Form 137 with a working verification code.

---

## Phase 9 — Guardian/Student Portal & Mobile App

**Outcome:** Parents and students self-serve instead of calling the office.

- [ ] Guardian portal web app: dashboard, grades, attendance, SOA + Pay Now, documents, messages (per `frontend.md` §7)
- [ ] Multi-student (sibling) switcher for one guardian account (incl. cross-branch siblings) — uses `user_person_links` (account → guardian) + `student_guardians` (guardian → multiple students) + `student_transfers` (cross-branch continuity) [tables.md new]
- [ ] Student self-view (schedule, grades, attendance, balance, document requests)
- [ ] Flutter mobile app: parity with web portal core screens (grades, attendance, balance, pay, announcements)
- [ ] Push notification wiring (depends on Phase 8.1)
- [ ] Accessibility pass (WCAG 2.1 AA) on portal + mobile
- [ ] i18n + locale pass: `next-intl` EN/Filipino toggle on parent surfaces, PHP (₱) + `Month DD, YYYY` + `Asia/Manila` handling (`frontend.md` §10); perf pass (route `dynamic()` splits, TanStack virtualization >200 rows, `next/image`, hover-prefetch Student-360 per §11)

**Exit criteria:** A parent with two children in two different branches of the same tenant can log in once and see both children's grades, attendance, and balances, and can pay a fee for either.

---

## Phase 10 — Reporting & Analytics

**Outcome:** Leadership and regulators get the numbers they need without engineering tickets.

- [ ] `report_definitions` + `report_runs` + `report_subscriptions` DDL (MISSING, arch §6 aggregates) + `webhook_deliveries` audit log: definitions (tenant_id, branch_id NULL, name, entity, filters JSONB, columns JSONB, group_by, template_type regulatory/operational), runs (definition_id, tenant_id, status, file_url, row_count, run_by/at), subscriptions (definition_id, cron, recipients, channel)
- [ ] Role-based dashboards (Registrar enrollment funnel/Cashier daily collections/Teacher class performance/Tenant Admin cross-branch KPIs) per `frontend.md` §7 — consider GraphQL BFF to avoid over/under-fetching (arch §9)
- [ ] Ad-hoc report builder (entity/filter/column/group-by → export Excel/PDF/CSV); **define supported column types** [GAP] (FR-RPT-3): text, currency (PHP ₱ formatted), date (Month DD, YYYY), percentage, number, calculated (formula over other columns e.g. balance = total - paid). The `report_definitions.columns` JSONB stores an array of column defs with `[{field, label, type, format, formula}]` — the report engine renders each type appropriately and exports to Excel/PDF/CSV with the same formatting
- [ ] Regulatory report template library (enrollment stats, learner movement) — built as configurable templates so format changes don't require redeploys; **define initial regulatory report library** [GAP] (FR-RPT-2): ship with at least: (1) DepEd enrollment count by grade level + education level (basic ed) — `SELECT grade_levels.code, education_levels.code, COUNT(enrollments.id)` filtered by branch + school_year + status=enrolled; (2) Learner movement report (transfers in, transfers-out, promotions, repetitions, dropouts per SY) — joins `student_transfers`, `promotion_decisions`, `enrollments` (status changes); (3) CHED enrollment count by program + year level (College) — joins `programs`, `grade_levels`, `enrollments`. Each is a `report_definitions` row with `template_type=regulatory` and a pre-built `filters`/`columns`/`group_by` JSONB that the ad-hoc builder can clone and tweak. The exact government format changes year to year; the library is a starting point, not a freeze
- [ ] Financial reports: revenue by fee type, AR aging (cross-branch), discount/scholarship utilization, collection efficiency, GL-ready journal export
- [ ] Scheduled report subscriptions (emailed on a cadence)
- [ ] Move heavy report queries to read replicas; verify OLTP isolation under load test (report workers on separate BullMQ pool; tenant-scoped Redis cache keys per arch §12)

**Exit criteria:** A Tenant Admin can pull a consolidated, cross-branch enrollment and collections report without asking engineering for a custom query.

---

## Phase 11 — Non-Functional Hardening

**Outcome:** The system is ready for real tenants and real money, not just feature-complete.

### 11.1 Security

- [ ] Full OWASP ASVS-aligned review of authn/authz/session handling + WAF + rate limiting at edge (arch §10)
- [ ] Penetration test (external) before first paying enterprise tenant
- [ ] Field-level encryption for the most sensitive PII (government IDs — `sss_no`, `philhealth_no`, `pagibig_no`, `tin_no`, `gov_id_number`) via envelope encryption (KMS data key); TLS 1.2+ + AES-256 at rest verified
- [ ] Secrets fully migrated to vault (AWS Secrets Manager/Vault); secret-scanning in CI green; never in logs/tenant fields — `channel_configs.credentials_ref` is a vault path string, never the raw credential
- [ ] RLS bypass test suite expanded to cover every tenant-scoped table, run in CI on every migration

### 11.2 Compliance

- [ ] Data Privacy Act workflow: consent capture at enrollment, DSAR (access/correction/erasure) request handling, DPO-facing queue
- [ ] Retention-schedule automation — **configurable per document type** (e.g., Form 138: 2 yrs post-graduation; Form 137: indefinite; configurable retention per `retention_rules` table) with soft-delete + scheduled hard-purge jobs (`spec.md` §10, arch §10); **add `retention_rules` table** [GAP] (arch §10): `id`, `tenant_id`, `document_type` (form_138, form_137, tor, or, certificate, id_card, other), `retention_period_years` (NULL = indefinite, e.g. Form 137), `soft_delete_after_days`, `hard_purge_after_days`, `is_active`. The soft-delete job runs daily and marks `is_deleted=TRUE` on `student_documents`, `generated_documents`, `official_receipts` (voided), `attendance_excuses` (rejected) etc. when `now() > created_at + soft_delete_after_days`. The hard-purge job runs weekly and physically deletes rows where `now() > created_at + hard_purge_after_days` and `is_deleted=TRUE`. The DPO can configure these per document type per tenant
- [ ] BIR OR/SI numbering audit: verify zero gaps, zero duplicates under concurrency load test
- [ ] Legal review of generated document templates (Form 137/138, TOR, OR) against current DepEd/CHED/BIR formats

### 11.3 Performance & scale

- [ ] Load test: simulate a 50-branch, 100,000-student tenant profile against the shared-schema model; verify P95 API <400ms for standard CRUD + NFR availability ≥99.5% (`spec.md` §7); identify first bottleneck
- [ ] Partitioning plan implemented for `payments`/`attendance_records` if load test indicates need (by tenant hash or SY)
- [ ] Noisy-neighbor test: one tenant's bulk import/report export must not degrade another tenant's cashiering latency
- [ ] Schema-per-tenant "graduation" path exercised at least once end-to-end (migrate a test tenant from pool → bridge) + orchestrated multi-schema/DB migration runner (arch §17); stateless pods + HPA + PgBouncer validated

### 11.4 Reliability

- [ ] Backup/PITR verified with a real restore drill (continuous WAL + nightly snapshot; RPO ≤15m / RTO ≤4h; per-tenant PITR/export path per arch §15)
- [ ] DR failover drill to secondary region/AZ
- [ ] Health checks + graceful shutdown for all services
- [ ] Chaos test: kill a pod mid-transaction, verify no partial writes / no duplicate OR numbers
- [ ] Observability sign-off: structured JSON logs + correlation ID + `tenant_id`/`branch_id` on every line/span; metrics (latency/error/queue/DB/usage); SLO burn-rate + business alerts (OR gap, session >24h) via OTEL → Grafana/Loki/Tempo/Prometheus + Sentry (arch §14)

**Exit criteria:** Sign-off from security review, a completed restore drill, and a load test report showing the platform meets the NFR targets in `spec.md` §7.

---

## Phase 12 — Pilot Launch

**Outcome:** First real tenant(s) live.

- [ ] Select 1–2 pilot tenants (ideally one single-branch, one multi-branch) representing different level mixes (e.g., one K-12 school, one school with a College department)
- [ ] Data migration tooling for pilot tenant's existing student/fee records (import mapping tool)
- [ ] Staff training materials + in-app onboarding checklist (mirrors `spec.md` §11 acceptance criteria)
- [ ] Go-live runbook (rollback plan, support escalation path, on-call rotation)
- [ ] Post-launch monitoring window (daily check-ins for first 2 weeks: cashier reconciliation accuracy, grade posting accuracy, support ticket volume)
- [ ] Collect structured feedback → feed into Phase 13 backlog
- [ ] Run `spec.md` §11 acceptance bar as scripted UAT: branch → buildings/rooms → SY/terms → Elem+JHS+SHS-strand+College curricula → enroll → section/schedule → attendance+grades → fee assessment → cashier OR reflected instantly — zero vendor tickets

---

## Phase 13 — Post-Launch / Future Modules

Prioritize based on pilot feedback; candidates already scoped in `spec.md` §12:

- [ ] Cafeteria/canteen POS & inventory (reuses Cashiering + Facility primitives)
- [ ] Transportation/bus routing
- [ ] Dormitory/boarding management
- [ ] Library circulation
- [ ] Full statutory payroll (BIR 2316, SSS/PhilHealth/Pag-IBIG computation)
- [ ] LMS content authoring (or deepen Google Classroom/Moodle integration instead)
- [ ] Alumni/donor management
- [ ] DepEd LIS / CHED CHEDMIS direct submission connectors
- [ ] Multi-country localization (second jurisdiction's tax/receipt/curriculum rules as a second "compliance pack")

---

## Appendix B — Critical Gap Closure Log (2026-09-04 review vs spec/arch/tables/frontend + 2026-09-05 tables.md sync + v1.1 gap sweep)

Source of truth: `spec.md` FR-xxx + `architecture.md` §§3-4/7/10-11 + `tables.md` fields. Every item below is now a checkbox in its phase AND DDL in `tables.md` — this log is traceability only. `tables.md` now includes all NEW sections (IAM §1B, Compliance §14, Integration §15, Reporting §16, plus all [new] and [fix] tables), and is fully RLS-consistent.

- B1 IAM absent in tables.md → Phase 1.3 complete `users/roles/permissions/role_permissions/user_roles/rebac_edges` + `user_person_links` + `user_sessions` + rename kinship `relationships` to Lookup seed for Relationship Types; `tenant_plans` for FR-TEN-4; `user_person_links` lifecycle in 1.2.
- B2 Workflow engine had no DDL → Phase 1.4 `workflow_definitions/instances/approvals`; numbering per-branch counters + `numbering_schemes` table; audit `branch_id+ip+correlation_id`, `users.last_login_at` + `updated_at`.
- B3 Facility FR-FAC-1/6 shortfall → Phase 2 `buildings.address/wing/floor_count/contact`, `room_assets` table, conflict-check signature with `term_id` scope; `idx_class_offerings_conflict` for Phase 5.
- B4 Grading versioning + honor-roll typo → Phase 3 `grading_systems.school_year_id + branch_id + is_active`, generic `resolveTemplate()` for all overrides, fix `honor_roll_configs.with_highest_honors_threshold`; [GAP] add `gradings_systems.is_active` + active-resolution rule (B4.2), add `curricula.cloned_from_curriculum_id/cloned_at/cloned_by` (B4.3), add `curriculum_subjects.effective_grading_system_id` (B4.4).
- B5 SIS FR-SIS-1/ADM-6/DOC-vault with no tables → Phase 4.1 full `students/guardians/student_guardians` field expansion, `enrollment_holds`, `student_documents`; 4.2 `applicant_stage_configs/entrance_exams/applicant_documents` + `applicant_stage_transitions` (B5.1), `section_assignment_rules` decomposition (B5.4), `student_merge_audit` (B5.2), `student_transfers` artifact (B5.3), bulk import error categories (B5.5); 4.3 `sections.capacity/homeroom`, `promotion_decisions` stub, `v_student_academic_history` view definition.
- B6 Attendance FR-ATT-2 excuse + grading batch → Phase 5.2 `attendance_excuses` + `attendance_config` per-level mode (B6.1) + `attendance_notification_thresholds` (B6.2); 5.3 `grade_change_requests` + default grade-change workflow seed (B6.3), report-card merge-field catalog (B6.4), `honor_roll_configs` table (B6.5), `permanent_records` + `generated_documents` (B6.6), `grading_system` active resolution (B6.7), `grade_entries.locked` + `effective_grading_system_id` linkage (B6.8).
- B7 Billing FR-BIL-2/3/4/6 schema mismatch → Phase 6 `fee_structures.strand/track/boarding/term` + `discipline` table, `fee_structure_items.tenant_id` + RLS, `discount_types` table (B7.1), `student_discount_grants`, `withdrawal_policies`, `payment_plans` + `installment_schedules` + `penalty_rules`, idempotent invoice generation + invoice trigger events (B7.3), full fee-structure resolution precedence (B7.4), aging as-of date spec (B7.2).
- B8 Cashiering FR-CSH catalogue + FR-CSH-9 ad-hoc + offline blocks → Phase 7.1 `cashier_stations/payment_methods/denomination_sets` + `payment_allocations` + `refunds` + `atp_series/series_counters` (with session_id/reserved_at/expires_at) + `or_number_display`, `users.id` FK fix, float validation rules (B8.1), daily report breakdown dimensions (B8.2), `ad_hoc_sales/items`; 7.2 provider-to-rail coverage lock (B8.3); 7.3 OR-block size configurable (B8.4); 7.4 ad-hoc stock tracking decision (B8.5).
- B9 Comms FR-COM-1/3/4 + Docs FR-DOC-1/2/3 + HR FR-HR-1 + Reports arch §6 with no tables → Phase 8.1 `notification_templates/notification_rules/channel_configs/notification_logs/message_threads/messages/message_thread_participants/announcements` + audience resolution at send time (B9.1) + per-participant read tracking (B9.2) + notification template merge-field catalog (B9.3); 8.2 `generated_documents/bulk_print_jobs/bulk_print_job_failures` + public verify endpoint + verification-code format lock (B9.5) + WYSIWYG engine decision (B9.4) + bulk-print failed-item policy (B9.6); 8.3 `employees/employee_branch_assignments/teaching_loads/dtr_records`; 8.4 LMS adapter direction (B9.7); Phase 10 `report_definitions/runs/subscriptions` + column types spec (B9.8) + initial regulatory report library (B9.9).
- B10 Frontend shells implicit → Phase 0 scaffold explicit + Phase 1 route-to-permission map + Phase 9 sibling-switcher cache invalidation already present; no new tables needed.
- B11 Cross-cutting NFRs → Phase 11.2 `retention_rules` table (B11.1) + configurable per-document-type retention (B11.2); Phase 11.1 field-level encryption for gov IDs + `user_sessions` table for session audit (B11.3).
- B12 Phase ordering fix → HR-Lite (employees, teaching_loads) is a prerequisite for Phase 5 (Scheduling needs faculty, Gradebook needs teachers); moved Phase 8.3 → Phase 4.5 (HR-Lite prerequisite for academic ops). Communications (Phase 8.1) and Documents (Phase 8.2) remain Phase 8 as they depend on Phase 7 cashiering for payment-gated document release.

### Appendix A — Traceability / Test Gates (added from 2026-09-03 gap review)

- [ ] E2E golden-path gate in CI (Playwright vs. seeded demo tenant): login → enroll → assess fees → collect payment → print receipt → post grade → report card (`frontend.md` §12) — release-blocking
- [ ] Integration suite with MSW for enrollment wizard, cashier payment+receipt, grade entry+report card; unit suite (Vitest+RTL) for Config-Forms renderer; visual regression (Chromatic or Playwright diff) on `packages/ui`
- [ ] Migrations follow expand/contract across ≥2 releases; `CREATE INDEX CONCURRENTLY` + batched backfills; orchestrated runner keeps pool/bridge/silo on same version (arch §§13/17)
- [ ] RLS bypass test suite expanded to cover every tenant-scoped table, run in CI on every migration (Phase 11.1)
- [ ] BIR OR/SI numbering audit: verify zero gaps, zero duplicates under concurrency load test (Phase 11.2)
- [ ] Schema-per-tenant graduation path exercised end-to-end: migrate a test tenant from pool → bridge, verify zero data loss, verify RLS still enforced (Phase 11.3)

### Appendix C — Phase Reordering Note

**HR-Lite (employees, teaching_loads) moves from Phase 8.3 to Phase 4.5.** The prior version listed HR-Lite as "Phase 8.3" but Phase 5 (Scheduling) requires faculty (`employees`), and Phase 5.3 (Grading) requires teachers. Without Employee/Faculty records, there is no `class_offerings.employee_id` FK and no `teaching_loads`. The `employees` table and `employee_branch_assignments` table are now built in Phase 4.5 (immediately after Section 4.3 Enrollment, before Phase 5). The Phase 8.3 remaining items (DTR, payroll export, substitute-teacher workflow) stay in Phase 8 since they are not blocking scheduling or grading. The new Phase 8.3 section header is updated to "8.3 HR-Lite (completion): DTR + Payroll Export + Sub" to reflect that the CRUD core ships in Phase 4.5.

---

## Cross-Cutting Checklists (apply throughout, not a single phase)

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
- [ ] Every new financial table gets an `idempotency_key` or equivalent dedup mechanism if it can be created by a retryable operation (payments, invoices, OR allocations)
- [ ] Every new table that holds money or grades gets an append-only correction pattern (reversal/adjustment row, never hard-update) — per `architecture.md` §1.5

### Release discipline

- [ ] Migrations follow expand/contract; never a breaking single-step schema change
- [ ] Feature-flagged rollout for any module touching money or grades before 100% tenant exposure
- [ ] Any new Phase 0 decision (LMS direction B9.7, verification-code format B9.5, OR-block size B8.4, ad-hoc stock tracking B8.5, bulk-print policy B9.6, notification merge fields B9.3, invoice triggers B7.3, grading-system active resolution B6.7, grading-system linkage B6.8, report column types B9.8, regulatory library B9.9) is recorded in `docs/decisions/` ADR folder before the consuming phase starts
