ACCEPTED No blocking issues found.

**Summary**
- Drizzle ORM configuration, connection pooling, migrations, and seed/reset scripts look correct and align with issue requirements.
- Health readiness now uses the injected config and the tests are updated accordingly.

**Notes**
- Database scripts (`db:migrate`, `db:seed`, `db:reset`) were not executed because no local Postgres was configured for this review.

**Tests**
- `pnpm --filter api test`
- `pnpm --filter api typecheck`
