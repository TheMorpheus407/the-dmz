# Access Policy Module

This module provides a centralized, typed access-policy contract that keeps frontend route-group behavior and backend authorization decisions aligned.

## Overview

The access policy system ensures that:

- Frontend route guards and backend authorization use the same policy rules
- Policy changes are centralized in one location
- Drift between frontend and backend is caught by tests

## Policy Matrices

### Route Group Policy Matrix

Location: `packages/shared/src/auth/access-policy.ts`

The `routeGroupPolicyMatrix` defines access rules for frontend route groups:

| Route Group | Actor Type    | Required Roles | Allowed Tenant Statuses | Redirect on Deny |
| ----------- | ------------- | -------------- | ----------------------- | ---------------- |
| `(public)`  | anonymous     | none           | none                    | -                |
| `(auth)`    | anonymous     | none           | none                    | `/game`          |
| `(game)`    | authenticated | none           | active                  | `/login`         |
| `(admin)`   | authenticated | admin roles    | active                  | `/game`          |

### API Endpoint Policy Matrix

Location: `packages/shared/src/auth/access-policy.ts`

The `apiEndpointPolicyMatrix` defines access rules for API endpoints:

| Endpoint                | Required Roles | Allowed Tenant Statuses |
| ----------------------- | -------------- | ----------------------- |
| `/api/v1/auth/me`       | -              | active                  |
| `/api/v1/auth/login`    | -              | -                       |
| `/api/v1/auth/logout`   | -              | -                       |
| `/api/v1/auth/refresh`  | -              | -                       |
| `/api/v1/auth/register` | -              | -                       |
| `/api/v1/profile`       | -              | active                  |
| `/api/v1/games`         | -              | active                  |
| `/api/v1/admin/games`   | admin          | active                  |
| `/api/v1/admin/tenants` | admin          | active                  |
| `/api/v1/admin/users`   | admin          | active                  |

## How to Add a New Route/Endpoint Policy

### Adding a New Route Group

1. Add the route group to the `RouteGroup` enum in `access-policy.ts`:

   ```typescript
   export const RouteGroup = {
     PUBLIC: '(public)',
     AUTH: '(auth)',
     GAME: '(game)',
     ADMIN: '(admin)',
     NEW_GROUP: '(new)', // Add new route group
   } as const;
   ```

2. Add the policy entry to `routeGroupPolicyMatrix`:

   ```typescript
   export const routeGroupPolicyMatrix: Record<RouteGroup, RouteGroupPolicy> = {
     // ... existing entries
     [RouteGroup.NEW_GROUP]: {
       actorType: ActorType.AUTHENTICATED,
       requiredRoles: [],
       allowedTenantStatuses: [AccessPolicyTenantStatus.ACTIVE],
       redirectOnDeny: '/login',
     },
   };
   ```

3. Wire up the frontend layout to use the policy:
   - Import `evaluateRouteGroupPolicy` and `RouteGroup` from `@the-dmz/shared/auth`
   - Call `evaluateRouteGroupPolicy(RouteGroup.NEW_GROUP, user)` in the layout's `load` function

4. Add corresponding tests in `access-policy.test.ts`

### Adding a New API Endpoint

1. Add the endpoint policy to `apiEndpointPolicyMatrix`:

   ```typescript
   export const apiEndpointPolicyMatrix: Record<string, ApiEndpointPolicy> = {
     // ... existing entries
     '/api/v1/new-endpoint': {
       scopes: [ApiScope.NEW_SCOPE],
       requiredRoles: [], // or adminRoles for admin endpoints
       allowedTenantStatuses: [AccessPolicyTenantStatus.ACTIVE],
     },
   };
   ```

2. Wire up the backend guard to use the policy:
   - Import `getApiPolicyForEndpoint` from `@the-dmz/shared/auth`
   - Call it in your authorization middleware

3. Add corresponding tests in `access-policy.test.ts`

### Adding a New Role

1. Add the role to the `Role` enum:

   ```typescript
   export const Role = {
     SUPER_ADMIN: 'super_admin',
     TENANT_ADMIN: 'tenant_admin',
     MANAGER: 'manager',
     TRAINER: 'trainer',
     LEARNER: 'learner',
     NEW_ROLE: 'new_role', // Add new role
   } as const;
   ```

2. Update the Zod schema:

   ```typescript
   export const roleSchema = z.enum([
     Role.SUPER_ADMIN,
     Role.TENANT_ADMIN,
     Role.MANAGER,
     Role.TRAINER,
     Role.LEARNER,
     Role.NEW_ROLE,
   ]);
   ```

3. Update `allRoles` array if the role should be included

## Required Tests

When making policy changes, the following tests must pass:

### Unit Tests (shared package)

```bash
pnpm --filter shared test
```

All tests in:

- `packages/shared/src/auth/access-policy.test.ts` - Policy evaluation logic
- `packages/shared/src/auth/policy-drift.test.ts` - Drift detection

### Integration Tests

```bash
pnpm --filter web test    # Frontend route guards
pnpm --filter api test    # Backend authorization
```

### Key Test Scenarios

1. **Policy Evaluation Tests** (`access-policy.test.ts`):
   - Anonymous users access public routes
   - Authenticated users access protected routes
   - Role-based access control
   - Tenant status gating

2. **Drift Detection Tests** (`policy-drift.test.ts`):
   - All route groups explicitly defined
   - All API endpoints explicitly defined
   - Frontend/backend tenant status alignment
   - Frontend/backend role requirements alignment

3. **Integration Tests**:
   - Frontend layouts use shared policy evaluation
   - Backend guards use shared policy constants
   - Error envelope consistency

## Export Usage

The policy module is exported via:

```typescript
// Main export
import { ... } from '@the-dmz/shared';

// Or direct auth subpath
import { ... } from '@the-dmz/shared/auth';
```

### Available Exports

- **Types**: `ActorType`, `Role`, `AccessPolicyTenantStatus`, `RouteGroup`, `ApiScope`
- **Schemas**: `roleSchema`, `tenantStatusSchema`, `routeGroupSchema`, `apiScopeSchema`
- **Constants**: `allRoles`, `adminRoles`, `allowedTenantStatuses`, `blockedTenantStatuses`
- **Matrices**: `routeGroupPolicyMatrix`, `apiEndpointPolicyMatrix`
- **Functions**:
  - `isRouteGroupProtected()`
  - `isApiEndpointProtected()`
  - `hasRequiredRole()`
  - `hasAllowedTenantStatus()`
  - `evaluateRouteGroupPolicy()`
  - `getApiPolicyForEndpoint()`

## Best Practices

1. **Never hardcode policy rules** in components or middleware - always use the shared policy matrices
2. **Always add tests** when adding new routes or endpoints
3. **Run drift detection tests** after any policy change to catch misalignments
4. **Keep matrices in sync** - if you add a route group, add corresponding API endpoint policies
5. **Use TypeScript** - the policy module provides strong typing to catch errors at compile time
