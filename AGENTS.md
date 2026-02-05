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
├── packages/              # Monorepo workspaces (created in M0, may not exist yet)
│   ├── frontend/          # SvelteKit app
│   ├── backend/           # Fastify server
│   └── shared/            # Shared types, Zod schemas, constants
├── .claude/agents/        # Task-specialized sub-agent instructions (Claude Code)
├── logs/issues/{N}/       # Per-issue artifacts (created by auto-develop.sh)
│   ├── issue.json         # Issue snapshot from GitHub
│   ├── research.md        # Research agent output
│   ├── implementation.md  # Implementer agent summary
│   ├── review-1.md        # Reviewer A verdict (ACCEPTED/DENIED)
│   └── review-2.md        # Reviewer B verdict (ACCEPTED/DENIED)
├── SOUL.md                # Project identity, tech stack, standards (do not modify)
├── MEMORY.md              # Living project state (update as you work)
├── AGENTS.md              # This file (do not modify without user instruction)
├── CLAUDE.md              # Claude Code extensions
└── auto-develop.sh        # Multi-agent development loop
```

## Environment

- Node.js 22.x, npm 10.x, pnpm (install if missing: `corepack enable` or `npm i -g pnpm`)
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
8. Update `MEMORY.md` when completing milestones or making significant decisions.

### auto-develop.sh Pipeline

The script orchestrates four agent roles against the lowest-numbered open issue (filtered to issues created by the repo owner):

```
Research Agent  -->  Implementer Agent  -->  Reviewer A (correctness)
                                         -->  Reviewer B (issue coverage)
                         ^                          |
                         |  loop if DENIED          |
                         +--------------------------+
                    On both ACCEPTED: commit, push, close issue
```

- **Research:** Reads the issue, codebase, and docs. Writes `logs/issues/{N}/research.md`.
- **Implement:** Reads research + issue. Implements code and tests. Writes `implementation.md`. Does NOT commit.
- **Review A:** Checks uncommitted changes for correctness, quality, and security. First word: `ACCEPTED` or `DENIED`.
- **Review B:** Checks whether changes fully solve the issue. First word: `ACCEPTED` or `DENIED`.
- If either reviewer says `DENIED`, the implement-review loop restarts.
- Each role can be assigned to `claude` or `codex` independently via CLI flags.
- The script works on the current branch. It requires a clean working tree before starting.

## Git Conventions

- **Branches:** `issue-{number}-{short-description}` (e.g., `issue-42-auth-module`)
- **Commits:** `Issue #{number}: {imperative description}` (e.g., `Issue #42: Add JWT validation middleware`)
- One concern per commit. No mixed changes.
- Never force-push to master.
- Never amend published commits.
- Never skip hooks (`--no-verify`).
- When running inside `auto-develop.sh`: the script handles commit, push, and issue close. Do NOT commit yourself.

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
- Modify governance files (`SOUL.md`, `AGENTS.md`, `auto-develop.sh`) without explicit user instruction
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
