# The DMZ: Archive Gate — Project Memory

> Living document. Update when milestones complete, decisions are made, or blockers change.

## Current State

- **Phase:** Pre-implementation (documentation complete)
- **Active milestone:** None — M0 not started
- **Blocker:** Monorepo needs bootstrapping (M0)

## Completed Work

- [x] Game premise and story (`docs/story.md`)
- [x] Business Requirements Document (`docs/BRD.md`, 1,363 lines)
- [x] 14 BRD research files (`docs/BRD/`, ~22,200 lines)
- [x] 14 Design Documents (`docs/DD/`, ~24,500 lines)
- [x] Development roadmap (`docs/MILESTONES.md`, M0–M16)
- [x] Multi-agent development loop (`auto-develop.sh`)
- [x] AI instruction files (SOUL.md, AGENTS.md, CLAUDE.md, MEMORY.md)

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

## Next Up: M0 — Project Bootstrap (2 weeks)

- [ ] Initialize pnpm monorepo (`packages/frontend`, `packages/backend`, `packages/shared`)
- [ ] Scaffold SvelteKit app
- [ ] Scaffold Fastify server
- [ ] Configure TypeScript strict mode
- [ ] Set up ESLint + Prettier + Husky pre-commit hooks
- [ ] Create Docker Compose (PostgreSQL, Redis)
- [ ] Set up Drizzle ORM + first migration
- [ ] Shared validation: Zod schemas compiled to JSON Schema for Fastify
- [ ] Create GitHub Actions CI pipeline
- [ ] Set up Vitest + Playwright

**Exit criteria:** `pnpm dev` starts both frontend and backend. CI passes. First migration runs.

## Known Blockers

- pnpm not yet installed globally (`npm i -g pnpm` or `corepack enable`)

## Architecture Notes

- Monorepo: `packages/frontend`, `packages/backend`, `packages/shared`
- 4 route groups: `/(game)`, `/(admin)`, `/(auth)`, `/(public)`
- Event sourcing: immutable `game.events` table, snapshots every 50 events
- State layers: ephemeral UI / synced game state / event sourcing
- 11-phase day cycle state machine (see DD-01)
- 13 in-game document types (see DD-02, DD-07)

## Update Instructions

When updating this file:
1. Move completed items from "Next Up" to "Completed Work"
2. Add new decisions to the "Tech Decisions Log" with date
3. Update "Current State" to reflect the active milestone
4. Update "Known Blockers" as they are resolved or discovered
5. Replace "Next Up" contents with the next milestone's deliverables from `docs/MILESTONES.md`
