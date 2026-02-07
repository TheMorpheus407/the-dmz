# ADR-004: PostgreSQL + RLS for Multi-tenancy

## Status

Accepted

## Date

2026-02-07

## Context

Enterprise requirements demand strict tenant isolation, auditable access controls, and compatibility with compliance frameworks. The platform also needs an operational database that supports relational consistency, append-only event storage, and flexible payload fields.

Tenant isolation must be enforced at the database layer, not only in application logic.

References:

- BRD FR-ENT-001 through FR-ENT-004, §8.5 Data Architecture, §10.6 API and Integration Principles
- DD-10 Database Schema and Data Model (PostgreSQL rationale, multi-tenancy, tenant_id + RLS)
- DD-11 Enterprise Multi-tenancy and Admin (isolation model and RLS enforcement)

## Decision

Use PostgreSQL 16+ as the operational system of record and enforce tenant isolation with row-level security on tenant-scoped tables. Require non-null `tenant_id` on tenant data and set tenant context per request (`app.tenant_id`) so RLS policies govern reads and writes. Use JSONB selectively for extensible payloads.

## Consequences

### Positive

- Database-enforced tenant isolation reduces reliance on application-layer correctness alone.
- ACID guarantees and mature tooling support reliable transactional workloads.
- JSONB enables controlled schema flexibility for evolving event and integration payloads.

### Negative

- RLS policy design and verification add ongoing complexity.
- Query planning and index strategy must be managed carefully to avoid tenant-scope performance regressions.

### Risks

- Risk of policy misconfiguration causing overexposure or unintended denials.
- Risk of missing tenant context in background or integration flows.
- Mitigation: fail-closed tenant context handling, automated isolation tests, and RLS policy review gates.

## Alternatives Considered

### Application-Level Tenant Filtering Only

- **Pros:** Less initial database policy setup.
- **Cons:** Higher exposure risk if any code path omits tenant filters.
- **Why rejected:** Fails defense-in-depth and compliance expectations.

### Dedicated Database Per Tenant from Day One

- **Pros:** Strong physical isolation.
- **Cons:** High operational cost and provisioning overhead for early-stage scale.
- **Why rejected:** Overly expensive for M0 while RLS-based isolation meets current phase requirements.
