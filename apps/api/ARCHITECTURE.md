# API Architecture

## Module System

The API follows a modular monolith architecture as defined in [DD-09: Backend Architecture API](../docs/DD/09_backend_architecture_api.md).

## Module Boundary Policy

### Allowed Imports

For code under `apps/api/src/modules/*`:

1. **Module-to-Module**: A module may import another module **only** through that module's public `index.ts` export surface.

2. **Cross-Module Internal Imports**: Direct imports into sibling module internals (`*.service.ts`, `*.repo.ts`, `*.routes.ts`, `*.schema.ts`, `*.errors.ts`, `*.events.ts`, `*.types.ts`, `*.plugin.ts`) are **prohibited**.

3. **Shared Cross-Cutting**: Shared cross-cutting imports are allowed only from:
   - `apps/api/src/shared/*`
   - `packages/shared/*`

4. **No Circular Dependencies**: Module graph cycles are prohibited at the module level.

### Enforcement

Boundary rules are enforced via ESLint:

- `import-x/no-cycle`: Prevents circular dependencies
- `import-x/no-restricted-paths`: Enforces module boundary zones

Run the architecture gate locally:

```bash
pnpm --filter api lint:architecture
```

### Adding a New Module

When creating a new module in `apps/api/src/modules/{module-name}/`:

1. Create an `index.ts` that exports all public API surface
2. Ensure other modules only import through your `index.ts`
3. The ESLint configuration auto-detects new modules and applies boundary rules
