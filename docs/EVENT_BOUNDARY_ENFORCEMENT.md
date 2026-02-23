# Event Boundary Enforcement

This document describes the event ownership registry and how contributors should work with it.

## Overview

The DMZ uses a canonical module-owned DomainEvent registry to enforce cross-module event emission boundaries. This ensures:

- Events are owned by a single module
- Cross-module emission requires explicit exemptions
- Metadata invariants are enforced
- Sensitive data is excluded from event payloads
- Version compatibility rules are followed

## Registry Location

The event ownership manifest is located at:

```
apps/api/src/shared/events/ownership-manifest.ts
```

## Registering a New Module Event

When creating a new event type in a module:

1. **Define the event** in your module's `*.events.ts` file:

   ```typescript
   export const MYMODULE_EVENTS = {
     MY_EVENT: 'mymodule.my.event',
   } as const;
   ```

2. **Add to ownership manifest**: Add the event to `EVENT_OWNERSHIP_MANIFEST.events`:

   ```typescript
   {
     eventType: 'mymodule.my.event',
     owningModule: 'mymodule',
     version: 1,
     requiredMetadata: [
       'eventId',
       'eventType',
       'timestamp',
       'correlationId',
       'tenantId',
       'userId',
       'source',
       'version',
     ],
   },
   ```

3. **Run validation**:
   ```bash
   pnpm --filter api lint:event-boundaries
   ```

## Evolving Event Versions Safely

### Version Policy

The current policy is `additive`, meaning:

- New optional fields can be added
- Existing fields cannot be removed
- Field types cannot be changed incompatibly

### Adding a New Version

1. Update the event in the ownership manifest:

   ```typescript
   {
     eventType: 'mymodule.my.event',
     owningModule: 'mymodule',
     version: 2,  // Increment version
     // ...
   },
   ```

2. Update your event factory to use the new version

3. Run validation to ensure compatibility

### Breaking Changes

Breaking changes require:

1. Adding the version to `versionPolicy.breakingVersions`
2. Documenting the migration path
3. Updating all consumers

## Requesting Cross-Module Emission Exemptions

Sometimes another module legitimately needs to emit your module's event. To request an exemption:

1. Add an `exemptions` array to the event ownership:

   ```typescript
   {
     eventType: 'auth.user.created',
     owningModule: 'auth',
     version: 1,
     // ...
     exemptions: [
       {
         module: 'admin',
         justification: 'Admin can trigger user creation for provisioning',
         approvedBy: 'tech-lead',
       },
     ],
   },
   ```

2. Run validation to confirm

## Running the Event Boundary Gate

### Local Development

```bash
# Run only event boundary checks
pnpm --filter api lint:event-boundaries

# Run full lint
pnpm --filter api lint
```

### CI/Pre-commit

The event boundary check is automatically included in the main `lint` command and will fail builds if any violations are detected.

## Troubleshooting

### "Unregistered event type"

- The event is not in the ownership manifest
- Add it following the registration steps above

### "Module X emits event owned by Y without exemption"

- Either the owning module should emit this event, or
- Request an exemption in the ownership manifest

### "Forbidden sensitive field found in payload"

- Remove the sensitive field from the event payload
- See `SENSITIVE_PAYLOAD_FIELDS` in `@the-dmz/shared/contracts` for the list

### "Missing required metadata field"

- Ensure your DomainEvent includes all required metadata `REQUIRE fields
- SeeD_METADATA_FIELDS`in`@the-dmz/shared/contracts`

## Related Documents

- [DD-09: Backend Architecture API](docs/DD/09_backend_architecture_api.md)
- [Auth Events](docs/auth-events.md)
- [Event Contract Evolution](docs/EVENT_CONTRACT_EVOLUTION.md)
