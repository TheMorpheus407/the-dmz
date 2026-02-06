# Implementation Summary — Issue #13

## What I Changed
- Updated `apps/web/package.json` scripts to fix the two denied findings and keep Vitest infrastructure reliable from a clean checkout:
  - `test:coverage` now runs `svelte-kit sync`, scaffold checks, and `vitest run --coverage` directly.
  - `typecheck` now runs `svelte-kit sync` before `svelte-check`/`tsc`.
- Kept the existing `test` / `test:watch` `svelte-kit sync` pre-step behavior in place.

## Files Touched
- `apps/web/package.json`
- `logs/issues/13/implementation.md`

## Tests Run
- `pnpm --filter @the-dmz/web clean && pnpm --filter @the-dmz/web typecheck` (PASS)
- `pnpm --filter @the-dmz/web clean && pnpm --filter @the-dmz/web test` (PASS)
- `rm -rf apps/web/coverage && pnpm --filter @the-dmz/web test:coverage && [ -d apps/web/coverage ]` (PASS, coverage directory created)
- `pnpm --filter @the-dmz/api test` (PASS)
- `pnpm --filter @the-dmz/shared test` (PASS)
- `pnpm --filter @the-dmz/web test` (PASS)
- `pnpm test` (PASS)
- `pnpm test:coverage` (PASS)
- `pnpm --filter @the-dmz/api test:watch -- --run` (PASS)
- `pnpm --filter @the-dmz/web test:watch -- --run` (PASS)
- `pnpm --filter @the-dmz/shared test:watch -- --run` (PASS)

## Result
- Clean-state web `typecheck` no longer fails with missing `.svelte-kit/tsconfig.json`.
- Web coverage now runs through the declared `test:coverage` script and writes to `apps/web/coverage`.
- No commits were created.
