/**
 * Route-to-Permission mapping
 * Maps frontend route paths to required backend permission codes
 * Used by the frontend to filter navigation items based on user permissions.
 *
 * IMPORTANT: every code below must exist in the seeded `permissions` catalog
 * (`apps/backend/src/migrations/001-phase1-rls-and-seed.sql` +
 * `004-phase1-fixes.sql`). A code that is not in the catalog can never be
 * granted to a role, so its route is hidden from *every* user.
 */

export interface RoutePermission {
  route: string;
  permission: string;
  children?: RoutePermission[];
}

export const ROUTE_PERMISSION_MAP: RoutePermission[] = [
  // Dashboard is intentionally ungated — every authenticated role gets it.
  // (It used to require `platform.dashboard:view`, which only the platform
  // roles hold, so tenant staff lost the Dashboard link.)

  // Facility
  { route: '/facility', permission: 'facility.building:view', children: [
    { route: '/facility/buildings', permission: 'facility.building:view' },
    { route: '/facility/floors', permission: 'facility.floor:view' },
    { route: '/facility/rooms', permission: 'facility.room:view' },
  ]},

  // Academic
  // Catalog codes: academic.curriculum / academic.subject / academic.school_year
  // (no academic.structure|gradelevel|track|program — those never existed, so
  // the whole section was unmatched before).
  { route: '/academic', permission: 'academic.curriculum:view', children: [
    { route: '/academic/school-years', permission: 'academic.school_year:view' },
    { route: '/academic/grade-levels', permission: 'academic.curriculum:view' },
    { route: '/academic/tracks', permission: 'academic.curriculum:view' },
    { route: '/academic/programs', permission: 'academic.curriculum:view' },
    { route: '/academic/subjects', permission: 'academic.subject:view' },
    { route: '/academic/curricula', permission: 'academic.curriculum:view' },
  ]},

  // SIS
  { route: '/sis', permission: 'sis.student:view', children: [
    { route: '/sis/students', permission: 'sis.student:view' },
    { route: '/sis/guardians', permission: 'sis.guardian:view' },
    { route: '/sis/enrollments', permission: 'sis.enrollment:view' },
    { route: '/sis/promotions', permission: 'sis.promotion:view' },
    { route: '/sis/sections', permission: 'sis.section:view' },
    // Catalog code is `sis.applicant` (not `sis.admission`).
    { route: '/sis/admissions', permission: 'sis.applicant:view' },
  ]},

  // Scheduling
  { route: '/scheduling', permission: 'scheduling.timetable:view', children: [
    { route: '/scheduling/timetable', permission: 'scheduling.timetable:view' },
    { route: '/scheduling/faculty-load', permission: 'scheduling.facultyload:view' },
    { route: '/scheduling/attendance', permission: 'attendance.record:view' },
  ]},

  // Gradebook
  { route: '/scheduling/gradebook', permission: 'grading.gradebook:view' },

  // Grading Config
  { route: '/grading', permission: 'grading.system:view', children: [
    { route: '/grading/systems', permission: 'grading.system:view' },
    { route: '/grading/components', permission: 'grading.component:view' },
    { route: '/grading/honor-roll', permission: 'grading.honorroll:view' },
  ]},

  // Billing
  // Catalog code is `billing.fee_type` (not `billing.feetype`).
  { route: '/billing', permission: 'billing.fee_type:view', children: [
    { route: '/billing/fee-types', permission: 'billing.fee_type:view' },
    { route: '/billing/fee-structures', permission: 'billing.feestructure:view' },
    { route: '/billing/discounts', permission: 'billing.discount:view' },
    { route: '/billing/invoices', permission: 'billing.invoice:view' },
  ]},

  // Cashiering
  { route: '/cashiering', permission: 'cashiering.session:view', children: [
    { route: '/cashiering/payment', permission: 'cashiering.payment:view' },
    { route: '/cashiering/ad-hoc', permission: 'cashiering.adhoc:view' },
    { route: '/cashiering/reports', permission: 'cashiering.report:view' },
  ]},

  // Departments
  { route: '/departments', permission: 'tenancy.department:view' },

  // Users & Roles (IAM)
  { route: '/iam', permission: 'iam.role:view' },

  // Communications
  { route: '/communications', permission: 'communications.announcement:view', children: [
    { route: '/communications#templates', permission: 'communications.template:view' },
    { route: '/communications#threads', permission: 'communications.message:view' },
  ]},

  // Documents
  { route: '/documents', permission: 'document.template:view' },

  // HR
  { route: '/hr', permission: 'hr.employee:view' },

  // Reports
  { route: '/reports', permission: 'reporting.dashboard:view', children: [
    { route: '/reports/sf-forms', permission: 'reporting.sf_forms:view', children: [
      { route: '/reports/sf-forms/sf1', permission: 'reporting.sf_forms:view' },
      { route: '/reports/sf-forms/sf2', permission: 'reporting.sf_forms:view' },
      { route: '/reports/sf-forms/sf9', permission: 'reporting.sf_forms:view' },
    ]},
  ]},

  // Settings
  { route: '/settings', permission: 'config.lookup:view' },
];

/**
 * Flatten the route permission map into a simple route → permission lookup
 */
export function getRoutePermission(route: string): string | null {
  for (const item of ROUTE_PERMISSION_MAP) {
    if (item.route === route) return item.permission;
    if (item.children) {
      for (const child of item.children) {
        if (child.route === route) return child.permission;
      }
    }
  }
  return null;
}

/**
 * Filter navigation items based on user permissions.
 *
 * A parent item is kept when the user can reach the parent itself OR any of
 * its children, so partial-permission roles keep the section instead of losing
 * it wholesale (e.g. a Branch Admin holds `academic.school_year:view` but not
 * `academic.curriculum:view` and should still see Academic → School Years).
 *
 * Uses a Set for O(1) permission checks so rapid auth/me re-fetches (including
 * cache hits that return new array references each time) don't churn the
 * sidebar's filter pass on every render cycle.
 */
export function filterNavigationByPermissions(
  navigation: any[],
  userPermissions: string[],
): any[] {
  const allowed = new Set(userPermissions);
  const isAllowed = (href: string): boolean => {
    const required = getRoutePermission(href);
    if (!required) return true; // No permission required
    return allowed.has(required);
  };

  return navigation
    .map((item) => {
      const children = Array.isArray(item.children)
        ? item.children.filter((child: any) => isAllowed(child.href))
        : undefined;
      const selfAllowed = isAllowed(item.href);

      if (!selfAllowed && !(children && children.length > 0)) return null;

      if (children) {
        return { ...item, children: children.length > 0 ? children : undefined };
      }
      return item;
    })
    .filter(Boolean);
}

/**
 * Check if user has a specific permission.
 */
export function hasPermission(userPermissions: string[], permission: string): boolean {
  return userPermissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions.
 */
export function hasAnyPermission(userPermissions: string[], permissions: string[]): boolean {
  return permissions.some((p) => userPermissions.includes(p));
}

/**
 * Check if user has all specified permissions.
 */
export function hasAllPermissions(userPermissions: string[], permissions: string[]): boolean {
  return permissions.every((p) => userPermissions.includes(p));
}

/**
 * Filter menu items based on user permissions.
 */
export function filterMenuByPermissions(
  menu: Array<{ name: string; href: string; permissions?: string[] }>,
  userPermissions: string[],
): Array<{ name: string; href: string }> {
  return menu.filter((item) => {
    if (!item.permissions || item.permissions.length === 0) return true;
    return item.permissions.some((p) => userPermissions.includes(p));
  });
}
