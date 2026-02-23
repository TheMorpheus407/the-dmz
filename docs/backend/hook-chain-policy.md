# Hook Chain Policy

This document describes the hook-chain contract for protected API routes and how to work with it.

## Overview

The hook-chain contract ensures that protected routes have consistent middleware behavior. It defines:

- Which lifecycle hooks are used in M1
- Required `preHandler` hooks and their order for protected routes
- Allowed hooks per route category
- Hook source boundaries (security-critical middleware must come from approved locations)

## Route Categories

| Category    | Description                                                        | Required Hooks                              |
| ----------- | ------------------------------------------------------------------ | ------------------------------------------- |
| `public`    | No authentication required (e.g., `/auth/login`, `/auth/register`) | None                                        |
| `auth`      | Authentication endpoints (e.g., `/auth/refresh`, `/auth/logout`)   | Varies                                      |
| `system`    | Health/readiness probes (e.g., `/health`, `/ready`)                | None                                        |
| `protected` | Authenticated user endpoints (e.g., `/auth/me`, `/auth/profile`)   | authGuard, tenantContext, tenantStatusGuard |
| `game`      | Game session endpoints (e.g., `/game/*`)                           | authGuard, tenantContext, tenantStatusGuard |
| `admin`     | Admin-only endpoints (e.g., `/auth/admin/*`)                       | authGuard, tenantContext, tenantStatusGuard |

## Canonical preHandler Order

For protected routes, the canonical hook order is:

```
1. authGuard          -- JWT verification (FIRST)
2. tenantContext      -- Set RLS tenant_id (SECOND)
3. tenantStatusGuard  -- Verify tenant is active (THIRD)
4. requirePermission  -- RBAC/ABAC evaluation (optional, LAST)
5. requireMfaForSuperAdmin -- MFA check for super admin actions (optional)
```

## Declaring Hook Chain Policy for New Routes

When adding a new protected route, ensure the `preHandler` array follows the canonical order:

```typescript
// ✅ Correct - follows canonical order
fastify.get('/protected-route', {
  preHandler: [authGuard, tenantContext, tenantStatusGuard],
  async handler(request, reply) {
    /* ... */
  },
});

// ❌ Incorrect - wrong order
fastify.get('/protected-route', {
  preHandler: [tenantContext, authGuard, tenantStatusGuard],
  async handler(request, reply) {
    /* ... */
  },
});

// ❌ Incorrect - missing required hooks
fastify.get('/protected-route', {
  preHandler: [authGuard],
  async handler(request, reply) {
    /* ... */
  },
});
```

## Requesting an Exception

If a route genuinely requires different middleware (e.g., `/auth/refresh` uses CSRF validation instead of the full auth chain), you can request an exception:

1. Edit `apps/api/src/shared/middleware/hook-chain-manifest.ts`
2. Add an entry to the `exceptions` array:

```typescript
exceptions: [
  // Existing exceptions...
  {
    route: '/your/new/route',
    reason: 'Explain why this route needs different middleware',
    grantedAt: new Date().toISOString().split('T')[0]!,
    expiresAt: '2026-03-31', // Optional: for temporary exceptions
  },
],
```

Exception requests should include:

- A valid business reason
- An expiry date for temporary exceptions
- A plan to migrate to standard behavior (if temporary)

## Running the Hook Chain Gate Locally

### Run validation only

```bash
pnpm --filter api lint:hook-chain
```

### Run full lint pipeline

```bash
pnpm lint
```

### Run individual test

```bash
pnpm --filter api test -- --run hook-chain
```

## Troubleshooting

### "Route X is missing required hook Y"

Add the missing hook to the route's `preHandler` array in the correct position.

### "Route X has hooks in wrong order"

Reorder the hooks to match the canonical order (authGuard → tenantContext → tenantStatusGuard).

### "Route X uses unapproved hook Y"

Ensure security-critical hooks come from approved sources:

- `authGuard`, `requirePermission`, `requireRole` → `shared/middleware/authorization.ts`
- `tenantContext` → `shared/middleware/tenant-context.ts`
- `tenantStatusGuard` → `shared/middleware/tenant-status-guard.ts`
- `requireMfaForSuperAdmin` → `shared/middleware/mfa-guard.ts`
- `validateCsrf` → `modules/auth/csrf.ts`
- `rateLimiter` → `shared/middleware/rate-limiter.ts`

## References

- [DD-09: Backend Architecture API](./DD/09_backend_architecture_api.md) - Section 2.4 Request Lifecycle Hooks
- [Hook Chain Manifest](./apps/api/src/shared/middleware/hook-chain-manifest.ts)
- [Validation Script](./apps/api/scripts/validate-hook-chain.ts)
