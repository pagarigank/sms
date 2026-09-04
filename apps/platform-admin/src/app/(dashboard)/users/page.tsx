'use client';

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">Manage platform users and their roles</p>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <p className="text-muted-foreground">
          User management is tenant-scoped. Use the Tenant Admin portal to manage users within a specific tenant.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Platform admins can view and impersonate users across tenants for support purposes.
        </p>
      </div>
    </div>
  );
}
