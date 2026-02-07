# ADR-003: Event Sourcing as Canonical State

## Status

Accepted

## Date

2026-02-07

## Context

Gameplay, compliance reporting, and enterprise audit all require deterministic replay. The system must support reproducible session outcomes, sequence-safe multi-client interaction, and detailed audit trails for training evidence.

A mutable state-only model is insufficient for replayability and forensic reconstruction.

References:

- BRD §8.2 High-Level Architecture, §8.5 Data Architecture, §9.4 Data Retention & Compliance, §14.2 Technical Risks
- DD-01 Core Loop and State Machine (determinism, replay, snapshots)
- DD-10 Database Schema and Data Model (event-sourcing principles)

## Decision

Treat the immutable event log as the canonical source of truth for game state. Derive current state through reducers and maintain snapshots for fast reads and recovery. Use deterministic sequencing and replay rules across the core loop.

## Consequences

### Positive

- Full replayability for audits, coaching, and incident investigation.
- Deterministic behavior across devices and reconnect scenarios.
- Strong compliance evidence through immutable action history.

### Negative

- Higher implementation complexity than CRUD-first state mutation.
- Requires careful event schema evolution and replay compatibility management.

### Risks

- Risk of reducer drift breaking deterministic replay across versions.
- Risk of performance degradation if snapshot and partition strategy is neglected.
- Mitigation: enforce sequence rules, snapshot cadence, and replay verification tests.

## Alternatives Considered

### Mutable CRUD State with Audit Table

- **Pros:** Simpler data model and faster initial implementation.
- **Cons:** Audit logs are secondary and can diverge from operational truth; replay is incomplete.
- **Why rejected:** Does not satisfy deterministic replay and compliance-grade auditability requirements.

### Snapshot-Only State Persistence

- **Pros:** Fast reads and simpler restore flow.
- **Cons:** Loses full historical causality and granular forensic traceability.
- **Why rejected:** Insufficient for enterprise evidence and deterministic reconstruction.
