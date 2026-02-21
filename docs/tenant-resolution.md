# Pre-Auth Tenant Resolution

This document describes how tenant context is resolved for unauthenticated auth flows (`/auth/register`, `/auth/login`) before JWT tokens are issued.

## Overview

The pre-auth tenant resolver enables tenant-scoped authentication by resolving the tenant context before authentication occurs. This ensures that user registration and login are bound to the correct tenant from the first request.

## Resolution Order

Tenant resolution follows this priority order:

1. **X-Tenant-ID Header** — API/test usage with explicit tenant identification
2. **Host/Subdomain** — Web usage with subdomain-based tenant mapping
3. **Fallback** — Development-only deterministic fallback (opt-in)

## Request Headers

| Header        | Required | Description                                                            |
| ------------- | -------- | ---------------------------------------------------------------------- |
| `X-Tenant-ID` | No\*     | Tenant identifier (UUID or slug). Required unless fallback is enabled. |

\*When `TENANT_RESOLVER_ENABLED=false` (production default), tenant resolution is skipped and auth flows work without tenant context.

### X-Tenant-ID Header

The header can contain either:

- **UUID**: `X-Tenant-ID: 550e8400-e29b-41d4-a716-446655440000`
- **Slug**: `X-Tenant-ID: acme-corp`

When a UUID is provided, the resolver validates it against the database and returns the canonical tenant record. When a slug is provided, the resolver looks up the tenant by slug.

## Subdomain Resolution

For web-based multi-tenancy, the resolver extracts the subdomain from the request host:

```
Host: acme-corp.the-dmz.example.com
  -> Tenant slug: acme-corp
```

Local hosts (`localhost`, `127.0.0.1`, `::1`) are excluded from subdomain resolution.

## Configuration

The following environment variables control tenant resolution behavior:

| Variable                  | Default                           | Description                                  |
| ------------------------- | --------------------------------- | -------------------------------------------- |
| `TENANT_HEADER_NAME`      | `x-tenant-id`                     | Header name for tenant identification        |
| `TENANT_FALLBACK_ENABLED` | `true` (dev/test), `false` (prod) | Enable fallback tenant for local development |
| `TENANT_FALLBACK_SLUG`    | `default`                         | Slug of fallback tenant                      |
| `TENANT_RESOLVER_ENABLED` | `false`                           | Enable/disable pre-auth tenant resolution    |

### Production Safety

- `TENANT_RESOLVER_ENABLED` defaults to `false` in production
- `TENANT_FALLBACK_ENABLED` defaults to `false` in production
- No implicit unsafe fallbacks in production environments

## Error Responses

When tenant resolution fails, the API returns a standardized error envelope:

### Missing Tenant Context (401)

```json
{
  "error": {
    "code": "TENANT_CONTEXT_MISSING",
    "message": "Tenant context is required. Provide X-Tenant-ID header or configure fallback.",
    "details": {
      "availableSources": ["X-Tenant-ID header", "subdomain"],
      "fallbackEnabled": false
    },
    "correlationId": "req-abc123"
  }
}
```

### Tenant Not Found (404)

```json
{
  "error": {
    "code": "TENANT_NOT_FOUND",
    "message": "Tenant with ID 550e8400-e29b-41d4-a716-446655440000 not found",
    "details": {
      "tenantId": "550e8400-e29b-41d4-a716-446655440000"
    },
    "correlationId": "req-abc123"
  }
}
```

## Auth Endpoint Integration

The pre-auth tenant resolver is applied to the following endpoints:

### POST /api/v1/auth/register

Creates a new user within the resolved tenant context.

**Request:**

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{"email": "user@example.com", "password": "securepass123"}'
```

**Response:**

```json
{
  "user": {
    "userId": "...",
    "email": "user@example.com",
    "tenantId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "tokens": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

The JWT access token includes a `tenant_id` claim matching the resolved tenant.

### POST /api/v1/auth/login

Authenticates a user within the resolved tenant context.

**Request:**

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: acme-corp" \
  -d '{"email": "user@example.com", "password": "securepass123"}'
```

**Response:**

```json
{
  "user": {
    "userId": "...",
    "email": "user@example.com",
    "tenantId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "tokens": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

## Error Codes

| Code                     | HTTP Status | Description                                       |
| ------------------------ | ----------- | ------------------------------------------------- |
| `TENANT_CONTEXT_MISSING` | 401         | No tenant context available and fallback disabled |
| `TENANT_NOT_FOUND`       | 404         | Specified tenant does not exist                   |

## Testing

Run tenant resolution tests:

```bash
pnpm --filter api test -- --grep "tenant"
```

Tests cover:

- Register/login success with explicit tenant header
- Host/subdomain-based tenant resolution
- Failure on missing/invalid tenant when fallback disabled
- Development fallback path resolves deterministic tenant
- JWT `tenant_id` claim matches resolved tenant

## Related Documents

- [Auth Lifecycle Events](./auth-events.md) — Auth module domain events
- [DD-09: Backend Architecture API](./DD/09_backend_architecture_api.md) — Tenant-context lifecycle
- [DD-10: Database Schema Data Model](./DD/10_database_schema_data_model.md) — Tenant data model
- [BRD-05: Enterprise Admin](./BRD/05_enterprise_admin.md) — Tenant resolution precedence
