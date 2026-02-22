# Loading State Contract

This document describes the loading-state taxonomy and where each pending boundary lives in The DMZ application. This contract ensures consistent loading UI across all M1+ screens and prevents ad-hoc spinner implementations.

## Loading State Taxonomy

### State Types

The application distinguishes between four loading state types:

| Type           | Description                      | Default Surface | Default Timeout |
| -------------- | -------------------------------- | --------------- | --------------- |
| `initial`      | First route load / app bootstrap | `full-page`     | 30s             |
| `navigation`   | Intra-route-group navigation     | `panel`         | 15s             |
| `revalidation` | Background data refresh          | `inline`        | 10s             |
| `mutation`     | Form/action submission           | `full-page`     | 30s             |

### Loading Surfaces

- **full-page**: Renders over the entire viewport, blocking all interaction
- **panel**: Renders within a panel/region, allowing other areas to remain interactive
- **inline**: Renders within a component, minimal disruption to surrounding UI

### Interaction Policy

| Surface   | Interactive Elements     | Disabled Elements |
| --------- | ------------------------ | ----------------- |
| full-page | None (blocked)           | All               |
| panel     | Other panels, navigation | Current panel     |
| inline    | Everything               | None              |

### Timeout Behavior

Each state type has a configurable timeout. When exceeded:

- Display retry/help messaging
- Log analytics event for latency monitoring

## Route Group Boundaries

Each route group implements a loading boundary using SvelteKit's `$navigating` store:

### (public) — Public Routes

**Location:** `apps/web/src/routes/(public)/+layout.svelte`

**Loading Message:** "Loading..."

**Surface:** Minimal spinner (`variant="spinner"`, `size="sm"`)

**Accessibility:**

- `role="status"`
- `aria-live="polite"`

**CSS Class:** `.loading-boundary`

```svelte
{#if $navigating}
  <div class="loading-boundary" role="status" aria-live="polite">
    <LoadingState variant="spinner" size="sm" message="Loading..." label="Page loading" />
  </div>
{/if}
```

### (auth) — Authentication Routes

**Location:** `apps/web/src/routes/(auth)/+layout.svelte`

**Loading Message:** "Authenticating..."

**Surface:** Low-cognitive spinner (`variant="spinner"`, `size="sm"`)

**Accessibility:**

- `role="status"`
- `aria-live="polite"`

**CSS Class:** `.loading-boundary`

### (admin) — Admin Routes

**Location:** `apps/web/src/routes/(admin)/+layout.svelte`

**Loading Message:** "Loading dashboard..."

**Surface:** Enterprise-neutral spinner (`variant="spinner"`, `size="md"`)

**Accessibility:**

- `role="status"`
- `aria-live="polite"`

**CSS Class:** `.loading-boundary`

### (game) — Game Routes

**Location:** `apps/web/src/routes/(game)/+layout.svelte`

**Loading Message:** "Establishing secure connection..."

**Surface:** Terminal-style overlay with `dots` variant (`variant="dots"`, `size="lg"`)

**Behavior:** Full-panel overlay that hides game panels during navigation

**CSS Class:** `.loading-overlay`

## Implementation Details

### SvelteKit Integration

The loading boundaries use SvelteKit's built-in `$navigating` store:

```typescript
import { navigating } from '$app/stores';
```

This store automatically updates during:

- Route navigation
- Form submissions
- Data revalidation

### Accessibility Requirements

All loading states MUST include:

1. **Announcement:** `role="status"` with `aria-live="polite"` for screen reader announcement
2. **Label:** Descriptive `label` prop on `LoadingState` component
3. **Focus:** Focus remains predictable during loading transitions
4. **Motion:** Respects `prefers-reduced-motion` media query

### Theme Compatibility

Loading states use design tokens only (no hardcoded colors):

- Font: `var(--font-terminal)` for game, `var(--font-ui)` for others
- Colors: `var(--color-phosphor-green)` for game, standard text tokens for others
- Spacing: `var(--space-* tokens`) throughout

## Extending the Pattern

When adding new screens in M2+:

1. Import `LoadingState` from `$lib/ui/components/LoadingState.svelte`
2. Import `navigating` from `$app/stores`
3. Add conditional rendering using `$navigating` store
4. Include accessibility attributes
5. Use appropriate variant/size based on route group
6. Add unit tests for loading configuration
7. Add E2E test for loading-boundary verification

## Related Files

- **Types:** `apps/web/src/lib/types/loading.ts`
- **Component:** `apps/web/src/lib/ui/components/LoadingState.svelte`
- **Tests:** `apps/web/src/__tests__/types/loading.test.ts`
- **E2E:** `e2e/smoke/m1-foundation.spec.ts`

## References

- DD-07: UI/UX Terminal Aesthetic
- DD-08: Frontend Architecture SvelteKit
- BRD-13: UX/UI Accessibility
