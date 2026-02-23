# Module Registration Guide

This document describes how to add and configure backend modules in the DMZ: Archive Gate API.

## Overview

The API uses a **module manifest** (`apps/api/src/modules/manifest.ts`) as the single source of truth for module registration. This ensures:

- Deterministic module boot order
- Explicit dependency management
- Fail-fast on missing dependencies or cycles

## Adding a New Module

### 1. Create the Module

Create your module in `apps/api/src/modules/<module-name>/`:

```
modules/
  <module-name>/
    index.ts              # Barrel export (exports plugin)
    <module-name>.plugin.ts  # Fastify plugin
    <module-name>.routes.ts   # Route definitions
    ...
```

### 2. Export the Plugin

Your module's `index.ts` must export the Fastify plugin:

```typescript
// modules/my-module/index.ts
export { myModulePlugin } from './my-module.plugin.js';
```

### 3. Add to Manifest

Edit `apps/api/src/modules/manifest.ts` and add your module:

```typescript
export const MODULE_MANIFEST: ModuleManifest = {
  infrastructure: [...],
  modules: [
    // ... existing modules
    {
      name: 'myModule',
      pluginPath: './modules/my-module/index.js',
      routePrefix: '/my-module',  // optional
      dependencies: ['eventBus'], // list of module names
      startupFlags: {
        required: true,
        diagnostics: true,
      },
    },
  ],
};
```

## Declaring Dependencies

### Dependency Rules

- **Infrastructure plugins** (infrastructure, eventBus) must be listed in the `infrastructure` array
- **Domain modules** must be listed in the `modules` array
- Dependencies must reference other modules by their `name`
- Circular dependencies are detected and prevented at startup

### Common Dependencies

| Module    | Typical Dependencies     |
| --------- | ------------------------ |
| auth      | eventBus                 |
| game      | eventBus                 |
| analytics | auth, game-engine        |
| billing   | auth                     |
| admin     | auth, analytics, billing |

## Module Startup Flags

```typescript
startupFlags?: {
  required?: boolean;      // If false, module can fail without blocking startup
  diagnostics?: boolean;   // Enable detailed logging for this module
}
```

## Running the Module Integrity Gate

Validate the module manifest:

```bash
pnpm --filter api lint:modules
```

This checks:

- All modules in `modules/` are represented in manifest
- No unknown manifest entries
- Dependency graph is acyclic and resolvable

## Troubleshooting

### Error: "Module 'X' depends on unknown module 'Y'"

The module declares a dependency that doesn't exist in the manifest. Either:

1. Add the missing module to the manifest
2. Remove the incorrect dependency

### Error: "Dependency cycle detected"

Two or more modules depend on each other indirectly. Break the cycle by:

- Removing one dependency
- Restructuring the modules

### Error: "Module bootstrap failed"

A module failed to register. Check:

- The plugin path is correct
- The plugin exports properly
- All dependencies are satisfied

### Application hangs on startup

Run with debug logging:

```bash
DEBUG=* pnpm --filter api dev
```

## Architecture Tests

Module registration tests are located in:

- `apps/api/src/modules/__tests__/bootstrap.test.ts`

Run tests:

```bash
pnpm --filter api test
```
