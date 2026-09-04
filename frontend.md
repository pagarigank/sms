# FRONTEND.md — School Management System (SMS)
### Client Architecture, UX, and Component Strategy

**Companion to:** `spec.md`, `architecture.md`, `todo.md`

---

## 1. Frontend Principles

1. **Config-driven UI, not hard-coded screens.** Because the backend treats curricula, fee types, roles, and document templates as data (see `spec.md` §8), the frontend must render forms, tables, and menus from schema/metadata wherever the entity is tenant-configurable — a new fee type or custom field should appear in the UI automatically, without a frontend release.
3. **Role-first navigation.** Every user sees a menu and dashboard built from their effective permissions (RBAC/ReBAC from the backend), not a role name hard-coded in the client.
4. **One design system, many portals.** A single component library and design language serves the Super Admin console, the Tenant/Branch back office, the Cashier POS, and the Parent/Student portal — differentiated by information density and layout, not by inconsistent visual language.
5. **Print and export are first-class**, not an afterthought — report cards, receipts, IDs, and TOR/Form 137 must render pixel-correct in print/PDF, since these are legal documents.
6. **Resilience over cleverness at the cashier.** The POS surface is the one place where offline behavior, large touch targets, and unambiguous state (session open/closed, synced/pending) matter more than visual polish.

## 2. Technology Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | **Next.js 15** (App Router), TypeScript | SSR for public/marketing + portal shells, CSR for data-dense back-office screens |
| Styling | **Tailwind CSS** + **shadcn/ui** (Radix primitives) | consistent, themeable, accessible-by-default components |
| Data fetching/cache | **TanStack Query** | server-state cache, optimistic updates for cashiering, background refetch |
| Client/UI state | **Zustand** | lightweight, avoids Redux boilerplate for cross-component UI state (active branch, active school year, POS session) |
| Forms | **React Hook Form** + **Zod** | schema validation shared/mirrored with backend DTOs |
| Tables | **TanStack Table** | server-side pagination/sort/filter for large student/payment lists |
| Charts | **Recharts** | dashboards (enrollment trend, collection rate) |
| Dates | **date-fns** with PH timezone (`Asia/Manila`) handling | school-year/date-range heavy domain |
| i18n | **next-intl** (English default, Filipino toggle) | |
| Offline (POS only) | Service Worker + **IndexedDB** (via Dexie.js) + Background Sync API | see §8 |
| Printing | `react-to-print` for report cards/IDs; ESC/POS via local print agent or WebUSB for receipts | see §8.3 |
| Testing | **Vitest** + React Testing Library (unit), **Playwright** (e2e) | |
| Monorepo tooling | **Turborepo** + pnpm workspaces | shared UI kit + types across apps |

## 3. Application/Repo Structure

```
apps/
  platform-admin/        # Super Admin console (cross-tenant)
  school-portal/         # Tenant/Branch back office: registrar, cashier, teacher, finance, admin
  guardian-portal/        # Parent/Student self-service (web)
  pos-terminal/            # Cashier POS, offline-capable route (can also be a mode within school-portal)
packages/
  ui/                    # shared shadcn/ui-based component library, design tokens
  api-client/            # generated TS client from backend OpenAPI schema
  config-forms/          # the "dynamic form renderer" engine (see §6)
  i18n/                  # shared translation resources
  utils/                 # date/currency/PH-specific formatting helpers
```

`school-portal` is a single app whose **navigation and dashboard are role-driven** rather than one app per role — a Registrar and a Cashier log into the same shell and see different modules, because in real schools staff often wear multiple hats.

## 4. Multi-Tenant Theming & White-Labeling

- Tenant `branding` (logo, primary/secondary color, favicon) is fetched at shell bootstrap based on subdomain and applied via CSS custom properties (`--brand-primary`, etc.) — no rebuild per tenant.
- Tenant/branch switcher in the top bar for users with multi-branch or multi-tenant access (e.g., a platform support engineer, or a finance officer overseeing all branches); switching updates the active `tenant_id`/`branch_id` in the Zustand store and invalidates the relevant TanStack Query caches.
- Print templates (receipts, report cards, IDs) also pull tenant branding, since these are the documents parents and regulators actually see.

## 5. Navigation & Role-Based UI

- On login, the client fetches the user's **effective permission set** and **module entitlements** (tenant plan/feature flags) once, and derives the sidebar/menu tree from a declarative route-to-permission map — a route that a user lacks permission for is not rendered (and is also rejected server-side; the UI hide is a UX convenience, never the security boundary).
- Representative navigation per persona:
  - **Tenant/Branch Admin:** Dashboard → Branches → Facilities (Buildings/Floors/Rooms) → Academic Setup (School Years, Curricula, Subjects) → People (Students, Staff, Guardians) → Finance Setup (Fee Types, Structures, Discounts) → Roles & Permissions → Reports.
  - **Registrar:** Dashboard → Admissions Pipeline → Enrollment → Sections → Student Records → Document Requests → Reports.
  - **Cashier:** POS (full-screen, minimal nav) → Session History → Daily Report.
  - **Teacher:** My Classes → Attendance → Gradebook → Class Records → Announcements.
  - **Guardian/Student:** Home (announcements) → Grades → Attendance → Statement of Account / Pay Now → Documents → Messages.

## 6. Dynamic Configuration UI (the "everything is maintainable" layer)

Because the backend exposes generic **Lookup Lists**, **Custom Field Definitions**, and **Fee/Curriculum templates** as data, the frontend implements a shared **Config-Forms engine** (`packages/config-forms`) rather than one bespoke form per entity:

- A **Schema-to-Form renderer** takes a JSON field-schema (label, type, validation, options, visibility rules) — sourced from either a static DTO schema (for core fields) or the tenant's `custom_field_definitions` (for extra fields) — and renders a unified form using the shared component kit (text, select, date, number, currency, file upload, relation-picker).
- A **generic Lookup Manager** screen (used for Room Types, Fee Types, Discount Types, ID Types, Document Types, Hold Types, etc.) provides list/create/edit/archive/reorder for any tenant-scoped lookup table, configured by pointing it at the right API resource — avoiding ~15 near-identical CRUD screens.
- A **Curriculum Builder** is the one deliberately bespoke, richer screen (drag/drop subjects into terms, clone-from-prior-year, prerequisite linking) because its UX value justifies custom work beyond the generic form renderer.
- A **Fee Structure Builder** similarly gets a dedicated line-item editor (add/remove fee-type rows, live total, installment-plan preview) on top of the generic engine.
- A **Role/Permission Builder** renders the permission catalog as a matrix (modules × actions) with checkboxes, calling the same RBAC API described in `architecture.md` §7.

## 7. Key Screens by Module (representative, not exhaustive)

| Module | Screens |
|---|---|
| Facility | Building/Floor/Room list & CRUD, Room schedule/occupancy calendar |
| Academic | School Year & Term setup, Curriculum Builder, Subject catalog, Track/Strand/Program setup, Grading system & weight config |
| Admissions | Applicant Kanban pipeline, Application form preview, Bulk import wizard |
| Enrollment | Enrollment wizard (student → curriculum → section), Re-enrollment batch tool, Transfer workflow |
| SIS | Student 360 profile (tabs: Info, Guardians, Academic History, Documents, Finance, Health, Discipline), Guardian directory |
| Scheduling | Timetable builder (drag/drop grid), Faculty load report |
| Attendance | Daily/period attendance grid, Absence alert log |
| Grading | Gradebook (spreadsheet-like grid with inline calc), Report Card preview/print, Grade-change approval queue |
| Billing | Fee Structure Builder, Student SOA view, AR Aging report, Discount/Scholarship approval queue |
| Cashiering | POS payment screen, Session open/close, Daily Collection Report, Void/Refund flow |
| HR-Lite | Employee directory, Load assignment |
| Communications | Announcement composer (audience picker), Template manager, Message threads |
| Documents | Document request tracker, Template designer (WYSIWYG with merge fields), Bulk print queue |
| Reporting | Dashboard builder, Ad-hoc report builder (entity/filter/column picker), Scheduled report subscriptions |
| Config | Lookup Manager, Custom Field Manager, Numbering Scheme Manager, Role/Permission Builder, Workflow/Approval Builder, Audit Log viewer |

## 8. Cashiering / POS UI (special case)

### 8.1 Design goals
Large touch targets, high contrast, minimal steps from "search student" to "print receipt," and an always-visible session/connectivity status bar — this screen is used standing up, often mid-queue, and must never leave the cashier unsure whether a payment "went through."

### 8.2 Offline behavior in the UI
- A persistent status chip shows **Online / Offline (queued: N) / Syncing**.
- When offline, the payment screen behaves identically except the receipt is clearly stamped "Provisional — printed offline, OR #___ reserved," and a background indicator shows pending-sync count.
- On reconnect, a toast confirms each synced transaction; any conflict routes to an **Exception Inbox** visible to the branch admin/finance role, never silently resolved.

### 8.3 Printing
- Thermal receipt printing via a small local print agent (or WebUSB where supported) using ESC/POS commands; a print-preview fallback (PDF) exists for setups without a receipt printer.
- Report cards, IDs, TOR, and other formal documents use HTML/CSS print stylesheets (`@media print`) rendered server-side to PDF for consistency and to preserve tenant branding exactly, then downloaded/printed by the browser.

## 9. State Management & Data-Fetching Conventions

- Server state (students, invoices, curricula) lives in **TanStack Query**, keyed by `[tenantId, branchId, resource, params]` so switching branch/tenant context automatically invalidates the right caches.
- Client-only UI state (active branch/school-year selector, POS session, form wizard step) lives in **Zustand**, persisted to `localStorage` where it should survive a refresh (e.g., "last selected school year") — never for anything security-sensitive.
- Mutations use optimistic updates only where safe to roll back visually (e.g., marking attendance); financial mutations (payments) are **not** optimistic — the UI shows a pending state and waits for server/local-DB confirmation before declaring success, consistent with the append-only, idempotent backend design.

## 10. Accessibility & Localization

- WCAG 2.1 AA target for Guardian/Student portal and all form-heavy back-office screens: keyboard navigable, sufficient contrast, ARIA labeling via Radix primitives (shadcn/ui default).
- English/Filipino toggle for parent-facing surfaces (announcements, portal chrome); back-office defaults to English (common in PH school administration) but is translation-ready.
- All currency renders as PHP (₱) with proper thousands/decimal formatting; date formats follow PH convention (Month DD, YYYY) with explicit `Asia/Manila` timezone handling for anything attendance/deadline-related.

## 11. Performance

- Route-level code splitting (Next.js automatic) plus manual `dynamic()` splitting for heavy screens (Curriculum Builder, Timetable drag/drop, Gradebook grid).
- Server-side pagination/virtualization (TanStack Table + Virtual) for any list that can exceed ~200 rows (student lists, payment history).
- Image optimization (`next/image`) for student photos/ID cards; lazy-loaded avatars in list views.
- Prefetching: hovering a student row prefetches their Student-360 profile query.

## 12. Testing Strategy

- **Unit:** Vitest + RTL for components and the Config-Forms schema renderer (schema-in → correct field types out).
- **Integration:** mock API (MSW) against key flows — enrollment wizard, cashier payment + receipt, grade entry + report card generation.
- **E2E (Playwright):** golden-path smoke suite run in CI against a seeded demo tenant: login → enroll a student → assess fees → collect payment → print receipt → post grade → generate report card — this single path exercises most modules and is treated as the release gate.
- **Visual regression:** Chromatic (or Playwright screenshot diffing) on the shared `packages/ui` components, since they're reused across every portal.

## 13. Component Library Structure (`packages/ui`)

```
ui/
  tokens/            # colors, spacing, typography as CSS variables + Tailwind config
  primitives/        # Button, Input, Select, Dialog, Table, Tabs, Badge, Toast (shadcn/ui-based)
  patterns/          # DataTable (server-paginated), FormField (RHF-bound), EntityPicker, StatusChip
  domain/            # StudentCard, InvoiceSummary, ReceiptPreview, ScheduleGrid, GradebookGrid
  print/             # print-optimized layouts: ReportCardLayout, ReceiptLayout, IDCardLayout, TORLayout
```

Domain-specific but visually reusable components (e.g., `StatusChip` used for enrollment status, invoice status, attendance status, session status) are intentionally generic and configured via props/variants rather than duplicated per module.

## 14. Design Direction

Follow the frontend-design skill guidance at build time for concrete tokens/typography choices; directionally: a clean, high-trust "administrative software" aesthetic (not overly playful, given the audience includes finance and registrar staff and formal documents), generous whitespace in back-office tables, and a distinctly higher-contrast, larger-type mode specifically for the Cashier POS and any kiosk/attendance-scanning surface.
