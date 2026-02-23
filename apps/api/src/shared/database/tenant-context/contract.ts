export const TENANT_CONTEXT_SESSION_KEYS = ['app.current_tenant_id', 'app.tenant_id'] as const;

export type TenantSessionKey = (typeof TENANT_CONTEXT_SESSION_KEYS)[number];

export interface TenantSessionContextContract {
  sessionKeys: readonly string[];
  lifecycle: {
    mustBeSetBeforeTenantScopedDbAccess: boolean;
    mustNotSurviveBeyondRequestScope: boolean;
    mustNotSurviveBeyondTransactionScope: boolean;
  };
  globalOperations: readonly string[];
  exceptions: readonly {
    operation: string;
    reason: string;
  }[];
}

export const TENANT_CONTEXT_CONTRACT: TenantSessionContextContract = {
  sessionKeys: TENANT_CONTEXT_SESSION_KEYS,
  lifecycle: {
    mustBeSetBeforeTenantScopedDbAccess: true,
    mustNotSurviveBeyondRequestScope: true,
    mustNotSurviveBeyondTransactionScope: true,
  },
  globalOperations: [
    'SELECT * FROM public.tenants',
    'SELECT * FROM auth.permissions',
    'SELECT * FROM public.regulatory_frameworks',
    'SELECT * FROM public.locales',
  ],
  exceptions: [
    {
      operation: 'Migration scripts',
      reason: 'Migrations run outside request context and require schema access',
    },
    {
      operation: 'Health checks',
      reason: 'Health checks may need to verify database connectivity without tenant context',
    },
    {
      operation: 'Initial tenant provisioning',
      reason: 'Creating the first tenant requires system-level access',
    },
  ],
} as const;

export type TenantContextState = {
  isSet: boolean;
  tenantId: string | null;
  userId: string | null;
  setAt: Date | null;
  source: 'middleware' | 'wrapper' | 'raw';
};

export const GLOBAL_OPERATIONS_ALLOWLIST = TENANT_CONTEXT_CONTRACT.globalOperations;

export function isGlobalOperation(sql: string): boolean {
  const normalizedSql = sql.toLowerCase().trim();
  return GLOBAL_OPERATIONS_ALLOWLIST.some((op) => normalizedSql.startsWith(op.toLowerCase()));
}
