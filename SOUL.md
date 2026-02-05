# The DMZ: Archive Gate — Project Soul

## Identity

The DMZ: Archive Gate is a cybersecurity awareness training platform built as a post-apocalyptic data center management game. Developed by Matrices GmbH. Positioned as "Duolingo for Cybersecurity."

**Premise:** A Stuxnet variant (NIDHOGG) crashed the public internet. Players operate the last functioning data center — deciding who gets access, defending against attackers, and upgrading infrastructure. Through gameplay, they acquire real cybersecurity skills without realizing they're being trained.

**Markets:** B2B enterprise (per-seat licensing, 14+ regulatory frameworks) + B2C consumer (free-to-play). One game engine serves both.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | SvelteKit 2.x, Svelte 5, TypeScript, PixiJS |
| Backend | Node.js, TypeScript, Fastify (modular monolith) |
| Database | PostgreSQL (RLS multi-tenancy), Redis |
| Analytics DB | PostgreSQL initially; ClickHouse or TimescaleDB when needed |
| AI | Claude API (phishing content generation) |
| ORM | Drizzle ORM (versioned migrations) |
| Validation | Zod → JSON Schema (Fastify) |
| Package manager | pnpm (monorepo workspaces) |
| Testing | Vitest (unit), Playwright (E2E) |
| CI/CD | GitHub Actions |
| Infrastructure | Docker, Kubernetes |

## Architecture Principles

1. **Event sourcing from day one** — game engine and event store are inseparable.
2. **tenant_id on every table from day one** — even before multi-tenancy is enforced.
3. **Accessibility is structural** — WCAG 2.1 AA is a legal requirement at launch.
4. **Privacy by design** — pseudonymization and data minimization from the first event.
5. **Modular monolith first** — no premature microservice extraction. Clear module boundaries.
6. **PostgreSQL first for analytics** — defer ClickHouse/TimescaleDB to M7.
7. **Consumer game validates, enterprise game monetizes** — the game must be fun before it can be sold.

## Coding Standards

- TypeScript strict mode everywhere. No `any` without explicit justification.
- Svelte 5 runes (`$state`, `$derived`, `$effect`). No legacy reactive syntax.
- Named exports over default exports.
- Server-authoritative game state. Client mirrors, never owns.
- All API endpoints validated with Zod. All responses typed.
- Structured logging with Pino. Redact PII fields.
- Error codes registry — every error gets a unique code.
- Tests colocated: `thing.ts` → `thing.test.ts`.

## Security Principles

- OWASP Top 10 awareness in all code.
- No secrets in code or commits. Environment variables only.
- CSP headers, Trusted Types, anti-clickjacking.
- Input validation at every system boundary.
- Rate limiting on all public endpoints.
- AI content safety: no real companies, people, URLs, or PII in generated content.

## Tone

All engineering artifacts (commits, PRs, code comments, docs) are strictly professional. The post-apocalyptic theme stays in game code and content only.

## Key Documents

| Document | Path | Lines |
|----------|------|-------|
| Game premise | `docs/story.md` | 59 |
| Business Requirements | `docs/BRD.md` | 1,363 |
| Development Roadmap | `docs/MILESTONES.md` | 565 |
| 14 Design Documents | `docs/DD/01-14_*.md` | ~24,000 |
| 14 BRD Research Files | `docs/BRD/01-14_*.md` | ~23,000 |

### Design Document Index

| DD | System |
|----|--------|
| 01 | Game core loop and state machine |
| 02 | Email and document system |
| 03 | AI content pipeline |
| 04 | Facility and resource simulation |
| 05 | Threat engine and breach mechanics |
| 06 | Narrative and season architecture |
| 07 | UI/UX and terminal aesthetic |
| 08 | Frontend architecture (SvelteKit) |
| 09 | Backend architecture and API |
| 10 | Database schema and data model |
| 11 | Enterprise multi-tenancy and admin |
| 12 | Analytics and learning assessment |
| 13 | Multiplayer and social systems |
| 14 | Integration and infrastructure |
