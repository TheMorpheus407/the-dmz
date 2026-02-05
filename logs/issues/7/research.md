# Issue #7 Research — Drizzle ORM + Migration Framework

**Summary**
- Current backend has a stub database connection and no Drizzle ORM configuration, schema, migrations, or seed pipeline.
- Design docs require strict multi-tenancy (`tenant_id` on every operational table), RLS enforcement, and an additive-first migration strategy.
- Issue requirements specify postgres-js driver, pool configuration, a `tenants` foundation table + default system tenant, and idempotent seeding.
- There is a potential conflict with M0-18 (“0001_initial_schema”) and DD-10’s fuller `public.tenants` schema; the initial migration must be coordinated to avoid duplicate numbering or schema drift.

**Current Behavior (Repo State)**
- `apps/api/src/shared/database/connection.ts` returns `{ ok: false, message: "Database connection not configured" }` and has no Drizzle client setup.
- `apps/api/src/shared/database/migrations/` is empty. No schema files exist under `apps/api/src/shared/database/schema/`.
- `apps/api/package.json` has no Drizzle dependencies and no `db:*` scripts.
- `apps/api/src/config.ts` only defines `DATABASE_URL` (no pool size, SSL, or timeout config).
- Health readiness test asserts database is not configured: `apps/api/src/modules/health/__tests__/health.routes.test.ts`.

**Root Cause**
- M0 bootstrap work has not yet installed Drizzle or created the connection/migration/seed scaffolding. Database modules were stubbed to allow API health routes to compile before the DB layer exists.

**Relevant Requirements and Constraints**
- DD-10 “Data Model Principles” mandates `tenant_id` on every operational table and RLS enforcement at the DB layer. See `docs/DD/10_database_schema_data_model.md` (principles section).
- DD-10 “Migration, Versioning, and Backward Compatibility” requires additive-first migrations with later contract migrations only after consumers upgrade.
- DD-09 backend architecture expects a shared database module with a connection pool and migrations directory under `apps/api/src/shared/database/`.
- Repo conventions: no default exports, named exports only; migrations are numbered and never edited after merge; tests colocated per module.
- Issue requires postgres-js driver (or Neon serverless), `drizzle.config.ts` at `apps/api/`, connection pooling with configurable pool size/SSL/timeouts, an idempotent seed script, and a foundation migration that creates `public.tenants` + inserts the default “system” tenant.

**Impacted Areas**
- `apps/api/src/shared/database/connection.ts`: replace stub with Drizzle client singleton and health check that actually pings DB.
- `apps/api/src/shared/database/schema/`: add `index.ts` barrel and `tenants.ts` schema.
- `apps/api/src/shared/database/migrations/`: generated migration(s) committed to git.
- `apps/api/src/shared/database/seed.ts`: new idempotent seeding script.
- `apps/api/src/config.ts`: extend env schema for pool size, timeouts, SSL, etc.
- `apps/api/package.json`: add `drizzle-orm`, `drizzle-kit`, `postgres` (or `@neondatabase/serverless`), and db scripts (`db:generate`, `db:migrate`, `db:studio`, `db:seed`, `db:reset`).
- Health readiness tests likely need update if DB check becomes real and depends on running Postgres.

**Design/Doc Alignment Notes**
- DD-10 defines a richer `public.tenants` table (includes `domain`, `plan_id`, `branding`, `data_region`, `is_active`, etc.). Issue #7’s requested table is a minimal subset. This is likely acceptable as a foundation migration, but later migrations should expand to DD-10 fields. Coordinate with M0-18 to avoid duplicate “initial schema” migrations.
- DD-09 notes tenant-context should select pool/schema by isolation tier (SMB shared schema, mid-market dedicated schema, enterprise dedicated DB). The initial connection module should be designed so pool selection can evolve (even if only a single pool is used in M0).

**Alternative Approaches and Tradeoffs**
- Driver choice:
  - `postgres` (postgres-js) aligns with issue requirements and supports pooling; good for Node server runtime.
  - `@neondatabase/serverless` is edge-friendly but has different connection semantics; would likely require separate config or conditional initialization.
- Migration execution:
  - `drizzle-kit` CLI for generate/migrate is the standard workflow; programmatic migrator (`drizzle-orm/postgres-js/migrator`) can be used for custom scripts like `db:migrate`/`db:reset`.
- UUID default generation:
  - Issue uses `gen_random_uuid()` which requires `pgcrypto` extension. Ensure the migration creates the extension or use a Drizzle default that doesn’t depend on server extension.

**Risks and Edge Cases**
- Migration numbering conflict with M0-18: both issues may attempt to create `0001_initial_schema`. Decide numbering upfront to avoid collision.
- `gen_random_uuid()` requires `CREATE EXTENSION IF NOT EXISTS "pgcrypto";` on Postgres. Without it, migration will fail.
- `slug` length mismatch: issue says `VARCHAR(63)` while DD-10 uses `VARCHAR(64)`. Pick one and document rationale.
- “No default exports” may conflict with Drizzle config patterns (`export default`). If linting enforces this later, choose a compliant configuration or explicitly allow config files.
- Health check behavior: if DB not running, readiness endpoint and tests may fail. Might need a conditional or mock strategy to keep tests stable in CI without Postgres.

**Test Ideas**
- Seed idempotency: run seed twice and assert only one `system` tenant and one test tenant exist.
- Migration success: `db:migrate` on a fresh DB creates `public.tenants` with expected columns.
- Health readiness: when DB is reachable, readiness returns `ok` with `database.ok === true`; when not reachable, returns `degraded` with a clear error message.
- Drizzle schema sanity: `db:generate` produces no diff when schema is unchanged.

**Open Questions**
- Should M0-07 own `0001_initial_schema`, or should it create a smaller “0000_foundation” and let M0-18 own `0001_initial_schema`?
- Is a minimal `public.tenants` acceptable now, with expansion later, or should the migration align to DD-10’s full column set immediately?
- Are we standardizing on `postgres` (postgres-js) for all environments, or do we need a conditional setup for Neon/edge?
