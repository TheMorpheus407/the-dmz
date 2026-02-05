# Research: Issue #4 — Create shared TypeScript package

## Summary
The `packages/shared` workspace already exists but is **only a stub**. It currently exports `sharedVersion` from `src/index.ts`, builds a single ESM output, and exposes only the root export. The structure, types, constants, and build configuration required by Issue #4 are **missing**, and similar types/error codes already live inside `apps/api`, creating duplication and drift risk.

## Key Findings
- `packages/shared` is a minimal stub (`sharedVersion` only) with **no** `types/`, `constants/`, or `utils/` folders. (`packages/shared/src/index.ts`)
- Build output is **ESM-only**; no CJS build or subpath exports exist. (`packages/shared/package.json`, `packages/shared/tsconfig.json`)
- `apps/api` already defines overlapping API types and error codes locally, which will diverge from the shared contract unless reconciled. (`apps/api/src/shared/types/common.ts`, `apps/api/src/shared/middleware/error-handler.ts`)
- `apps/web` and `apps/api` already depend on `@the-dmz/shared` (via workspace) and verify `sharedVersion` in scripts; changes must preserve or update these checks.

## Current Behavior (Repo Scan)
- `packages/shared`:
  - `src/index.ts` exports only `sharedVersion`.
  - `package.json` exports only `.` (no subpath exports).
  - `tsconfig.json` extends `tsconfig.base.json` but lacks `sourceMap` / `declarationMap`.
  - `dist/` contains only `index.js` (ESM) and `index.d.ts`.
- `apps/api`:
  - `@the-dmz/shared` is a dependency; `scripts/verify-shared-import.mjs` expects `sharedVersion`.
  - API response types exist in `apps/api/src/shared/types/common.ts` (ApiResponse, Pagination) but do **not** match the Issue #4 envelope exactly (e.g., `pageSize` vs `limit`, error shape differences).
  - Error code constants exist in `apps/api/src/shared/middleware/error-handler.ts` (INTERNAL_SERVER_ERROR, VALIDATION_FAILED, NOT_FOUND, SERVICE_UNAVAILABLE) which do not map to the required categories (AUTH, VALIDATION, GAME, TENANT, SYSTEM).
- `apps/web`:
  - `@the-dmz/shared` dependency + `scripts/verify-shared-import.mjs` also expects `sharedVersion`.
  - No shared API types in use yet.

## Root Cause / Gap Analysis
- Issue #1 implemented a **minimal** shared package to prove workspace linking. Issue #4 requires a **full shared contract**, but no additional structure, types, or build config has been added.
- Shared API envelope types currently live in `apps/api` (and not in `packages/shared`), so the shared package does not yet define the cross-package contract the issue expects.

## Impacted Modules / Areas
- `packages/shared`:
  - `package.json` (exports, dual-build, scripts)
  - `tsconfig.json` (multi-target build, source maps)
  - `src/` layout (types, constants, utils, barrel exports)
- `apps/api`:
  - Types overlap in `apps/api/src/shared/types/common.ts`
  - Error codes overlap in `apps/api/src/shared/middleware/error-handler.ts`
  - `scripts/verify-shared-import.mjs` relies on `sharedVersion`
- `apps/web`:
  - `scripts/verify-shared-import.mjs` relies on `sharedVersion`
  - Future API integration will need shared types

## Constraints & Requirements
- Must follow repo standards: **named exports only**, strict TS, no circular dependencies.
- `packages/shared` must compile to **dual ESM + CJS** with source maps.
- `exports` field must support **subpath exports** (e.g., `@the-dmz/shared/types`, `@the-dmz/shared/constants`).
- Types must include initial set (ApiResponse, ApiError, PaginationMeta, UserBase, etc.).
- Error code registry should include categories: AUTH, VALIDATION, GAME, TENANT, SYSTEM.
- `tsconfig` should extend `../../tsconfig.base.json` (already true).

## Alternative Approaches
1. **TSC dual-build (no new tooling):**
   - Add `tsconfig.esm.json` and `tsconfig.cjs.json` (or override via CLI) and run `tsc` twice to `dist/esm` and `dist/cjs`.
   - Update `exports` with `import`/`require` conditions + `types` for each subpath.
   - Pros: no extra deps, consistent with current monorepo.
   - Cons: CJS output with `type: module` requires `.cjs` or explicit `exports` mapping, may need post-build rename.
2. **Bundler (tsup/rollup):**
   - Single build pipeline to emit ESM+CJS+DTS with sourcemaps and correct extensions.
   - Pros: simpler output mapping, `.cjs` handled automatically.
   - Cons: adds tooling + config; might be overkill for M0.

## Risks / Edge Cases
- **CJS output & `type: module`:** TSC outputs `.js`; with `type: module`, Node treats `.js` as ESM. CJS consumers will fail unless `.cjs` is emitted or `exports` is mapped correctly.
- **Module resolution mismatch:** `tsconfig.base.json` uses `moduleResolution: "Bundler"`, which may not align with Node’s `exports` conditions for CJS/ESM unless carefully configured.
- **Type drift:** `apps/api` currently defines `ApiResponse`, `Pagination`, and error codes. Introducing shared definitions without migrating can cause inconsistencies or duplicate types.
- **Existing import checks:** `sharedVersion` is used by verify scripts in `apps/api` and `apps/web`; removing it will break those tests unless they are updated in the same change.

## Test / Validation Ideas
- `pnpm --filter shared build` produces **both** ESM and CJS outputs + source maps.
- Node validation (manual):
  - ESM: `node -e "import('@the-dmz/shared').then(m => console.log(m))"`
  - CJS: `node -e "const m = require('@the-dmz/shared'); console.log(m)"`
- Subpath export checks:
  - `node -e "import('@the-dmz/shared/types').then(m => console.log(m))"`
  - `node -e "import('@the-dmz/shared/constants').then(m => console.log(m))"`
- Workspace consumers:
  - `pnpm --filter api test` (verifies `@the-dmz/shared` import via script)
  - `pnpm --filter web test`
- Optional: add a shared package unit test for runtime type guards.

