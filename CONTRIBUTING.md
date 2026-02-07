# Contributing to The DMZ: Archive Gate

This is a proprietary project owned by Matrices GmbH. All contributions require prior authorization. See [LICENSE](LICENSE) for details.

For setup instructions, see the [README](README.md).

## Branch Naming

Use the pattern `issue-{number}-{short-description}`:

```
issue-42-auth-module
issue-15-dev-orchestration
issue-21-developer-docs
```

For work not tied to an issue, use a descriptive name with a type prefix:

```
docs/update-readme
fix/port-conflict-preflight
```

## Commit Convention

This project accepts two commit message formats. Use whichever fits the context.

### Issue-Linked Commits (preferred when working on a GitHub issue)

When working on a specific GitHub issue -- including all commits produced by `auto-develop.sh` -- use the issue-linked format:

```
Issue #42: Add JWT validation middleware
Issue #18: Create initial database schema migration
```

This is the format prescribed by `AGENTS.md` for automated and issue-driven development.

### Conventional Commits (for general work)

For commits not tied to a specific issue, use [Conventional Commits](https://www.conventionalcommits.org/) enforced by commitlint. The `commit-msg` git hook validates these commits.

**Format:** `type(scope): description`

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `perf`, `style`, `build`, `revert`

**Scopes (enforced):** `web`, `api`, `shared`, `infra`, `ci`, `deps`, `db`, `e2e`, `docker`, `auth`, `docs`, `config`

**Examples:**

```
feat(api): add rate limiting to public endpoints
fix(web): resolve hydration error on login page
docs(docs): add developer documentation
test(e2e): add accessibility smoke tests
chore(deps): update SvelteKit to 2.x
refactor(shared): extract Zod schemas to separate module
```

### General Rules

- Header max length: 100 characters
- Subject must not be sentence-case, start-case, PascalCase, or UPPER_CASE
- One concern per commit — do not mix unrelated changes

## Pull Request Workflow

1. Create a branch from `master` following the naming convention above.
2. Implement your changes in small, testable increments.
3. Write or update tests for every change.
4. Run tests locally: `pnpm test` and `pnpm lint`.
5. Push your branch and open a PR against `master`.
6. All CI checks must pass (lint, typecheck, format, unit tests, E2E, build, integration).
7. At least 1 approving review is required.
8. Use squash merge or rebase merge to keep linear history.

## Development Workflows

### Adding a New API Endpoint

1. Create a module directory under `apps/api/src/modules/{name}/`.
2. Follow the module structure from [DD-09](docs/DD/09_backend_architecture_api.md):
   ```
   modules/{name}/
   ├── {name}.routes.ts      # Route handlers
   ├── {name}.service.ts     # Business logic
   ├── {name}.schema.ts      # Zod request/response schemas
   ├── {name}.plugin.ts      # Fastify plugin registration
   ├── {name}.events.ts      # Event definitions
   ├── {name}.errors.ts      # Error classes
   ├── {name}.types.ts       # TypeScript types
   ├── index.ts              # Barrel export (public interface)
   └── __tests__/            # Colocated tests
   ```
3. Register Zod schemas for request validation and typed responses.
4. Register the module plugin in `apps/api/src/app.ts`.
5. Write tests in `modules/{name}/__tests__/`.
6. Run: `pnpm --filter @the-dmz/api test`

### Adding a New Frontend Route

1. Choose the appropriate route group:
   - `(public)` — unauthenticated pages
   - `(auth)` — login, registration
   - `(game)` — gameplay UI
   - `(admin)` — enterprise admin panel
2. Create route files at `apps/web/src/routes/({group})/{path}/`:
   - `+page.svelte` — page component
   - `+page.server.ts` — server-side data loading (if needed)
   - `+layout.svelte` — layout (if needed)
3. Follow [DD-08](docs/DD/08_frontend_architecture_sveltekit.md) module boundaries for imports:
   - `src/lib/api/` — API client layer
   - `src/lib/game/` — game state, reducers, state machine
   - `src/lib/ui/` — reusable components, design tokens
   - `src/lib/stores/` — Svelte 5 rune-based stores
   - `src/lib/utils/` — pure utility functions
4. Write a colocated test: `{component}.test.ts`.
5. Run: `pnpm --filter @the-dmz/web test`

### Creating a Database Migration

1. Edit the schema in `apps/api/src/shared/database/schema/`.
2. Generate a migration: `pnpm --filter @the-dmz/api db:generate`
3. Review the generated SQL in `apps/api/src/shared/database/migrations/`.
4. Run the migration: `pnpm db:migrate`
5. Update seed data if needed: `apps/api/src/shared/database/seed.ts`
6. **Never edit a migration after it has been merged to master.**

### Adding Shared Types or Schemas

1. Add types to `packages/shared/src/types/` or Zod schemas to `packages/shared/src/schemas/`.
2. Export from the relevant barrel file (`types/index.ts` or `schemas/index.ts`).
3. Export from the package entry point if introducing a new subpath.
4. Rebuild: `pnpm --filter @the-dmz/shared build`
5. Import in apps via `@the-dmz/shared`.
6. Write a colocated test for any validation logic.

## Testing Expectations

- **Unit tests** for all new business logic (Vitest). Colocate with source files for frontend and shared packages; use `__tests__/` subdirectories for backend modules.
- **E2E tests** for critical user flows (Playwright, in `e2e/`).
- **Accessibility tests** using `@axe-core/playwright` in E2E suites.
- Run all tests before pushing: `pnpm test`
- CI enforces coverage thresholds — do not skip tests.

## Code Review Checklist

When reviewing a PR, check for:

- [ ] **Security** — no secrets in code, input validation at boundaries, no SQL injection or XSS vectors
- [ ] **Accessibility** — WCAG 2.1 AA compliance, keyboard navigation, screen reader support
- [ ] **Performance** — no unnecessary re-renders, efficient queries, proper indexing
- [ ] **Type safety** — TypeScript strict mode, no untyped `any`, Zod validation on API boundaries
- [ ] **Tests** — new logic has unit tests, critical paths have E2E coverage
- [ ] **Conventions** — commit messages follow Conventional Commits, code formatted with Prettier

## CI Pipeline

The CI pipeline runs on every push and PR to `master`:

| Job               | What it checks                                        |
| ----------------- | ----------------------------------------------------- |
| Lint & Typecheck  | `pnpm lint`, `pnpm typecheck`, `pnpm format:check`    |
| Unit Tests        | Vitest across all workspaces with coverage            |
| E2E Tests         | Playwright with PostgreSQL + Redis service containers |
| Build             | Production builds for shared, web, and api            |
| Integration Tests | Database migration smoke test with live PostgreSQL    |

All jobs must pass before merge.

## Git Hooks

These hooks run automatically via Husky:

| Hook         | Runs             | Purpose                           |
| ------------ | ---------------- | --------------------------------- |
| `pre-commit` | `lint-staged`    | ESLint + Prettier on staged files |
| `commit-msg` | `commitlint`     | Validates commit message format   |
| `pre-push`   | `pnpm typecheck` | Full TypeScript strict check      |

## Project Documentation

For architecture details, see the [Design Documents](docs/DD/):

| DD                                                                   | System                             |
| -------------------------------------------------------------------- | ---------------------------------- |
| [DD-01](docs/DD/01_game_core_loop_state_machine.md)                  | Game core loop and state machine   |
| [DD-02](docs/DD/02_email_document_system.md)                         | Email and document system          |
| [DD-03](docs/DD/03_ai_content_pipeline.md)                           | AI content pipeline                |
| [DD-04](docs/DD/04_facility_resource_simulation.md)                  | Facility and resource simulation   |
| [DD-05](docs/DD/05_threat_engine_breach_mechanics.md)                | Threat engine and breach mechanics |
| [DD-06](docs/DD/06_design_document_narrative_season_architecture.md) | Narrative and season architecture  |
| [DD-07](docs/DD/07_ui_ux_terminal_aesthetic.md)                      | UI/UX and terminal aesthetic       |
| [DD-08](docs/DD/08_frontend_architecture_sveltekit.md)               | Frontend architecture (SvelteKit)  |
| [DD-09](docs/DD/09_backend_architecture_api.md)                      | Backend architecture and API       |
| [DD-10](docs/DD/10_database_schema_data_model.md)                    | Database schema and data model     |
| [DD-11](docs/DD/11_enterprise_multitenancy_admin.md)                 | Enterprise multi-tenancy and admin |
| [DD-12](docs/DD/12_analytics_learning_assessment.md)                 | Analytics and learning assessment  |
| [DD-13](docs/DD/13_multiplayer_social_systems.md)                    | Multiplayer and social systems     |
| [DD-14](docs/DD/14_design_document_integration_infrastructure.md)    | Integration and infrastructure     |
