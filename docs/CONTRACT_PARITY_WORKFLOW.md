# Contract Parity Gate Workflow

This document describes the cross-workspace contract parity workflow for M1 foundation APIs.

## Overview

The DMZ monorepo enforces contract integrity between three layers:

1. **Backend OpenAPI** (`apps/api/openapi/`) - Generated from Fastify routes
2. **Shared Schemas** (`packages/shared/src/schemas/`) - Zod schemas as single source of truth
3. **Frontend API Client** (`apps/web/src/lib/api/`) - Typed client consuming the API

## The Contract Parity Gate

The contract parity check ensures that frontend-consumed API contracts remain aligned with backend schema-first APIs. It prevents silent drift between:

- OpenAPI definitions vs frontend expectations
- Shared schemas vs frontend usage
- Auth requirements vs actual endpoint protection

## Commands

### Run Contract Parity Check

```bash
# Run the full parity check
pnpm contract:parity
```

This command:

1. Validates OpenAPI spec exists
2. Checks all M1 endpoints are present in OpenAPI with correct methods
3. Validates auth requirements match between manifest and OpenAPI
4. Verifies frontend client uses all M1 endpoints
5. Ensures frontend uses shared schemas (not ad-hoc duplicates)

### Run Individual Checks

```bash
# Generate OpenAPI spec
pnpm openapi:generate

# Check OpenAPI vs canonical
pnpm openapi:check
```

## M1 Contract Manifest

The canonical list of M1 endpoints consumed by the frontend is defined in:

```
packages/shared/src/contracts/manifest.ts
```

This manifest is the single source of truth for:

- Endpoint paths
- HTTP methods
- Auth requirements (protected vs public)
- Response schema references

### Tracked M1 Endpoints

| Path                           | Method | Auth Required |
| ------------------------------ | ------ | ------------- |
| `/api/v1/auth/register`        | POST   | No            |
| `/api/v1/auth/login`           | POST   | No            |
| `/api/v1/auth/refresh`         | POST   | No            |
| `/api/v1/auth/logout`          | DELETE | Yes           |
| `/api/v1/auth/me`              | GET    | Yes           |
| `/api/v1/auth/profile`         | PATCH  | Yes           |
| `/api/v1/health/authenticated` | GET    | Yes           |
| `/health`                      | GET    | No            |
| `/ready`                       | GET    | No            |

## Updating M1 API Contracts

When you need to change an M1 API contract, follow this deliberate update path:

### 1. Update OpenAPI (Backend)

Modify the route schema in `apps/api/src/modules/` and regenerate:

```bash
pnpm openapi:generate
```

### 2. Update Shared Schema

If the response schema changed, update the corresponding schema in `packages/shared/src/schemas/`:

- Auth schemas: `packages/shared/src/schemas/auth.schema.ts`
- API envelope: `packages/shared/src/schemas/api-envelope.schema.ts`

### 3. Update Manifest (if needed)

If you added or removed an M1 endpoint, update `packages/shared/src/contracts/manifest.ts`:

```typescript
export const m1ApiContractManifest = {
  version: '1.0.0',
  endpoints: [
    // Add or remove endpoints here
  ],
} as const;
```

### 4. Update Frontend Client

Update the frontend API client in `apps/web/src/lib/api/` to use the new/changed schemas from `@the-dmz/shared/schemas`.

### 5. Run Parity Check

```bash
pnpm contract:parity
```

This ensures all three layers are aligned.

## CI Enforcement

The contract parity check is wired into the quality pipeline:

```
pnpm lint  -->  runs contract:parity
pnpm typecheck
```

This means:

- All pull requests must pass `contract:parity` before merge
- Drift between OpenAPI, shared schemas, and frontend will fail CI
- Missing endpoints or auth mismatches will fail CI

## Tests

Contract parity tests are located at:

- `packages/shared/src/contracts/manifest.test.ts` - Manifest structure and validation
- `apps/api/src/modules/__tests__/contract-parity.test.ts` - Cross-workspace parity

Run tests:

```bash
# Run all tests
pnpm test

# Run contract-specific tests
pnpm --filter @the-dmz/shared test
pnpm --filter @the-dmz/api test
```

## Troubleshooting

### "M1 endpoint missing in OpenAPI"

The endpoint defined in the manifest doesn't exist in the generated OpenAPI spec. Check:

- Route exists in `apps/api/src/modules/`
- Route is registered in the app

### "Auth requirement mismatch"

The auth requirement in the manifest doesn't match the OpenAPI spec. Check:

- Add `security` array to protected routes
- Remove `security` from public routes

### "Frontend client missing endpoint"

The frontend API client doesn't reference this endpoint. Add the endpoint to:

- `apps/web/src/lib/api/auth.ts` for auth endpoints
- Create new module if needed

### "Frontend file may have ad-hoc schema"

The frontend has inline Zod schemas that should use `@the-dmz/shared/schemas`. Replace with:

```typescript
import { loginResponseSchema } from '@the-dmz/shared/schemas';
```
