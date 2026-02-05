ACCEPTED

Summary:
The changes fully implement the shared package required by Issue #4. The `packages/shared` workspace now has the expected structure (types/constants/utils with barrel exports), the initial shared types and error-code registry, and runtime type guards. Build configuration supports dual ESM/CJS output with subpath exports and source maps, aligning with the acceptance criteria.

Tests:
- pnpm --filter @the-dmz/shared test
- pnpm --filter @the-dmz/shared build
