# Frontend Surface Boundary Policy

## Overview

This document defines the canonical frontend boundary policy for `apps/web` to enforce separation between game and admin surfaces. This policy ensures that game and admin codebases remain independently evolvable, testable, and CI-enforceable.

## Scope

This policy applies to all code under:

- `apps/web/src/lib/*`
- `apps/web/src/routes/*`

## Boundary Rules

### 1. Surface Isolation

- **`src/lib/game/*`** must not import from `src/lib/admin/*` internals
- **`src/lib/admin/*`** must not import from `src/lib/game/*` internals
- Route-group surfaces must remain separated:
  - `(game)` routes consume game-layer modules
  - `(admin)` routes consume admin-layer modules

### 2. Allowed Cross-Surface Imports

Shared/neutral layers that can be imported from any surface:

- `src/lib/ui/*` — Shared UI components
- `src/lib/api/*` — API client layer
- `src/lib/stores/*` — Cross-cutting stores
- `src/lib/utils/*` — Utility functions
- `src/lib/config/*` — Environment configuration
- `src/lib/server/*` — Server-side utilities
- `@the-dmz/shared` — Shared types and constants

### 3. Public Interface Pattern

Each surface module must expose its public interface through an `index.ts` file:

```typescript
// apps/web/src/lib/game/index.ts
export * from './state';
export * from './services';
```

Cross-surface imports should only use these public index files, not internal modules:

```typescript
// Allowed (imports public interface)
import { GameState } from '$lib/game';

// Not allowed (imports internal module)
import { ActionQueue } from '$lib/game/services/action-queue';
```

### 4. Circular Dependencies

Cross-surface circular dependencies are prohibited. The `import-x/no-cycle` ESLint rule enforces this globally.

## Enforcement

### Static Checks

The boundary is enforced through ESLint rules in `eslint.config.mjs`:

1. **`import-x/no-restricted-paths`**: Blocks illegal cross-surface imports between game and admin internals
2. **`import-x/no-cycle`**: Blocks circular dependencies across all modules

### Architecture Gate Command

Run the architecture check explicitly:

```bash
pnpm --filter web lint:architecture
```

This command lints only the game and admin library directories to verify boundary compliance.

### CI Integration

The `lint:architecture` task is defined in `turbo.json` and can be wired into the CI pipeline:

```bash
pnpm lint:architecture
```

## Verification

### Test Invalid Import

To verify the gate catches invalid imports, create a test file that attempts cross-surface imports:

```typescript
// apps/web/src/lib/game/test-boundary.ts
// This should fail linting:
import { something } from '$lib/admin/services';
```

### Run Architecture Check

```bash
# Check game surface
pnpm --filter web lint:architecture

# Or run full lint
pnpm --filter web lint
```

## Related Documents

- [DD-08: Frontend Architecture & SvelteKit Design Specification](./DD/08_frontend_architecture_sveltekit.md)
- [DD-07: UI/UX Terminal Aesthetic](./DD/07_ui_ux_terminal_aesthetic.md)
- [Issue #57: Backend Module Boundary Enforcement](./issues/57)

## Policy Evolution

This policy should be reviewed and updated as the frontend architecture evolves. Key review triggers:

- Addition of new surface modules
- Introduction of new shared layers
- Significant refactoring of existing surfaces
