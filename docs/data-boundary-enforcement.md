# Data Boundary Enforcement

This document describes the database access boundary enforcement system for the API. It ensures modules can only access tables they own or that are explicitly shared.

## Overview

Following DD-09 (Backend Architecture), each backend module owns its database tables. Cross-module data access must go through the owning module's public interface, not direct table access.

The system enforces:

- Modules can only import Drizzle tables they own
- Raw SQL cannot reference foreign owned schemas
- Cross-module access requires explicit allow-list entries

## Running the Gate

```bash
# Run data-boundary lint
pnpm --filter api lint:data-boundaries

# Run full API lint (includes data boundaries)
pnpm --filter api lint
```

On violations, the command exits with code 1 and reports:

- File and line number
- Offending module
- Table/schema being accessed
- Message explaining the violation

## Declaring Ownership for a New Module/Schema

When adding a new module with database tables, declare ownership in the manifest.

### 1. Add Ownership Entry

Edit `apps/api/src/db/ownership/manifest.ts`:

```typescript
export const OWNERSHIP_MANIFEST: OwnershipManifest = {
  ownership: [
    // ... existing entries ...
    { schema: 'new_module', table: 'new_table', module: 'new_module' },
  ],
  // ...
};
```

Each entry requires:

- `schema`: Database schema name (e.g., `auth`, `public`, `new_module`)
- `table`: Table name
- `module`: Owning module identifier (must match directory name in `src/modules/`)

### 2. Update Schema Directory Map

If your module uses a different directory-to-schema mapping, update `SCHEMA_DIRECTORY_MAP` in `apps/api/scripts/validate-data-boundaries.ts`:

```typescript
const SCHEMA_DIRECTORY_MAP: Record<string, string> = {
  auth: 'auth',
  game: 'public',
  new_module: 'new_module', // Add your mapping
};
```

### 3. Verify with Tests

Run the data-boundary tests:

```bash
pnpm --filter api test -- --testNamePattern "lint:data-boundaries"
```

Also verify your module's repository correctly uses only its owned tables:

```bash
pnpm --filter api lint:data-boundaries
```

## Requesting and Justifying Temporary Exceptions

Sometimes modules need temporary access to tables owned by another module. These must be explicitly allowed with justification.

### When to Use Exceptions

Exceptions are appropriate for:

- **Migration periods**: During module refactoring
- **Cross-cutting concerns**: Audit logging, metrics
- **Shared infrastructure**: Tenant resolution, user lookup

Exceptions are NOT appropriate for:

- Bypassing proper module boundaries
- Avoiding proper API design
- Permanent access to foreign module data

### Adding an Exception

Edit `apps/api/src/db/ownership/manifest.ts`:

```typescript
export const OWNERSHIP_MANIFEST: OwnershipManifest = {
  // ... ownership entries ...
  exceptions: [
    // ... existing exceptions ...
    {
      schema: 'other_module',
      table: 'other_table',
      allowedModules: ['requesting_module'],
      justification: 'Brief explanation of why access is needed and when it will be removed',
    },
  ],
};
```

Each exception requires:

- `schema`: Schema containing the table
- `table`: Table name being accessed
- `allowedModules`: Array of module identifiers permitted to access
- `justification`: Clear explanation of why this exception exists

### Exception Review Process

Before adding an exception:

1. Consider if the data should be accessed through the owning module's public interface instead
2. Document a timeline for resolving the exception (e.g., "remove after module X refactor")
3. Create a tracking issue for removing the exception

## Fixing Violations

### Scenario 1: Module Accessing Foreign Tables

**Error:**

```
[unauthorized_access] src/modules/game/repositories/session.repo.ts
Module: game, Table: auth.sessions
Module 'game' accesses table 'auth.sessions' owned by 'auth'
```

**Fix:** Use the auth module's public interface instead of direct table access:

```typescript
// Not allowed (direct table access)
import { sessions } from '$lib/db/schema/auth/sessions';

// Allowed (through module interface)
import { AuthService } from '@/modules/auth';
const sessions = await authService.getUserSessions(userId);
```

### Scenario 2: Raw SQL References Foreign Schema

**Error:**

```
[raw_sql_foreign_schema] src/modules/game/repositories/session.repo.ts:42
Module: game, Table: auth.user_profiles
Module 'game' references foreign schema 'auth' which is owned by 'auth'
```

**Fix:** Use the module's service layer or query builder instead of raw SQL:

```typescript
// Not allowed (raw SQL to foreign schema)
const result = await db.query('SELECT * FROM auth.user_profiles WHERE...');

// Allowed (through module interface)
import { AuthService } from '@/modules/auth';
const profiles = await authService.getProfilesByIds(profileIds);
```

### Scenario 3: New Table Not in Manifest

**Error:** The validation passes but you know a table is missing.

**Fix:** Add the table to the ownership manifest as described in "Declaring Ownership for a New Module/Schema".

## Adding Tests for Boundary Scenarios

### Unit Tests

Add tests in `apps/api/src/db/ownership/__tests__/ownership.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { isAccessAllowed } from '../manifest';

describe('ownership:access-control', () => {
  it('should allow module to access its own tables', () => {
    expect(isAccessAllowed('auth', 'auth', 'sessions')).toBe(true);
  });

  it('should deny access to foreign module tables', () => {
    expect(isAccessAllowed('game', 'auth', 'sessions')).toBe(false);
  });
});
```

### Integration Tests

Add tests in `apps/api/src/__tests__/data-boundaries.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { execSync } from 'child_process';

describe('lint:data-boundaries', () => {
  it('should pass on valid codebase', () => {
    const output = execSync('pnpm lint:data-boundaries', {
      cwd: 'apps/api',
      encoding: 'utf-8',
    });
    expect(output).toContain('PASSED');
  });
});
```

## Verification Checklist

Before committing changes:

- [ ] New tables added to ownership manifest
- [ ] `pnpm --filter api lint:data-boundaries` passes
- [ ] `pnpm --filter api test -- --testNamePattern "lint:data-boundaries"` passes
- [ ] `pnpm --filter api typecheck` passes
- [ ] Documentation updated if new modules/exceptions added

## Architecture Details

### Files

- `apps/api/src/db/ownership/ownership.types.ts` - Type definitions
- `apps/api/src/db/ownership/manifest.ts` - Ownership manifest and helper functions
- `apps/api/src/db/ownership/index.ts` - Barrel exports
- `apps/api/scripts/validate-data-boundaries.ts` - Static analysis script

### Manifest Structure

```typescript
interface OwnershipManifest {
  // Tables owned by modules
  ownership: Array<{
    schema: string; // Database schema
    table: string; // Table name
    module: string; // Owning module identifier
  }>;

  // Tables shared across modules (no access control)
  sharedTables: string[];

  // Explicit cross-module access grants
  exceptions: Array<{
    schema: string;
    table: string;
    allowedModules: string[];
    justification: string;
  }>;
}
```

### Detection Logic

1. Scans all TypeScript files in `src/modules/` and `src/shared/`
2. Extracts Drizzle table imports from schema paths
3. Validates each import against the ownership manifest
4. Detects raw SQL references to foreign schemas
5. Reports violations with file, line, module, and table details

## Related Documents

- [DD-09: Backend Architecture API](./DD/09_backend_architecture_api.md)
- [DD-10: Database Schema Data Model](./DD/10_database_schema_data_model.md)
- [Module Boundary Enforcement (Issue #57)](https://github.com/TheMorpheus407/the-dmz/issues/57)
- [Tenant Isolation Gate](./tenant-isolation-gate.md)
