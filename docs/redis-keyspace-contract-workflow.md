# Redis Keyspace Contract Workflow

This document describes how to work with Redis keys in the DMZ project, ensuring tenant-aware isolation and consistent key patterns.

## Overview

All Redis keys must follow a canonical format and be tenant-scoped to prevent cross-tenant data leakage. The keyspace contract is enforced via automated linting.

## Key Format

```
{env}:{app}:{module}:{category}:{tenant_id}:{resource}
```

Example: `prod:dmz:api:rate-limit:550e8400-e29b-41d4-a716-446655440000:192.168.1.1`

## Running the Gate

```bash
# Run Redis keyspace lint
pnpm --filter api lint:redis-keyspace

# Run full API lint (includes keyspace)
pnpm --filter api lint
```

On violations, the command exits with code 1 and reports the file, line, and violation details.

## Key Categories

| Category     | Default TTL | Use Case                |
| ------------ | ----------- | ----------------------- |
| `rate-limit` | 60s         | API rate limiting       |
| `session`    | 3600s       | User session caching    |
| `cache`      | 300s        | General-purpose caching |
| `queue`      | 86400s      | Job queues              |
| `streams`    | 3600s       | Event streams           |

## Declaring New Key Categories

### Step 1: Add to Key Manifest

Edit `apps/api/src/shared/cache/redis-key-manifest.ts`:

```typescript
export const KEY_CATEGORIES = {
  // ... existing categories
  NEW_CATEGORY: 'new-category',
} as const;
```

### Step 2: Set TTL Policy

Add the default TTL for the new category:

```typescript
export const DEFAULT_TTL_SECONDS: Record<RedisKeyCategory, number> = {
  // ... existing TTLs
  [KEY_CATEGORIES.NEW_CATEGORY]: 300,
};
```

### Step 3: Update Validation Script

Edit `apps/api/scripts/validate-redis-keyspace.ts` to include the new category in the allowlist if needed.

## Tenant-Scoped vs Global Keys

### Tenant-Scoped Keys (Default)

Most keys should be tenant-scoped to ensure isolation:

```typescript
import { tenantScopedKey, KEY_CATEGORIES } from '../cache/index.js';

const key = tenantScopedKey(KEY_CATEGORIES.CACHE, 'user-profile', tenantId);
```

**When to use**: Any data that belongs to a specific tenant.

### Global Keys (Allowlisted Only)

Global keys are only permitted for system-wide data that has no tenant association:

```typescript
import { globalKey, KEY_CATEGORIES } from '../cache/index.js';

const key = globalKey(KEY_CATEGORIES.CACHE, 'health');
```

**When to use**: Health checks, metrics, system-wide configuration.

**Adding to allowlist**: Edit `GLOBAL_KEY_ALLOWLIST` in `redis-key-manifest.ts`:

```typescript
export const GLOBAL_KEY_ALLOWLIST = new Set<string>([
  // ... existing entries
  `${KEY_CATEGORIES.CACHE}:new-global-key`,
]);
```

## Requesting Temporary Exceptions

If you need a temporary exception to the keyspace rules (e.g., for debugging):

1. **Create an issue** with the `security` label
2. **Document the reason** for the exception
3. **Set an expiry** - exceptions must have a hard deadline
4. **Get approval** from a maintainer

Exception requests should include:

- Rationale for why the standard pattern cannot be used
- Expected duration of the exception
- Plan for migrating to standard pattern

## Fixing Validation Failures

### "Missing tenant_id in key"

Ensure you're using `tenantScopedKey()` with a valid tenant ID:

```typescript
// ❌ Wrong - no tenant isolation
const key = `cache:${resource}`;

// ✅ Correct - tenant-scoped
const key = tenantScopedKey(KEY_CATEGORIES.CACHE, resource, tenantId);
```

### "Invalid key category"

Use a category from `KEY_CATEGORIES`:

```typescript
// ❌ Wrong - arbitrary category
const key = tenantScopedKey('custom', resource, tenantId);

// ✅ Correct - use defined category
const key = tenantScopedKey(KEY_CATEGORIES.CACHE, resource, tenantId);
```

### "Key not in global allowlist"

If you need a truly global key, add it to `GLOBAL_KEY_ALLOWLIST`:

```typescript
export const GLOBAL_KEY_ALLOWLIST = new Set<string>([
  // ... existing entries
  `${KEY_CATEGORIES.CACHE}:my-global-key`,
]);
```

## Observability

When logging Redis keys, ensure tenant IDs are not exposed in plain text:

```typescript
import { createRedisKeyLogger } from '../cache/index.js';

const logger = createRedisKeyLogger();
logger.info('Rate limit key generated', { key: maskedKey });
```

The logger automatically masks tenant IDs in log output.
