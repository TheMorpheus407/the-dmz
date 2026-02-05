# Research: Issue #1 — Initialize pnpm monorepo workspace

## Summary
The root monorepo scaffolding **already exists** in this repo: root config files are present and `apps/` and `packages/` directories exist. However, the workspace packages themselves are empty (no `package.json` under `apps/web`, `apps/api`, or `packages/shared`), which likely prevents satisfying the acceptance criterion that “workspace packages can import from each other.” The remaining work for this issue is mostly about **validating** the current scaffolding against requirements and deciding whether to add **minimal workspace package stubs** now (or defer to issues #2–#4).

## Key Findings
- Root configuration is already in place: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.npmrc`, `.nvmrc` are all present.
- `apps/web`, `apps/api`, and `packages/shared` directories exist but are **empty** (no `package.json`), so pnpm will not treat them as workspace packages.
- Acceptance criteria item “workspace packages can import from each other” is **not currently verifiable** without at least minimal package stubs.
- `turbo.json` uses the `pipeline` key with `turbo@^2.0.0`; this should be validated because Turbo 2’s preferred schema is `tasks` (risk of schema mismatch).

## Current Behavior (Repo Scan)
- Root configs present:
  - `package.json` defines workspace scripts (`dev`, `build`, `lint`, `test`, `typecheck`, `clean`), `private: true`, engine constraints (Node >= 22, pnpm >= 9), and `turbo` devDependency.
  - `pnpm-workspace.yaml` includes `apps/*` and `packages/*`.
  - `turbo.json` defines pipelines for `build`, `dev`, `lint`, `test`, `typecheck`, `clean` with `build` depending on `^build`.
  - `.npmrc` has `strict-peer-dependencies=true` and `auto-install-peers=true`.
  - `.nvmrc` pins Node 22.
  - `tsconfig.base.json` defines strict TS defaults.
- Workspace directories exist but contain no package manifests:
  - `apps/web/` is empty.
  - `apps/api/` is empty.
  - `packages/shared/` is empty.

## Root Cause Analysis
- The monorepo skeleton was partially implemented (root config + empty directories), but **workspace package definitions were not created**. That makes it impossible to demonstrate cross-package imports or a workspace graph, leaving the issue’s acceptance criteria only partially satisfied.

## Impacted Modules / Areas
- **`apps/web` (SvelteKit)** and **`apps/api` (Fastify)** cannot be treated as workspaces until they have `package.json` files.
- **`packages/shared`** is not a workspace package, so it cannot be imported or linked.
- Tooling and CI tasks that expect workspace packages (Turbo pipelines, `pnpm -r`, and import resolution) won’t behave as intended.

## Requirements & Constraints (Issue + Docs)
- Required root structure is already present, but the issue’s acceptance criteria include **cross-package imports**, implying minimal workspace packages should exist.
- DD-08 Section 7 expects the SvelteKit project structure under `apps/web/src` (route groups, `src/lib`), which will be created in Issue #2.
- DD-09 Section 1.2 expects backend module structure under `apps/api/src/modules` and `apps/api/src/shared`, which will be created in Issue #3.
- DD-14 Section 12 stresses environment reproducibility and CI consistency (Node 22, pnpm 9, standard scripts).

## Alternative Approaches
1. **Minimal workspace stubs in Issue #1 (recommended if acceptance must be satisfied now):**
   - Add `package.json` stubs to `apps/web`, `apps/api`, and `packages/shared`.
   - Add a tiny `packages/shared/src/index.ts` export and a trivial import in `apps/web` or `apps/api` to demonstrate interop.
   - Risk: overlaps with Issue #2/#3/#4 scaffolding, but can be kept minimal and replaced later.
2. **Defer interop to Issues #2–#4:**
   - Leave Issue #1 as “root scaffolding only” and satisfy “workspace packages can import” when actual scaffolds are created.
   - Risk: Issue #1 acceptance criteria remain technically unmet.

## Risks / Edge Cases
- **Turbo config schema mismatch:** `turbo@^2.0.0` may expect `tasks` instead of `pipeline` in `turbo.json`. Needs validation with `pnpm turbo run build --dry` after installing dependencies.
- **Strict peer deps** in `.npmrc` can cause early install failures once real packages land (expected, but could surprise downstream work).
- **Script naming drift:** root scripts must remain aligned with later issues’ expectations (CI, dev orchestration).

## Test / Validation Ideas
- `pnpm install` from repo root completes.
- `pnpm -w run` lists root scripts: `dev`, `build`, `lint`, `test`, `typecheck`, `clean`.
- `pnpm turbo run build --dry` verifies Turbo schema and `^build` dependency ordering.
- After adding minimal package stubs: `pnpm -r list` shows workspace packages, and a trivial import from `@the-dmz/shared` resolves.
- `node -v` confirms Node 22.x matches `.nvmrc`.

## Notes for Implementation Agent
- The root workspace scaffolding appears **already implemented**. This issue likely needs either verification-only or minimal workspace package stubs to satisfy the “cross-import” acceptance criterion. Coordinate with Issues #2–#4 to avoid redundant scaffolding.
