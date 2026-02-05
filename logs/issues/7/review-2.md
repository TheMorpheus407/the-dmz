ACCEPTED

Summary:
- Drizzle ORM is configured with postgres-js + drizzle-kit, including `apps/api/drizzle.config.ts` and `db:*` scripts in `apps/api/package.json`.
- Connection pooling and health checks are implemented in `apps/api/src/shared/database/connection.ts` with env-driven pool size/SSL/timeouts.
- Foundation schema and migrations are present: `tenants` table + default system tenant, plus idempotent seeding with a test tenant.

Notes:
- `pnpm --filter api db:migrate`, `pnpm --filter api db:seed`, `pnpm --filter api db:reset`, and `pnpm --filter api db:studio` were not executed because no local Postgres was configured for this review.

Tests:
- `pnpm --filter api test`
- `pnpm --filter api typecheck`
