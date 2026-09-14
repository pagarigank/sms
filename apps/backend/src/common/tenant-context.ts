import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  tenantId: string;
  userId?: string;
  platformAdmin?: boolean;
}

const storage = new AsyncLocalStorage<TenantContext>();

export function runWithTenantContext<T>(ctx: TenantContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function getTenantContext(): TenantContext | undefined {
  return storage.getStore();
}

export function getTenantIdFromContext(): string | undefined {
  return storage.getStore()?.tenantId;
}

export function getPlatformAdminFromContext(): boolean | undefined {
  return storage.getStore()?.platformAdmin;
}
