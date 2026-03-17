import * as crypto from 'crypto';

import { eq, and } from 'drizzle-orm';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

import type {
  SSOProviderConfig,
  SSOIdentityClaim,
  SSOTrustFailureReason,
  SAMLProviderConfig,
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
  idpCertificate: string | null;
  spPrivateKey: string | null;
  spCertificate: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SAMLConfig {
  issuer: string;
  ssoUrl: string;
  certificate: string;
  wantAssertionsSigned: boolean;
  wantMessagesSigned: boolean;
  signatureAlgorithm: string;
  allowedClockSkewSeconds: number;
}

export interface SAMLAttributeMapping {
  email: string;
  firstName: string;
  lastName: string;
  groups: string;
  department: string;
  title: string;
}

export interface RoleMappingRule {
  idpGroup: string;
  rbRole: string;
}

export interface SAMLIdPMetadata {
  issuer: string;
  entityId: string;
  ssoUrl: string;
  certificates: string[];
  wantAssertionsSigned: boolean;
  wantMessagesSigned: boolean;
}

export interface SAMLValidationResult {
  valid: boolean;
  failureReason?: SSOTrustFailureReason;
  claims?: SSOIdentityClaim;
  sessionIndex?: string;
}

interface SAMLXMLEntityDescriptor {
  '@_entityID'?: string;
  IDPSSODescriptor?: SAMLXMLIDPSSODescriptor;
  Extensions?: {
    IDPAttribute?: {
      '@_Name'?: string;
    };
  };
}

interface SAMLXMLIDPSSODescriptor {
  '@_WantAssertionsSigned'?: string;
  '@_WantAuthnRequestsSigned'?: string;
  SingleSignOnService?: SAMLXMLSingleSignOnService | SAMLXMLSingleSignOnService[];
  KeyDescriptor?: SAMLXMLKeyDescriptor | SAMLXMLKeyDescriptor[];
  Extensions?: Record<string, unknown>;
}

interface SAMLXMLSingleSignOnService {
  '@_Location'?: string;
  '@_Binding'?: string;
}

interface SAMLXMLKeyDescriptor {
  '@_use'?: string;
  KeyInfo?: {
    X509Data?: {
      X509Certificate?: string | string[];
    };
  };
}

interface SAMLXMLResponse {
  '@_Destination'?: string;
  '@_ID'?: string;
  '@_IssueInstant'?: string;
  Issuer?: string | { '#text'?: string };
  Status?: {
    StatusCode?: {
      '@_Value'?: string;
    };
  };
  Signature?: SAMLXMLSignature;
  Assertion?: SAMLXMLAssertion;
  EncryptedAssertion?: unknown;
}

interface SAMLXMLSignature {
  SignedInfo?: {
    Reference?: {
      '@_URI'?: string;
    };
  };
  SignatureValue?: string;
}

interface SAMLXMLAssertion {
  '@_ID'?: string;
  Signature?: SAMLXMLSignature;
  Conditions?: {
    '@_NotBefore'?: string;
    '@_NotOnOrAfter'?: string;
  };
  Subject?: {
    NameID?: string | { '#text'?: string };
  };
  AttributeStatement?: {
    Attribute?: SAMLXMLAttribute | SAMLXMLAttribute[];
  };
}

interface SAMLXMLAttribute {
  '@_Name'?: string;
  AttributeValue?: unknown[];
}

const DEFAULT_ATTRIBUTE_MAPPING: SAMLAttributeMapping = {
  email: 'email',
  firstName: 'firstName',
  lastName: 'lastName',
  groups: 'groups',
  department: 'department',
  title: 'title',
};

interface SAMLXMLEncryptedAssertion {
  EncryptionMethod?: {
    '@_Algorithm'?: string;
  };
  KeyInfo?: {
    XencEncryptedKey?: {
      EncryptionMethod?: {
        '@_Algorithm'?: string;
      };
      CipherData?: {
        CipherValue?: string;
      };
    };
  };
  CipherData?: {
    CipherValue?: string;
  };
}

const decryptEncryptedAssertion = (
  encryptedAssertion: SAMLXMLEncryptedAssertion,
  spPrivateKey: string,
): SAMLXMLAssertion | null => {
  try {
    const encryptedData = encryptedAssertion.CipherData?.CipherValue;
    if (!encryptedData) {
      return null;
    }

    const encryptedKey = encryptedAssertion.KeyInfo?.XencEncryptedKey;
    let decryptionKey: crypto.KeyObject;

    if (spPrivateKey) {
      const privateKeyBody = spPrivateKey
        .replace(/-----BEGIN PRIVATE KEY-----/, '')
        .replace(/-----END PRIVATE KEY-----/, '')
        .replace(/-----BEGIN RSA PRIVATE KEY-----/, '')
        .replace(/-----END RSA PRIVATE KEY-----/, '')
        .replace(/\s/g, '');

      const keyBuffer = Buffer.from(privateKeyBody, 'base64');
      decryptionKey = crypto.createPrivateKey({
        key: keyBuffer,
        type: 'pkcs8',
      });
    } else {
      return null;
    }

    const encryptedKeyCipher = encryptedKey?.CipherData?.CipherValue;
    if (encryptedKeyCipher) {
      const decryptedKey = crypto.privateDecrypt(
        {
          key: decryptionKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        Buffer.from(encryptedKeyCipher, 'base64'),
      );

      const algorithm = encryptedAssertion.EncryptionMethod?.['@_Algorithm'];
      if (algorithm !== 'http://www.w3.org/2009/xmlenc11#aes256-gcm') {
        return null;
      }

      const iv = Buffer.from(encryptedData.slice(0, 12), 'base64');
      const authTag = Buffer.from(encryptedData.slice(encryptedData.length - 24), 'base64');
      const cipherText = Buffer.from(encryptedData.slice(12, encryptedData.length - 24), 'base64');

      const aesDecipher = crypto.createDecipheriv('aes-256-gcm', decryptedKey, iv, {
        authTagLength: 16,
      });

      const decrypted = Buffer.concat([aesDecipher.update(cipherText), aesDecipher.final()]);
      aesDecipher.setAuthTag(authTag);

      const decryptedXml = decrypted.toString('utf-8');
      const decryptedParsed = xmlParser.parse(decryptedXml) as { Assertion?: SAMLXMLAssertion };

      return decryptedParsed.Assertion ?? null;
    }

    return null;
  } catch {
    return null;
  }
};

const DEFAULT_ROLE_MAPPING: RoleMappingRule[] = [];

const DEFAULT_SESSION_TIMEOUT = 8 * 60 * 60 * 1000;
const REMEMBER_ME_TIMEOUT = 30 * 24 * 60 * 60 * 1000;

const idpMetadataCache: Map<string, { metadata: SAMLIdPMetadata; expiresAt: number }> = new Map();

const assertionIdCache: Map<string, number> = new Map();
const ASSERTION_ID_CACHE_TTL_MS = 5 * 60 * 1000;

const validateXMLSignature = (xml: string, signature: string, certificate: string): boolean => {
  try {
    const sigLines = certificate.split('\n');
    const certBody = sigLines
      .filter(
        (line) =>
          !line.includes('-----BEGIN CERTIFICATE-----') &&
          !line.includes('-----END CERTIFICATE-----'),
      )
      .join('');
    const certBuffer = Buffer.from(certBody, 'base64');

    const xmlWithoutSignature = xml.replace(/<ds:Signature[\s\S]*?<\/ds:Signature>/g, '');

    const cryptoSign = crypto.createVerify('RSA-SHA256');
    cryptoSign.update(xmlWithoutSignature);
    cryptoSign.update('\n');

    return cryptoSign.verify(certBuffer, signature, 'base64');
  } catch {
    return false;
  }
};

const checkAndCacheAssertionId = (assertionId: string): boolean => {
  const now = Date.now();
  const existing = assertionIdCache.get(assertionId);
  if (existing && now - existing < ASSERTION_ID_CACHE_TTL_MS) {
    return false;
  }
  assertionIdCache.set(assertionId, now);

  for (const [id, timestamp] of assertionIdCache.entries()) {
    if (now - timestamp > ASSERTION_ID_CACHE_TTL_MS) {
      assertionIdCache.delete(id);
    }
  }

  return true;
};

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
    idpCertificate: (row as { idpCertificate?: string }).idpCertificate ?? null,
    spPrivateKey: (row as { spPrivateKey?: string }).spPrivateKey ?? null,
    spCertificate: (row as { spCertificate?: string }).spCertificate ?? null,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

export interface CreateSAMLProviderInput {
  tenantId: string;
  name: string;
  metadataUrl: string;
  idpCertificate?: string;
  spPrivateKey?: string;
  spCertificate?: string;
}

export const createSAMLProvider = async (input: CreateSAMLProviderInput): Promise<SSOProvider> => {
  const { tenantId, name, metadataUrl, idpCertificate, spPrivateKey, spCertificate } = input;

  const [created] = await db
    .insert(ssoConnections)
    .values({
      tenantId,
      provider: 'saml',
      name,
      metadataUrl,
      idpCertificate: idpCertificate ?? null,
      spPrivateKey: spPrivateKey ?? null,
      spCertificate: spCertificate ?? null,
      isActive: true,
    })
    .returning();

  if (!created) {
    throw new SSOError({
      message: 'Failed to create SAML provider',
      code: ErrorCodes.SSO_CONFIGURATION_ERROR,
      statusCode: 500,
    });
  }

  return {
    id: created.id,
    tenantId: created.tenantId,
    provider: 'saml',
    name: created.name,
    metadataUrl: created.metadataUrl,
    clientId: null,
    clientSecretEncrypted: null,
    idpCertificate: idpCertificate ?? null,
    spPrivateKey: spPrivateKey ?? null,
    spCertificate: spCertificate ?? null,
    isActive: created.isActive,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  };
};

export interface UpdateSAMLProviderInput {
  name?: string;
  metadataUrl?: string;
  idpCertificate?: string | null;
  spPrivateKey?: string | null;
  spCertificate?: string | null;
  isActive?: boolean;
}

export const updateSAMLProvider = async (
  providerId: string,
  tenantId: string,
  input: UpdateSAMLProviderInput,
): Promise<SSOProvider | null> => {
  const existing = await getSSOProvider(providerId, tenantId);
  if (!existing) {
    return null;
  }

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates['name'] = input.name;
  if (input.metadataUrl !== undefined) updates['metadataUrl'] = input.metadataUrl;
  if (input.idpCertificate !== undefined) updates['idpCertificate'] = input.idpCertificate;
  if (input.spPrivateKey !== undefined) updates['spPrivateKey'] = input.spPrivateKey;
  if (input.spCertificate !== undefined) updates['spCertificate'] = input.spCertificate;
  if (input.isActive !== undefined) updates['isActive'] = input.isActive;

  const [updated] = await db
    .update(ssoConnections)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(ssoConnections.id, providerId), eq(ssoConnections.tenantId, tenantId)))
    .returning();

  if (!updated) {
    return null;
  }

  return {
    id: updated.id,
    tenantId: updated.tenantId,
    provider: 'saml',
    name: updated.name,
    metadataUrl: updated.metadataUrl,
    clientId: null,
    clientSecretEncrypted: null,
    idpCertificate: updated.idpCertificate,
    spPrivateKey: updated.spPrivateKey,
    spCertificate: updated.spCertificate,
    isActive: updated.isActive,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
};

export const deleteSAMLProvider = async (
  providerId: string,
  tenantId: string,
): Promise<boolean> => {
  const existing = await getSSOProvider(providerId, tenantId);
  if (!existing) {
    return false;
  }

  await db
    .delete(ssoConnections)
    .where(and(eq(ssoConnections.id, providerId), eq(ssoConnections.tenantId, tenantId)));

  return true;
};

export const testSAMLProviderConnection = async (
  providerId: string,
  tenantId: string,
): Promise<{ success: boolean; message: string }> => {
  const provider = await getSSOProvider(providerId, tenantId);
  if (!provider) {
    return { success: false, message: 'Provider not found' };
  }

  if (!provider.metadataUrl) {
    return { success: false, message: 'Metadata URL not configured' };
  }

  try {
    await fetchAndParseIdPMetadata(provider.metadataUrl);
    return { success: true, message: 'Connection successful' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, message: `Failed to connect: ${errorMessage}` };
  }
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
    idpCertificate: (row as { idpCertificate?: string }).idpCertificate ?? null,
    spPrivateKey: (row as { spPrivateKey?: string }).spPrivateKey ?? null,
    spCertificate: (row as { spCertificate?: string }).spCertificate ?? null,
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

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
});

export const fetchAndParseIdPMetadata = async (
  metadataUrl: string,
  cacheDurationMs: number = 3600000,
): Promise<SAMLIdPMetadata> => {
  const cached = idpMetadataCache.get(metadataUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.metadata;
  }

  try {
    const response = await fetch(metadataUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new SSOError({
        message: `Failed to fetch IdP metadata: HTTP ${response.status}`,
        code: ErrorCodes.SSO_METADATA_FETCH_FAILED,
        statusCode: 502,
      });
    }

    const xml = await response.text();
    const parsed = xmlParser.parse(xml) as { EntityDescriptor?: SAMLXMLEntityDescriptor };

    const entityDescriptor = parsed.EntityDescriptor;
    if (!entityDescriptor) {
      throw new SSOError({
        message: 'Invalid SAML metadata: missing EntityDescriptor',
        code: ErrorCodes.SSO_METADATA_INVALID,
        statusCode: 400,
      });
    }

    const idpSSODescriptor = entityDescriptor.IDPSSODescriptor;
    if (!idpSSODescriptor) {
      throw new SSOError({
        message: 'Invalid SAML metadata: missing IDPSSODescriptor',
        code: ErrorCodes.SSO_METADATA_INVALID,
        statusCode: 400,
      });
    }

    const singleSignOnServices = Array.isArray(idpSSODescriptor.SingleSignOnService)
      ? idpSSODescriptor.SingleSignOnService
      : [idpSSODescriptor.SingleSignOnService].filter(Boolean);

    const ssoUrl = singleSignOnServices[0]?.['@_Location'];
    if (!ssoUrl) {
      throw new SSOError({
        message: 'Invalid SAML metadata: missing SSO URL',
        code: ErrorCodes.SSO_METADATA_INVALID,
        statusCode: 400,
      });
    }

    const certificates: string[] = [];
    const keyDescriptors = idpSSODescriptor.KeyDescriptor
      ? Array.isArray(idpSSODescriptor.KeyDescriptor)
        ? idpSSODescriptor.KeyDescriptor
        : [idpSSODescriptor.KeyDescriptor]
      : [];

    for (const keyDesc of keyDescriptors) {
      if (keyDesc?.KeyInfo?.X509Data?.X509Certificate) {
        const cert = keyDesc.KeyInfo.X509Data.X509Certificate;
        const certValue = Array.isArray(cert) ? cert[0] : cert;
        if (certValue) {
          certificates.push(certValue.replace(/\s/g, ''));
        }
      }
    }

    const issuer =
      entityDescriptor['@_entityID'] || entityDescriptor.Extensions?.IDPAttribute?.['@_Name'] || '';

    const wantAssertionsSigned =
      idpSSODescriptor['@_WantAssertionsSigned']?.toLowerCase() === 'true';
    const wantMessagesSigned =
      idpSSODescriptor['@_WantAuthnRequestsSigned']?.toLowerCase() === 'true';

    const metadata: SAMLIdPMetadata = {
      issuer,
      entityId: issuer,
      ssoUrl,
      certificates,
      wantAssertionsSigned,
      wantMessagesSigned,
    };

    idpMetadataCache.set(metadataUrl, {
      metadata,
      expiresAt: Date.now() + cacheDurationMs,
    });

    return metadata;
  } catch (error) {
    if (error instanceof SSOError) {
      throw error;
    }
    throw new SSOError({
      message: `Failed to parse IdP metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
      code: ErrorCodes.SSO_METADATA_FETCH_FAILED,
      statusCode: 502,
    });
  }
};

export const validateSAMLResponse = async (
  samlResponse: string,
  provider: SSOProvider,
  expectedDestination: string,
  _correlationId?: string,
): Promise<SAMLValidationResult> => {
  try {
    const metadataUrl = provider.metadataUrl;
    if (!metadataUrl) {
      return {
        valid: false,
        failureReason: 'configuration_error',
      };
    }

    const idpMetadata = await fetchAndParseIdPMetadata(metadataUrl);

    const decodedResponse = Buffer.from(samlResponse, 'base64').toString('utf-8');

    const parsed = xmlParser.parse(decodedResponse) as { Response?: SAMLXMLResponse };
    const response = parsed.Response;

    if (!response) {
      return {
        valid: false,
        failureReason: 'invalid_assertion',
      };
    }

    const responseSignature = response.Signature;
    const assertionSignature = response.Assertion?.Signature;

    if (!responseSignature && !assertionSignature && idpMetadata.certificates.length > 0) {
      return {
        valid: false,
        failureReason: 'invalid_assertion',
      };
    }

    if ((responseSignature || assertionSignature) && idpMetadata.certificates.length > 0) {
      const sig = responseSignature || assertionSignature;
      const signatureValue = sig?.SignatureValue;

      if (!signatureValue) {
        return {
          valid: false,
          failureReason: 'invalid_assertion',
        };
      }

      const isSignatureValid = validateXMLSignature(
        decodedResponse,
        signatureValue,
        idpMetadata.certificates[0] ?? '',
      );

      if (!isSignatureValid) {
        return {
          valid: false,
          failureReason: 'invalid_assertion',
        };
      }
    }

    const issuer =
      typeof response.Issuer === 'object'
        ? (response.Issuer['#text'] ?? response.Issuer)
        : response.Issuer;
    if (issuer !== idpMetadata.issuer && issuer !== idpMetadata.entityId) {
      return {
        valid: false,
        failureReason: 'issuer_mismatch',
      };
    }

    const destination = response['@_Destination'];
    if (destination && !destination.startsWith(expectedDestination)) {
      return {
        valid: false,
        failureReason: 'configuration_error',
      };
    }

    const issueInstant = response['@_IssueInstant'];
    if (issueInstant) {
      const issuedAt = new Date(issueInstant).getTime();
      const now = Date.now();
      const clockSkewMs = 300000;

      if (Math.abs(now - issuedAt) > clockSkewMs) {
        return {
          valid: false,
          failureReason: 'token_expired',
        };
      }
    }

    const statusCode = response.Status?.StatusCode?.['@_Value'];
    if (statusCode && !statusCode.includes('Success')) {
      return {
        valid: false,
        failureReason: 'invalid_assertion',
      };
    }

    const assertion = response.Assertion;
    let activeAssertion: SAMLXMLAssertion;
    if (!assertion) {
      const encryptedAssertion = response.EncryptedAssertion as
        | SAMLXMLEncryptedAssertion
        | undefined;
      if (encryptedAssertion) {
        if (!provider.spPrivateKey) {
          return {
            valid: false,
            failureReason: 'configuration_error',
          };
        }
        const decryptedAssertion = decryptEncryptedAssertion(
          encryptedAssertion,
          provider.spPrivateKey,
        );
        if (!decryptedAssertion) {
          return {
            valid: false,
            failureReason: 'invalid_assertion',
          };
        }
        activeAssertion = decryptedAssertion;
      } else {
        return {
          valid: false,
          failureReason: 'invalid_assertion',
        };
      }
    } else {
      activeAssertion = assertion;
    }

    const assertionId = activeAssertion['@_ID'];
    if (assertionId) {
      const isNewAssertion = checkAndCacheAssertionId(assertionId);
      if (!isNewAssertion) {
        return {
          valid: false,
          failureReason: 'invalid_assertion',
        };
      }

      const notBefore = activeAssertion.Conditions?.['@_NotBefore'];
      const notOnOrAfter = activeAssertion.Conditions?.['@_NotOnOrAfter'];

      if (notBefore || notOnOrAfter) {
        const now = new Date().getTime();
        if (notBefore) {
          const notBeforeMs = new Date(notBefore).getTime();
          if (now < notBeforeMs) {
            return {
              valid: false,
              failureReason: 'token_early',
            };
          }
        }
        if (notOnOrAfter) {
          const notOnOrAfterMs = new Date(notOnOrAfter).getTime();
          if (now >= notOnOrAfterMs) {
            return {
              valid: false,
              failureReason: 'token_expired',
            };
          }
        }
      }
    }

    const subjectValue =
      typeof activeAssertion.Subject?.NameID === 'object'
        ? (activeAssertion.Subject.NameID['#text'] ?? activeAssertion.Subject.NameID)
        : activeAssertion.Subject?.NameID;
    if (!subjectValue) {
      return {
        valid: false,
        failureReason: 'missing_required_claim',
      };
    }

    const attrStatements = activeAssertion.AttributeStatement?.Attribute;
    const attributes: Record<string, unknown> = {};

    if (attrStatements) {
      const attrs = Array.isArray(attrStatements) ? attrStatements : [attrStatements];
      for (const attr of attrs) {
        const name = attr['@_Name'];
        const values = attr.AttributeValue;
        if (name && values) {
          const value = Array.isArray(values)
            ? values.map((v: unknown) => (v as { '#text'?: string })['#text'] || v)
            : (values as { '#text'?: string })['#text'] || values;
          attributes[name] = Array.isArray(value) && value.length === 1 ? value[0] : value;
        }
      }
    }

    const attributeMapping = DEFAULT_ATTRIBUTE_MAPPING;

    const emailRaw =
      (attributes[attributeMapping.email] as string | undefined) ||
      (attributes['email'] as string | undefined) ||
      (attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] as
        | string
        | undefined);

    const firstName =
      (attributes[attributeMapping.firstName] as string | undefined) ||
      (attributes['firstName'] as string | undefined) ||
      (attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'] as
        | string
        | undefined);

    const lastName =
      (attributes[attributeMapping.lastName] as string | undefined) ||
      (attributes['lastName'] as string | undefined) ||
      (attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'] as
        | string
        | undefined);

    const groups: string[] = [];
    const groupsAttr =
      attributes[attributeMapping.groups] ||
      attributes['groups'] ||
      attributes['http://schemas.microsoft.com/ws/2008/06/identity/claims/groups'];
    if (groupsAttr) {
      const groupsArray = Array.isArray(groupsAttr) ? groupsAttr : [groupsAttr];
      for (const g of groupsArray) {
        if (typeof g === 'string') {
          groups.push(g);
        }
      }
    }

    const emailValue: string | undefined = emailRaw ? String(emailRaw).toLowerCase() : undefined;

    const displayNameValue =
      firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || undefined;

    const claims: SSOIdentityClaim = {
      subject: subjectValue as string,
      email: emailValue,
      displayName: displayNameValue,
      groups,
    };

    return {
      valid: true,
      claims,
      sessionIndex: assertionId ?? '',
    };
  } catch {
    return {
      valid: false,
      failureReason: 'invalid_assertion',
    };
  }
};

export const mapGroupsToRole = (
  groups: string[],
  roleMappingRules: RoleMappingRule[] = DEFAULT_ROLE_MAPPING,
  defaultRole: string = 'learner',
  allowedRoles: string[] = ['super_admin', 'tenant_admin', 'manager', 'trainer', 'learner'],
): string => {
  for (const rule of roleMappingRules) {
    if (groups.includes(rule.idpGroup)) {
      if (allowedRoles.includes(rule.rbRole)) {
        return rule.rbRole;
      }
    }
  }

  return allowedRoles.includes(defaultRole) ? defaultRole : 'learner';
};

export const buildSAMLAuthnRequest = (
  provider: SSOProvider,
  acsUrl: string,
  tenantId: string,
  relayState?: string,
): string => {
  const spEntityId = `https://dmz.thearchive.game/sp/${tenantId}`;
  const requestId = `_${crypto.randomUUID()}`;

  const authnRequest = {
    'samlp:AuthnRequest': {
      '@_ID': requestId,
      '@_Version': '2.0',
      '@_IssueInstant': new Date().toISOString(),
      '@_AssertionConsumerServiceURL': acsUrl,
      '@_ProtocolBinding': 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
      Issuer: {
        '@_Format': 'urn:oasis:names:tc:SAML:2.0:nameid-format:entity',
        '#text': spEntityId,
      },
      NameIDPolicy: {
        '@_Format': 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        '@_AllowCreate': 'true',
      },
    },
  };

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true,
  });

  let xml = builder.build(authnRequest);
  xml = xml.replace(
    '<samlp:',
    '<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">',
  );
  xml = xml.replace('</samlp:', '</samlp:');

  const encoded = Buffer.from(xml).toString('base64');

  const params = new URLSearchParams({
    SAMLRequest: encoded,
  });

  if (relayState) {
    params.append('RelayState', relayState);
  }

  const idpSsoUrl = provider.metadataUrl ? '?' : '';
  return `${provider.metadataUrl || ''}${idpSsoUrl}${params.toString()}`;
};

export const generateSPMetadata = (
  tenantId: string,
  acsUrl: string,
  sloUrl: string,
  spCertificate?: string,
): string => {
  const entityId = `https://dmz.thearchive.game/sp/${tenantId}`;

  const metadata: Record<string, unknown> = {
    'md:EntityDescriptor': {
      '@_entityID': entityId,
      '@_xmlns:md': 'urn:oasis:names:tc:SAML:2.0:metadata',
      'md:SPSSODescriptor': {
        '@_AuthnRequestsSigned': spCertificate ? 'true' : 'false',
        '@_WantAssertionsSigned': 'true',
        '@_protocolSupportEnumeration': 'urn:oasis:names:tc:SAML:2.0:protocol',
        'md:AssertionConsumerService': {
          '@_Binding': 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
          '@_Location': acsUrl,
          '@_index': '0',
          '@_isDefault': 'true',
        },
      },
    },
  };

  if (sloUrl) {
    (metadata['md:EntityDescriptor'] as Record<string, unknown>)['md:SPSSODescriptor'] = {
      ...((metadata['md:EntityDescriptor'] as Record<string, unknown>)[
        'md:SPSSODescriptor'
      ] as Record<string, unknown>),
      'md:SingleLogoutService': {
        '@_Binding': 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
        '@_Location': sloUrl,
      },
    };
  }

  if (spCertificate) {
    const spDesc = metadata['md:EntityDescriptor'] as Record<string, unknown>;
    const spSsoDesc = spDesc['md:SPSSODescriptor'] as Record<string, unknown>;
    spSsoDesc['md:KeyDescriptor'] = {
      '@_use': 'signing',
      'ds:KeyInfo': {
        '@_xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#',
        'ds:X509Data': {
          'ds:X509Certificate': spCertificate,
        },
      },
    };
  }

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true,
  });

  return builder.build(metadata);
};

export const createSAMLLoginSession = (
  _userId: string,
  _tenantId: string,
  _providerId: string,
  rememberMe: boolean = false,
): { sessionId: string; expiresAt: Date; cookieOptions: Record<string, unknown> } => {
  const sessionId = crypto.randomUUID();
  const timeout = rememberMe ? REMEMBER_ME_TIMEOUT : DEFAULT_SESSION_TIMEOUT;
  const expiresAt = new Date(Date.now() + timeout);

  const isProduction = process.env['NODE_ENV'] === 'production';

  const cookieOptions: Record<string, unknown> = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  };

  return {
    sessionId,
    expiresAt,
    cookieOptions,
  };
};

export const getSAMLProviderConfig = (
  provider: SSOProvider,
  tenantId: string,
): SAMLProviderConfig => {
  return {
    type: 'saml',
    issuer: provider.metadataUrl || '',
    entityId: `https://dmz.thearchive.game/sp/${tenantId}`,
    ssoUrl: provider.metadataUrl || '',
    certificate: provider.idpCertificate || '',
    signatureAlgorithm: 'RSA-SHA256',
    wantAssertionsSigned: true,
    wantMessagesSigned: false,
    allowedClockSkewSeconds: 60,
  };
};

export const clearIdPMetadataCache = (metadataUrl?: string): void => {
  if (metadataUrl) {
    idpMetadataCache.delete(metadataUrl);
  } else {
    idpMetadataCache.clear();
  }
};
