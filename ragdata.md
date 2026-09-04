# RAGDATA.md — Reference Data, Seed Data, and Application Data Needs
### School Management System (SMS) — Every lookup, every seed, every static dataset

**Companion to:** `spec.md` (requirements), `architecture.md` (data model), `todo.md` (build plan), `tables.md` (field-level schema)

**Purpose:** This document enumerates every piece of reference/lookup data, seed data, and static data needed to run the application from Day 1. It covers:
1. **Lookup lists** and their required items (populated via the Config Engine, but must be seeded or available from the first login)
2. **Seed templates** for academic structure (depEd K-12, generic College)
3. **Default roles and permissions** that the RBAC system needs out of the box
4. **System-level data** that the platform itself requires (plans, notification events, document types, etc.)
5. **Demo tenant seed data** for staging/UAT environments

---

## 1. Lookup Lists and Required Items

All lookup items are tenant-scoped. The items below are the **minimum viable seed** that every fresh tenant must have available immediately after provisioning. They are created either by a setup script or surfaced as pre-loaded items in the Lookup Manager UI (Phase 1.4).

### 1.1 Room Types
| Value | Description |
|---|---|
| `classroom` | Standard classroom |
| `laboratory` | Science / computer lab |
| `gym` | Gymnasium / covered court |
| `clinic` | School clinic / infirmary |
| `office` | Staff / admin office |
| `cashier_window` | Cashier window |
| `canteen` | Cafeteria / canteen |
| `library` | Library / media center |
| `comfort_room` | Restroom / comfort room |
| `stockroom` | Storage / stockroom |
| `auditorium` | Auditorium / multipurpose hall |
| `other` | Other (free-text in description) |

### 1.2 Document Types
| Value | Description |
|---|---|
| `birth_certificate` | Birth Certificate |
| `form_138` | DepEd Form 138 (Elementary / JHS) |
| `form_137` | DepEd Form 137 (Learner's Permanent Academic Record) |
| `tor` | Transcript of Records (College) |
| `certificate_of_grades` | Certificate of Grades |
| `certificate_of_enrollment` | Certificate of Enrollment |
| `certificate_of_good_moral` | Certificate of Good Moral Character |
| `diploma` | Diploma |
| `id_card` | Student / Employee ID Card |
| `certificate_of_completion` | Certificate of Completion (SHS) |

### 1.3 Relationship Types *(new — used in student_guardians, applicants)*
| Value | Description |
|---|---|
| `mother` | Mother |
| `father` | Father |
| `guardian` | Guardian (non-parent) |
| `grandparent` | Grandparent |
| `aunt_uncle` | Aunt / Uncle |
| `sibling` | Sibling |
| `other` | Other (free-text) |

### 1.4 Discount Types *(new — FR-BIL-4)*
| Value | Description | Discount Type | Stackable | Requires Approval |
|---|---|---|---|---|
| `sibling` | Sibling discount | percentage | true | false |
| `employee_dependent` | Employee-dependent discount | percentage | true | false |
| `early_bird` | Early bird discount | percentage | true | false |
| `esc_qvr` | Government subsidy (ESC/QVR) | fixed_amount | true | true |
| `scholarship_academic` | Academic scholarship | percentage | true | true |
| `scholarship_full` | Full scholarship | fixed_amount | false | true |
| `military_tfr` | Military/Family Assistance Program | fixed_amount | true | true |

### 1.5 Incident Types *(new — behavior_incidents)*
| Value | Description |
|---|---|
| `disciplinary` | Disciplinary infraction |
| `misconduct` | Misconduct |
| `violence` | Violent incident |
| `theft` | Theft / stealing |
| `substance` | Substance-related |
| `other` | Other |

### 1.6 Health Record Types *(new — health_records)*
| Value | Description |
|---|---|
| `immunization` | Vaccination / immunization record |
| `illness` | Illness / sickness record |
| `injury` | Injury / accident |
| `allergy` | Allergy / medical condition |
| `medical_visit` | General medical visit |
| `dental` | Dental check-up |
| `vision` | Vision screening |

### 1.7 Notification Events
| Value | Description | Default Channels |
|---|---|---|
| `absence` | Student absence alert | sms, push |
| `tardy` | Student tardy alert | push |
| `low_balance` | Low SOA balance | email, push |
| `grade_posted` | Grade posted for term | email, push |
| `document_ready` | Document ready for release | email, push, in_app |
| `announcement` | New announcement | sms, email, push, in_app |
| `payment_receipt` | Payment receipt sent | email, in_app |
| `enrollment_confirmed` | Enrollment confirmed | email, push |
| `fee_due` | Fee payment due reminder | email, push |
| `grading_deadline` | Grading deadline approaching | email (staff) |

### 1.8 Applicant Stages
| Value | Description | Order |
|---|---|---|
| `inquiry` | Initial inquiry | 1 |
| `applicant` | Application submitted | 2 |
| `entrance_exam` | Entrance exam / interview scheduled | 3 |
| `admitted` | Admitted | 4 |
| `enrolled` | Enrolled | 5 |
| `waitlisted` | Waitlisted | 6 |
| `rejected` | Rejected | 7 |

### 1.9 Employment Statuses *(new — employees)*
| Value | Description |
|---|---|
| `regular` | Regular / permanent |
| `probationary` | Probationary |
| `contract` | Fixed-term contract |
| `casual` | Casual / project-based |
| `part_time` | Part-time |
| `consultant` | Consultant |

### 1.10 Department Types *(new — HR-Lite, also used in academic structure)*
| Value | Description |
|---|---|
| `elementary` | Elementary (K-6) |
| `jhs` | Junior High School (7-10) |
| `shs` | Senior High School (11-12) |
| `college` | College (1st Year-4th Year+) |
| `techvoc` | Technical-Vocational (optional) |

### 1.11 Payment Methods
| Value | Description | Category |
|---|---|---|
| `cash` | Cash payment | in_person |
| `check` | Check payment | in_person |
| `bank_deposit_ref` | Bank deposit reference number | in_person |
| `gcash` | GCash e-wallet | online |
| `maya` | Maya e-wallet | online |
| `qrph` | QR Ph (national QR standard) | online |
| `card` | Debit/credit card (terminal) | in_person / online |
| `online` | Online bank transfer | online |

### 1.12 Attendance Statuses
| Value | Description | Triggers Notification |
|---|---|---|
| `present` | Present | — |
| `absent` | Absent | Yes (threshold) |
| `tardy` | Tardy | Yes (threshold) |
| `excused` | Excused (parent-reported) | No |

### 1.13 Enrollment Statuses
| Value | Description |
|---|---|
| `enrolled` | Currently enrolled |
| `waitlisted` | On waitlist |
| `rejected` | Application rejected |
| `graduated` | Completed level |
| `transferred` | Transferred to another branch/tenant |
| `withdrawn` | Withdrawn mid-year |

---

## 2. Academic Seed Data

### 2.1 Education Levels (DepEd K-12 + College)
| Code | Name | Sort Order |
|---|---|---|
| `kindergarten` | Kindergarten | 0 |
| `elementary` | Elementary | 1 |
| `jhs` | Junior High School | 2 |
| `shs` | Senior High School | 3 |
| `college` | College | 4 |

### 2.2 Grade Levels — Elementary (Grade 1–6)
| Code | Name | Sort Order | Education Level |
|---|---|---|---|
| `grade_1` | Grade 1 | 1 | elementary |
| `grade_2` | Grade 2 | 2 | elementary |
| `grade_3` | Grade 3 | 3 | elementary |
| `grade_4` | Grade 4 | 4 | elementary |
| `grade_5` | Grade 5 | 5 | elementary |
| `grade_6` | Grade 6 | 6 | elementary |

### 2.3 Grade Levels — Junior High School (Grade 7–10)
| Code | Name | Sort Order | Education Level |
|---|---|---|---|
| `grade_7` | Grade 7 | 7 | jhs |
| `grade_8` | Grade 8 | 8 | jhs |
| `grade_9` | Grade 9 | 9 | jhs |
| `grade_10` | Grade 10 | 10 | jhs |

### 2.4 Grade Levels — Senior High School (Grade 11–12)
| Code | Name | Sort Order | Education Level |
|---|---|---|---|
| `grade_11` | Grade 11 | 11 | shs |
| `grade_12` | Grade 12 | 12 | shs |

### 2.5 Grade Levels — College (1st Year–4th Year+)
| Code | Name | Sort Order | Education Level |
|---|---|---|---|
| `1st_year` | 1st Year | 13 | college |
| `2nd_year` | 2nd Year | 14 | college |
| `3rd_year` | 3rd Year | 15 | college |
| `4th_year` | 4th Year | 16 | college |

*Note: Levels must be configurable per branch via `levels_offered` on branches.*

### 2.6 SHS Tracks
| Name | Description |
|---|---|
| `academic` | Academic Track |
| `tvl` | Technical-Vocational-Livelihood Track |
| `sports` | Sports Track |
| `arts_design` | Arts & Design Track |

### 2.7 SHS Strands
| Code | Name | Track |
|---|---|---|
| `stem` | Science, Technology, Engineering, Mathematics | academic |
| `abm` | Accountancy, Business, Management | academic |
| `humss` | Humanities and Social Sciences | academic |
| `gas` | General Academic Strand | academic |
| `tvl-he` | Home Economics | tvl |
| `tvl-it` | Information Technology | tvl |
| `tvl-be` | Business Enterprise | tvl |
| `tvl-ag` | Agriculture-Fishery Arts | tvl |

### 2.8 SHS Core + Specialized Subjects (Seed Template)

**STEM Strand — Core Subjects:**
| Code | Title | Units | Hours/Week | Learning Area | Core/Elective |
|---|---|---|---|---|---|
| `stem_1` | Science 1 | 2.0 | 4 | Science | Core |
| `stem_2` | Science 2 | 2.0 | 4 | Science | Core |
| `stem_3` | Biology | 3.0 | 5 | Science | Core |
| `stem_4` | Chemistry | 3.0 | 5 | Science | Core |
| `stem_5` | Physics | 3.0 | 5 | Science | Core |
| `math_1` | Mathematics 1 | 2.0 | 4 | Mathematics | Core |
| `math_2` | Mathematics 2 | 2.0 | 4 | Mathematics | Core |
| `math_3` | Pre-Calculus | 3.0 | 5 | Mathematics | Core |
| `math_4` | Calculus | 3.0 | 5 | Mathematics | Core |
| `engl_1` | English 1 | 2.0 | 4 | Languages | Core |
| `engl_2` | English 2 | 2.0 | 4 | Languages | Core |
| `engl_3` | English 3 | 2.0 | 4 | Languages | Core |
| `engl_4` | English 4 | 2.0 | 4 | Languages | Core |
| `fil_1` | Filipino 1 | 2.0 | 4 | Languages | Core |
| `fil_2` | Filipino 2 | 2.0 | 4 | Languages | Core |
| `map` | MAPEH | 2.0 | 3 | MAPEH | Core |
| `pe` | Physical Education | 1.0 | 2 | MAPEH | Core |
| `tap` | Technology and Livelihood | 2.0 | 3 | TLE | Elective |

**ABM Strand — Core Subjects:**
| Code | Title | Units | Hours/Week | Learning Area | Core/Elective |
|---|---|---|---|---|---|
| `abm_math1` | Accountancy, Business, and Economics 1 | 3.0 | 5 | Mathematics | Core |
| `abm_math2` | Accountancy, Business, and Economics 2 | 3.0 | 5 | Mathematics | Core |
| `abm_bspk1` | Applied Economics | 2.0 | 3 | Business | Core |
| `abm_bspk2` | Business Finance | 3.0 | 5 | Business | Core |
| `abm_bspk3` | Fundamentals of Accountancy | 3.0 | 5 | Business | Core |
| `abm_esp1` | Entrepreneurial Marketing | 2.0 | 3 | Business | Core |
| `abm_esp2` | Entrepreneurial Principles | 2.0 | 3 | Business | Core |

**STEM Specialized Subjects (selected):**
| Code | Title | Units | Hours/Week | Learning Area | Core/Elective | Prerequisite |
|---|---|---|---|---|---|---|
| `stem_esp1` | Research 1 | 2.0 | 3 | Science | Specialized | (none in Grade 11) |
| `stem_esp2` | Research 2 | 2.0 | 3 | Science | Specialized | stem_esp1 |

### 2.9 College Program Template — Generic BS (Seed Template)

**Program:** `BS General Education` (generic skeleton)

| Code | Title | Units | Hours/Week | Learning Area | Core/Elective |
|---|---|---|---|---|---|
| `gen_ed_1` | Understanding the Self | 3 | 3 | General Education | Core |
| `gen_ed_2` | Mathematics in the Modern World | 3 | 3 | General Education | Core |
| `gen_ed_3` | The Contemporary World | 3 | 3 | General Education | Core |
| `gen_ed_4` | Purposive Communication | 3 | 3 | General Education | Core |
| `gen_ed_5` | Art Appreciation | 3 | 3 | General Education | Core |
| `gen_ed_6` | Ethics | 3 | 3 | General Education | Core |
| `gen_ed_7` | Filipino Nationalism | 3 | 3 | General Education | Core |
| `gen_ed_8` | The Contemporary Philosophies | 3 | 3 | General Education | Core |

*Note: The generic BS template is a starting skeleton; each College program (BSIT, BSA, etc.) customizes its own curriculum from Gen-Ed + major subjects.*

### 2.10 Subjects with Co-requisites and Learning Areas
| Subject Code | Subject Title | Units | Hours/Wk | Learning Area | Co-requisite Of |
|---|---|---|---|---|---|
| `map_1` | MAPEH 1 | 2 | 3 | MAPEH | — |
| `tle_1` | TLE 1 | 2 | 3 | TLE | — |
| `math_1` | Mathematics 1 | 2 | 4 | Mathematics | — |
| `math_2` | Mathematics 2 | 2 | 4 | Mathematics | math_1 |
| `math_3` | Elementary Algebra | 3 | 5 | Mathematics | math_2 |
| `math_4` | Intermediate Algebra | 3 | 5 | Mathematics | math_3 |
| `engl_1` | English 1 | 2 | 4 | Languages | — |
| `sci_1` | Science 1 | 3 | 5 | Science | — |

*Note: co-requisite_subject_id in subjects table and curriculum_subjects table enables co-requisite relationships (FR-ACA-4).*

---

## 3. Default Roles and Permissions Catalog

### 3.1 Default Roles *(seed — Phase 1.3)*
| Role Name | Scope | Description |
|---|---|---|
| `platform_super_admin` | Platform-wide | Full platform access, tenant management |
| `tenant_admin` | Tenant-wide | All configuration, all branches |
| `branch_admin` | Branch | Facility, local reports, local overrides |
| `accounting_officer` | Branch/Tenant | Fee setup, AR, reconciliation, GL export |
| `program_coordinator` | Department | Curriculum maintenance, class offerings, load assignment |
| `registrar` | Branch | Admissions, enrollment, records, document requests |
| `cashier` | Branch | Payments, OR issuance, session management |
| `finance` | Tenant | Fee structures, discounts, SOA |
| `teacher` | Assigned sections | Attendance, gradebook, class records |
| `guidance` | Branch | Behavior/incident records, referrals |
| `nurse` | Branch | Health records, immunizations |
| `guardian` | Self + linked students | View grades, attendance, pay fees |
| `student` | Self | View schedule, grades, attendance |
| `platform_support` | Platform (impersonation) | Support access, audited |
| `dpo` | Tenant | Data Privacy Act compliance, DSAR |

### 3.2 Permission Catalog *(permission types per module)*
| Permission | Description |
|---|---|
| `view` | Read access |
| `create` | Create new records |
| `edit` | Update existing records |
| `delete` | Soft-delete (never hard-delete for financial/academic records) |
| `approve` | Approval gate (for workflows) |
| `export` | Export to PDF/Excel/CSV |

### 3.3 Module Permissions Matrix *(base catalog — Phase 1.3)*
| Module | Permissions |
|---|---|
| `tenancy` | view, create, edit, delete, approve, export |
| `facility` | view, create, edit, delete |
| `academic` | view, create, edit, delete, approve |
| `enrollment` | view, create, edit, approve |
| `billing` | view, create, edit, delete, approve, export |
| `cashiering` | view, create, edit, approve, export |
| `grading` | view, create, edit, approve, export |
| `attendance` | view, create, edit |
| `scheduling` | view, create, edit |
| `hr` | view, create, edit |
| `communications` | view, create, edit |
| `documents` | view, create, edit, approve, export |
| `reporting` | view, export |
| `config` | view, create, edit, delete |

---

## 4. Feature Flags *(default seed)*

| Flag Key | Default | Description |
|---|---|---|
| `college_module` | false | Enable College features (curricula, programs) |
| `offline_pos` | false | Enable offline-capable POS mode |
| `biometric_attendance` | false | Enable biometric attendance hook |
| `qr_check_in` | false | Enable QR/ID-scan kiosk attendance |
| `guardian_portal` | false | Enable guardian-facing portal |
| `student_portal` | false | Enable student self-service |
| `bulk_print` | false | Enable bulk document generation |
| `substitute_teacher` | false | Enable substitute teacher workflow |
| `cross_branch_transfer` | false | Enable cross-branch transfer |

---

## 5. Numbering Scheme Defaults *(seed — Phase 1.4)*

| Name | Entity Type | Format | Counter Start |
|---|---|---|---|
| `student_number` | student | `{branch_code}-{SY}-{seq}` | 1001 |
| `employee_id` | employee | `EMP-{seq}` | 1001 |
| `or_number` | official_receipt | `{branch_code}-OR-{seq}` | 1000001 |
| `si_number` | sales_invoice | `{branch_code}-SI-{seq}` | 1000001 |
| `document_ref` | document_request | `DOC-{seq}` | 1001 |
| `applicant_number` | applicant | `APP-{seq}` | 2001 |

---

## 6. Demo Tenant Seed Data (Staging/UAT)

### 6.1 Demo Tenant: `demo-k12`
| Field | Value |
|---|---|
| `name` | `Demo K-12 School` |
| `slug` | `demo-k12` |
| `plan` | `professional` |
| `branding` | `{logo: "demo-logo.png", colors: {primary: "#1E40AF", secondary: "#F59E0B"}}` |

### 6.2 Demo Branches
| Branch | Code | TIN | BIR Branch Code | Levels Offered |
|---|---|---|---|---|
| `Main Campus` | `MAIN` | `123-4567890-001` | `BIR-001` | elementary, jhs, shs |
| `North Campus` | `NORTH` | `123-4567890-002` | `BIR-002` | jhs, shs |

### 6.3 Demo School Year
| Name | Start Date | End Date | Status |
|---|---|---|---|
| `SY 2026-2027` | 2026-06-01 | 2027-03-31 | active |

### 6.4 Demo Terms
| Name | Sequence | Start Date | End Date | Grading Deadline |
|---|---|---|---|---|
| `First Quarter` | 1 | 2026-06-01 | 2026-08-31 | 2026-09-15 |
| `Second Quarter` | 2 | 2026-09-01 | 2026-11-30 | 2026-12-15 |
| `Third Quarter` | 3 | 2026-12-01 | 2027-02-28 | 2027-03-15 |

### 6.5 Demo Users *(seed with hashed passwords)*
| Email | Role(s) | Branch | Password Hint |
|---|---|---|---|
| `superadmin@schoolsuite.ph` | Platform Super Admin | — | Platform admin default |
| `admin@demo-k12.ph` | Tenant Admin | — | Tenant admin default |
| `registrar@demo-k12.ph` | Registrar | MAIN | Registrar default |
| `cashier@demo-k12.ph` | Cashier | MAIN | Cashier default |
| `teacher@demo-k12.ph` | Teacher | MAIN | Teacher default |

### 6.6 Demo Students *(seed 20 students for testing)*
| First Name | Last Name | Grade Level | Section | LRN (12-digit) |
|---|---|---|---|---|
| Juan | Dela Cruz | Grade 7 | 7-A | 202601010001 |
| Maria | Santos | Grade 7 | 7-A | 202601010002 |
| ... | ... | ... | ... | ... |

*(Seed 10 per grade level: Grade 7, Grade 8, Grade 11 STEM, College 1st Year)*

### 6.7 Demo Staff *(seed 5 employees)*
| First Name | Last Name | Position | Department | Employment Status |
|---|---|---|---|---|
| Jose | Rizal | Principal | Administration | regular |
| Ana | Cruz | Registrar | Registrar's Office | regular |
| Pedro | Reyes | Teacher | Mathematics | regular |
| Juan | Garcia | Teacher | Science | regular |
| Maria | Lopez | Cashier | Cashiering | regular |

---

## 7. Notification Template Defaults *(seed)*

| Event | Channel | Subject | Body Template |
|---|---|---|---|
| `absence` | sms | — | `Dear {guardian_name}, {student_name} was marked absent on {date}. Please confirm if this is excused. Thank you.` |
| `absence` | push | Absence Alert | `{student_name} was absent today. Please check the portal for details.` |
| `low_balance` | email | Low Balance Alert | `Dear {guardian_name}, {student_name}'s SOA balance is ₱{balance}. Please settle at your earliest convenience.` |
| `grade_posted` | email | Grades Posted | `Grades for {student_name} have been posted for {term}. View at {portal_url}.` |
| `document_ready` | email | Document Ready | `Your document request ({document_type}) is ready for release at {branch_name}.` |
| `enrollment_confirmed` | email | Enrollment Confirmed | `Congratulations! {student_name} has been enrolled in {curriculum} for {school_year}.` |

---

## 8. Application State Data *(needed at runtime)*

### 8.1 Tenant Plan Definitions
| Plan | Max Branches | Max Students | Modules |
|---|---|---|---|
| `starter` | 1 | 100 | Basic (no College, no offline POS) |
| `professional` | 5 | 1,000 | Full K-12, College, basic reporting |
| `enterprise` | Unlimited | Unlimited | All modules, multi-provider payments, SSO |

### 8.2 Invoice Statuses
| Value | Description |
|---|---|
| `open` | Fees assessed, not yet paid |
| `partially_paid` | Partial payment received |
| `paid` | Fully paid |
| `overdue` | Past due date |
| `cancelled` | Cancelled (void) |

### 8.3 Cashier Session Statuses
| Value | Description |
|---|---|
| `open` | Session is active |
| `closed` | Session reconciled and closed |
| `forced_closed` | Session force-closed by supervisor |

### 8.4 Document Request Statuses
| Value | Description |
|---|---|
| `requested` | Initial request |
| `fee_assessed` | Fee calculated |
| `paid` | Payment collected |
| `released` | Registrar released with e-signature |
| `rejected` | Request denied |

### 8.5 Approval Workflow Statuses *(reusable across modules)*
| Value | Description |
|---|---|
| `pending` | Awaiting first approver |
| `approved` | All approvers approved |
| `rejected` | Rejected by an approver |
| `escalated` | Escalated to next level |

### 8.6 Retention Rules *(new — arch §10)*
| Document Type | Retention Years | Soft Delete After | Hard Purge After |
|---|---|---|---|
| `form_138` | 2 years post-graduation | 90 days after retention expires | 1 year after soft delete |
| `form_137` | Indefinite (permanent) | — | — |
| `tor` | Indefinite | — | — |
| `or` | 10 years (BIR) | 90 days after retention expires | 1 year after soft delete |
| `student_record` | Indefinite | — | — |

---

## 9. Cross-Reference: Lookup Items ↔ Tables

This mapping shows which lookup lists feed into which table fields, ensuring the seed data is complete.

| Lookup List (lookup_items) | Consuming Table | Consuming Field |
|---|---|---|
| Room Types | rooms | room_type |
| Document Types | document_templates | document_type |
| Relationship Types | student_guardians | relationship |
| Relationship Types | applicants | relationship (future) |
| Discount Types | fee_structure_items | discount_type_id |
| Discount Types | invoice_items | discount_type_id |
| Incident Types | behavior_incidents | incident_type |
| Health Record Types | health_records | record_type |
| Notification Events | notification_templates | event_type |
| Applicant Stages | applicants | stage |
| Employment Statuses | employees | employment_status |
| Department Types | branches | levels_offered (array reference) |
| Payment Methods | payments | method |
| Attendance Statuses | attendance_records | status |
| Enrollment Statuses | enrollments | status |
| Invoice Statuses | invoices | status |
| Cashier Session Statuses | cashier_sessions | status |
| Document Request Statuses | document_requests | status |
| Approval Workflow Statuses | grade_change_requests, refunds | status |
| SHS Tracks | tracks | (direct entity) |
| SHS Strands | strands | (direct entity) |
| Education Levels | education_levels | (direct entity) |
| Grade Levels | grade_levels | (direct entity) |
