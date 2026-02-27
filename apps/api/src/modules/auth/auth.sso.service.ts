import { eq, and } from 'drizzle-orm';

import type {
  SSOProviderConfig,
  SSOIdentityClaim,
  SSOTrustFailureReason,
} from '@the-dmz/shared/auth';
import { ErrorCodes } from '@the-dmz/shared/constants';

import { ssoConnections } from '../../db/schema/auth/sso-connections.js';
import { userSsoIdentities } from '../../db/schema/auth/user-sso-identities.js';
import { users } from '../../shared/database/schema/users.js';
import { getDatabaseClient } from '../../shared/database/connection.js';

const db = getDatabaseClient();

export class SSOError extends Error {
  code: string;
  statusCode: number;
  failureReason?: SSOTrustFailureReason | undefined;
  correlationId?: string | undefined;

  constructor(params: {
    message: string;
    code: string;
    statusCode: number;
    failureReason?: SSOTrustFailureReason | undefined;
    correlationId?: string | undefined;
  }) {
    super(params.message);
    this.name = 'SSOError';
    this.code = params.code;
    this.statusCode = params.statusCode;
    this.failureReason = params.failureReason;
    this.correlationId = params.correlationId;
  }
}

export interface SSOProvider {
  id: string;
  tenantId: string;
  provider: 'saml' | 'oidc';
  name: string;
  metadataUrl: string | null;
  clientId: string | null;
  clientSecretEncrypted: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SSOStateStore {
  generateState(): string;
  validateState(state: string): boolean;
  storeState(state: string, data: SSOStateData, expiresInSeconds: number): Promise<void>;
  getStateData(state: string): Promise<SSOStateData | null>;
  deleteState(state: string): Promise<void>;
}

export interface SSOStateData {
  providerId: string;
  redirectUri?: string;
  tenantId: string;
  nonce?: string;
  pkceCodeVerifier?: string;
}

export interface SSOAccountLinkingResult {
  outcome:
    | 'linked_existing'
    | 'linked_new'
    | 'linked_new_jit'
    | 'denied_existing_mismatch'
    | 'denied_no_email'
    | 'denied_tenant_mismatch'
    | 'denied_blocked'
    | 'denied_role_escalation';
  userId?: string;
  email?: string;
}

export const getSSOProvider = async (
  providerId: string,
  tenantId: string,
): Promise<SSOProvider | null> => {
  const result = await db
    .select()
    .from(ssoConnections)
    .where(and(eq(ssoConnections.id, providerId), eq(ssoConnections.tenantId, tenantId)))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const row = result[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    tenantId: row.tenantId,
    provider: row.provider as 'saml' | 'oidc',
    name: row.name,
    metadataUrl: row.metadataUrl,
    clientId: row.clientId,
    clientSecretEncrypted: row.clientSecretEncrypted,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

export const getActiveSSOProviders = async (tenantId: string): Promise<SSOProvider[]> => {
  const result = await db
    .select()
    .from(ssoConnections)
    .where(and(eq(ssoConnections.tenantId, tenantId), eq(ssoConnections.isActive, true)));

  return result.map((row) => ({
    id: row.id,
    tenantId: row.tenantId,
    provider: row.provider as 'saml' | 'oidc',
    name: row.name,
    metadataUrl: row.metadataUrl,
    clientId: row.clientId,
    clientSecretEncrypted: row.clientSecretEncrypted,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
};

export const findUserBySSOIdentity = async (
  tenantId: string,
  providerId: string,
  subject: string,
): Promise<string | null> => {
  const result = await db
    .select()
    .from(userSsoIdentities)
    .where(
      and(
        eq(userSsoIdentities.tenantId, tenantId),
        eq(userSsoIdentities.ssoProviderId, providerId),
        eq(userSsoIdentities.subject, subject),
      ),
    )
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const row = result[0];
  return row ? row.userId : null;
};

export const findUserByEmail = async (
  tenantId: string,
  email: string,
): Promise<{ userId: string; tenantId: string; email: string; role: string } | null> => {
  const result = await db
    .select({
      userId: users.userId,
      tenantId: users.tenantId,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.email, email.toLowerCase())))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const row = result[0];
  if (!row) {
    return null;
  }

  return {
    userId: row.userId,
    tenantId: row.tenantId,
    email: row.email,
    role: row.role,
  };
};

export const linkUserToSSOIdentity = async (
  userId: string,
  tenantId: string,
  providerId: string,
  subject: string,
  claims: SSOIdentityClaim,
): Promise<void> => {
  await db
    .insert(userSsoIdentities)
    .values({
      userId,
      tenantId,
      ssoProviderId: providerId,
      subject,
      email: claims.email?.toLowerCase() ?? null,
      displayName: claims.displayName ?? null,
      groups: claims.groups ? JSON.stringify(claims.groups) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();
};

export const createSSOUser = async (
  tenantId: string,
  email: string,
  displayName?: string,
  role: string = 'learner',
): Promise<string> => {
  const [user] = await db
    .insert(users)
    .values({
      tenantId,
      email: email.toLowerCase(),
      displayName: displayName ?? null,
      role,
      passwordHash: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ userId: users.userId });

  if (!user) {
    throw new Error('Failed to create SSO user');
  }

  return user.userId;
};

export const validateOIDCProviderTrust = async (
  providerConfig: SSOProviderConfig,
  idTokenClaims: Record<string, unknown>,
  expectedNonce?: string,
): Promise<{
  valid: boolean;
  failureReason?: SSOTrustFailureReason;
  claims?: SSOIdentityClaim;
}> => {
  if (providerConfig.type !== 'oidc') {
    return {
      valid: false,
      failureReason: 'configuration_error',
    };
  }

  const issuer = idTokenClaims['iss'] as string | undefined;
  const subject = idTokenClaims['sub'] as string | undefined;
  const audience = idTokenClaims['aud'] as string | string[] | undefined;
  const exp = idTokenClaims['exp'] as number | undefined;
  const iat = idTokenClaims['iat'] as number | undefined;
  const nonce = idTokenClaims['nonce'] as string | undefined;
  const email = idTokenClaims['email'] as string | undefined;
  const name = idTokenClaims['name'] as string | undefined;
  const groups = idTokenClaims['groups'] as string[] | undefined;

  if (!subject) {
    return {
      valid: false,
      failureReason: 'missing_required_claim',
    };
  }

  if (issuer !== providerConfig.issuer) {
    return {
      valid: false,
      failureReason: 'issuer_mismatch',
    };
  }

  const audienceValue = Array.isArray(audience) ? audience[0] : audience;
  if (audienceValue !== providerConfig.clientId) {
    return {
      valid: false,
      failureReason: 'audience_mismatch',
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const clockSkew = providerConfig.allowedClockSkewSeconds;

  if (exp && exp < now - clockSkew) {
    return {
      valid: false,
      failureReason: 'token_expired',
    };
  }

  if (iat && iat > now + clockSkew) {
    return {
      valid: false,
      failureReason: 'token_early',
    };
  }

  if (expectedNonce && nonce !== expectedNonce) {
    return {
      valid: false,
      failureReason: 'nonce_mismatch',
    };
  }

  return {
    valid: true,
    claims: {
      subject,
      email,
      displayName: name,
      groups,
    },
  };
};

export const validateSAMLAssertion = async (
  providerConfig: SSOProviderConfig,
  assertion: Record<string, unknown>,
): Promise<{
  valid: boolean;
  failureReason?: SSOTrustFailureReason;
  claims?: SSOIdentityClaim;
}> => {
  if (providerConfig.type !== 'saml') {
    return {
      valid: false,
      failureReason: 'configuration_error',
    };
  }

  const subject = assertion['subject'] as string | undefined;
  const email = assertion['email'] as string | undefined;
  const nameId = assertion['nameId'] as string | undefined;
  const attributes = assertion['attributes'] as Record<string, unknown> | undefined;

  if (!subject && !nameId) {
    return {
      valid: false,
      failureReason: 'missing_required_claim',
    };
  }

  return {
    valid: true,
    claims: {
      subject: subject || nameId || '',
      email,
      displayName: attributes?.['displayName'] as string | undefined,
      groups: attributes?.['groups'] as string[] | undefined,
    },
  };
};

export const resolveSSOAccountLinking = async (
  tenantId: string,
  providerId: string,
  claims: SSOIdentityClaim,
  defaultRole: string,
  allowedRoles: string[],
): Promise<SSOAccountLinkingResult> => {
  if (!claims.email) {
    return { outcome: 'denied_no_email' };
  }

  const existingUserId = await findUserBySSOIdentity(tenantId, providerId, claims.subject);
  if (existingUserId) {
    return {
      outcome: 'linked_existing',
      userId: existingUserId,
      email: claims.email,
    };
  }

  const existingUserByEmail = await findUserByEmail(tenantId, claims.email);
  if (existingUserByEmail) {
    return {
      outcome: 'linked_existing',
      userId: existingUserByEmail.userId,
      email: claims.email,
    };
  }

  if (!allowedRoles.includes(defaultRole)) {
    return { outcome: 'denied_role_escalation' };
  }

  return {
    outcome: 'linked_new_jit',
    email: claims.email,
  };
};

export const buildOIDCAuthorizationUrl = (
  providerConfig: SSOProviderConfig,
  clientId: string,
  redirectUri: string,
  state: string,
  nonce: string,
  _pkceCodeVerifier?: string,
): string => {
  if (providerConfig.type !== 'oidc') {
    throw new SSOError({
      message: 'Invalid provider type',
      code: ErrorCodes.SSO_CONFIGURATION_ERROR,
      statusCode: 500,
    });
  }

  const params = new URLSearchParams({
    response_type: providerConfig.responseType,
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: providerConfig.scopes.join(' '),
    state,
    nonce,
    ...(providerConfig.responseMode && { response_mode: providerConfig.responseMode }),
  });

  return `${providerConfig.authorizationEndpoint}?${params.toString()}`;
};

export const generateState = (): string => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64url');
};

export const generateNonce = (): string => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64url');
};

export const generatePKCECodeVerifier = (): string => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64url');
};

export const generatePKCECodeChallenge = async (codeVerifier: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};
