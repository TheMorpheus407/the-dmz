import type { EventOwnershipManifest } from '@the-dmz/shared/contracts';

export const EVENT_OWNERSHIP_MANIFEST: EventOwnershipManifest = {
  events: [
    {
      eventType: 'auth.user.created',
      owningModule: 'auth',
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
    {
      eventType: 'auth.user.updated',
      owningModule: 'auth',
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
    {
      eventType: 'auth.user.deactivated',
      owningModule: 'auth',
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
    {
      eventType: 'auth.session.created',
      owningModule: 'auth',
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
    {
      eventType: 'auth.session.revoked',
      owningModule: 'auth',
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
    {
      eventType: 'auth.login.failed',
      owningModule: 'auth',
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
    {
      eventType: 'game.session.started',
      owningModule: 'game',
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
  ],
  versionPolicy: {
    allowedChanges: 'additive',
    breakingVersions: [],
    maxVersion: 10,
  },
  lastUpdated: new Date().toISOString(),
};

export function getEventOwnership(eventType: string) {
  return EVENT_OWNERSHIP_MANIFEST.events.find((e) => e.eventType === eventType);
}

export function isEventOwnedByModule(eventType: string, moduleName: string): boolean {
  const ownership = getEventOwnership(eventType);
  return ownership?.owningModule === moduleName;
}

export function isCrossModuleEmissionAllowed(eventType: string, emittingModule: string): boolean {
  const ownership = getEventOwnership(eventType);
  if (!ownership) {
    return false;
  }

  if (ownership.owningModule === emittingModule) {
    return true;
  }

  const exemptions = ownership.exemptions;
  if (exemptions && exemptions.some((e) => e.module === emittingModule)) {
    return true;
  }

  return false;
}

export function getAllOwnedEvents(
  moduleName: string,
): Array<{ eventType: string; version: number }> {
  return EVENT_OWNERSHIP_MANIFEST.events
    .filter((e) => e.owningModule === moduleName)
    .map((e) => ({ eventType: e.eventType, version: e.version }));
}

export function validateEventVersion(
  eventType: string,
  version: number,
): {
  valid: boolean;
  error?: string;
} {
  const ownership = getEventOwnership(eventType);
  if (!ownership) {
    return { valid: false, error: `Event type "${eventType}" is not registered` };
  }

  const policy = EVENT_OWNERSHIP_MANIFEST.versionPolicy;

  if (policy.breakingVersions?.includes(version)) {
    return {
      valid: false,
      error: `Version ${version} of "${eventType}" is a breaking change and not allowed`,
    };
  }

  if (policy.maxVersion && version > policy.maxVersion) {
    return {
      valid: false,
      error: `Version ${version} exceeds maximum allowed version ${policy.maxVersion} for "${eventType}"`,
    };
  }

  return { valid: true };
}
