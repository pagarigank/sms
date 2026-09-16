/**
 * Declarative API → permission map.
 *
 * The domain controllers (academic, billing, cashiering, sis, facility,
 * scheduling, attendance, grading, communications, documents, hr, reporting,
 * config) don't carry per-route `@RequirePermission` decorators (~180 routes).
 * Instead, `PermissionsGuard` resolves the required permission for a request
 * from this map when no explicit decorator metadata is present.
 *
 * Every code here MUST exist in the seeded `permissions` catalog
 * (migrations 001/004/013/015) — a code that does not exist can never be
 * granted, which would deny the route to every role.
 *
 * Verbs: GET/HEAD → `view`, POST → `write`, PUT/PATCH/DELETE → `update`.
 */

export interface ApiPermissionRule {
  /** Path prefix after the `/api/v1/` global prefix, e.g. `billing/fee-types`. */
  prefix: string;
  view: string;
  write: string;
  update: string;
}

/**
 * Self-service (portal) endpoints: authenticated, but intentionally NOT
 * permission-gated. These are scoped to the caller's own identity by the
 * service layer (e.g. `GET /sis/students/my-children` resolves the guardian
 * via `guardians.userId`), so Guardian/Student roles need no staff
 * permissions to use them.
 *
 * Endpoints keyed by a client-supplied `studentId` (`invoices/student/:id/soa`,
 * `grading/students/:id`, `attendance/students/:id/*`, `documents/*`), by a
 * client-supplied `userId` (`communications/threads`), or by a thread id are
 * ownership-checked by `SelfServiceScopeGuard`: a caller who does not hold the
 * route's own staff permission must own the student / be the user / be a thread
 * participant (see `student-access.service.ts`).
 */
export const SELF_SERVICE_RULES: { prefix: string; methods: string[] }[] = [
  { prefix: 'sis/students/my-children', methods: ['GET'] },
  { prefix: 'invoices/student', methods: ['GET'] },
  { prefix: 'grading/students', methods: ['GET'] },
  { prefix: 'attendance/students', methods: ['GET'] },
  { prefix: 'scheduling/students', methods: ['GET'] },
  { prefix: 'documents/templates', methods: ['GET'] },
  { prefix: 'documents/requests', methods: ['GET', 'POST'] },
  { prefix: 'documents/generated', methods: ['GET'] },
  { prefix: 'documents/verify', methods: ['GET'] },
  { prefix: 'communications/threads', methods: ['GET', 'POST'] },
  { prefix: 'communications/messages', methods: ['GET', 'POST', 'PUT'] },
];

export const API_PERMISSION_MAP: ApiPermissionRule[] = [
  // === Academic ===
  { prefix: 'academic/education-levels', view: 'academic.curriculum:view', write: 'academic.curriculum:create', update: 'academic.curriculum:edit' },
  { prefix: 'academic/grade-levels', view: 'academic.curriculum:view', write: 'academic.curriculum:create', update: 'academic.curriculum:edit' },
  { prefix: 'academic/school-years', view: 'academic.school_year:view', write: 'academic.school_year:create', update: 'academic.school_year:create' },
  { prefix: 'academic/terms', view: 'academic.term:view', write: 'academic.term:create', update: 'academic.term:create' },
  { prefix: 'academic/tracks', view: 'academic.curriculum:view', write: 'academic.curriculum:create', update: 'academic.curriculum:edit' },
  { prefix: 'academic/strands', view: 'academic.curriculum:view', write: 'academic.curriculum:create', update: 'academic.curriculum:edit' },
  { prefix: 'academic/programs', view: 'academic.curriculum:view', write: 'academic.curriculum:create', update: 'academic.curriculum:edit' },
  { prefix: 'academic/subjects', view: 'academic.subject:view', write: 'academic.subject:create', update: 'academic.subject:create' },
  // covers `curricula`, `curricula/:id`, `curriculum-subjects`
  { prefix: 'academic/curricul', view: 'academic.curriculum:view', write: 'academic.curriculum:create', update: 'academic.curriculum:edit' },

  // === Grading config ===
  { prefix: 'grading/systems', view: 'grading.system:view', write: 'grading.system:create', update: 'grading.system:create' },
  { prefix: 'grading/components', view: 'grading.component:view', write: 'grading.component:view', update: 'grading.component:view' },
  { prefix: 'grading/honor-roll', view: 'grading.honorroll:view', write: 'grading.honorroll:view', update: 'grading.honorroll:view' },

  // === Billing ===
  { prefix: 'billing/fee-types', view: 'billing.fee_type:view', write: 'billing.fee_type:create', update: 'billing.fee_type:create' },
  { prefix: 'billing/fee-structures', view: 'billing.feestructure:view', write: 'billing.feestructure:view', update: 'billing.feestructure:view' },
  { prefix: 'billing/discount-types', view: 'billing.discount:view', write: 'billing.discount:approve', update: 'billing.discount:approve' },
  { prefix: 'billing/discount-grants', view: 'billing.discount:view', write: 'billing.discount:approve', update: 'billing.discount:approve' },
  { prefix: 'billing/payment-plans', view: 'billing.feestructure:view', write: 'billing.feestructure:view', update: 'billing.feestructure:view' },
  { prefix: 'billing/penalty-rules', view: 'billing.feestructure:view', write: 'billing.feestructure:view', update: 'billing.feestructure:view' },
  { prefix: 'billing/withdrawal-policies', view: 'billing.feestructure:view', write: 'billing.feestructure:view', update: 'billing.feestructure:view' },
  { prefix: 'billing/invoices', view: 'billing.invoice:view', write: 'billing.invoice:create', update: 'billing.invoice:approve' },
  // InvoiceController base is `/invoices`
  { prefix: 'invoices', view: 'billing.invoice:view', write: 'billing.invoice:create', update: 'billing.invoice:approve' },

  // === Cashiering ===
  { prefix: 'cashiering/sessions', view: 'cashiering.session:view', write: 'cashiering.session:open', update: 'cashiering.session:open' },
  { prefix: 'cashiering/or', view: 'cashiering.receipt:view', write: 'cashiering.payment:create', update: 'cashiering.payment:create' },
  { prefix: 'cashiering/payments', view: 'cashiering.payment:view', write: 'cashiering.payment:create', update: 'cashiering.payment:create' },
  { prefix: 'cashiering/receipts', view: 'cashiering.receipt:view', write: 'cashiering.payment:create', update: 'cashiering.payment:create' },
  { prefix: 'cashiering/refunds', view: 'cashiering.receipt:view', write: 'cashiering.payment:create', update: 'cashiering.payment:create' },
  { prefix: 'cashiering/ad-hoc-sales', view: 'cashiering.adhoc:view', write: 'cashiering.payment:create', update: 'cashiering.payment:create' },
  { prefix: 'cashiering/stations', view: 'cashiering.session:view', write: 'cashiering.session:open', update: 'cashiering.session:open' },
  { prefix: 'cashiering/payment-methods', view: 'cashiering.session:view', write: 'cashiering.session:open', update: 'cashiering.session:open' },
  { prefix: 'cashiering/denomination-sets', view: 'cashiering.session:view', write: 'cashiering.session:open', update: 'cashiering.session:open' },
  { prefix: 'cashiering/reports', view: 'cashiering.report:view', write: 'cashiering.report:view', update: 'cashiering.report:view' },

  // === SIS ===
  { prefix: 'sis/students', view: 'sis.student:view', write: 'sis.student:create', update: 'sis.student:edit' },
  { prefix: 'sis/guardians', view: 'sis.guardian:view', write: 'sis.student:create', update: 'sis.student:edit' },
  { prefix: 'sis/enrollments', view: 'sis.enrollment:view', write: 'sis.enrollment:create', update: 'sis.enrollment:create' },
  { prefix: 'sis/sections', view: 'sis.section:view', write: 'sis.section:view', update: 'sis.section:view' },
  { prefix: 'sis/holds', view: 'sis.enrollment:view', write: 'sis.enrollment:create', update: 'sis.enrollment:create' },
  { prefix: 'sis/documents', view: 'document.request:view', write: 'document.request:view', update: 'document.request:approve' },
  { prefix: 'sis/incidents', view: 'sis.student:view', write: 'sis.student:edit', update: 'sis.student:edit' },
  { prefix: 'sis/health', view: 'sis.student:view', write: 'sis.student:edit', update: 'sis.student:edit' },
  { prefix: 'sis/transfers', view: 'sis.enrollment:view', write: 'sis.enrollment:create', update: 'sis.enrollment:create' },
  { prefix: 'sis/promotions', view: 'sis.enrollment:view', write: 'sis.enrollment:create', update: 'sis.enrollment:create' },
  { prefix: 'sis/merge-audit', view: 'sis.student:view', write: 'sis.student:edit', update: 'sis.student:edit' },

  // === Admissions ===
  { prefix: 'admissions', view: 'sis.applicant:view', write: 'sis.applicant:edit', update: 'sis.applicant:edit' },

  // === Facility ===
  { prefix: 'facility/buildings', view: 'facility.building:view', write: 'facility.building:create', update: 'facility.building:create' },
  { prefix: 'facility/floors', view: 'facility.floor:view', write: 'facility.floor:view', update: 'facility.floor:view' },
  { prefix: 'facility/rooms', view: 'facility.room:view', write: 'facility.room:create', update: 'facility.room:create' },
  { prefix: 'facility/room-assets', view: 'facility.room:view', write: 'facility.room:create', update: 'facility.room:create' },

  // === Scheduling ===
  { prefix: 'scheduling/offerings', view: 'scheduling.timetable:view', write: 'scheduling.timetable:view', update: 'scheduling.timetable:view' },
  { prefix: 'scheduling/faculty', view: 'scheduling.facultyload:view', write: 'scheduling.facultyload:view', update: 'scheduling.facultyload:view' },
  { prefix: 'scheduling/timetable', view: 'scheduling.timetable:view', write: 'scheduling.timetable:view', update: 'scheduling.timetable:view' },
  { prefix: 'scheduling/calendars', view: 'scheduling.timetable:view', write: 'scheduling.timetable:view', update: 'scheduling.timetable:view' },
  { prefix: 'scheduling/students', view: 'sis.student:view', write: 'sis.student:view', update: 'sis.student:view' },

  // === Attendance ===
  { prefix: 'attendance', view: 'attendance.record:view', write: 'attendance.record:edit', update: 'attendance.record:edit' },

  // === Grading (extended: gradebook, change requests, permanent records) ===
  { prefix: 'grading/class', view: 'grading.gradebook:view', write: 'grading.gradebook:edit', update: 'grading.gradebook:edit' },
  // Also a portal self-service route (guardian's child grades); the staff
  // permission here is what lets Faculty/admin bypass the ownership check.
  { prefix: 'grading/students', view: 'grading.gradebook:view', write: 'grading.gradebook:edit', update: 'grading.gradebook:edit' },
  { prefix: 'grading/entries', view: 'grading.gradebook:view', write: 'grading.gradebook:edit', update: 'grading.gradebook:edit' },
  { prefix: 'grading/change-requests', view: 'grading.gradebook:view', write: 'grading.gradebook:edit', update: 'grading.report_card:approve' },
  { prefix: 'grading/permanent-records', view: 'grading.report_card:view', write: 'grading.report_card:approve', update: 'grading.report_card:approve' },

  // === Communications ===
  { prefix: 'communications/templates', view: 'communications.template:view', write: 'communications.template:view', update: 'communications.template:view' },
  { prefix: 'communications/rules', view: 'communications.template:view', write: 'communications.announcement:create', update: 'communications.announcement:create' },
  { prefix: 'communications/channels', view: 'communications.template:view', write: 'communications.announcement:create', update: 'communications.announcement:create' },
  { prefix: 'communications/dispatch', view: 'communications.announcement:create', write: 'communications.announcement:create', update: 'communications.announcement:create' },
  { prefix: 'communications/logs', view: 'communications.message:view', write: 'communications.message:view', update: 'communications.message:view' },
  { prefix: 'communications/announcements', view: 'communications.announcement:view', write: 'communications.announcement:create', update: 'communications.announcement:create' },

  // === Documents ===
  { prefix: 'documents/templates', view: 'document.template:view', write: 'document.template:create', update: 'document.template:create' },
  { prefix: 'documents/requests', view: 'document.request:view', write: 'document.request:view', update: 'document.request:approve' },
  { prefix: 'documents/generate', view: 'document.request:view', write: 'document.request:approve', update: 'document.request:approve' },
  { prefix: 'documents/generated', view: 'document.request:view', write: 'document.request:approve', update: 'document.request:approve' },
  { prefix: 'documents/verify', view: 'document.request:view', write: 'document.request:view', update: 'document.request:view' },

  // === HR ===
  { prefix: 'hr', view: 'hr.employee:view', write: 'hr.employee:create', update: 'hr.employee:create' },

  // === Reporting ===
  { prefix: 'reporting', view: 'reporting.dashboard:view', write: 'reporting.export:export', update: 'reporting.export:export' },

  // === Config engine ===
  { prefix: 'config/lookup-lists', view: 'config.lookup:view', write: 'config.lookup:edit', update: 'config.lookup:edit' },
  { prefix: 'config/lookup-items', view: 'config.lookup:view', write: 'config.lookup:edit', update: 'config.lookup:edit' },
  { prefix: 'config/custom-fields', view: 'config.custom_field:view', write: 'config.custom_field:edit', update: 'config.custom_field:edit' },
  { prefix: 'config/numbering-schemes', view: 'config.lookup:view', write: 'config.lookup:edit', update: 'config.lookup:edit' },
  { prefix: 'config/feature-flags', view: 'config.lookup:view', write: 'config.lookup:edit', update: 'config.lookup:edit' },
  { prefix: 'config/workflows', view: 'config.lookup:view', write: 'config.lookup:edit', update: 'config.lookup:edit' },
  { prefix: 'config/workflow-instances', view: 'config.lookup:view', write: 'config.lookup:edit', update: 'config.lookup:edit' },
  { prefix: 'config/audit-events', view: 'config.audit_log:view', write: 'config.audit_log:export', update: 'config.audit_log:export' },
];

/** Strip the `/api/v1` global prefix. */
function normalizePath(rawPath: string): string {
  return rawPath
    .split('?')[0]
    .replace(/^\/api\/v\d+\//, '')
    .replace(/^\/+/, '');
}

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(prefix + '/');
}

function split(code: string): { resource: string; action: string } {
  const idx = code.lastIndexOf(':');
  return { resource: code.slice(0, idx), action: code.slice(idx + 1) };
}

/** True when `method`+`path` is an identity-scoped self-service route. */
export function isSelfServiceRoute(method: string, rawPath: string): boolean {
  const path = normalizePath(rawPath);
  const verb = (method || 'GET').toUpperCase();
  return SELF_SERVICE_RULES.some(
    (rule) => matchesPrefix(path, rule.prefix) && rule.methods.includes(verb),
  );
}

/**
 * Resolve the permission a request would require if its route were not
 * self-service. Used by `SelfServiceScopeGuard` so staff holding the route's
 * own permission keep full access, while everyone else is narrowed to their
 * own identity. Returns `null` for unmapped routes.
 */
export function resolveStaffPermission(
  method: string,
  rawPath: string,
): { resource: string; action: string } | null {
  const path = normalizePath(rawPath);
  const verb = (method || 'GET').toUpperCase();

  const rule = API_PERMISSION_MAP.find((r) => matchesPrefix(path, r.prefix));
  if (!rule) return null;

  if (verb === 'GET' || verb === 'HEAD') return split(rule.view);
  if (verb === 'POST') return split(rule.write);
  return split(rule.update);
}

/**
 * Resolve the permission required for an API request, or `null` when the
 * route is self-service / unmapped (caller falls back to auth-only).
 */
export function resolveApiPermission(
  method: string,
  rawPath: string,
): { resource: string; action: string } | null {
  // Self-service endpoints are identity-scoped, not permission-gated — the
  // ownership check happens in SelfServiceScopeGuard instead.
  if (isSelfServiceRoute(method, rawPath)) return null;
  return resolveStaffPermission(method, rawPath);
}
