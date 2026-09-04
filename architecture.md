# ARCHITECTURE.md — School Management System (SMS)
### Technical Architecture, Data Model, and Infrastructure

**Companion to:** `spec.md` (requirements), `frontend.md` (client architecture), `todo.md` (build plan)

---

## 1. Architecture Principles

1. **Tenant-aware by construction, not by convention.** Every query path runs through a tenant context; there is no code path that can "forget" the tenant filter (enforced by DB-level Row-Level Security, not just application `WHERE` clauses).
2. **Configuration over code.** Academic structure, fees, roles, and documents are data. The schema is generic enough that a new grading system or fee type never requires a migration.
3. **Modular monolith first, extract services later.** A single deployable, organized as strict Domain-Driven Design (DDD) bounded contexts, avoids premature microservice overhead while keeping module boundaries clean enough to extract a service (e.g., Cashiering, Reporting) if/when scale demands it.
4. **Start with the pool model, design for the bridge model.** Per current multi-tenant SaaS practice, the cheapest correct default is a shared database with a `tenant_id` discriminator and Postgres Row-Level Security; large/enterprise tenants can be "graduated" to a dedicated schema or dedicated database without an application rewrite, because the data-access layer is already tenant-context-driven.
5. **Money and grades are append-only.** Financial transactions and finalized grades are never hard-updated/deleted; corrections are reversal/adjustment entries with full audit trail — required both for BIR compliance and academic-record integrity.
6. **Offline is an explicit, bounded exception**, not a general design goal — only the Cashiering/POS terminal supports offline operation, with a narrow, well-defined sync protocol.

## 2. High-Level System Diagram (textual)

```
                              ┌───────────────────────────────┐
                              │        Edge / CDN (CloudFront) │
                              └───────────────┬─────────────────┘
                                              │
                     ┌────────────────────────┼─────────────────────────┐
                     │                        │                         │
             ┌───────▼────────┐     ┌─────────▼─────────┐     ┌─────────▼─────────┐
             │ Web App (Next.js│     │ Mobile App (Flutter│     │ Cashier POS (PWA,  │
             │ SSR/SPA)        │     │ - parent/student/  │     │ offline-capable)   │
             │                 │     │   teacher)          │     │                    │
             └───────┬────────┘     └─────────┬─────────┘     └─────────┬─────────┘
                     │                        │                         │
                     └────────────────┬───────┴────────────┬────────────┘
                                       │  HTTPS / REST+GraphQL/ webhooks
                             ┌─────────▼──────────┐
                             │   API Gateway /     │  AuthN (OIDC/JWT), rate limiting,
                             │   BFF layer         │  tenant resolution (subdomain/header)
                             └─────────┬──────────┘
                                       │
                 ┌─────────────────────┼───────────────────────────────┐
                 │            Modular Monolith (NestJS, TS)            │
                 │  ┌───────────┐ ┌────────────┐ ┌───────────────────┐ │
                 │  │ IAM/Tenant│ │ Academic/  │ │ Enrollment/SIS     │ │
                 │  │ (RBAC)    │ │ Curriculum │ │                    │ │
                 │  ├───────────┤ ├────────────┤ ├───────────────────┤ │
                 │  │ Facility  │ │ Scheduling │ │ Attendance/Grading │ │
                 │  ├───────────┤ ├────────────┤ ├───────────────────┤ │
                 │  │ Billing   │ │ Cashiering │ │ Document Generation│ │
                 │  ├───────────┤ ├────────────┤ ├───────────────────┤ │
                 │  │ HR-Lite   │ │ Comms/Notif│ │ Reporting/Analytics│ │
                 │  └───────────┘ └────────────┘ └───────────────────┘ │
                 │             Cross-cutting: Audit Log, Config Engine │
                 └─────────┬──────────────┬───────────────┬────────────┘
                           │              │               │
                 ┌─────────▼───┐  ┌───────▼──────┐ ┌──────▼───────┐
                 │ PostgreSQL  │  │ Redis (cache,│ │ Object Storage│
                 │ (RLS, per-  │  │ queues -     │ │ (S3-compatible│
                 │ tenant_id)  │  │ BullMQ)      │ │ documents/    │
                 │ + read      │  │              │ │ images)       │
                 │ replicas    │  │              │ │               │
                 └─────────────┘  └──────────────┘ └───────────────┘
                           │
                 ┌─────────▼─────────────────────────────────────────┐
                 │ External integrations (via adapters/webhooks):     │
                 │ Payment gateways (Xendit/PayMongo/HitPay/Dragonpay │
                 │  → GCash, Maya, QR Ph, cards, InstaPay/PESONet),   │
                 │ SMS (Semaphore/Movider), Email (SES), Push (FCM),  │
                 │ LMS (Google Classroom/Moodle), Payroll export,     │
                 │ DepEd/CHED reporting exports                       │
                 └─────────────────────────────────────────────────────┘
```

## 3. Multi-Tenancy Strategy

**Decision: Shared database, shared schema, `tenant_id` discriminator + PostgreSQL Row-Level Security (the "pool" model), with a graduation path to schema-per-tenant or database-per-tenant for enterprise tenants.**

Rationale (from current SaaS practice): the shared-schema-with-RLS model gives the lowest operational overhead and fastest onboarding, which fits a platform that must onboard many small-to-mid schools; the main risk (a missing filter leaking data) is mitigated by pushing isolation into the database engine itself rather than relying solely on application code discipline. A schema- or database-per-tenant escape hatch is kept available for large tenants (e.g., a diocese-wide school network with regulatory data-residency demands) — these graduate without an application rewrite because every repository already resolves through a `TenantContext`.

### 3.1 Tenant context propagation
- Every inbound request resolves a `tenant_id` from the subdomain (`tenant-slug.schoolsuite.ph`) or a signed JWT claim (mobile apps).
- The API layer sets a Postgres session variable (`SET LOCAL app.current_tenant_id = '...'`) at the start of every transaction; RLS policies reference this variable, so **it is structurally impossible for a query to omit tenant scoping.**
- `branch_id` is a second-level scope: users are granted access to one or more branches within their tenant; branch scoping is enforced in the application authorization layer (permission grants), layered on top of the tenant RLS boundary.

### 3.2 Example RLS policy

```sql
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_students ON students
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Every tenant-scoped table gets tenant_id NOT NULL + this same policy pattern.
CREATE INDEX idx_students_tenant_id ON students (tenant_id);
CREATE INDEX idx_students_tenant_branch ON students (tenant_id, branch_id);
```

### 3.3 Graduation path for enterprise tenants
1. **Pool (default):** shared tables, RLS, shared connection pool.
2. **Bridge:** same application, dedicated schema per large tenant (`schema = tenant_slug`), migrations run per-schema; used when a tenant needs isolated backup/restore SLAs.
3. **Silo:** dedicated database (or dedicated cluster) for tenants with contractual/regulatory isolation requirements; connection routing keyed by `tenant_id → connection string` in a tenant registry service.

### 3.4 Noisy-neighbor mitigation
- Per-tenant rate limiting and query timeouts at the API gateway.
- Background/report jobs run on a separate worker pool from OLTP traffic (BullMQ queues), so one tenant's large report export cannot starve another tenant's cashiering traffic.
- Read replicas serve reporting/analytics queries; OLTP (enrollment, cashiering) stays on the primary.

## 4. Multi-Branch Data Model

`branch_id` is a foreign key present on every operationally-scoped table (rooms, sections, enrollments, fee structures, cashier sessions, official receipts). A tenant-level record (e.g., a curriculum *template*) has `branch_id = NULL` and is "inherited" by branches unless a branch-specific override row exists — implemented via a standard **override-by-shadow-row** pattern:

```sql
-- Fee structure resolution: branch-specific row wins if present, else tenant default.
SELECT COALESCE(branch_fee.*, tenant_fee.*)
FROM fee_structures tenant_fee
LEFT JOIN fee_structures branch_fee
  ON branch_fee.tenant_id = tenant_fee.tenant_id
 AND branch_fee.template_key = tenant_fee.template_key
 AND branch_fee.branch_id = :current_branch_id
WHERE tenant_fee.tenant_id = :tenant_id
  AND tenant_fee.branch_id IS NULL;
```

This same override pattern applies to curricula, grading templates, and document templates — tenant sets the default, any branch may override without duplicating the entire configuration.

## 5. Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Backend runtime | Node.js 22 LTS + **NestJS** (TypeScript) | DDD-friendly module system, mature DI, first-class OpenAPI, easy to extract modules into services later |
| Primary database | **PostgreSQL 16** | RLS support, JSONB for custom-fields/EAV, mature replication, partitioning for large tenants |
| Cache/Queue | **Redis** + BullMQ | Session cache, rate limiting, background jobs (report generation, notification dispatch, receipt-sync) |
| Object storage | S3-compatible (AWS S3 / DigitalOcean Spaces) | Documents, ID photos, generated PDFs, offline-POS sync payloads |
| Search (optional, phase 2) | OpenSearch/Meilisearch | Full-text search across students/documents at scale |
| API style | REST (OpenAPI 3.1) for CRUD; **GraphQL BFF** for dashboard/reporting aggregation | REST is simplest for CRUD+webhooks; GraphQL avoids dashboard over/under-fetching |
| AuthN | OIDC-compatible (Keycloak self-hosted or Auth0/WorkOS) issuing JWT + refresh tokens | SSO-ready (Google Workspace/Azure AD for staff), MFA support out of the box |
| AuthZ | Custom RBAC + ReBAC layer (tenant-scoped roles, resource-relationship checks) | See §7 |
| Web frontend | Next.js 15 (App Router) + TypeScript | see `frontend.md` |
| Mobile | Flutter (parent/student/teacher) | one codebase, iOS+Android, good offline/local-storage story |
| Cashier POS | Installable PWA (same Next.js codebase, offline route) with IndexedDB + Service Worker | avoids a third codebase; ESC/POS printing via WebUSB/WebBluetooth or a lightweight local print agent |
| Infra | Docker containers, Kubernetes (managed — EKS/DOKS) for production; Docker Compose for local/dev and very small single-tenant pilots | scales from pilot to platform without re-platforming |
| IaC | Terraform | reproducible environments |
| CI/CD | GitHub Actions → build, test, scan, deploy | |
| Observability | OpenTelemetry → Grafana/Loki/Tempo/Prometheus stack; Sentry for error tracking | |
| Region | AWS `ap-southeast-1` (Singapore) primary, with PH-latency validated; DR region `ap-southeast-3` (Jakarta) or secondary AZ | data residency & latency for PH users |

## 6. Bounded Contexts / Modules

| Module | Responsibility | Key aggregates |
|---|---|---|
| **IAM & Tenant** | Authn, tenant/branch registry, RBAC/ReBAC, audit log, feature flags | Tenant, Branch, User, Role, Permission, AuditEvent |
| **Facility** | Buildings/Floors/Rooms, room scheduling conflicts | Building, Floor, Room |
| **Academic Structure** | Education levels, grade/year levels, school years/terms, curricula, subjects, tracks/strands/programs | EducationLevel, GradeLevel, SchoolYear, Term, Curriculum, Subject |
| **Enrollment/SIS** | Applicants, students, guardians, enrollment records, sections | Student, Guardian, Applicant, Enrollment, Section |
| **Scheduling** | Class offerings, timetable, room/faculty conflict checks | ClassOffering, Timetable |
| **Attendance** | Daily/period attendance, notifications trigger | AttendanceRecord |
| **Grading** | Gradebook, grade computation, report cards, permanent records | GradeComponent, GradeEntry, ReportCard |
| **Billing** | Fee types, fee structures, SOA, discounts, AR aging | FeeType, FeeStructure, Invoice, Discount |
| **Cashiering** | Sessions, payments, official receipts, refunds, offline sync | CashierSession, Payment, OfficialReceipt |
| **HR-Lite** | Employee records, load assignment, DTR | Employee, TeachingLoad |
| **Communications** | Templates, dispatch, audience segmentation | NotificationTemplate, Announcement |
| **Document Generation** | Template engine, requests, e-signature/QR verification | DocumentTemplate, DocumentRequest |
| **Reporting/Analytics** | Dashboards, ad-hoc report builder, regulatory exports | ReportDefinition, ReportRun |
| **Config Engine** | Lookup tables, numbering schemes, custom fields, workflow builder | LookupList, NumberingScheme, CustomFieldDef, WorkflowDefinition |

Each module is a NestJS module with its own controllers/services/repositories; cross-module communication happens via well-defined application-service interfaces and an internal domain-event bus (in-process now, swappable for a real message broker like NATS/Kafka if a module is later extracted as a microservice).

## 7. Authentication & Authorization

- **AuthN:** OIDC. Staff/admin can use SSO (Google Workspace/Azure AD common in PH private schools); parents/students use email+password or mobile+OTP; MFA enforced for Admin, Finance, and Cashier roles.
- **AuthZ model:** Multi-tenant RBAC extended with ReBAC for record-level checks — a role like `Teacher` grants `attendance:write` only for sections where a `TeachesSection` relationship exists between the user and that section; a `Guardian` can view a student's grades only where a `GuardianOf` relationship exists.

```
users(id, tenant_id, ...)
roles(id, tenant_id, name)                     -- tenant-scoped, can be custom
permissions(id, resource, action)              -- global catalog (e.g., "billing.invoice:approve")
role_permissions(role_id, permission_id)
user_roles(user_id, tenant_id, branch_id NULL, role_id)   -- branch_id NULL = tenant-wide
relationships(subject_user_id, relation, object_type, object_id, tenant_id)  -- ReBAC edges
```

- Authorization check pseudocode: `allow = hasPermission(user, tenant, permission) AND (isBranchScoped(user, branch) OR isTenantWide(user)) AND (permission.requiresRelation ? hasRelation(user, resource) : true)`.
- All permission checks are centralized in a single `PolicyService` (never scattered `if` statements) — matches current best practice of separating authorization logic from business logic, and allows the underlying engine to be swapped for a dedicated policy engine (e.g., OpenFBAC/Permit.io-style PDP) later without touching call sites.

## 8. Core Data Model (selected DDL — illustrative, not exhaustive)

```sql
-- ===== Tenancy =====
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'starter',
  status TEXT NOT NULL DEFAULT 'active',           -- active|suspended|archived
  branding JSONB DEFAULT '{}',                      -- logo url, colors
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  address TEXT, tin TEXT, bir_branch_code TEXT,
  levels_offered TEXT[] DEFAULT '{}',               -- ['elementary','jhs','shs','college']
  status TEXT DEFAULT 'active',
  UNIQUE (tenant_id, code)
);

-- ===== Facility =====
CREATE TABLE buildings (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, branch_id UUID NOT NULL REFERENCES branches(id),
  name TEXT NOT NULL, code TEXT);

CREATE TABLE floors (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, building_id UUID NOT NULL REFERENCES buildings(id),
  label TEXT NOT NULL, floor_number INT);

CREATE TABLE rooms (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, branch_id UUID NOT NULL, floor_id UUID NOT NULL REFERENCES floors(id),
  name TEXT NOT NULL, room_type TEXT NOT NULL, capacity INT, status TEXT DEFAULT 'active');

-- ===== Academic structure =====
CREATE TABLE education_levels (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, code TEXT, name TEXT, sort_order INT);

CREATE TABLE grade_levels (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, education_level_id UUID NOT NULL REFERENCES education_levels(id),
  code TEXT, name TEXT, sort_order INT);

CREATE TABLE school_years (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, name TEXT NOT NULL, start_date DATE, end_date DATE, status TEXT);

CREATE TABLE terms (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, school_year_id UUID NOT NULL REFERENCES school_years(id),
  name TEXT, sequence INT, start_date DATE, end_date DATE, grading_deadline DATE);

CREATE TABLE tracks (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   -- SHS only
  tenant_id UUID NOT NULL, name TEXT);
CREATE TABLE strands (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, track_id UUID REFERENCES tracks(id), name TEXT, code TEXT);

CREATE TABLE programs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- College only
  tenant_id UUID NOT NULL, code TEXT, name TEXT, level TEXT);          -- e.g. BSIT

CREATE TABLE curricula (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, branch_id UUID,                             -- NULL = tenant default
  education_level_id UUID NOT NULL REFERENCES education_levels(id),
  grade_level_id UUID REFERENCES grade_levels(id),
  strand_id UUID REFERENCES strands(id), program_id UUID REFERENCES programs(id),
  school_year_id UUID NOT NULL REFERENCES school_years(id),
  version_label TEXT, status TEXT DEFAULT 'draft');

CREATE TABLE subjects (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, code TEXT, title TEXT, units NUMERIC(4,1),
  hours_per_week NUMERIC(4,1), is_core BOOLEAN DEFAULT true);

CREATE TABLE curriculum_subjects (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_id UUID NOT NULL REFERENCES curricula(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  term_id UUID REFERENCES terms(id),
  prerequisite_subject_id UUID REFERENCES subjects(id));

-- ===== SIS / Enrollment =====
CREATE TABLE students (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, lrn TEXT, student_number TEXT,
  first_name TEXT, last_name TEXT, birth_date DATE, sex TEXT,
  custom_fields JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT now());

CREATE TABLE guardians (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, first_name TEXT, last_name TEXT, contact_number TEXT, email TEXT);

CREATE TABLE student_guardians (student_id UUID REFERENCES students(id),
  guardian_id UUID REFERENCES guardians(id), relationship TEXT, is_primary BOOLEAN,
  PRIMARY KEY (student_id, guardian_id));

CREATE TABLE sections (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, branch_id UUID NOT NULL, school_year_id UUID NOT NULL,
  grade_level_id UUID REFERENCES grade_levels(id), strand_id UUID REFERENCES strands(id),
  program_id UUID REFERENCES programs(id), name TEXT, adviser_employee_id UUID, room_id UUID);

CREATE TABLE enrollments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, branch_id UUID NOT NULL, student_id UUID NOT NULL REFERENCES students(id),
  school_year_id UUID NOT NULL, curriculum_id UUID NOT NULL, section_id UUID REFERENCES sections(id),
  status TEXT DEFAULT 'enrolled', enrolled_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id, school_year_id));

-- ===== Billing / Cashiering =====
CREATE TABLE fee_types (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, code TEXT, name TEXT, is_taxable BOOLEAN DEFAULT false,
  gl_account TEXT);

CREATE TABLE fee_structures (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, branch_id UUID,           -- NULL = tenant default
  template_key TEXT NOT NULL,                        -- e.g. "grade7-2026-2027"
  education_level_id UUID, grade_level_id UUID, program_id UUID, school_year_id UUID NOT NULL,
  status TEXT DEFAULT 'active');

CREATE TABLE fee_structure_items (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_structure_id UUID NOT NULL REFERENCES fee_structures(id),
  fee_type_id UUID NOT NULL REFERENCES fee_types(id), amount NUMERIC(12,2) NOT NULL);

CREATE TABLE invoices (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, branch_id UUID NOT NULL, student_id UUID NOT NULL,
  enrollment_id UUID NOT NULL REFERENCES enrollments(id), term_id UUID,
  total_amount NUMERIC(12,2), balance NUMERIC(12,2), status TEXT DEFAULT 'open');

CREATE TABLE invoice_items (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id), fee_type_id UUID NOT NULL,
  description TEXT, amount NUMERIC(12,2), discount_amount NUMERIC(12,2) DEFAULT 0);

CREATE TABLE cashier_sessions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, branch_id UUID NOT NULL, cashier_user_id UUID NOT NULL,
  opening_float NUMERIC(12,2), opened_at TIMESTAMPTZ DEFAULT now(),
  closing_actual NUMERIC(12,2), closed_at TIMESTAMPTZ, status TEXT DEFAULT 'open');

CREATE TABLE payments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, branch_id UUID NOT NULL, invoice_id UUID NOT NULL REFERENCES invoices(id),
  cashier_session_id UUID REFERENCES cashier_sessions(id), amount NUMERIC(12,2) NOT NULL,
  method TEXT NOT NULL,                              -- cash|check|gcash|maya|qrph|card|bank
  gateway_reference TEXT, idempotency_key TEXT UNIQUE,
  status TEXT DEFAULT 'completed', paid_at TIMESTAMPTZ DEFAULT now(),
  offline_origin BOOLEAN DEFAULT false, synced_at TIMESTAMPTZ);

CREATE TABLE official_receipts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, branch_id UUID NOT NULL, payment_id UUID NOT NULL REFERENCES payments(id),
  or_number TEXT NOT NULL, atp_series_id UUID NOT NULL,
  is_voided BOOLEAN DEFAULT false, void_reason TEXT, reversed_by UUID REFERENCES official_receipts(id),
  issued_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (branch_id, or_number));

-- ===== Audit =====
CREATE TABLE audit_events (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, actor_user_id UUID, entity_type TEXT, entity_id UUID,
  action TEXT, before_state JSONB, after_state JSONB, occurred_at TIMESTAMPTZ DEFAULT now());
```

*(Attendance, grading, HR, document, and configuration tables follow the same `tenant_id`/`branch_id`-first pattern; full DDL lives in the migration set, not duplicated here.)*

## 9. API Design

- **REST** for all CRUD and transactional endpoints, versioned via URL path (`/api/v1/...`), OpenAPI-documented and used to generate the TypeScript client consumed by the frontend.
- **Pagination:** cursor-based for large collections (students, payments); offset-based acceptable for small admin lists.
- **Idempotency:** all mutating financial endpoints (payment creation, refund) require an `Idempotency-Key` header, stored against the resulting record, to make retries (including offline-sync replays) safe.
- **Webhooks:** outbound webhooks for `payment.completed`, `enrollment.created`, `grade.finalized`, `document.ready`, signed with HMAC, retried with backoff — this is how the payment gateways' inbound webhooks are also received and verified.
- **GraphQL BFF**: a thin aggregation layer specifically for dashboard/reporting screens that need to combine many REST resources in one round trip, without turning the whole API into GraphQL.

## 10. Security & Compliance

- **Encryption:** TLS 1.2+ everywhere; AES-256 at rest for the database volume and object storage; field-level encryption for the most sensitive PII (government IDs) using envelope encryption (KMS-managed data key).
- **Secrets:** managed via a vault (AWS Secrets Manager/HashiCorp Vault) — never in source, never in tenant-configurable fields that reach logs.
- **PII/SPI handling (Data Privacy Act of 2012):**
  - Consent capture at enrollment (parent/guardian consent for minors, per DPA IRR).
  - Data Subject Access/Correction/Erasure request workflow surfaced to a designated Data Protection Officer role per tenant.
  - Retention schedules configurable per document type to match DepEd Order 35 s.2022 (e.g., Form 138 retained 2 years post-graduation, Form 137 retained indefinitely) and general DPA proportionality principle — soft-delete plus scheduled hard-purge jobs.
  - Every access to a student's sensitive personal information (grades, health, discipline) is captured in `audit_events`.
- **BIR compliance for cashiering:** OR numbering is never reused, void is a reversal record, system supports registering the tenant's ATP series ranges and enforces sequential, gapless numbering per branch; export format for BIR-required sales/collection books.
- **Application security:** OWASP ASVS-aligned code review checklist, dependency scanning (Dependabot/Snyk) in CI, secrets scanning, regular penetration testing before major releases, rate limiting + WAF at the edge.
- **Tenant impersonation for support:** must be explicit ("Support Access" grant with expiry, requested by tenant admin or time-boxed emergency break-glass), fully audited, banner-visible to the tenant while active.

## 11. Payments & Cashiering Architecture

### 11.1 Payment gateway abstraction

```
PaymentGatewayPort (interface)
 ├─ createPaymentIntent(amount, method, metadata) -> {redirectUrl | qrPayload, referenceId}
 ├─ handleWebhook(rawPayload, signature) -> PaymentEvent
 └─ refund(paymentId, amount) -> RefundResult

Adapters: XenditAdapter | PayMongoAdapter | DragonpayAdapter | HitPayAdapter
```
A single **payment gateway abstraction layer** insulates the domain from any one provider, since GCash/Maya have no direct public merchant API and are only reachable through a licensed PH payment aggregator (Xendit, PayMongo, HitPay, DragonPay, etc.) supporting GCash, Maya, QR Ph, cards, and InstaPay/PESONet bank rails. Provider can be swapped or run multi-provider (e.g., different aggregator per tenant) purely by configuration.

- Every webhook is verified (HMAC signature per provider spec) before the domain accepts it.
- Every payment intent carries an idempotency key so a duplicated webhook delivery never double-credits a student ledger.
- Reconciliation job runs daily against each gateway's settlement report, flagging mismatches for finance review.

### 11.2 BIR receipt numbering module

- Tenant registers one or more **ATP series** per branch (range start/end, validity window) matching their real BIR Authority-to-Print registration.
- `official_receipts.or_number` is allocated transactionally from the active series for that branch — a Postgres advisory lock (or a `SELECT ... FOR UPDATE` on a `series_counters` row) guarantees no duplicate/gapped numbers even under concurrent cashiers.
- Voids create a linked reversal record; the original OR is flagged, never deleted — required for BIR audit trail integrity.

### 11.3 Offline-first cashier sync

1. When a cashier terminal opens a session, it pre-fetches a **reserved block of OR numbers** (e.g., 50) from its branch's active series and caches student/balance snapshots for likely lookups.
2. While offline, payments are written to local IndexedDB with a client-generated idempotency key and an OR number drawn from the reserved block; a receipt prints immediately from the local ESC/POS agent.
3. On reconnect, a background sync worker pushes queued payments to the server in order; the server validates the idempotency key and OR number against the reserved block (rejecting only on genuine conflict, e.g., a session that was force-closed remotely), and reconciles the student ledger.
4. If a conflict is detected (e.g., the terminal's reserved block was revoked because the session was closed elsewhere), the transaction is queued into an exception list for a supervisor to manually resolve — it is **never silently dropped or silently double-applied.**
5. Reserved-but-unused OR numbers are released back to the series when a session closes.

This mirrors the general pattern used in resilient POS systems: **the local device is the source of truth only for the duration of the outage, sync is idempotent, and every exception is visible, never hidden.**

## 12. Scalability & Performance

- Stateless API pods behind a load balancer; horizontal pod autoscaling on CPU/RPS.
- Database: connection pooling (PgBouncer), read replicas for reporting/GraphQL BFF, partitioning large tenant-spanning tables (e.g., `payments`, `attendance_records`) by `tenant_id` hash or by school year for very large tenants.
- Redis-backed caching for reference/lookup data (fee types, room lists) with tenant-scoped cache keys and write-through invalidation.
- Heavy operations (bulk document generation, regulatory export, academic-year rollover) run as background jobs (BullMQ) with progress tracking, never inline in a request.
- Per-tenant rate limits protect against one tenant's burst (e.g., mass SMS blast) affecting others.

## 13. Deployment & Environments

| Environment | Purpose |
|---|---|
| `local` | Docker Compose: API, Postgres, Redis, MinIO (S3-compatible), mailhog |
| `dev` | Shared cloud sandbox, seeded demo tenants |
| `staging` | Production-parity, used for tenant UAT before go-live |
| `production` | Kubernetes cluster, multi-AZ, autoscaled |

- **CI/CD:** GitHub Actions — lint/typecheck → unit tests → integration tests (against ephemeral Postgres) → build container → image scan → deploy to `staging` → manual gate → deploy to `production` (blue/green or rolling).
- **Schema migrations:** versioned, backward-compatible ("expand/contract") migrations run automatically pre-deploy; because most tenants share one schema, migrations must never lock large tables for long — use `CREATE INDEX CONCURRENTLY`, batched backfills.
- **Feature flags** gate risky new modules per tenant before full rollout.

## 14. Observability

- Structured JSON logs, correlation ID per request, `tenant_id`/`branch_id` attached to every log line and trace span (so a single tenant's incident is filterable instantly).
- Metrics: request latency/error rate per module, queue depth, DB connection saturation, per-tenant usage metrics (for plan enforcement and support).
- Alerting: SLO-based (error-rate/latency burn-rate alerts), plus business alerts (e.g., cashier session left open > 24h, OR sequence gap detected).

## 15. Disaster Recovery & Backup

- Continuous WAL archiving + nightly full snapshot; PITR (point-in-time recovery) supported.
- RPO ≤ 15 minutes, RTO ≤ 4 hours (target; tightened for enterprise/silo tenants).
- Tenant-level export tool doubles as a lightweight per-tenant backup/restore mechanism even in the shared-schema model.
- Quarterly restore drills.

## 16. Extensibility

- **Custom fields / EAV:** `custom_fields JSONB` column on core entities + a `custom_field_definitions` table (tenant-scoped) driving dynamic form rendering on the frontend — new attributes never require a migration.
- **Webhooks & public API** for LMS integration, payroll export, and future DepEd LIS / CHED CHEDMIS submission connectors.
- **Plugin points** (v2+): a module registry allowing future first-party modules (Library, Transportation, Cafeteria) to hook into the same Tenant/Branch/Facility/Person primitives without touching core modules.

## 17. Schema Versioning & Multi-Tenant Migration Strategy

- All tenants on the pool tier share one schema version at all times (no per-tenant schema drift) — configuration differences live in data, not schema.
- "Bridge"/"Silo" tenants (dedicated schema/DB) are migrated by an orchestrated migration runner that applies the same versioned migration set across all schemas/databases before a release is considered complete; a release is not "done" until every tenant tier is on the same code+schema version.
- Breaking changes always ship as expand → migrate data → contract, across at least two releases, to allow zero-downtime rollout across potentially hundreds of tenants.
