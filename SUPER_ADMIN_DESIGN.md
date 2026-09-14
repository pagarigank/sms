# Super Admin / Multi-Tenant Access Design

## Problem

The `tenants` table (global registry of all schools) has the same RLS policy as tenant-scoped tables:
```sql
CREATE POLICY tenant_isolation_tenants ON tenants
  USING ((id)::text = current_setting('app.current_tenant_id'::text, true));
```

This means a Platform Super Admin logged in as user in Tenant A can only see Tenant A's row in the `tenants` table. They **cannot**:
- List all tenants (`GET /tenants` returns 0 results or 1 result)
- Create a new tenant (`POST /tenants` is blocked by RLS because the new row won't match the GUC)
- Manage any other tenant's data

The `ImpersonationService` exists and can generate tokens with a different `tenantId`, but there's no UI or controller flow that uses it for super-admin cross-tenant access.

The `PermissionsGuard` reads `user.tenantId` from the JWT and queries `user_roles` filtered by that tenant ID — so cross-tenant role/permission checks also fail for super admins.

## Design: Three-tier role model

### Tier 1: Platform Super Admin (cross-tenant)
- **Role:** `Platform Super Admin` (id: `b0000000-...`, `isSystem = true`, `tenantId = 000...000`)
- **Permissions:** `platform.*` namespace (e.g. `platform.tenant:view`, `platform.tenant:create`, `platform.tenant:manage`)
- **Data access:** Bypasses tenant RLS. Can see/manage all tenants.
- **How it works:**
  1. Add a `PlatformSuperAdminGuard` that runs BEFORE `TenantContextMiddleware`
  2. For users with `platform.*` permissions (or the system role), skip setting `app.current_tenant_id` — leave it empty so RLS policies that use `current_setting(..., true)` return NULL and the `USING` clause evaluates to false... wait, that would block everything.

Actually, the cleaner approach: **the `tenants` table should NOT be RLS-protected at all**, or should have a separate permissive policy for platform admins. Let me think about which tables are truly global vs tenant-scoped:

| Table | Scope | Current RLS | Correct RLS |
|-------|-------|-------------|-------------|
| `tenants` | **Global** (registry of all schools) | RLS (wrong) | No RLS, or permissive for platform admins |
| `tenant_plans` | **Global** (catalog) | No RLS (correct) | No RLS |
| `branches` | Tenant | RLS | RLS |
| `users` | Tenant | RLS | RLS (but super admin needs cross-tenant user lookup) |
| `roles` | Tenant | RLS | RLS |
| `user_roles` | Tenant | RLS | RLS |
| All business tables | Tenant | RLS | RLS |

### Tier 2: Tenant Admin (single tenant)
- **Role:** Tenant-specific admin role (e.g. "School Administrator")
- **Permissions:** `tenancy.*`, `academic.*`, `sis.*`, etc. scoped to their tenant
- **Data access:** RLS-enforced to their tenant only
- **Current behavior:** Works correctly

### Tier 3: Staff/Teacher/Guardian (limited)
- Roles with specific permissions within their tenant
- RLS-enforced

## Implementation Plan

### 1. Fix the `tenants` table RLS (global table, not tenant-scoped)

The `tenants` table is the **platform-level registry**. It should not have the `tenant_isolation_tenants` policy. Either:
- **Option A:** Disable RLS on `tenants` entirely (it's a small reference table)
- **Option B:** Add a permissive policy for platform admins + keep RLS for regular users

**Option A is simpler and correct** — the `tenants` table is meant to be readable by platform admins. Tenant admins don't need to query other tenants.

```sql
-- Drop the incorrect RLS policy on tenants
DROP POLICY IF EXISTS tenant_isolation_tenants ON tenants;
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
```

But wait — the `users` table also has RLS and is tenant-scoped. A super admin needs to see all users across tenants for support purposes. So we need a different approach for user management.

### 2. Platform Super Admin bypass for RLS

The cleanest approach that reuses existing infrastructure:

**In `TenantContextMiddleware`**, after determining the tenant ID from JWT/header/override, check if the user has a `platform.*` permission. If yes, set the GUC to empty string (clearing RLS context) so all rows are visible. If no, set it to the user's tenant ID (normal RLS enforcement).

But this requires the permissions check to happen BEFORE the middleware sets the GUC, and the JWT doesn't contain permissions — only `sub` and `tenantId`. The permissions are resolved from the DB in `PermissionsGuard` and `AuthService.getMe()`.

**Better approach: Add a `isPlatformAdmin` claim to the JWT**

In `AuthService.generateTokens()`, check if the user has the `Platform Super Admin` role (or any `platform.*` permission) and add `platformAdmin: true` to the JWT payload. Then in `TenantContextMiddleware`, if `req.user.platformAdmin === true`, skip setting the GUC.

But this creates a chicken-and-egg: the JWT is issued at login, and the role assignment could change later. The token would be stale until refresh.

**Pragmatic approach: Check at request time in the middleware**

The middleware already has access to the request. We can add a lightweight check: if the user's ID matches a known platform admin (or we check a small cache), skip RLS. But querying the DB in middleware for every request adds latency.

**Simplest correct approach: Dedicated bypass header + guard**

1. Add a `RequirePlatformAdmin` guard that checks if the user has the system role or `platform.*` permissions
2. Apply it to platform-level endpoints (`/tenants`, `/iam/*` for cross-tenant ops)
3. For these endpoints, the controller explicitly sets `req.tenantId` to `undefined` before the middleware runs, so the GUC is not set and RLS is bypassed (since `current_setting(..., true)` returns NULL, and policies with `USING (tenant_id = NULL)` evaluate to false — blocking access)

Hmm, that still blocks. We need the policies to allow NULL GUC for platform admins.

### 3. RLS policy redesign for platform admin bypass

Change all `tenant_isolation_*` policies to allow access when the GUC is empty AND the requesting user is a platform admin. But RLS policies can't see the JWT — they only see the GUC and the row data.

**The correct pattern:**

Use two GUCs:
- `app.current_tenant_id` — the tenant to filter by (normal requests)
- `app.is_platform_admin` — boolean, set when the user is a platform admin

Then policies become:
```sql
CREATE POLICY tenant_isolation_students ON students
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    OR current_setting('app.is_platform_admin', true)::boolean = true
  );
```

This way:
- Normal users: GUC = their tenant ID, `is_platform_admin` = unset → filtered to their tenant
- Platform admin: GUC = unset (or any value), `is_platform_admin` = true → sees all rows

### 4. JWT claim + middleware changes

**`AuthService.generateTokens()`** — add `platformAdmin` claim:
```typescript
const isPlatformAdmin = await this.hasPlatformAdminRole(user.id);
const payload = {
  sub: user.id,
  tenantId: user.tenantId,
  email: user.email,
  platformAdmin: isPlatformAdmin, // NEW
};
```

**`TenantContextMiddleware.use()`** — set both GUCs:
```typescript
if (tenantId && /^[0-9a-fA-F-]{36}$/.test(tenantId)) {
  (req as any).tenantId = tenantId;
  return runWithTenantContext({ tenantId }, () => next());
}
// If no tenant context, just continue — platform admins bypass RLS
next();
```

**`TenantAwareDataSource`** — set both GUCs:
```typescript
if (tenantId && client.__currentTenant !== tenantId) {
  client.__currentTenant = tenantId;
  await origQuery("SELECT set_config('app.current_tenant_id', $1, false)", [tenantId]);
}
if (isPlatformAdmin) {
  await origQuery("SELECT set_config('app.is_platform_admin', 'true', false)");
} else {
  await origQuery("SELECT set_config('app.is_platform_admin', '', false)");
}
```

### 5. Platform admin endpoints

The `TenantsController` should have:
- `GET /tenants` — list all tenants (platform admin only)
- `POST /tenants` — create a new tenant (platform admin only)
- `GET /tenants/:id` — view any tenant
- `PATCH /tenants/:id` — update any tenant
- `DELETE /tenants/:id` — delete a tenant
- `POST /tenants/:id/clone` — clone a tenant (copy structure to new tenant)

Each endpoint needs `@RequirePermission('platform', 'tenant')` + `@RequirePermission('platform', 'tenant:create')` etc., and the `PermissionsGuard` needs to be updated to not filter `user_roles` by `tenantId` when checking platform permissions.

### 6. `PermissionsGuard` fix for platform admin

Currently:
```typescript
const userRoles = await this.userRolesRepo.find({
  where: { userId: user.sub, tenantId }, // <-- filters by JWT tenantId
});
```

For platform admins, this should search across all tenants:
```typescript
const userRoles = await this.userRolesRepo.find({
  where: { userId: user.sub, ...(tenantId ? { tenantId } : {}) },
});
```

And the role lookup should include system roles (tenantId = `000...000`).

### 7. Frontend: Platform Admin Dashboard

Add a "Platform Admin" section to the sidebar (visible only when `platform.*` permissions exist):
- **Tenants** — list all schools, create new, suspend/activate, clone
- **Platform Users** — view all users across all tenants
- **System Roles** — manage platform-level roles and permissions

The tenant switcher (Tier 2 access) can be a dropdown in the topbar where a platform admin picks a tenant to "enter" — this uses the impersonation flow to set `req.tenantId` override and the GUC to that tenant.

## What exists today vs what's needed

| Capability | Exists | Notes |
|-----------|--------|-------|
| `tenants` table | ✅ | Global registry |
| `tenant_plans` table | ✅ | Catalog of subscription plans |
| `POST /tenants` endpoint | ✅ | Unguarded — relies on RLS (broken) |
| `GET /tenants` endpoint | ✅ | Unguarded — relies on RLS (broken) |
| `ImpersonationService` | ✅ | Can generate cross-tenant tokens |
| `ImpersonationController` endpoints | ✅ | `request`, `break-glass`, `token`, `end`, `active` |
| `platformAdmin` JWT claim | ❌ | Not implemented |
| `app.is_platform_admin` GUC | ❌ | Not implemented |
| RLS policies with platform admin bypass | ❌ | All use strict tenant_id match |
| `PermissionsGuard` cross-tenant role check | ❌ | Filters by JWT tenantId |
| Platform admin UI (tenants list, create) | ❌ | `/iam` page exists but is tenant-scoped |
| Tenant switcher UI | ❌ | Not built |

## Recommended next steps

1. **Fix RLS policies** — add `OR current_setting('app.is_platform_admin', true)::boolean` to all `tenant_isolation_*` policies
2. **Add `platformAdmin` JWT claim** in `AuthService.generateTokens()`
3. **Update `TenantAwareDataSource`** to set `app.is_platform_admin` GUC
4. **Update `TenantContextMiddleware`** to handle platform admin bypass
5. **Update `PermissionsGuard`** to search system roles + cross-tenant roles for platform admins
6. **Add `RequirePermission` guards** to `TenantsController` endpoints
7. **Build Platform Admin UI** — tenants list + create tenant form
8. **Build tenant switcher** in topbar for platform admins to enter a specific tenant context
