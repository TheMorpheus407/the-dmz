# Tenant Isolation Gate

This document describes the tenant-isolation integration test gate for M1 protected APIs.

## Overview

The tenant-isolation gate ensures that cross-tenant access is properly denied at the application layer. It verifies that authenticated users can only access resources within their own tenant boundary.

## Running the Gate

```bash
# Run only tenant-isolation tests
pnpm --filter api test:isolation

# Run via Turborepo (includes build dependencies)
pnpm run test:isolation
```

## Test Matrix

The gate includes 17 integration tests organized into 6 test suites:

| Suite                            | Tests | Purpose                                                 |
| -------------------------------- | ----- | ------------------------------------------------------- |
| Cross-tenant API denial matrix   | 4     | Verify Tenant A cannot access Tenant B resources        |
| Tenant-context spoof resistance  | 3     | Verify caller-supplied tenant identifiers are ignored   |
| Request-context isolation safety | 2     | Verify tenant context doesn't leak between requests     |
| Error/logging consistency        | 3     | Verify standardized error envelopes and structured logs |
| Tenant status gating             | 1     | Verify inactive tenant denial doesn't leak metadata     |
| Logout isolation                 | 1     | Verify session termination is tenant-scoped             |

### Test Categories

#### 1. Cross-Tenant API Denial Matrix

Tests that verify authenticated users from Tenant A cannot read or mutate Tenant B resources:

- **Profile access**: User from Tenant A requests `/api/v1/auth/me` with Tenant B's access token
- **Profile updates**: User from Tenant A attempts to update Tenant B user profile
- **Admin resources**: Tenant A admin cannot access Tenant B admin endpoints
- **Session refresh**: Refresh tokens from one tenant cannot obtain access for another

#### 2. Tenant-Context Spoof Resistance

Tests that verify protected routes do not trust caller-supplied tenant identifiers:

- **Header spoofing**: Request with forged `x-tenant-id` header is rejected
- **Query parameter spoofing**: Request with tenant in query string is ignored
- **Body payload spoofing**: Request with tenant in body is rejected

Authorization decisions derive tenant context from validated auth/session identity, NOT from caller-supplied values.

#### 3. Request-Context Isolation Safety

Tests that verify tenant context is request-scoped:

- **Concurrent requests**: Multiple simultaneous requests with different tenants don't interfere
- **Sequential requests**: Sequential requests with different tenants maintain isolation

#### 4. Error/Logging Consistency

Tests that verify cross-tenant denials use standardized error handling:

- **Error envelope format**: Responses use the standard `{ success: false, error: { code, message } }` format
- **HTTP status codes**: Cross-tenant denials return appropriate 403/404 status codes
- **Structured logging**: Logs include `requestId`, `tenantId`, and user context (per #42)

## Adding New Protected Endpoints

To add a new endpoint to the isolation gate:

### 1. Create Test in `tenant-isolation.test.ts`

```typescript
import { describe, expect, it } from 'vitest';

describe('tenant-isolation:new-endpoint', () => {
  it('should deny cross-tenant access to new-endpoint', async () => {
    // Use the dual-tenant fixture
    const fixture = await createDualTenantFixture(app);

    // Attempt cross-tenant access
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/new-endpoint',
      headers: {
        authorization: `Bearer ${fixture.tenantA.standardUser.tokens.accessToken}`,
        'x-tenant-id': fixture.tenantB.tenantId, // Different tenant
      },
    });

    // Verify denial
    expect(response.statusCode).toBe(403);
    const body = response.json();
    expect(body.success).toBe(false);
  });
});
```

### 2. Use the Dual Tenant Fixture

The `createDualTenantFixture()` helper creates isolated tenant pairs:

```typescript
import { createDualTenantFixture } from '../../../__tests__/helpers/factory.js';

const fixture = await createDualTenantFixture(app);

// Access patterns:
// fixture.tenantA.tenantId
// fixture.tenantA.standardUser (learner role)
// fixture.tenantA.adminUser (tenant_admin role)
// fixture.tenantA.standardUser.tokens.accessToken

// fixture.tenantB.* (same structure)
```

### 3. Test Tenant Spoofing

Always include tests that verify the endpoint ignores caller-supplied tenant identifiers:

```typescript
it('should ignore x-tenant-id header for authenticated requests', async () => {
  const fixture = await createDualTenantFixture(app);

  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/protected',
    headers: {
      authorization: `Bearer ${fixture.tenantA.standardUser.tokens.accessToken}`,
      'x-tenant-id': fixture.tenantB.tenantId, // Spoof attempt
    },
  });

  // Should either:
  // 1. Deny with 403 (strict - ignore header entirely)
  // 2. Deny with 403 (strict - deny spoof attempt explicitly)
  // Either way, MUST NOT return Tenant B's data
  expect(response.statusCode).toBe(403);
});
```

## Expected Deny Semantics

All cross-tenant denial responses MUST follow these conventions:

### HTTP Status Codes

| Scenario                     | Status Code     |
| ---------------------------- | --------------- |
| Cross-tenant resource access | 403 Forbidden   |
| Tenant not found             | 404 Not Found   |
| Tenant inactive/suspended    | 403 Forbidden   |
| Tenant context missing       | 400 Bad Request |

### Error Envelope Format

All responses MUST use the standard error envelope:

```typescript
{
  success: false,
  error: {
    code: string,      // e.g., 'TENANT_ACCESS_DENIED'
    message: string,   // Human-readable message
  }
}
```

### Error Codes

Defined in `packages/shared/src/constants/error-codes.ts`:

- `TENANT_NOT_FOUND`: Tenant does not exist
- `TENANT_SUSPENDED`: Tenant is suspended
- `TENANT_INACTIVE`: Tenant is inactive
- `TENANT_BLOCKED`: Tenant is blocked
- `TENANT_CONTEXT_MISSING`: No tenant context in request
- `TENANT_CONTEXT_INVALID`: Tenant context is invalid

### Structured Logging

Cross-tenant denial logs MUST include (per #42):

```typescript
{
  level: 'warn',
  requestId: string,
  tenantId: string | undefined,  // May be undefined for missing context
  userId: string | undefined,
  action: 'TENANT_ACCESS_DENIED',
  timestamp: string,
}
```

Logs MUST NOT include:

- Sensitive data from the denied tenant
- Cross-tenant correlation IDs
- Internal error details that could aid enumeration

## CI Integration

The tenant-isolation gate is wired into the Turborepo pipeline:

```json
// turbo.json
{
  "tasks": {
    "test:isolation": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    }
  }
}
```

Run in CI:

```bash
# Via pnpm filter
pnpm --filter api test:isolation

# Or via turbo (includes dependencies)
pnpm run test:isolation
```

The gate runs as part of the standard test suite and will fail fast on cross-tenant regressions.

## Test Fixtures

### DualTenantFixture Structure

```typescript
interface DualTenantFixture {
  tenantA: TestTenant;
  tenantB: TestTenant;
}

interface TestTenant {
  tenantId: string;
  standardUser: {
    userId: string;
    tokens: {
      accessToken: string;
      refreshToken: string;
      csrfToken: string;
    };
  };
  adminUser: {
    userId: string;
    tokens: {
      accessToken: string;
      refreshToken: string;
      csrfToken: string;
    };
  };
}
```

Each fixture uses unique UUIDs and timestamps to ensure CI-safe parallel execution.

## Dependencies

- **#37**: Local auth module with JWT sessions
- **#41**: Tenant context middleware
- **#47**: Pre-auth tenant resolution
- **#49**: Tenant lifecycle status gating
- **#50**: Tenant-scoped auth user profiles
- **#55**: Tenant schema v1 invariants
- **#64**: Shared access-policy matrix

## References

- `docs/DD/09_backend_architecture_api.md`: Request lifecycle, tenant context middleware
- `docs/DD/10_database_schema_data_model.md`: Tenant_id invariants
- `docs/DD/11_enterprise_multitenancy_admin.md`: Tenant isolation controls
- `packages-codes.ts`: Error code/shared/src/constants/errorpackages registry
- `/shared/src/auth/access-policy.ts`: Access policy definitions
