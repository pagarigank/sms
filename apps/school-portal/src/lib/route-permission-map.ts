/**
 * Route-to-Permission mapping
 * Maps frontend route paths to required backend permission codes
 * Used by the frontend to filter navigation items based on user permissions
 */

export interface RoutePermission {
  route: string;
  permission: string;
  children?: RoutePermission[];
}

export const ROUTE_PERMISSION_MAP: RoutePermission[] = [
  { route: '/dashboard', permission: 'platform.dashboard:view' },
  { route: '/facility', permission: 'facility.building:view', children: [
    { route: '/facility/buildings', permission: 'facility.building:view' },
    { route: '/facility/floors', permission: 'facility.floor:view' },
    { route: '/facility/rooms', permission: 'facility.room:view' },
  ]},
  { route: '/academic', permission: 'academic.structure:view', children: [
    { route: '/academic/school-years', permission: 'academic.schoolyear:view' },
    { route: '/academic/grade-levels', permission: 'academic.gradelevel:view' },
    { route: '/academic/tracks', permission: 'academic.track:view' },
    { route: '/academic/programs', permission: 'academic.program:view' },
    { route: '/academic/subjects', permission: 'academic.subject:view' },
    { route: '/academic/curricula', permission: 'academic.curriculum:view' },
  ]},
  { route: '/sis', permission: 'sis.student:view', children: [
    { route: '/sis/students', permission: 'sis.student:view' },
    { route: '/sis/guardians', permission: 'sis.guardian:view' },
    { route: '/sis/enrollments', permission: 'sis.enrollment:view' },
    { route: '/sis/sections', permission: 'sis.section:view' },
    { route: '/sis/admissions', permission: 'sis.admission:view' },
  ]},
  { route: '/scheduling', permission: 'scheduling.timetable:view', children: [
    { route: '/scheduling/timetable', permission: 'scheduling.timetable:view' },
    { route: '/scheduling/faculty-load', permission: 'scheduling.facultyload:view' },
    { route: '/scheduling/attendance', permission: 'attendance.record:view' },
  ]},
  { route: '/scheduling/gradebook', permission: 'grading.gradebook:view' },
  { route: '/grading', permission: 'grading.system:view', children: [
    { route: '/grading/systems', permission: 'grading.system:view' },
    { route: '/grading/components', permission: 'grading.component:view' },
    { route: '/grading/honor-roll', permission: 'grading.honorroll:view' },
  ]},
  { route: '/billing', permission: 'billing.feetype:view', children: [
    { route: '/billing/fee-types', permission: 'billing.feetype:view' },
    { route: '/billing/fee-structures', permission: 'billing.feestructure:view' },
    { route: '/billing/discounts', permission: 'billing.discount:view' },
    { route: '/billing/invoices', permission: 'billing.invoice:view' },
  ]},
  { route: '/cashiering', permission: 'cashiering.session:view', children: [
    { route: '/cashiering/payment', permission: 'cashiering.payment:view' },
    { route: '/cashiering/ad-hoc', permission: 'cashiering.adhoc:view' },
    { route: '/cashiering/reports', permission: 'cashiering.report:view' },
  ]},
  { route: '/departments', permission: 'tenancy.department:view' },
  { route: '/iam', permission: 'iam.role:view' },
  { route: '/communications', permission: 'communications.announcement:view', children: [
    { route: '/communications#templates', permission: 'communications.template:view' },
    { route: '/communications#threads', permission: 'communications.message:view' },
  ]},
  { route: '/documents', permission: 'document.template:view' },
  { route: '/hr', permission: 'hr.employee:view' },
  { route: '/reports', permission: 'reporting.dashboard:view' },
  { route: '/settings', permission: 'config.lookup:view' },
];

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

export function filterNavigationByPermissions(
  navigation: any[],
  userPermissions: string[],
): any[] {
  return navigation.filter((item) => {
    const required = getRoutePermission(item.href);
    if (!required) return true;
    return userPermissions.includes(required);
  }).map((item) => {
    if (item.children) {
      return {
        ...item,
        children: item.children.filter((child: any) => {
          const required = getRoutePermission(child.href);
          if (!required) return true;
          return userPermissions.includes(required);
        }),
      };
    }
    return item;
  });
}

export function hasPermission(userPermissions: string[], permission: string): boolean {
  return userPermissions.includes(permission);
}

export function hasAnyPermission(userPermissions: string[], permissions: string[]): boolean {
  return permissions.some((p) => userPermissions.includes(p));
}

export function hasAllPermissions(userPermissions: string[], permissions: string[]): boolean {
  return permissions.every((p) => userPermissions.includes(p));
}

export function filterMenuByPermissions(
  menu: Array<{ name: string; href: string; permissions?: string[] }>,
  userPermissions: string[],
): Array<{ name: string; href: string }> {
  return menu.filter((item) => {
    if (!item.permissions || item.permissions.length === 0) return true;
    return item.permissions.some((p) => userPermissions.includes(p));
  });
}
