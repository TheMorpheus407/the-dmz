import { clearTenantSessionContext, setTenantSessionContext } from './wrapper.js';

import type { DatabasePool } from '../connection.js';

export interface ConnectionResetConfig {
  onSuccess: boolean;
  onError: boolean;
  onAbort: boolean;
}

export const DEFAULT_RESET_CONFIG: ConnectionResetConfig = {
  onSuccess: true,
  onError: true,
  onAbort: true,
};

export const createTenantScopedConnection = (
  pool: DatabasePool,
  _tenantId: string,
  resetConfig: ConnectionResetConfig = DEFAULT_RESET_CONFIG,
): TenantScopedConnection => {
  let contextSet = false;
  let currentTenantId: string | null = null;

  return {
    async query<T>(queryFn: () => Promise<T>): Promise<T> {
      if (!contextSet) {
        throw new Error('Tenant context not set. Use setContext() first.');
      }

      try {
        const result = await queryFn();
        if (resetConfig.onSuccess) {
          await this.reset();
        }
        return result;
      } catch (error) {
        if (resetConfig.onError) {
          await this.reset();
        }
        throw error;
      }
    },

    async transaction<T>(txFn: () => Promise<T>): Promise<T> {
      if (!contextSet) {
        throw new Error('Tenant context not set. Use setContext() first.');
      }

      try {
        const result = await pool.begin(async (tx) => {
          await tx.unsafe(
            `SELECT set_config('app.current_tenant_id', $1, true), set_config('app.tenant_id', $1, true)`,
            [currentTenantId],
          );
          try {
            return await txFn();
          } finally {
            await tx.unsafe(`RESET app.current_tenant_id; RESET app.tenant_id;`);
          }
        });

        if (resetConfig.onSuccess) {
          await this.reset();
        }
        return result as T;
      } catch (error) {
        if (resetConfig.onError) {
          await this.reset();
        }
        throw error;
      }
    },

    async setContext(tenantId: string): Promise<void> {
      await setTenantSessionContext(pool, { tenantId });
      contextSet = true;
      currentTenantId = tenantId;
    },

    async reset(): Promise<void> {
      await clearTenantSessionContext(pool);
      contextSet = false;
      currentTenantId = null;
    },

    isContextSet(): boolean {
      return contextSet;
    },

    getCurrentTenantId(): string | null {
      return currentTenantId;
    },
  };
};

export interface TenantScopedConnection {
  query<T>(queryFn: () => Promise<T>): Promise<T>;
  transaction<T>(txFn: () => Promise<T>): Promise<T>;
  setContext(tenantId: string): Promise<void>;
  reset(): Promise<void>;
  isContextSet(): boolean;
  getCurrentTenantId(): string | null;
}

export const createConnectionResetGuard = (
  pool: DatabasePool,
): {
  guard: <T>(fn: () => Promise<T>) => Promise<T>;
  reset: () => Promise<void>;
} => {
  let inScope = false;

  return {
    async guard<T>(fn: () => Promise<T>): Promise<T> {
      if (inScope) {
        throw new Error('Nested tenant-scoped DB operations are not allowed');
      }

      inScope = true;
      try {
        return await fn();
      } finally {
        await clearTenantSessionContext(pool);
        inScope = false;
      }
    },

    async reset(): Promise<void> {
      if (inScope) {
        await clearTenantSessionContext(pool);
        inScope = false;
      }
    },
  };
};
