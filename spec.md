# SPEC.md — School Management System (SMS)
### Multi-Tenant, Multi-Branch, Multi-Level Education Platform

**Version:** 0.1 (Draft for build-out)
**Owner:** Product / Engineering
**Status:** Baseline specification — feeds `architecture.md`, `frontend.md`, `todo.md`

---

## 1. Executive Summary

SchoolSuite is a **SaaS platform** that lets a single company operate **many school organizations** (tenants), each of which may run **many physical campuses/branches**, each of which may offer **any combination of Elementary, Junior High School (JHS), Senior High School (SHS), and College** — plus room to extend into TESDA/vocational or review-center programs later.

The defining design constraint is **"everything is configurable, nothing is hard-coded."** Buildings, floors, rooms, school years, grade levels, curricula, subjects, sections, fee types, discounts, payment methods, receipt series, roles, and workflows are all data the tenant manages through the UI — not code the vendor ships.

The platform is designed primarily for the **Philippine education market** (DepEd K-12 basic education structure, CHED higher-education structure, BIR receipting rules, the Data Privacy Act of 2012) while keeping the academic and fiscal models abstract enough to configure for other jurisdictions.

## 2. Goals

1. One codebase, one deployment, serving unlimited school organizations (tenants) with strict data isolation.
2. A single tenant can operate multiple branches/campuses, each with its own buildings, rooms, sections, cashier, and (optionally) its own fee structure and academic offerings.
3. Support the full learner lifecycle from Kindergarten through College: admissions → enrollment → scheduling → attendance → grading → promotion/graduation → alumni.
4. Support the full financial lifecycle: fee assessment → billing → cashiering/POS → collection → BIR-compliant receipting → reconciliation → financial reporting.
5. Make structural and academic configuration (buildings/floors/rooms, curricula, grading systems, fee types) entirely admin-managed, versioned by school year, with no code changes or redeploys.
6. Provide role-scoped portals for Super Admin (platform), Tenant Admin, Branch/Campus Admin, Registrar, Cashier, Teacher/Faculty, Guidance/Discipline, Nurse/Clinic, Parent/Guardian, and Student.
7. Be auditable and compliant: RA 10173 (Data Privacy Act), BIR receipting (RA 11976 / EOPT), DepEd/CHED reporting formats (Form 137/138, TOR, COG).

## 3. Non-Goals (v1)

- Full-blown Learning Management System (content authoring, video lessons). We integrate with LMS (Google Classroom, Moodle, Canvas) via API rather than rebuild one.
- Full HR/Payroll suite (statutory PH payroll — BIR 2316, SSS/PhilHealth/Pag-IBIG contribution tables). v1 ships lightweight employee/faculty records and load/timesheet only; payroll is an integration point, not a rebuild.
- Cafeteria/canteen inventory, transportation/bus routing, dormitory management — modeled as **future modules** in the same tenant/branch/facility framework, not built in v1 (see §12).
- Native offline-first mode for the full academic system — only **Cashiering/POS** gets offline support in v1 (see §6.10).

## 4. Stakeholders & Personas

| Persona | Scope | Representative needs |
|---|---|---|
| **Platform Super Admin** (SchoolSuite staff) | Cross-tenant | Onboard tenants, manage subscription/billing plans, monitor platform health, impersonate for support (audited) |
| **Tenant Owner/Admin** | One tenant, all branches | Configure org-wide policies, curricula templates, fee templates, view consolidated reports across branches |
| **Branch/Campus Admin** | One branch | Manage buildings/rooms, sections, staff assignment, local fee overrides, local reports |
| **Registrar** | One or more branches | Admissions, enrollment, records (Form 137/138, TOR), section assignment, document requests |
| **Cashier** | One branch (one cashier drawer/session) | Collect payments, issue Official Receipts, open/close cash drawer, handle refunds/voids |
| **Accounting/Finance Officer** | Tenant or branch | Fee structure setup, discounts/scholarships approval, AR aging, reconciliation, GL export |
| **Teacher/Faculty** | Assigned sections/subjects | Attendance, gradebook, class records, advisory tasks |
| **Subject/Program Coordinator** | Department/program | Curriculum maintenance, class offering setup, load assignment |
| **Guidance Counselor / Prefect of Discipline** | Branch | Behavior/incident records, referrals |
| **Clinic/Nurse** | Branch | Health records, immunization, incident logs |
| **Parent/Guardian** | Linked students | View grades, attendance, balances, pay fees, receive announcements |
| **Student** | Self | View schedule, grades, attendance, balance, request documents |

## 5. Multi-Tenancy & Multi-Branch Model

```
Platform
 └─ Tenant (School Organization / Legal Entity)          e.g. "Holy Angel Integrated School System, Inc."
     ├─ Subscription / Plan
     ├─ Tenant-level configuration templates (curricula, fee templates, grading templates, roles)
     └─ Branch / Campus (physical site, own address, own BIR registration data)
         ├─ Building
         │   └─ Floor
         │       └─ Room (classroom, lab, office, clinic, cashier window, canteen, gym)
         ├─ Department (Elementary / JHS / SHS / College / optionally TechVoc)
         ├─ School Year (branch may share tenant calendar or override)
         │   └─ Term (Quarter / Semester / Trimester — configurable per department)
         ├─ Curriculum offering for that SY (grade levels / tracks-strands / programs & year levels)
         ├─ Sections / Class offerings, room + schedule assignment
         ├─ Enrollment (students enrolled at this branch, this SY)
         ├─ Fee structure (inherits tenant template, branch may override/add line items)
         ├─ Cashier stations / sessions, official receipt series (BIR ATP is per branch/TIN branch code)
         └─ Staff assigned to this branch (staff can be multi-branch)
```

**Isolation rule:** a tenant can never see another tenant's data, under any role, including Platform Super Admin outside of an explicit, audited support-impersonation flow. A branch-scoped user can only see data of the branch(es) explicitly granted, even within their own tenant.

**Cross-branch use cases explicitly supported:** a student enrolling in Branch B after finishing Elementary in Branch A of the same tenant; a tenant-level financial report consolidating all branches; a teacher who teaches at two branches on different days.

## 6. Functional Requirements

### 6.1 Tenant & Subscription Management (FR-TEN)
- FR-TEN-1: Platform admin can create/suspend/archive tenants, assign subscription plan (tiers by branch count, student count, or modules enabled).
- FR-TEN-2: Each tenant gets an isolated logical workspace, a custom subdomain (`tenant.schoolsuite.ph`) and optional custom domain + white-label branding (logo, colors, favicon).
- FR-TEN-3: Tenant admin can create/manage branches, each with its own name, address, TIN, BIR branch code, contact info, and academic levels offered.
- FR-TEN-4: Plan enforcement: student count caps, branch count caps, module gating (e.g., College module only on higher tiers), enforced server-side, visible to tenant admin with usage meters.
- FR-TEN-5: Tenant-level data export ("right to portability") and full tenant data purge on offboarding, within data-retention policy windows.

### 6.2 Facility / Physical Structure Management (FR-FAC)
- FR-FAC-1: CRUD for Building (name, code, branch, address/wing, floor count).
- FR-FAC-2: CRUD for Floor (per building, floor number/label).
- FR-FAC-3: CRUD for Room (per floor: name/number, type [classroom, lab, gym, clinic, office, cashier, canteen, library, comfort room, stockroom], capacity, seating layout, equipment tags, room status [active/under maintenance/closed]).
- FR-FAC-4: Rooms are assignable to class-offerings/sections per time slot; system prevents double-booking a room for overlapping time slots within the same branch.
- FR-FAC-5: Facility utilization report (occupancy % per room/time block) for capacity planning.
- FR-FAC-6: Asset/equipment tagging per room (optional light asset registry — projector, aircon, PCs) with maintenance-flag capability (not full asset management).

### 6.3 Academic Structure & Curriculum Management (FR-ACA)
This is the most "dynamic" module — it must model DepEd K-12, CHED higher ed, and be abstract enough for other frameworks.

- FR-ACA-1: **Education Level** is a configurable entity: Kindergarten, Elementary, Junior High School, Senior High School, College (and extensible: Vocational/TESDA, Graduate School). Each tenant chooses which levels it operates, per branch.
- FR-ACA-2: **Grade/Year Level** is configurable per Education Level (e.g., Grade 1–6, Grade 7–10, Grade 11–12, 1st Year–4th/5th Year College) with a display order and code.
- FR-ACA-3: **School Year** (e.g., SY 2026–2027) and **Term** are configurable: Quarters (basic ed, typically 4), Semesters (SHS/College, typically 2 + optional summer/midyear), Trimesters — all definable per department, with start/end dates and grade-submission deadlines.
- FR-ACA-4: **Curriculum** entity binds an Education Level + Grade/Year Level + School Year to a set of **Subjects/Courses**, with:
  - For SHS: **Track** (Academic, TVL, Sports, Arts & Design) and **Strand** (STEM, ABM, HUMSS, GAS, TVL specializations) as configurable sub-entities of Grade 11–12 curricula, each with its own core + specialized subject list.
  - For College: **Program** (e.g., BSIT, BSA) with **Curriculum Version/Year** (so a 2022 curriculum and a 2026 curriculum for the same program can coexist for different cohorts), Year Level, and Semester-mapped subjects with **units**, **prerequisites**, and **co-requisites**.
- FR-ACA-5: **Subject/Course** master: code, title, description, unit/credit value (College), hours-per-week (basic ed), lecture/lab split, is-core/is-elective flag, department/learning-area tag (e.g., MAPEH, TLE), and version history.
- FR-ACA-6: Curriculum authoring UI supports cloning a prior school year's curriculum as a starting point, then editing deltas (add/retire subjects, change units).
- FR-ACA-7: **Grading System** is configurable per Education Level: numeric (e.g., 60–100 transmuted), descriptive (Outstanding/VS/S/DNM per DepEd), GPA/QPI (College), pass/fail. Transmutation tables and weighted-component formulas (Written Work/Performance Task/Quarterly Exam weights) are tenant-editable per subject/level, versioned per school year.
- FR-ACA-8: **Section** = a group of students in a Grade/Year Level for a School Year, optionally with an adviser, homeroom, and default room (basic ed); for College, a **Class/Block** or per-subject class offering with its own schedule, room, and faculty (multiple students from different programs may share a general-education class).
- FR-ACA-9: **Class Offering / Schedule**: subject + section/block + faculty + room + time slots (day-of-week, start/end time) + term; conflict validation against faculty schedule, room schedule, and section schedule.

### 6.4 Admissions & Enrollment (FR-ADM)
- FR-ADM-1: Online application form builder (configurable fields per level, e.g., requires ESC/QVR for private-school subsidy applicants) with document upload (birth certificate, Form 138/137, TOR, ID photo).
- FR-ADM-2: Applicant pipeline: Inquiry → Applicant → Entrance Exam/Interview scheduling → Admitted → Enrolled/Waitlisted/Rejected, with configurable stages per tenant.
- FR-ADM-3: Automatic **Learner Reference Number (LRN)** capture/validation for DepEd learners; college applicants captured with prior LRN if transferring, plus student number auto-generation (tenant-defined format, e.g., `{branch}-{SY}-{sequence}`).
- FR-ADM-4: Re-enrollment workflow for continuing students (auto-suggest next grade/year level, carry forward outstanding balances/holds).
- FR-ADM-5: Section/block assignment (manual or rule-based: by strand, by academic standing, by alphabetical/quota balancing).
- FR-ADM-6: Enrollment holds: registrar/finance can flag a student (unpaid balance, incomplete requirements, disciplinary) that blocks schedule release, TOR release, or exam permits, configurable per hold-type and per level.
- FR-ADM-7: Bulk enrollment import (CSV/Excel) with validation and error report.
- FR-ADM-8: Cross-branch transfer workflow within the same tenant, preserving academic and financial history with an audit trail.

### 6.5 Student Information Management (FR-SIS)
- FR-SIS-1: Central student profile: demographics, LRN, guardians/emergency contacts (with relationship + custody flags), address, photo, prior school, health flags, special needs/IEP notes, government IDs (for College: student number, TIN if applicable).
- FR-SIS-2: Guardian portal linkage — one guardian can be linked to multiple students (siblings), across branches of the same tenant.
- FR-SIS-3: Full academic history per student across levels/branches within the tenant (Elementary → JHS → SHS → College continuity where applicable).
- FR-SIS-4: Document vault per student (uploaded documents + system-generated documents) with access-controlled sharing to guardians.
- FR-SIS-5: Custom fields engine: tenant can add level-specific custom fields (e.g., "Ethnicity" for a scholarship program, "Dorm Room" for boarding schools) without schema changes.
- FR-SIS-6: Merge/duplicate-detection tool for accidental duplicate student records.

### 6.6 Scheduling & Timetabling (FR-SCH)
- FR-SCH-1: Visual timetable builder per section/block; auto-conflict detection (room, faculty, section overlaps).
- FR-SCH-2: Faculty load report (units/hours per faculty per term) with configurable max-load warnings.
- FR-SCH-3: Student-facing personal schedule (esp. College, where students may have unique combinations).
- FR-SCH-4: Calendar of school events (holidays, exam weeks, teacher-training days) configurable per branch, affecting attendance-day computation.

### 6.7 Attendance (FR-ATT)
- FR-ATT-1: Daily attendance (basic ed homeroom) and per-period/per-subject attendance (JHS/SHS/College), configurable by level.
- FR-ATT-2: Multiple capture modes: manual teacher entry, QR/ID-scan kiosk, biometric integration hook (webhook/API), parent-reported excuse upload.
- FR-ATT-3: Automated guardian notification (SMS/email/push) on absence/tardy, configurable thresholds (e.g., 3 consecutive absences → counselor alert).
- FR-ATT-4: Attendance-based reports required for DepEd (Form 137 attendance summary) and for scholarship/ESC compliance (minimum attendance %).

### 6.8 Grading, Report Cards & Records (FR-GRA)
- FR-GRA-1: Gradebook per class offering with configurable components (Written Work, Performance Task, Quarterly Assessment for DepEd K-12; Prelim/Midterm/Finals for College) and tenant-defined weight templates per subject/level.
- FR-GRA-2: Automatic computation of quarterly/semestral/final grades using the active transmutation/weight configuration; manual override with required reason + audit log.
- FR-GRA-3: Report card generation (DepEd Form 138 style for basic ed, Certificate of Grades / TOR style for College) as templated, tenant-brandable documents (PDF).
- FR-GRA-4: Honor roll / Latin honors computation rules, configurable thresholds per level.
- FR-GRA-5: Permanent record generation: **Form 137** (Learner's Permanent Academic Record) for basic ed, **Transcript of Records (TOR)** for College, with registrar approval/e-signature workflow before release.
- FR-GRA-6: Grade change/appeal workflow with approval chain (teacher → coordinator → registrar) and immutable audit trail once term is "closed."
- FR-GRA-7: Promotion/retention/graduation processing at end of school year, level-aware (e.g., SHS completion triggers "Graduate" status and eligibility for College application within the same tenant).

### 6.9 Billing & Fee Management (FR-BIL)
- FR-BIL-1: **Fee Type** master (tenant-defined): Tuition, Miscellaneous, Laboratory, Books/Modules, Uniform, ID, Insurance, Registration, Graduation, Facilities/Development Fee, Late Payment Penalty, etc. — fully CRUD, taxable/non-taxable flag, GL account mapping.
- FR-BIL-2: **Fee Structure/Package** per Education Level + Grade/Year Level + School Year (+ optional per-branch override, per-track/strand/program override, boarding vs. non-boarding, etc.), composed of line items referencing Fee Types with amounts.
- FR-BIL-3: **Payment Plan/Term** configuration: cash (full payment discount %), or installment (e.g., Prelim/Midterm/Finals; monthly 10-month plan) — tenant-defined number of installments, due dates, and per-installment amounts (equal split or custom).
- FR-BIL-4: **Discounts & Scholarships**: sibling discount, employee-dependent discount, early-bird discount, government subsidy (ESC/QVR/TES/TDP), academic scholarship (full/partial), configurable as % or fixed amount, stackable rules configurable, approval workflow for manually-granted discounts.
- FR-BIL-5: Automatic **Statement of Account (SOA)** generation per student per term, reflecting assessed fees, payments, discounts, penalties, and running balance.
- FR-BIL-6: Late-payment penalty auto-computation rules (grace period, flat fee or % per month overdue), configurable and can be waived with approval + reason.
- FR-BIL-7: Accounts Receivable aging report (current, 30/60/90+ days) per student, per section, per branch, tenant-wide.
- FR-BIL-8: Refund and fee-adjustment workflow (e.g., student withdrawal mid-term → pro-rated refund policy configurable per tenant).

### 6.10 Cashiering / Point-of-Sale (FR-CSH)
- FR-CSH-1: **Cashier session/shift**: cashier opens a session with a declared starting cash float, all transactions tie to the session; session close reconciles expected vs. actual cash, generates a shift report, requires supervisor approval for variances.
- FR-CSH-2: Payment collection screen: search student → view SOA/balance → select line items or apply to oldest balance first (configurable allocation rule) → accept payment.
- FR-CSH-3: **Multi-modal payment capture**: cash, check, bank deposit slip reference, card (if card terminal integrated), and **online/digital wallet** (GCash, Maya, QR Ph, InstaPay/PESONet bank transfer) via a payment-gateway abstraction (see `architecture.md` §11). Parents can also pay remotely through the guardian portal, which posts into the same ledger the cashier sees in real time.
- FR-CSH-4: **BIR-compliant receipting**: system issues an **Official Receipt (OR)** — the correct principal document for schools as service-providers under BIR rules — sequentially numbered per branch/TIN-branch-code, from a tenant-configured **Authority to Print (ATP)/series range**, with all mandatory fields (registered name, TIN, branch code, address, date, payor name/TIN, description, amount, VAT/exempt status, "Tax Exempt" labeling for non-stock non-profit exempt revenue where applicable). Void/cancel of an issued OR requires reason + supervisor approval and is never a hard delete (reversal entry only).
- FR-CSH-5: Every OR is instantly reflected in the student ledger and, in real time, in the finance dashboards — no end-of-day batch delay.
- FR-CSH-6: Cash drawer / denomination breakdown entry at open and close (bills/coins count) for audit.
- FR-CSH-7: Daily Collection Report and Cash Position Report per cashier, per branch, exportable to accounting/GL.
- FR-CSH-8: **Offline-capable POS mode**: cashier terminal can continue issuing receipts (from a pre-allocated local OR-number block) during internet outage, queuing transactions for sync; conflict-safe reconciliation on reconnect (see `architecture.md` §11.3). This directly supports provincial branches with unreliable connectivity.
- FR-CSH-9: Non-tuition sales support (uniform/books/ID sold at cashier) using the same fee-type/GL framework, so cashiering is one till for all school collections.
- FR-CSH-10: Refund/void printed as a Credit/Adjustment Receipt referencing the original OR number, never overwriting history.

### 6.11 HR-Lite / Staff Records (FR-HR)
- FR-HR-1: Employee/faculty master record: personal info, position, department, branch assignment(s), employment status, government-mandated numbers (for payroll integration, not computation).
- FR-HR-2: Teaching load assignment feeding FR-SCH; substitute-teacher assignment workflow.
- FR-HR-3: Daily time record (DTR) capture (manual or biometric hook) for informational/attendance purposes — not a payroll engine in v1.
- FR-HR-4: Export hooks (CSV/API) to third-party payroll systems.

### 6.12 Communication & Notifications (FR-COM)
- FR-COM-1: Configurable notification templates (SMS/email/push/in-app) triggered by system events (absence, low balance, grade posted, document ready, announcement).
- FR-COM-2: Branch/tenant-wide announcements targeted by audience (all guardians, specific grade level, specific section).
- FR-COM-3: Two-way messaging thread between guardian/teacher/registrar (lightweight; not a full chat platform).
- FR-COM-4: Notification channel provider abstraction (SMS gateway e.g. Semaphore/Movider for PH, email via SES/SendGrid, push via FCM/APNs).

### 6.13 Document Generation (FR-DOC)
- FR-DOC-1: Template engine for generating official documents: Certificate of Enrollment, Certificate of Good Moral Character, Form 137, Form 138, TOR, Certificate of Grades, Diploma, ID cards, Official Receipts — each template tenant-brandable (logo, signatories) and versionable.
- FR-DOC-2: Document request workflow (student/guardian requests via portal → fee assessed if applicable → cashier collects → registrar releases, with e-signature/QR-verifiable authenticity code).
- FR-DOC-3: Bulk document generation (e.g., print all Form 138 for a section at quarter end).

### 6.14 Reporting & Analytics (FR-RPT)
- FR-RPT-1: Operational dashboards per role (Registrar: enrollment funnel; Cashier: daily collections; Teacher: class performance; Tenant Admin: cross-branch KPIs).
- FR-RPT-2: DepEd/CHED-format regulatory export reports (enrollment statistics, learner movement, completion/cohort-survival where feasible) as a configurable report-template library, since exact government formats change year to year.
- FR-RPT-3: Ad-hoc report builder (choose entity, filters, columns, group-by) for power users, export to Excel/PDF/CSV.
- FR-RPT-4: Financial reports: revenue by fee type, AR aging, collection efficiency, discount/scholarship utilization, GL-ready journal export.

### 6.15 System Administration & Configuration Engine (FR-CFG)
This is the cross-cutting module that makes "everything maintainable" real.

- FR-CFG-1: **Roles & Permissions** builder: tenant admin can create custom roles from a permission catalog (per module: view/create/edit/delete/approve/export), scoped to tenant, branch, or self-record level.
- FR-CFG-2: **Lookup/reference-data manager**: a generic admin screen to CRUD all "small" configurable lists — room types, fee types, discount types, ID types, relationship types, document types, hold types — without needing a dedicated screen per list.
- FR-CFG-3: **Numbering-scheme manager**: configurable auto-number formats for student numbers, OR/SI series, document reference numbers, employee IDs.
- FR-CFG-4: **Workflow/approval-chain configuration**: define multi-step approval for discounts, grade changes, refunds, document releases (who approves, escalation, SLA).
- FR-CFG-5: **Custom fields/EAV manager**: attach extra fields to Student, Employee, Enrollment, or Fee entities per tenant without a schema migration.
- FR-CFG-6: **Academic-year rollover wizard**: clones prior year's structure (grade levels, curricula, fee templates, sections skeletons) into a new school year, then lets admins edit deltas.
- FR-CFG-7: Full **audit log** viewer (who changed what, when, before/after values) across all configuration and transactional changes, exportable for compliance audits.
- FR-CFG-8: Feature flags per tenant/branch (enable/disable College module, enable/disable offline POS, etc.).

## 7. Non-Functional Requirements (summary — see `architecture.md` for implementation)

| Category | Requirement |
|---|---|
| **Data isolation** | No tenant can access another tenant's data under any circumstance; enforced at DB layer, not just application layer. |
| **Availability** | ≥ 99.5% during school operating hours (target 99.9% for paid tiers); graceful degradation for cashiering during outages (offline mode). |
| **Performance** | P95 API response < 400ms for standard CRUD; report generation may be async/queued for large exports. |
| **Scalability** | Must scale from a 1-branch, 300-student tenant to a 50-branch, 100,000-student tenant on the same platform without architecture change — only infra scaling. |
| **Security** | Encryption in transit (TLS 1.2+) and at rest; RBAC+ReBAC; MFA for admin/cashier/finance roles; secrets vaulted, never in code. |
| **Compliance** | RA 10173 (Data Privacy Act) — DPO registration support, consent capture, data-subject access/erasure workflow, retention schedules matching DepEd Order 35 s.2022 (Form 138: 2 yrs post-graduation; Form 137: indefinite/permanent). BIR RA 11976 receipting rules. |
| **Auditability** | Every financial transaction and every academic-record change is immutably logged with actor, timestamp, before/after state. |
| **Localization** | English + Filipino UI toggle; currency PHP by default, multi-currency-ready for future markets. |
| **Accessibility** | WCAG 2.1 AA target for parent/student portals. |
| **Backup/DR** | RPO ≤ 15 min, RTO ≤ 4 hours; per-tenant point-in-time restore capability. |
| **Interoperability** | Open REST API + webhooks for LMS, payroll, DepEd/CHED submission tools, and payment gateways. |

## 8. Dynamic/Configurable Entities Catalogue

The following must be **data, not code** — the single most important requirement of this build:

| Domain | Configurable by tenant/branch admin |
|---|---|
| Facilities | Buildings, Floors, Rooms, Room Types, Capacity, Equipment tags |
| Calendar | School Years, Terms/Quarters/Semesters, Holidays, Grading-period deadlines |
| Academic structure | Education Levels offered, Grade/Year Levels, Tracks, Strands, Programs, Curriculum versions, Subjects/Courses, Prerequisites, Units/Hours |
| Grading | Grading systems, component weights, transmutation tables, honor-roll thresholds |
| Sections/Scheduling | Sections/Blocks, Class offerings, Room/Faculty/Time assignment rules |
| People | Custom fields on Student/Employee/Guardian, Relationship types, Document types, Hold types |
| Finance | Fee Types, Fee Structures/Packages per level/SY, Payment plans/installments, Discount/Scholarship rules, Penalty rules, GL account mapping |
| Cashiering | Payment methods, OR/SI numbering series & ATP ranges, Cashier stations, Denomination sets |
| Access | Roles, Permissions, Approval workflows, Feature flags |
| Documents | Document templates, Signatories, Numbering schemes |
| Notifications | Templates, Channels, Trigger rules, Audience segments |
| Reports | Report templates, Export formats, Scheduled report subscriptions |

## 9. Assumptions & Constraints

- Primary jurisdiction is the Philippines; multi-country support is architected for but not fully localized in v1 (only PH tax/receipt rules ship "in the box").
- Tenants are private/independent schools and school networks first; public/DepEd-run schools could be a later GovTech-track offering with stricter procurement/compliance needs (out of scope v1).
- Payment gateway aggregators (e.g., Xendit, PayMongo, DragonPay, HitPay) are used rather than direct bank/e-wallet integration, since GCash/Maya have no open direct-merchant API (per current provider landscape).
- Internet connectivity at branches is assumed intermittent in some areas — hence the offline POS requirement, but the rest of the academic system requires connectivity.

## 10. Glossary

- **Tenant** — a school organization (legal entity) subscribing to the platform.
- **Branch** — a physical campus belonging to a tenant.
- **LRN** — Learner Reference Number (DepEd, K-12).
- **TOR** — Transcript of Records (College).
- **OR/SI** — Official Receipt / Sales Invoice (BIR).
- **ATP** — Authority to Print (BIR receipt series registration).
- **SOA** — Statement of Account.
- **DPA** — Data Privacy Act of 2012 (RA 10173).
- **EOPT** — Ease of Paying Taxes Act (RA 11976).

## 11. Acceptance Criteria (v1 launch bar)

A tenant admin, with zero code assistance, must be able to: stand up a new branch; define its buildings/floors/rooms; define a school year with terms; build a curriculum for at least one Elementary grade, one JHS grade, one SHS strand, and one College program; enroll a student; assign a section and schedule; record attendance and grades; assess fees per the configured fee structure; and collect a payment at the cashier that produces a BIR-compliant Official Receipt reflected instantly in the student's ledger — all without a single vendor engineering ticket.

## 12. Future Modules (post-v1, same architecture)

Cafeteria/canteen POS & inventory · Transportation/bus routing · Dormitory/boarding management · Library circulation · Full payroll & statutory compliance · LMS content authoring · Alumni/donor management · Government (DepEd LIS / CHED CHEDMIS) direct submission connectors.
