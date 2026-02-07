# ADR-002: Modular Monolith Architecture

## Status

Accepted

## Date

2026-02-07

## Context

The platform needs fast delivery in M0 while still supporting future scale and module extraction. Starting with distributed services introduces operational and coordination complexity before domain boundaries are proven.

We need strict internal module boundaries, clear ownership, and an extraction path once scale or isolation requirements are demonstrated in production.

References:

- BRD §8.3 Backend Architecture, §14.2 Technical Risks
- DD-09 Backend Architecture (modular monolith philosophy, boundary rules, extraction strategy)

## Decision

Adopt a modular monolith as the initial backend architecture: one deployable process with explicit module boundaries, typed contracts, and event-driven coordination for side effects. Keep extraction triggers defined, but do not split services until justified by measurable load, latency, or isolation demands.

## Consequences

### Positive

- Lower operational overhead during early product development.
- Easier local development, testing, and transactional consistency.
- Clear path to incremental service extraction without rewriting domain logic.

### Negative

- Single deployable unit increases shared blast radius during incidents.
- Requires active governance to prevent boundary erosion and hidden coupling.

### Risks

- Risk of devolving into an unstructured monolith if module contracts are not enforced.
- Risk of deferred extraction becoming expensive if observability and boundaries are weak.
- Mitigation: enforce module boundaries, event contracts, and extraction criteria from DD-09.

## Alternatives Considered

### Microservices from Day One

- **Pros:** Independent scaling/deployment and strong service isolation.
- **Cons:** High orchestration, observability, and consistency complexity too early.
- **Why rejected:** Premature decomposition slows delivery before product/module boundaries are validated.

### Traditional Layered Monolith (No Module Boundaries)

- **Pros:** Simplest initial implementation model.
- **Cons:** High long-term coupling and difficult extraction path.
- **Why rejected:** Does not preserve the planned evolution path to services when needed.
