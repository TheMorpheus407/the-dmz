# The DMZ: Archive Gate — Project Memory

> Living document. Update when milestones complete, decisions are made, or blockers change.

## Current State

- **Phase:** Pre-implementation (documentation complete, issues created)
- **Active milestone:** M0 — Project Bootstrap (33 issues created on GitHub, #1–#33)
- **Blocker:** Monorepo needs bootstrapping (M0)

## Completed Work

- [x] Game premise and story (`docs/story.md`)
- [x] Business Requirements Document (`docs/BRD.md`, 1,363 lines)
- [x] 14 BRD research files (`docs/BRD/`, ~22,200 lines)
- [x] 14 Design Documents (`docs/DD/`, ~24,500 lines)
- [x] Development roadmap (`docs/MILESTONES.md`, M0–M16)
- [x] Multi-agent development loop (`auto-develop.sh`)
- [x] AI instruction files (SOUL.md, AGENTS.md, CLAUDE.md, MEMORY.md)
- [x] Sub-agent definitions (`.claude/agents/`: frontend, backend, database, testing, devops, reviewer)
- [x] M0 GitHub issues created (#1–#33, 33 issues covering full bootstrap scope)

## Tech Decisions Log

| Decision | Choice | Rationale | Date |
|----------|--------|-----------|------|
| Frontend framework | SvelteKit 2.x + Svelte 5 | 90% DOM app, compiled reactivity | 2026-02-05 |
| Backend framework | Fastify | Plugin architecture, JSON Schema | 2026-02-05 |
| Database | PostgreSQL + RLS | Proven, tenant isolation, JSONB | 2026-02-05 |
| ORM | Drizzle | TypeScript-native, migration support | 2026-02-05 |
| State architecture | Event sourcing | Determinism, audit, compliance | 2026-02-05 |
| Package manager | pnpm | Monorepo workspaces, disk efficiency | 2026-02-05 |
| Analytics DB | PostgreSQL (defer specialty DB) | Start simple, evaluate at M7 | 2026-02-05 |
| Architecture | Modular monolith | Avoid premature decomposition | 2026-02-05 |
| Build orchestration | Turborepo | Task graph, caching, pnpm workspace integration | 2026-02-05 |
| Monorepo layout | `apps/*` + `packages/*` | Apps (deployables) vs packages (libraries) separation | 2026-02-05 |
| auto-develop finalization | Dedicated finalizer agent for commit/push/close | Keeps final git operations in-agent with unbounded retries and validation checks | 2026-02-06 |

## Next Up: M0 — Project Bootstrap (33 issues, #1–#33)

### Core Scaffolding (#1–#5)
- [ ] #1 Initialize pnpm monorepo with Turborepo (`apps/web`, `apps/api`, `packages/shared`)
- [ ] #2 Scaffold SvelteKit frontend in `apps/web`
- [ ] #3 Scaffold Fastify backend in `apps/api`
- [ ] #4 Create shared TypeScript package (`packages/shared`)
- [ ] #5 Set up Zod shared validation schemas

### Infrastructure & Database (#6–#7, #17–#18, #20, #32)
- [ ] #6 Docker Compose dev environment (PostgreSQL, Redis)
- [ ] #7 Drizzle ORM + migration framework
- [ ] #18 Initial database schema migration (`0001_initial_schema`)
- [ ] #17 Test database seeding infrastructure
- [ ] #20 Docker Compose health checks and service readiness
- [ ] #32 Application Dockerfiles for API and Web

### Tooling & DX (#9–#16, #19, #25–#26)
- [ ] #9 TypeScript strict mode configuration
- [ ] #10 ESLint with flat config
- [ ] #11 Prettier for code formatting
- [ ] #12 Husky git hooks with lint-staged
- [ ] #15 Unified `pnpm dev` orchestration script
- [ ] #16 `.env.example` and environment variable validation
- [ ] #19 Repository configuration (.gitignore, .gitattributes, LICENSE)
- [ ] #25 VS Code workspace settings and debug configuration
- [ ] #26 Automated dependency updates (Renovate)

### Testing (#13–#14, #24)
- [ ] #13 Vitest unit testing infrastructure
- [ ] #14 Playwright E2E testing infrastructure
- [ ] #24 Accessibility testing foundation (axe-core in CI)

### CI/CD & Security (#8, #23, #29–#30, #33)
- [ ] #8 GitHub Actions CI/CD pipeline
- [ ] #23 Dependency scanning and security baseline in CI
- [ ] #29 Security headers middleware (Helmet, CSP, HSTS)
- [ ] #30 Request input sanitization middleware
- [ ] #33 Rate limiting middleware (@fastify/rate-limit)

### Backend Architecture (#27–#28, #31)
- [ ] #27 OpenAPI/Swagger documentation endpoint
- [ ] #28 In-process event bus with DomainEvent interface
- [ ] #31 Auth RBAC and session schema migration

### Documentation (#21–#22)
- [ ] #21 Developer documentation (README.md + CONTRIBUTING.md)
- [ ] #22 Architecture Decision Records (ADR template + initial ADRs)

**Exit criteria:** `pnpm dev` starts both frontend and backend. CI passes. First migration runs.

## Known Blockers

- pnpm not yet installed globally (`npm i -g pnpm` or `corepack enable`)

## Architecture Notes

- Monorepo: `apps/web` (SvelteKit), `apps/api` (Fastify), `packages/shared` (types, schemas, constants)
- Workspaces: `apps/*` + `packages/*` (pnpm-workspace.yaml)
- Build orchestration: Turborepo (`turbo.json`)
- 4 route groups: `/(game)`, `/(admin)`, `/(auth)`, `/(public)`
- Event sourcing: immutable `game.events` table, snapshots every 50 events
- In-process event bus (EventEmitter-based) from M0, upgrades to BullMQ in M1+
- State layers: ephemeral UI / synced game state / event sourcing
- 11-phase day cycle state machine (see DD-01)
- 13 in-game document types (see DD-02, DD-07)

## Database Seeding

### Seed Commands

| Command | Description | Requirements |
|---------|-------------|--------------|
| `pnpm db:migrate` | Run pending migrations | Docker services running |
| `pnpm db:seed` | Seed database with base data (M0) | - |
| `pnpm db:seed:m1` | Seed database with M1 foundation data | `ALLOW_SEEDING=1` env var |
| `pnpm db:seed:test` | Seed test database | - |
| `pnpm db:reset` | Drop, migrate, and re-seed (dev only) | Docker services running |

### Seed Data Fixtures

The project uses deterministic seed fixtures in `packages/shared/src/testing/`:
- `seed-ids.ts` — Stable UUIDs for tenants, users, and profiles
- `factories.ts` — Test data factories (`createTestProfile`, etc.)

These fixtures are used by:
- Database seed scripts (`apps/api/src/shared/database/seed.ts`)
- Integration tests requiring authenticated users
- E2E tests with stable identities

### Seed Verification

Automated seed verification is done via `apps/api/src/shared/database/__tests__/seed.test.ts` which:
1. Runs `seedDatabase()`
2. Verifies seeded entities exist in the database
3. Validates tenant/user/profile relationships

## Update Instructions

When updating this file:
1. Move completed items from "Next Up" to "Completed Work"
2. Add new decisions to the "Tech Decisions Log" with date
3. Update "Current State" to reflect the active milestone
4. Update "Known Blockers" as they are resolved or discovered
5. Replace "Next Up" contents with the next milestone's deliverables from `docs/MILESTONES.md`
