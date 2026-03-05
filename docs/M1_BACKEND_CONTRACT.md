# M1 Backend Coding-Standard Contract

This document defines the canonical coding standards for `apps/api` in M1.

## 1. Named Exports Only

All TypeScript modules in backend source paths MUST use named exports:

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

- `apps/api/src/**/*.ts` (except `__tests__/**`, `*.test.ts`, `*.generated.ts`, `*.d.ts`)

### Exceptions

- Test files (`*.test.ts`, `__tests__/**`) may use default exports
- Generated files (`*.generated.ts`, `json-schemas.generated.ts`) are excluded
- Type declaration files (`*.d.ts`) are excluded

### Module Entrypoints

Module public interfaces are exposed through module `index.ts` entrypoints, consistent with DD-09 module layout and boundary intent.

## 2. Allow-List: Generated/Vendor Files

The following paths are exempt from the above rules:

| Path Pattern                   | Reason              |
| ------------------------------ | ------------------- |
| `**/*.generated.ts`            | Auto-generated code |
| `**/json-schemas.generated.ts` | Drizzle output      |
| `**/__tests__/**`              | Test fixtures       |
| `**/*.test.ts`                 | Test files          |
| `**/*.d.ts`                    | Type declarations   |

## 3. Enforcement

Run the contract gate locally:

```bash
# Check contracts
pnpm --filter api lint:contracts

# Full quality gate
pnpm lint && pnpm test && pnpm typecheck
```

## 4. References

- SOUL.md: Project standards (named exports over default exports)
- DD-09: Backend architecture (module structure, boundary rules)
- DD-14: Integration infrastructure (integration invariants and drift prevention)
- BRD-14: Tech architecture (modular backend architecture governance)
