/**
 * Route-to-permission map.
 * Each route requires specific permissions to be visible in navigation.
 */
export const ROUTE_PERMISSION_MAP: Record<string, { permissions: string[]; label: string; icon?: string }> = {
  // Dashboard
  '/dashboard': { permissions: [], label: 'Dashboard', icon: 'LayoutDashboard' },

  // Tenancy (Platform Admin)
  '/tenants': { permissions: ['tenancy.tenant:view'], label: 'Tenants', icon: 'Building2' },
  '/tenants/[id]/branding': { permissions: ['tenancy.tenant:edit'], label: 'Tenant Branding' },

  // Facility
  '/facility/buildings': { permissions: ['facility.building:view'], label: 'Buildings', icon: 'Building' },
  '/facility/floors': { permissions: ['facility.building:view'], label: 'Floors' },
  '/facility/rooms': { permissions: ['facility.room:view'], label: 'Rooms', icon: 'DoorOpen' },

  // Academic
  '/academic/school-years': { permissions: ['academic.school_year:view'], label: 'School Years', icon: 'Calendar' },
  '/academic/grade-levels': { permissions: ['academic.school_year:view'], label: 'Grade Levels' },
  '/academic/tracks': { permissions: ['academic.subject:view'], label: 'Tracks & Strands' },
  '/academic/programs': { permissions: ['academic.subject:view'], label: 'Programs' },
  '/academic/subjects': { permissions: ['academic.subject:view'], label: 'Subjects', icon: 'BookOpen' },
  '/academic/curricula': { permissions: ['academic.curriculum:view'], label: 'Curricula', icon: 'GraduationCap' },

  // Grading
  '/grading/systems': { permissions: ['grading.system:view'], label: 'Grading Systems' },
  '/grading/components': { permissions: ['grading.system:view'], label: 'Grade Components' },
  '/grading/honor-roll': { permissions: ['grading.system:view'], label: 'Honor Roll' },

  // IAM
  '/iam': { permissions: ['iam.role:view'], label: 'Roles & Permissions', icon: 'Shield' },
  '/iam/roles': { permissions: ['iam.role:view'], label: 'Role Builder' },

  // Departments
  '/departments': { permissions: ['tenancy.department:view'], label: 'Departments', icon: 'School' },

  // Reports
  '/reports': { permissions: [], label: 'Reports', icon: 'BarChart3' },

  // Settings
  '/settings': { permissions: [], label: 'Settings', icon: 'Settings' },
};

/**
 * Filter navigation items based on user permissions.
 */
export function filterNavigationByPermissions(
  navigation: Array<{ name: string; href: string; children?: Array<{ name: string; href: string }> }>,
  userPermissions: string[],
): Array<{ name: string; href: string; children?: Array<{ name: string; href: string }> }> {
  return navigation
    .map((item) => {
      const routeConfig = ROUTE_PERMISSION_MAP[item.href];
      const hasAccess = !routeConfig || routeConfig.permissions.length === 0 ||
        routeConfig.permissions.some((p) => userPermissions.includes(p));

      if (!hasAccess) return null;

      if (item.children) {
        const filteredChildren = item.children.filter((child) => {
          const childConfig = ROUTE_PERMISSION_MAP[child.href];
          return !childConfig || childConfig.permissions.length === 0 ||
            childConfig.permissions.some((p) => userPermissions.includes(p));
        });
        return { ...item, children: filteredChildren.length > 0 ? filteredChildren : undefined };
      }

      return item;
    })
    .filter(Boolean) as any;
}
