# Tenant Schema Policy

This document defines the canonical tenant-schema policy for M1 and provides operational guidance for developers.

## Tenant-Scoped vs Global Tables

### Tenant-Scoped Tables

Tenant-scoped tables MUST include:

- `tenant_id` as a NOT NULL UUID column
- A foreign key to `public.tenants(tenant_id)`
- Row-Level Security (RLS) enabled and forced
- A `tenant_isolation_*` policy using `auth.current_tenant_id()`

**M1 Tenant-Scoped Tables:**

| Table            | Schema | Notes                                   |
| ---------------- | ------ | --------------------------------------- |
| tenants          | public | Root entity - tenant_id is PK           |
| users            | public | User accounts per tenant                |
| sessions         | auth   | Auth sessions                           |
| roles            | auth   | RBAC roles per tenant                   |
| user_roles       | auth   | User-role assignments                   |
| role_permissions | auth   | Role-permission bindings (via roles FK) |
| sso_connections  | auth   | SSO configuration                       |
| user_profiles    | auth   | User preferences                        |

### Global Tables

Global tables are exempt from tenant requirements:

- No `tenant_id` column
- No RLS policies
- System-wide data only

**M1 Global Tables:**

| Table       | Schema | Notes                              |
| ----------- | ------ | ---------------------------------- |
| permissions | auth   | System-wide permission definitions |

## Adding a New Tenant-Scoped Table

1. **Define the schema** in `apps/api/src/db/schema/`

2. **Add NOT NULL tenant_id column:**

   ```typescript
   tenantId: uuid('tenant_id').notNull();
   ```

3. **Add FK to tenants:**

   ```typescript
   .references(() => tenants.tenantId, { onDelete: 'restrict' })
   ```

4. **Enable RLS** in the migration:

   ```sql
   ALTER TABLE "schema"."table_name" ENABLE ROW LEVEL SECURITY;
   ALTER TABLE "schema"."table_name" FORCE ROW LEVEL SECURITY;
   ```

5. **Create tenant isolation policy:**

   ```sql
   CREATE POLICY "tenant_isolation_table_name" ON "schema"."table_name"
     USING ("tenant_id" = "auth"."current_tenant_id"())
     WITH CHECK ("tenant_id" = "auth"."current_tenant_id"());
   ```

6. **Add to tenant-policy.ts:**
   - Add entry to `TENANT_SCOPED_TABLES` array
   - Specify `hasNotNullTenantId`, `hasTenantFk`, `hasRls`
   - Document composite foreign keys if applicable

7. **Run tests:**
   ```bash
   pnpm --filter api test
   ```

## Declaring a Global/System Table

If a table should NOT be tenant-scoped:

1. **Do NOT add tenant_id column**

2. **Add to tenant-policy.ts:**
   - Add entry to `GLOBAL_TABLES` array
   - Document why it's global (e.g., system-wide permissions)

3. **Justification examples:**
   - Permission definitions are system-wide strings
   - Audit logs that must be accessible globally
   - Reference tables shared across tenants

## Required Tests Before Merging

Before merging any schema change, ensure:

```bash
# Run API tests
pnpm --filter api test

# Run typecheck
pnpm --filter api typecheck

# Run lint
pnpm lint
```

Specifically, these tests validate tenant invariants:

- `apps/api/src/shared/database/schema/__tests__/schema.test.ts`
- `apps/api/src/shared/database/migrations/__tests__/guardrails.test.ts`

## Runtime Context

The tenant context middleware (`apps/api/src/shared/middleware/tenant-context.ts`) sets:

- `app.current_tenant_id` - PostgreSQL session variable
- `app.tenant_id` - Compatibility alias

RLS policies use `auth.current_tenant_id()` function to read this value.

## Migration Guardrails

The guardrail tests in `migrations/__tests__/guardrails.test.ts` validate:

1. All tenant-scoped tables have NOT NULL tenant_id
2. All tenant-scoped tables have FK to public.tenants
3. RLS is enabled and forced for tenant-scoped tables
4. Tenant isolation policies exist and use `current_tenant_id()`
5. Global tables do NOT have tenant_id

If any migration violates these invariants, tests will fail in CI.
