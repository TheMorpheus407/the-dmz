# ADR-005: Shared-schema-first Tenancy Model

## Status

Accepted

## Date

2026-02-07

## Context

M0 prioritizes delivery speed, predictable operations, and low provisioning friction while maintaining strict tenant isolation. Early enterprise architecture decisions require `tenant_id` everywhere and RLS enforcement, but do not require dedicated infrastructure for all tenants immediately.

The roadmap explicitly defers dedicated schema/database rollout until larger contracts and compliance constraints justify that operational complexity.

References:

- BRD FR-ENT-001 through FR-ENT-004 (hybrid isolation goals and provisioning requirements)
- docs/MILESTONES.md Key Architectural Decisions (`Shared-schema first`)
- DD-10 Database Schema and Data Model (tenant model and RLS baseline)
- DD-11 Enterprise Multi-tenancy and Admin (shared, dedicated schema, and dedicated database tiers)

## Decision

Use a shared-schema tenancy model by default in early phases, enforced by mandatory `tenant_id` and RLS. Keep migration paths to dedicated schema and dedicated database defined but deferred to later milestones (target: M15 or first contract that requires stronger isolation).

## Consequences

### Positive

- Fast onboarding and lower operational overhead in the bootstrap phase.
- Simplifies migrations and schema management while product fit is still being validated.
- Keeps tenancy discipline in place from day one through tenant-aware data design.

### Negative

- No physical isolation boundary for most tenants in early milestones.
- Strong dependence on correct RLS, tenant context propagation, and tenant-aware cache design.

### Risks

- Risk of cross-tenant exposure if RLS or tenant context controls regress.
- Risk of costly late migration if dedicated-tier triggers are not tracked early.
- Mitigation: enforce automated isolation tests, explicit migration criteria, and periodic tiering reviews.

## Alternatives Considered

### Hybrid Tiers from Day One (Shared + Dedicated Schema + Dedicated DB)

- **Pros:** Early availability of stronger isolation tiers.
- **Cons:** Higher operational and provisioning complexity before demand is proven.
- **Why rejected:** Not justified at M0 bootstrap scale; deferral preserves focus and delivery speed.

### Dedicated Schema/Database for Every Tenant

- **Pros:** Maximum isolation by default.
- **Cons:** Expensive, slower tenant provisioning, and unnecessary complexity for early-stage footprint.
- **Why rejected:** Contradicts roadmap efficiency goals and onboarding targets for initial milestones.
