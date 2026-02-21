# Auth Lifecycle Events

This document describes the domain events published by the auth module via the in-process event bus.

## Overview

The auth module emits typed domain events for all major authentication lifecycle actions. These events can be consumed by other modules (analytics, admin audit, threat-engine) without direct coupling to auth internals.

## Event Types

| Event Type              | Description                                        | Payload Fields                                 |
| ----------------------- | -------------------------------------------------- | ---------------------------------------------- |
| `auth.user.created`     | New user registration                              | `userId`, `email`, `tenantId`                  |
| `auth.user.updated`     | User profile update                                | `userId`, `email`, `tenantId`, `changes[]`     |
| `auth.user.deactivated` | User account deactivation                          | `userId`, `email`, `tenantId`                  |
| `auth.session.created`  | New session established (login/register/refresh)   | `sessionId`, `userId`, `tenantId`              |
| `auth.session.revoked`  | Session invalidated (logout/expire/revoke/refresh) | `sessionId`, `userId`, `tenantId`, `reason`    |
| `auth.login.failed`     | Failed login attempt                               | `tenantId`, `email`, `reason`, `correlationId` |

## Event Flow Mapping

### Registration

```
POST /api/v1/auth/register
  -> auth.user.created
  -> auth.session.created
```

### Login (success)

```
POST /api/v1/auth/login (valid credentials)
  -> auth.session.created
```

### Login (failure)

```
POST /api/v1/auth/login (invalid credentials)
  -> auth.login.failed
```

### Token Refresh (rotation)

```
POST /api/v1/auth/refresh
  -> auth.session.created (new session)
  -> auth.session.revoked (old session, reason: refresh_rotation)
```

### Logout

```
DELETE /api/v1/auth/logout
  -> auth.session.revoked (reason: logout)
```

## Payload Safety

Event payloads **never** include:

- Passwords (plaintext or hashed)
- Token values (access or refresh)
- Token hashes
- MFA secrets
- Internal error details

Event payloads **always** include:

- `tenantId` (when available)
- `userId` (when available)
- `sessionId` (for session events)

## Intended Consumers

### Analytics Module

- Track user registration and login rates
- Monitor session lifecycle

### Admin Audit Module

- Log all authentication events for compliance
- Track failed login attempts (potential security events)

### Threat Engine Module

- Detect unusual login patterns
- Identify potential brute-force attempts
- Monitor session anomalies

## Consuming Events

Subscribe to auth events via the event bus:

```typescript
import { AUTH_EVENTS } from './modules/auth/auth.events.js';

app.eventBus.subscribe(AUTH_EVENTS.USER_CREATED, (event) => {
  console.log('New user:', event.payload);
});

app.eventBus.subscribe(AUTH_EVENTS.LOGIN_FAILED, (event) => {
  console.log('Failed login:', event.payload);
});
```

## Event Schema

All auth events conform to the shared `DomainEvent` interface:

```typescript
interface DomainEvent<T = unknown> {
  eventId: string;
  eventType: string;
  timestamp: string;
  correlationId: string;
  tenantId: string;
  userId?: string;
  source: 'auth-module';
  version: number;
  payload: T;
}
```

## Testing

Run auth event tests:

```bash
pnpm --filter api test -- --grep "auth events"
```

All event tests are located in `apps/api/src/modules/auth/__tests__/auth.events.test.ts`.
