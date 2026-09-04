import { ROUTE_PERMISSION_MAP, filterNavigationByPermissions } from '@sms/api-client/src/route-permission-map';

export { ROUTE_PERMISSION_MAP, filterNavigationByPermissions };

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
