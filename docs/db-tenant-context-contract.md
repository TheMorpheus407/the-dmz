# DB Tenant Context Contract

This document describes the PostgreSQL tenant-session context lifecycle and isolation contract for M1 database operations.

## Overview

The DB tenant-context contract ensures fail-closed tenant isolation at the database session layer. It provides a canonical, machine-checkable contract that all tenant-scoped database operations must follow.

## Contract Definition

### Session Keys

The contract requires two PostgreSQL session variables to be set for tenant-scoped operations:

| Session Key             | Purpose                    | Required |
| ----------------------- | -------------------------- | -------- |
| `app.current_tenant_id` | Primary tenant identifier  | Yes      |
| `app.tenant_id`         | Compatibility key (legacy) | Yes      |

### Lifecycle Semantics

1. **Must be set before tenant-scoped DB access**: Context must be established before any `SELECT`, `INSERT`, `UPDATE`, or `DELETE` on tenant-scoped tables
2. **Must not survive beyond request scope**: Context is automatically cleared after each HTTP request completes
3. **Must not survive beyond transaction scope**: Context is cleared after each transaction, whether successful or failed

### Global Operations (Exceptions)

The following operations are allowed without tenant context:

| Operation                                    | Reason                             |
| -------------------------------------------- | ---------------------------------- |
| `SELECT * FROM public.tenants`               | Root tenant entity access          |
| `SELECT * FROM auth.permissions`             | System-wide permission definitions |
| `SELECT * FROM public.regulatory_frameworks` | Regulatory framework catalog       |
| `SELECT * FROM public.locales`               | Localization reference data        |

## Usage

### Using the Tenant Context Wrapper

```typescript
import { runWithTenantContext, requireTenantContext } from '../database/tenant-context/wrapper.js';
import { getDatabasePool } from '../database/connection.js';

async function getUser(db, userId, tenantId) {
  // Validate tenant context exists before DB operations
  requireTenantContext(tenantId, 'user lookup');

  return runWithTenantContext({ pool: getDatabasePool(), tenantId }, async ({ tenantId }) => {
    // DB operations here have tenant context set
    return db.query.users.findFirst({
      where: eq(users.userId, userId),
    });
  });
}
```

### Using Tenant-Scoped Connection

```typescript
import { createTenantScopedConnection } from '../database/tenant-context/pool.js';
import { getDatabasePool } from '../database/connection.js';

const pool = getDatabasePool();
const scoped = createTenantScopedConnection(pool, tenantId);

try {
  const result = await scoped.query(async () => {
    return db.query.users.findFirst({ where: ... });
  });
} finally {
  await scoped.reset();
}
```

## Lint Gate

Run the tenant-context lint gate:

```bash
# Run via pnpm
pnpm --filter api lint:db-tenant-context

# Run directly
cd apps/api && pnpm lint:db-tenant-context
```

The lint gate validates:

- No direct `SET LOCAL app.*` statements in code
- Tenant-scoped DB operations use the wrapper
- Import patterns are consistent

### Lint Violations

| Severity | Pattern                       | Message                                          |
| -------- | ----------------------------- | ------------------------------------------------ |
| Error    | `SET LOCAL app.*`             | Direct SET LOCAL for tenant context is forbidden |
| Error    | `pool.unsafe('SET LOCAL...')` | Raw SQL SET is forbidden                         |
| Warning  | DB ops without wrapper        | Tenant-scoped DB ops should use wrapper          |

## Tests

Run tenant-context isolation tests:

```bash
# Run tenant-context isolation tests
pnpm --filter api test --testNamePattern tenant-context
```

### Test Coverage

- **Parallel tenant traffic**: Verifies Tenant A/B requests don't bleed session context
- **Connection reuse**: Ensures pooled connections don't leak context
- **Error standardization**: Validates error responses include correlation IDs

## Error Handling

Tenant context errors include:

- `TENANT_CONTEXT_MISSING`: No tenant context set before DB access
- `TENANT_CONTEXT_INVALID`: Invalid tenant ID format
- Standardized error envelope with `requestId`, `code`, `message`

## Adding New Tenant-Scoped Repositories

1. Import the tenant-context wrapper
2. Use `runWithTenantContext` for operations
3. Or use `createTenantScopedConnection` for complex flows
4. Never use raw `SET LOCAL` statements
5. Run lint gate before committing

## Files

| File                                                                   | Purpose                    |
| ---------------------------------------------------------------------- | -------------------------- |
| `apps/api/src/shared/database/tenant-context/contract.ts`              | Contract definition        |
| `apps/api/src/shared/database/tenant-context/wrapper.ts`               | Context-safe wrapper       |
| `apps/api/src/shared/database/tenant-context/pool.ts`                  | Connection pool management |
| `apps/api/scripts/validate-db-tenant-context.ts`                       | Lint gate                  |
| `apps/api/src/modules/auth/__tests__/tenant-context-isolation.test.ts` | Integration tests          |

## Dependencies

- **#41**: Tenant-context middleware
- **#55**: Tenant-schema invariants
- **#70**: Cross-tenant isolation tests
