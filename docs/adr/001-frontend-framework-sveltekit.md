# ADR-001: SvelteKit + Svelte 5 for Frontend

## Status

Accepted

## Date

2026-02-07

## Context

The product is a web-first application where most interaction is document and form driven (emails, worksheets, dashboards), not continuous canvas rendering. We also need strong accessibility support, SSR-capable routing, and a single frontend architecture that can serve both game and enterprise admin experiences.

The architecture requires a server-authoritative model with client-side mirrors and deterministic sync behavior to align with the event-sourced backend.

References:

- BRD §8.1 Platform Strategy, §8.2 High-Level Architecture, §8.7 Technology Stack, §14.2 Technical Risks
- DD-08 Frontend Architecture (executive summary, principles, stack, state architecture)

## Decision

Use SvelteKit 2.x with Svelte 5 runes as the official frontend framework. Build the UI as a hybrid rendering model where DOM handles the majority of gameplay and admin UX, while Canvas/WebGL is used only for targeted visual layers (facility visualization and effects).

## Consequences

### Positive

- Strong fit for DOM-heavy workflows and accessibility requirements.
- Compiled reactivity keeps runtime overhead low for frequent UI state updates.
- Route groups and shared infrastructure support one codebase for game and admin surfaces.

### Negative

- Smaller ecosystem and hiring pool than React-based stacks.
- Team must align on Svelte 5 rune conventions and architecture discipline.

### Risks

- Risk of uneven patterns if contributors mix framework styles.
- Risk that library availability lags compared with larger ecosystems.
- Mitigation: enforce TypeScript strict mode, shared UI patterns, and documented conventions in DD-08.

## Alternatives Considered

### React + Next.js

- **Pros:** Largest ecosystem, strong hiring pipeline, mature third-party integrations.
- **Cons:** Higher runtime overhead for highly interactive DOM transitions; more framework complexity for this use case.
- **Why rejected:** Lower product-fit for the project's DOM-heavy interaction profile and lean runtime goals.

### Vue + Nuxt

- **Pros:** Good DX, mature SSR story, strong component model.
- **Cons:** Adds another framework style not reflected in existing DDs and team decisions.
- **Why rejected:** SvelteKit was already selected in BRD/DD architecture with direct rationale tied to performance and UI behavior.
