# M1 Frontend Coding-Standard Contract

This document defines the canonical coding standards for `apps/web` and `packages/shared` in M1.

## 1. Svelte 5 Runes Requirement

All Svelte components (`.svelte` files) in scoped web source paths MUST use Svelte 5 runes for reactivity:

### Required Patterns

```svelte
<script lang="ts">
  // State - use $state
  let count = $state(0);

  // Derived - use $derived
  let doubled = $derived(count * 2);

  // Effects - use $effect
  $effect(() => {
    console.log('Count changed:', count);
  });

  // Props - use $props
  let { name = 'default' }: { name?: string } = $props();
</script>
```

### Prohibited Patterns

The following legacy reactive syntax is NOT allowed in M1 surface code:

| Prohibited                             | Reason                             |
| -------------------------------------- | ---------------------------------- |
| `$:` reactive statements               | Use `$derived` or `$effect`        |
| `export let` props                     | Use `$props()`                     |
| `$: { ... }` reactive blocks           | Use `$derived.by()`                |
| `writable()` store for component state | Use `$state`                       |
| `$store` auto-subscription             | Use `$state` or destructure stores |

### Exceptions

- Legacy stores in `apps/web/src/lib/stores/` are permitted for cross-component state management
- Test fixtures in `__tests__` and `*.test.svelte` may use legacy patterns

### Scoped Paths

The runes requirement applies to:

- `apps/web/src/lib/ui/components/*.svelte`
- `apps/web/src/routes/**/*.svelte`
- `apps/web/src/lib/game/**/*.svelte`
- `apps/web/src/lib/admin/**/*.svelte`

## 2. Named Exports Only

All TypeScript modules in scoped source paths MUST use named exports:

```typescript
// ✅ Correct
export function helper(): void {}
export class Service {}
export const CONSTANT = 'value';

// ❌ Wrong
export default function helper() {}
export default class Service {}
export default CONSTANT;
```

### Scoped Paths

The named-export requirement applies to:

- `apps/web/src/lib/**/*.ts` (except `__tests__/**`, `*.test.ts`, `*.stories.ts`)
- `packages/shared/src/**/*.ts` (except `__tests__/**`, `*.test.ts`, `generated/**`)

### Exceptions

- Storybook stories (`*.stories.ts`) may use default exports
- Test files (`*.test.ts`, `__tests__/**`) may use default exports
- Generated files (`*.generated.ts`, `json-schemas.generated.ts`) are excluded

## 3. Allow-List: Generated/Vendor Files

The following paths are exempt from the above rules:

| Path Pattern                   | Reason               |
| ------------------------------ | -------------------- |
| `**/*.stories.ts`              | Storybook convention |
| `**/*.generated.ts`            | Auto-generated code  |
| `**/json-schemas.generated.ts` | Drizzle output       |
| `**/__tests__/**`              | Test fixtures        |
| `**/*.test.ts`                 | Test files           |
| `**/*.test.svelte`             | Test components      |

## 4. Enforcement

Run the contract gate locally:

```bash
# Check contracts
pnpm --filter web lint:contracts

# Full quality gate
pnpm lint && pnpm test && pnpm typecheck
```

## 5. References

- SOUL.md: Project standards
- DD-08: Frontend architecture (SvelteKit)
- DD-07: UI/UX terminal aesthetic
