# Issue #7 Implementation — Drizzle ORM + Migration Framework

## Summary
- Added Drizzle ORM configuration, schema definitions, migration scaffolding, and seed/reset scripts for PostgreSQL.
- Implemented a database connection pool + Drizzle client singleton with environment-driven defaults and a real database health check (skipped in test env).
- Generated the foundation migration for `public.tenants` (plus `pgcrypto` extension) and ensured idempotent seed data.
- Fixed API typecheck blockers by typing the health test config and adding a local uuid module declaration.

## Changes Made
- Added Drizzle dependencies and database scripts to the API package.
- Expanded API configuration with pool sizing, timeouts, and SSL flags (environment-based defaults).
- Implemented database connection pool + Drizzle client singleton and updated readiness checks.
- Added schema barrel and `tenants` table definition.
- Added migration runner, seed script, and reset script.
- Generated initial migration and metadata.
- Updated health route test expectations for new database readiness message and typed the test config helper.
- Added local module declaration for `uuid` to satisfy TypeScript.

## Files Touched
- `apps/api/package.json`
- `apps/api/drizzle.config.ts`
- `apps/api/src/config.ts`
- `apps/api/src/modules/health/__tests__/health.routes.test.ts`
- `apps/api/src/modules/health/health.routes.ts`
- `apps/api/src/modules/health/health.service.ts`
- `apps/api/src/shared/database/connection.ts`
- `apps/api/src/shared/database/migrate.ts`
- `apps/api/src/shared/database/reset.ts`
- `apps/api/src/shared/database/seed.ts`
- `apps/api/src/shared/database/schema/index.ts`
- `apps/api/src/shared/database/schema/tenants.ts`
- `apps/api/src/shared/database/migrations/0000_rich_fantastic_four.sql`
- `apps/api/src/shared/database/migrations/meta/_journal.json`
- `apps/api/src/shared/database/migrations/meta/0000_snapshot.json`
- `apps/api/src/types/uuid.d.ts`
- `pnpm-lock.yaml`

## Tests Run
- `pnpm --filter api typecheck`
- `pnpm --filter api test`
