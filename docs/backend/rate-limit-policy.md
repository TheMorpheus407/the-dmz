# Rate-Limit Policy

This document describes the rate-limit policy contract for M1 foundation APIs and how contributors should work with it.

## Overview

The rate-limit policy ensures consistent rate-limiting behavior across all API endpoints by providing a canonical source of truth for:

- Endpoint categories and bucket strategies
- Rate limit thresholds per endpoint
- Exempt routes
- Header contract expectations
- Error envelope contracts

## Policy Artifact Location

The canonical rate-limit policy lives in:

```
packages/shared/src/contracts/rate-limit-policy.ts
```

This file exports:

- `m1RateLimitPolicyManifest` - The typed policy manifest
- `RateLimitCategory` - Category enums (AUTH, PROTECTED_WRITE, PROTECTED_READ, etc.)
- Schemas for validation (Zod)
- Header and error contract constants

## Categories

| Default Bucket Key Category | Description                                         |        |
| --------------------------- | --------------------------------------------------- | ------ |
| `auth`                      | Authentication endpoints (login, register, refresh) | IP     |
| `protected-write`           | Protected write operations                          | Tenant |
| `protected-read`            | Protected read operations                           | Tenant |
| `public-read`               | Public read-only endpoints                          | IP     |
| `infra-probe`               | Health/readiness probes                             | IP     |

## Registering a New Endpoint

### Step 1: Determine the Category

Choose the appropriate category based on the endpoint type:

- Auth endpoints → `RateLimitCategory.AUTH`
- Protected reads → `RateLimitCategory.PROTECTED_READ`
- Protected writes → `RateLimitCategory.PROTECTED_WRITE`
- Public APIs → `RateLimitCategory.PUBLIC_READ`
- Health probes → `RateLimitCategory.INFRA_PROBE`

### Step 2: Update the Policy

Add an entry to the `routes` array in `m1RateLimitPolicyManifest`:

```typescript
{
  route: '/api/v1/auth/my-new-endpoint',
  method: 'POST',
  category: RateLimitCategory.PROTECTED_WRITE,
  max: 20,           // requests per window
  windowMs: 60_000, // window in milliseconds
  exempt: false,
  bucketKey: 'tenant',
  rationale: 'Reason for this policy choice',
}
```

### Step 3: Apply Rate Limiting in Routes

In your route definition, configure the rate limit:

```typescript
fastify.post(
  '/my-new-endpoint',
  {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute',
      },
    },
    // ... other options
  },
  async (request, reply) => {
    // handler
  },
);
```

### Step 4: Exempt Routes

If an endpoint should not be rate-limited, add it to `exemptRoutes` in the policy:

```typescript
{
  path: '/api/v1/my-exempt-endpoint',
  rationale: 'Reason why this route is exempt',
}
```

Then disable rate-limiting in the route:

```typescript
config: {
  rateLimit: false,
},
```

## Running Contract Checks

### Validate Policy Against Routes

```bash
pnpm --filter api rate-limit-contract:check
```

This script:

- Discovers all routes from module files
- Validates each route against the policy
- Reports misclassified routes, missing exemptions, and unauthorized overrides

### Run Contract Integration Tests

```bash
pnpm --filter api test:rate-limit-contract
```

This runs the rate-limit contract test suite covering:

- Header contract (required headers on responses)
- 429 error contract (error envelope structure)
- Exempt route behavior
- Auth endpoint rate limiting
- Tenant/IP isolation

### Run All Quality Gates

```bash
pnpm --filter api lint
pnpm --filter api test
pnpm --filter api typecheck
```

## Troubleshooting

### Policy Violation: Unclassified Route

```
❌ Route '/api/v1/new-route' (GET) is missing from rate-limit policy
```

**Fix**: Add the route to `m1RateLimitPolicyManifest.routes`

### Policy Violation: Misclassified Route

```
❌ Route '/api/v1/auth/login' has rate limit max=5 but policy expects 10
```

**Fix**: Either update the policy to match the route config, or update the route to match the policy

### Policy Violation: Missing Exempt

```
❌ Route '/health' is marked rate-limit exempt but is not in the policy exempt list
```

**Fix**: Add the route to `m1RateLimitPolicyManifest.exemptRoutes`

### Test Failures

If contract tests fail:

1. Check that rate-limit headers are being emitted
2. Verify 429 responses include `Retry-After` header
3. Ensure error envelope has `retryAfterSeconds` in details

## Header Contract

### Required on All Rate-Limited Responses

- `X-RateLimit-Limit`: Maximum requests allowed in window
- `X-RateLimit-Remaining`: Requests remaining in current window

### Required on 429 Responses

- `Retry-After`: Seconds to wait before retrying
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`: Unix timestamp when window resets

### Optional

- `X-RateLimit-Reset`: Already required on 429

## Error Contract

429 responses must include:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Retry later.",
    "details": {
      "retryAfterSeconds": 60
    },
    "requestId": "uuid-string"
  }
}
```

## Dependencies

This policy depends on:

- Issue #33: Rate limiting middleware
- Issue #37, #53: Related foundation work

Related issues:

- #61, #69, #74, #78, #91, #92: M1 features
