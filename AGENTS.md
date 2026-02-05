# Agent Instructions — The DMZ: Archive Gate

> **FIRST:** Read `SOUL.md` for project identity, tech stack, and standards. Read `MEMORY.md` for current project state. These files are your primary context.

## Boundary: Project Root Only

All work MUST stay within this repository. Never read, write, or execute anything outside the project root.

## Repository Layout

```
the-dmz/
├── docs/                  # All project documentation
│   ├── BRD.md             # Business Requirements Document
│   ├── story.md           # Game premise and mechanics
│   ├── MILESTONES.md      # Development roadmap (M0–M16)
│   ├── BRD/               # 14 BRD research files
│   └── DD/                # 14 Design Documents (DD-01 to DD-14)
├── packages/              # Monorepo workspaces (created in M0)
│   ├── frontend/          # SvelteKit app
│   ├── backend/           # Fastify server
│   └── shared/            # Shared types, Zod schemas, constants
├── logs/issues/           # Per-issue research and review artifacts
├── SOUL.md                # Project identity, tech stack, standards
├── MEMORY.md              # Living project state (update as you work)
├── AGENTS.md              # This file
├── CLAUDE.md              # Claude Code extensions
└── auto-develop.sh        # Multi-agent development loop
```

## Environment

- Node.js 22.x, npm 10.x, pnpm (install if missing: `npm i -g pnpm`)
- Git, gh CLI (authenticated), Docker
- Repository: github.com/TheMorpheus407/the-dmz (master branch)

## Commands (M0+)

```sh
pnpm install              # Install all workspace dependencies
pnpm dev                  # Start frontend + backend dev servers
pnpm build                # Production build
pnpm test                 # Run all tests (Vitest + Playwright)
pnpm lint                 # ESLint + Prettier check
pnpm lint:fix             # Auto-fix lint issues
pnpm db:migrate           # Run Drizzle migrations
pnpm db:seed              # Seed development data
```

## Workflow

1. Work is driven by GitHub Issues (`gh issue list`).
2. Read the issue, all comments, and relevant Design Documents before starting.
3. Research before implementing. Check `docs/DD/` for the relevant system specification.
4. Implement in small, testable increments.
5. Write or update tests for every change.
6. Run tests before considering work complete.
7. Never commit without passing tests.

## Git Conventions

- **Branches:** `issue-{number}-{short-description}` (e.g., `issue-42-auth-module`)
- **Commits:** `Issue #{number}: {imperative description}` (e.g., `Issue #42: Add JWT validation middleware`)
- One concern per commit. No mixed changes.
- Never force-push to master.
- Never amend published commits.
- Never skip hooks (`--no-verify`).

## File Conventions

- Tests colocated: `module/thing.ts` → `module/thing.test.ts`
- Shared types in `packages/shared/`
- Migrations in `packages/backend/drizzle/` — numbered, never edited after merge
- No default exports. Named exports only.

## Before Implementing Any System

Read its Design Document first. The DD index is in `SOUL.md`.

## Prohibited Actions

### Filesystem
- Read, write, or execute anything outside the project root
- Delete top-level directories (`rm -rf docs/`, `rm -rf packages/`)
- Modify `.git/config` or `.git/hooks/` directly
- Write to `/tmp`, `/etc`, `/usr`, `~/.ssh`, or any path outside this repo
- Write secrets, API keys, or tokens into any tracked file

### Git
- `git push --force` to master
- `git reset --hard` without explicit user instruction
- `git clean -fd` without explicit user instruction
- Amend pushed commits
- Skip pre-commit hooks (`--no-verify`)

### System
- Install system-level packages (apt, pacman, nix-env)
- Run network scanners, exploit tools, or miners
- Start persistent background services or daemons
- Modify shell profiles or environment files
- Access other users' home directories
- Download and execute remote binaries
- Open network listeners on non-standard ports

### Content
- Generate real company names, real person names, real URLs, or real PII in game content
- Commit copyrighted content without attribution
- Write offensive, discriminatory, or harmful content

## When Stuck

1. Re-read the relevant Design Document (`docs/DD/`).
2. Check `MEMORY.md` for recent decisions and context.
3. Search existing code for established patterns.
4. Document the blocker clearly and ask for guidance.
