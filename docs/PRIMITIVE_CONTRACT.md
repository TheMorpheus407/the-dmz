# UI Primitive Contract

This document explains the UI primitive behavior contract system for The DMZ project, including how to maintain and validate the contract.

## Overview

The primitive contract system ensures that shared UI primitives cannot silently drift in interaction states, semantics, or shell usage as the project evolves. It provides automated enforcement through tests and validation scripts.

## Contract Manifest Location

The canonical primitive contract is defined in:

```
apps/web/src/lib/ui/primitive-contract.ts
```

This file contains:

- `REQUIRED_PRIMITIVES`: List of required primitives (Button, Panel, Badge, Tabs, Modal, LoadingState)
- `REQUIRED_THEMES`: Required themes (green, amber, high-contrast, enterprise)
- `PRIMITIVE_STATES`: Required interaction states for each primitive
- `SHELL_PRIMITIVE_REQUIREMENTS`: Required primitive usage for each route shell
- `SEMANTIC_CONTRACTS`: ARIA and keyboard behavior contracts for complex primitives

## Required Primitives

| Primitive    | States                                           | Semantic Contract                         |
| ------------ | ------------------------------------------------ | ----------------------------------------- |
| Button       | default, hover, focus-visible, disabled, loading | keyboard navigation                       |
| Panel        | default                                          | -                                         |
| Badge        | default                                          | -                                         |
| Tabs         | default, focus-visible, disabled, active         | tablist/tab/tabpanel roles, keyboard nav  |
| Modal        | default, open, close                             | focus trap, Escape close, aria-labelledby |
| LoadingState | loading, default                                 | aria-live, aria-busy                      |

## Required Themes

- `green` - Default game theme
- `amber` - Alternative theme
- `high-contrast` - Accessibility theme
- `enterprise` - Admin/auth theme

## Local Validation Commands

Before committing changes, run the following commands to validate contract compliance:

### Run All Contract Tests

```bash
pnpm --filter web test:ui-contract
```

This command:

1. Validates primitive catalog parity (story states match contract)
2. Validates shell primitive usage (shells use shared primitives)
3. Runs state-matrix tests (primitives × themes × states)
4. Runs semantic contract tests (Tabs, Modal, LoadingState)

### Run Individual Validations

```bash
# Check catalog parity
node scripts/check-primitive-catalog.mjs

# Check shell primitive usage
node scripts/check-shell-primitives.mjs

# Run state-matrix tests only
pnpm --filter web vitest run src/__tests__/components/primitive-state-matrix.test.ts

# Run semantic contract tests only
pnpm --filter web vitest run src/__tests__/components/primitive-semantic-contracts.test.ts
```

## Updating the Contract

When primitives evolve, follow these steps to update the contract safely:

### 1. Update the Contract Manifest

Edit `apps/web/src/lib/ui/primitive-contract.ts`:

- Add new primitives to `REQUIRED_PRIMITIVES`
- Add new states to `PRIMITIVE_STATES`
- Add new themes to `REQUIRED_THEMES`
- Update `SHELL_PRIMITIVE_REQUIREMENTS` if shell usage changes
- Update `SEMANTIC_CONTRACTS` for new ARIA/keyboard requirements

### 2. Add Story States

If you add new states to a primitive, add corresponding stories in:

```
apps/web/src/lib/ui/components/__stories__/{Primitive}.stories.ts
```

### 3. Run Contract Validation

```bash
pnpm --filter web test:ui-contract
```

Fix any failures before committing.

### 4. Update Documentation

Update this document if contract structure changes.

## CI/Turbo Integration

The primitive contract is integrated into the Turbo/CI pipeline:

- `test:ui-contract` task runs as part of `lint` in turbo.json
- Failures will block PR validation
- The task is cached for performance

## Troubleshooting

### "Missing story states" error

Add the missing story exports to the primitive's story file. Stories must match the states defined in `STORY_STATE_REQUIREMENTS` in the contract manifest.

### "Missing required primitive imports" error

Import the required primitive in the route shell file from `$lib/ui/components/{Primitive}.svelte`.

### Test failures in state-matrix

Ensure the primitive can render in all required themes and states. Check CSS custom property bindings are correct.

### Semantic contract test failures

For Tabs, Modal, or LoadingState, verify:

- ARIA roles are correctly applied
- Keyboard behavior works as specified
- Focus management is properly implemented
