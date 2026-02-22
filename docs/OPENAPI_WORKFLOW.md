# OpenAPI Contract Workflow

This document describes the OpenAPI contract workflow for contributors.

## Overview

The DMZ API uses OpenAPI 3.1 for API documentation. A canonical OpenAPI spec is committed to version control at `apps/api/openapi/openapi.v1.json`. This ensures API contracts are stable and reviewable.

## Commands

### Generate OpenAPI Spec

```bash
# Generate the canonical OpenAPI artifact
pnpm openapi:generate
```

This command:

1. Builds the Fastify application
2. Generates the OpenAPI spec from route schemas
3. Writes sorted, deterministic JSON to `apps/api/openapi/openapi.v1.json`

### Check OpenAPI Contract

```bash
# Validate spec and detect drift
pnpm openapi:check
```

This command:

1. Generates the current OpenAPI spec
2. Compares against the canonical artifact
3. Validates M1 endpoint completeness
4. Checks security schemes
5. Validates error responses

## When to Regenerate

Regenerate the OpenAPI spec when you:

- Add a new endpoint
- Modify an existing endpoint's request/response schema
- Change authentication requirements
- Add or modify error responses

## CI Enforcement

The OpenAPI check is wired into the quality pipeline:

```
pnpm lint  -->  runs openapi:check
```

This means:

- All pull requests must pass `openapi:check` before merge
- Drift between generated and canonical specs will fail CI
- Missing M1 endpoints will fail CI

## Reviewing Contract Diffs

When reviewing changes that affect the OpenAPI spec:

1. **Check the diff**: Review changes to `openapi/openapi.v1.json` carefully
2. **Intentional vs unintentional**: Determine if changes are intentional (new feature) or unintentional (schema drift)
3. **Breaking changes**: If changes are intentional but breaking, update the version in `apps/api/src/config.ts`
4. **Regenerate if needed**: If the diff shows legitimate changes, run `pnpm openapi:generate` and commit the updated artifact

### Safe Review Practices

- Always run `pnpm openapi:check` locally before pushing
- Use `--diff` flag if available to see what changed
- Verify new endpoints are documented with proper security schemes
- Check that error responses are properly defined

## M1 Contract Requirements

The canonical spec must include:

### Auth Endpoints

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `DELETE /api/v1/auth/logout`
- `GET /api/v1/auth/me`

### Health Endpoints

- `GET /health`
- `GET /ready`
- `GET /api/v1/health/authenticated`

### Security Schemes

- `bearerAuth`
- `cookieAuth`
- `csrfToken`

### Error Codes

- `TENANT_INACTIVE`
- `VALIDATION_FAILED`
- `NOT_FOUND`
- `AUTH_FORBIDDEN`
- `AUTH_INSUFFICIENT_PERMS`
