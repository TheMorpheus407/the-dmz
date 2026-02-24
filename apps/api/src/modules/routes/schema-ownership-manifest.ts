import type { SchemaOwnershipManifest, SchemaOwnershipEntry } from './ownership.types.js';

const AUTH_SHARED_SOURCES = ['@the-dmz/shared/schemas', '@the-dmz/shared/auth'];

export const SCHEMA_OWNERSHIP_MANIFEST: SchemaOwnershipManifest = {
  ownership: [
    {
      module: 'auth',
      schemaNamespace: 'Auth',
      ownedSchemas: [
        'loginBodyJsonSchema',
        'registerBodyJsonSchema',
        'refreshBodyJsonSchema',
        'authResponseJsonSchema',
        'refreshResponseJsonSchema',
        'meResponseJsonSchema',
        'updateProfileBodyJsonSchema',
        'profileResponseJsonSchema',
        'webauthnChallengeRequestJsonSchema',
        'webauthnChallengeResponseJsonSchema',
        'webauthnRegistrationRequestJsonSchema',
        'webauthnRegistrationResponseJsonSchema',
        'webauthnVerificationRequestJsonSchema',
        'webauthnVerificationResponseJsonSchema',
        'mfaStatusResponseJsonSchema',
        'webauthnCredentialsListResponseJsonSchema',
        'mfaMethodJsonSchema',
        'mfaChallengeStateJsonSchema',
        'webauthnCredentialJsonSchema',
        'passwordResetRequestBodyJsonSchema',
        'passwordResetRequestResponseJsonSchema',
        'passwordChangeRequestBodyJsonSchema',
        'passwordChangeRequestResponseJsonSchema',
      ],
      ownedComponents: [
        'AuthLoginResponse',
        'AuthRegisterResponse',
        'AuthRefreshResponse',
        'AuthMeResponse',
        'AuthProfileResponse',
        'AuthUpdateProfileRequest',
        'AuthUser',
        'AuthSession',
        'WebauthnChallengeRequest',
        'WebauthnChallengeResponse',
        'WebauthnRegistrationRequest',
        'WebauthnRegistrationResponse',
        'WebauthnVerificationRequest',
        'WebauthnVerificationResponse',
        'MfaStatusResponse',
        'WebauthnCredentialsListResponse',
        'MfaMethod',
        'MfaChallengeState',
        'WebauthnCredential',
      ],
      componentPatterns: ['^Auth', '^Webauthn', '^Mfa'],
      sharedSources: AUTH_SHARED_SOURCES,
      exemptions: [],
    },
    {
      module: 'game',
      schemaNamespace: 'Game',
      ownedSchemas: ['gameSessionBootstrapResponseJsonSchema'],
      ownedComponents: ['GameSessionBootstrapResponse', 'GameSession', 'GamePlayer', 'GameState'],
      componentPatterns: ['^Game'],
      sharedSources: ['@the-dmz/shared/schemas'],
      exemptions: [],
    },
    {
      module: 'health',
      schemaNamespace: 'Health',
      ownedSchemas: [
        'healthQueryJsonSchema',
        'healthResponseJsonSchema',
        'readinessResponseJsonSchema',
      ],
      ownedComponents: ['HealthQuery', 'HealthResponse', 'ReadinessResponse'],
      componentPatterns: ['^Health', '^Readiness'],
      sharedSources: ['@the-dmz/shared/schemas'],
      exemptions: [],
    },
  ],
};

export function getSchemaOwnership(moduleName: string): SchemaOwnershipEntry | undefined {
  return SCHEMA_OWNERSHIP_MANIFEST.ownership.find((o) => o.module === moduleName);
}

export function isSchemaOwnedByModule(moduleName: string, schemaName: string): boolean {
  const ownership = getSchemaOwnership(moduleName);
  if (!ownership) return false;

  if (ownership.ownedSchemas.includes(schemaName)) {
    return true;
  }

  return false;
}

export function isComponentOwnedByModule(moduleName: string, componentName: string): boolean {
  const ownership = getSchemaOwnership(moduleName);
  if (!ownership) return false;

  if (ownership.ownedComponents.includes(componentName)) {
    return true;
  }

  for (const pattern of ownership.componentPatterns) {
    const regex = new RegExp(pattern);
    if (regex.test(componentName)) {
      return true;
    }
  }

  return false;
}

export function isSharedSourceAllowed(moduleName: string, source: string): boolean {
  const ownership = getSchemaOwnership(moduleName);
  if (!ownership) return false;

  return ownership.sharedSources.some((s) => source.startsWith(s));
}

export function getSchemaOwner(schemaName: string): string | undefined {
  for (const ownership of SCHEMA_OWNERSHIP_MANIFEST.ownership) {
    if (ownership.ownedSchemas.includes(schemaName)) {
      return ownership.module;
    }
  }
  return undefined;
}

export function getComponentOwner(componentName: string): string | undefined {
  for (const ownership of SCHEMA_OWNERSHIP_MANIFEST.ownership) {
    if (ownership.ownedComponents.includes(componentName)) {
      return ownership.module;
    }
    for (const pattern of ownership.componentPatterns) {
      const regex = new RegExp(pattern);
      if (regex.test(componentName)) {
        return ownership.module;
      }
    }
  }
  return undefined;
}

export function isSchemaRegistered(schemaName: string): boolean {
  return getSchemaOwner(schemaName) !== undefined;
}

export function isComponentRegistered(componentName: string): boolean {
  return getComponentOwner(componentName) !== undefined;
}
