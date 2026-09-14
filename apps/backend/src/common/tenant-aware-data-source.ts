import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ModuleRef } from '@nestjs/core';
import { getTenantIdFromContext, getPlatformAdminFromContext } from './tenant-context';

/**
 * Sets the Postgres GUC `app.current_tenant_id` and `app.is_platform_admin`
 * on every pooled pg client when running inside a tenant context (AsyncLocalStorage,
 * populated by TenantContextMiddleware), and resets them when the client is released
 * back to the pool. This makes the tenant_isolation_* RLS policies enforced.
 *
 * Platform admin bypass: when `app.is_platform_admin` is set to 'true', all
 * tenant_isolation_* policies allow access to all rows regardless of the
 * current_tenant_id GUC.
 *
 * How it works: the pg pool emits 'connect' once per physical client. We
 * wrap client.query; on each call, if an ALS tenant context exists and the
 * client's cached tenant differs, we issue `SELECT set_config(..., is_local
 * = false)` FIRST (awaited, sequential on the same client) so every
 * subsequent query in the request runs under the right tenant. On pool
 * 'release'/'remove' events we clear the GUCs so the next borrower starts
 * clean.
 */
@Injectable()
export class TenantAwareDataSource implements OnModuleInit {
  constructor(private moduleRef: ModuleRef) {}

  onModuleInit() {
    const ds = this.moduleRef.get(DataSource, { strict: false });
    const pool = (ds.driver as any)?.master as any;
    if (!pool || typeof pool.connect !== 'function' || typeof pool.on !== 'function') {
      return; // non-postgres driver (tests) — nothing to hook
    }

    pool.on('connect', (client: any) => {
      if (client.__tenantHooked) return;
      client.__tenantHooked = true;
      const origQuery = client.query.bind(client);
      // Serialize GUC management per client: pending SET promise chains
      // ahead of user queries so ordering is guaranteed.
      let pending: Promise<void> = Promise.resolve();

      client.query = (...args: any[]) => {
        const tenantId = getTenantIdFromContext();
        const isPlatformAdmin = getPlatformAdminFromContext();

        const run = () => {
          // Set tenant GUC
          if (tenantId && client.__currentTenant !== tenantId) {
            client.__currentTenant = tenantId;
            return origQuery(
              "SELECT set_config('app.current_tenant_id', $1, false)",
              [tenantId],
            ).then(() => setPlatformAdminGuc(client, origQuery, isPlatformAdmin).then(() => origQuery(...args)));
          }
          if (!tenantId) {
            // Request has no tenant context — clear any stale GUC so this
            // client can't leak the previous tenant's rows.
            if (client.__currentTenant) {
              client.__currentTenant = undefined;
              return origQuery("SELECT set_config('app.current_tenant_id', '', false)").then(() =>
                setPlatformAdminGuc(client, origQuery, isPlatformAdmin).then(() => origQuery(...args)),
              );
            }
          }
          // Still set platform admin GUC even if no tenant context (platform admin bypass)
          return setPlatformAdminGuc(client, origQuery, isPlatformAdmin).then(() => origQuery(...args));
        };

        const result = pending.then(run, run);
        // Keep the chain alive even if a query fails.
        pending = result.then(
          () => undefined,
          () => undefined,
        );
        return result;
      };
    });

    // Reset GUCs when a client goes back to the pool or is destroyed.
    pool.on('release', (client: any) => {
      if (!client) return; // pg-pool may emit release with undefined client
      if (client.__currentTenant) {
        client.__currentTenant = undefined;
        client.query("SELECT set_config('app.current_tenant_id', '', false)").catch(() => {});
      }
      client.query("SELECT set_config('app.is_platform_admin', '', false)").catch(() => {});
    });
    pool.on('remove', (client: any) => {
      if (!client) return;
      client.__currentTenant = undefined;
    });
  }
}

/**
 * Set or clear the `app.is_platform_admin` GUC on a client.
 * Must be awaited before any user query on the same client.
 */
async function setPlatformAdminGuc(
  client: any,
  origQuery: (query: string, params?: any[]) => Promise<any>,
  isPlatformAdmin: boolean | undefined,
): Promise<void> {
  const value = isPlatformAdmin ? 'true' : '';
  if (client.__platformAdmin !== isPlatformAdmin) {
    client.__platformAdmin = isPlatformAdmin;
    await origQuery("SELECT set_config('app.is_platform_admin', $1, false)", [value]);
  }
}
