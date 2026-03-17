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
import { adminNotifications } from '../../db/schema/auth/admin-notifications.js';
import { users } from '../../shared/database/schema/users.js';
import { getDatabaseClient } from '../../shared/database/connection.js';
import { loadConfig } from '../../config.js';

const db = getDatabaseClient();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;

const deriveKey = (encryptionKey: string, salt: Buffer): Buffer => {
  return crypto.scryptSync(encryptionKey, salt, 32);
};

const getEncryptionKey = (): string => {
  const config = loadConfig();
  return config.JWT_PRIVATE_KEY_ENCRYPTION_KEY || 'dev-encryption-key-change-in-prod';
};

export const encryptClientSecret = (secret: string): string => {
  const encryptionKey = getEncryptionKey();
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(encryptionKey, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${salt.toString('base64')}:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
};

export const decryptClientSecret = (encryptedData: string): string => {
  const encryptionKey = getEncryptionKey();
  const parts = encryptedData.split(':');
  if (parts.length !== 4) {
    throw new SSOError({
      message: 'Invalid encrypted client secret format',
      code: ErrorCodes.SSO_CONFIGURATION_ERROR,
      statusCode: 500,
    });
  }

  const saltB64 = parts[0] ?? '';
  const ivB64 = parts[1] ?? '';
  const authTagB64 = parts[2] ?? '';
  const encryptedB64 = parts[3] ?? '';

  const salt = Buffer.from(saltB64, 'base64');
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const encrypted = Buffer.from(encryptedB64, 'base64');

  const key = deriveKey(encryptionKey, salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
};

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
  roleMappingRules: RoleMappingRule[] | null;
  defaultRole: string;
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
  transitiveGroupIds?: string[];
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

const oidcStateStore: Map<string, { data: SSOStateData; expiresAt: number }> = new Map();

export const storeOIDCState = async (
  state: string,
  data: SSOStateData,
  expiresInSeconds: number = 600,
): Promise<void> => {
  oidcStateStore.set(state, {
    data,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  });
};

export const getOIDCState = async (state: string): Promise<SSOStateData | null> => {
  const entry = oidcStateStore.get(state);
  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    oidcStateStore.delete(state);
    return null;
  }

  return entry.data;
};

export const deleteOIDCState = async (state: string): Promise<void> => {
  oidcStateStore.delete(state);
};

export const cleanupExpiredOIDCStates = (): void => {
  const now = Date.now();
  for (const [key, entry] of oidcStateStore.entries()) {
    if (now > entry.expiresAt) {
      oidcStateStore.delete(key);
    }
  }
};

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
    roleMappingRules: (row as { roleMappingRules?: RoleMappingRule[] }).roleMappingRules ?? null,
    defaultRole: (row as { defaultRole?: string }).defaultRole ?? 'learner',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

export const getSSOProviderById = async (providerId: string): Promise<SSOProvider | null> => {
  const result = await db
    .select()
    .from(ssoConnections)
    .where(eq(ssoConnections.id, providerId))
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
    roleMappingRules: (row as { roleMappingRules?: RoleMappingRule[] }).roleMappingRules ?? null,
    defaultRole: (row as { defaultRole?: string }).defaultRole ?? 'learner',
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
    roleMappingRules: null,
    defaultRole: 'learner',
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
  roleMappingRules?: RoleMappingRule[] | null;
  defaultRole?: string;
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
  if (input.roleMappingRules !== undefined) updates['roleMappingRules'] = input.roleMappingRules;
  if (input.defaultRole !== undefined) updates['defaultRole'] = input.defaultRole;

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
    roleMappingRules: existing.roleMappingRules,
    defaultRole: existing.defaultRole,
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

export interface CreateOIDCProviderInput {
  tenantId: string;
  name: string;
  metadataUrl: string;
  clientId: string;
  clientSecret: string;
}

export const createOIDCProvider = async (input: CreateOIDCProviderInput): Promise<SSOProvider> => {
  const { tenantId, name, metadataUrl, clientId, clientSecret } = input;

  const encryptedClientSecret = encryptClientSecret(clientSecret);

  const [created] = await db
    .insert(ssoConnections)
    .values({
      tenantId,
      provider: 'oidc',
      name,
      metadataUrl,
      clientId,
      clientSecretEncrypted: encryptedClientSecret,
      isActive: true,
    })
    .returning();

  if (!created) {
    throw new SSOError({
      message: 'Failed to create OIDC provider',
      code: ErrorCodes.SSO_CONFIGURATION_ERROR,
      statusCode: 500,
    });
  }

  return {
    id: created.id,
    tenantId: created.tenantId,
    provider: 'oidc',
    name: created.name,
    metadataUrl: created.metadataUrl,
    clientId: created.clientId,
    clientSecretEncrypted: created.clientSecretEncrypted,
    idpCertificate: null,
    spPrivateKey: null,
    spCertificate: null,
    isActive: created.isActive,
    roleMappingRules: null,
    defaultRole: 'learner',
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  };
};

export interface UpdateOIDCProviderInput {
  name?: string;
  metadataUrl?: string;
  clientId?: string;
  clientSecret?: string | null;
  isActive?: boolean;
  roleMappingRules?: RoleMappingRule[] | null;
  defaultRole?: string;
}

export const updateOIDCProvider = async (
  providerId: string,
  tenantId: string,
  input: UpdateOIDCProviderInput,
): Promise<SSOProvider | null> => {
  const existing = await getSSOProvider(providerId, tenantId);
  if (!existing) {
    return null;
  }

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates['name'] = input.name;
  if (input.metadataUrl !== undefined) updates['metadataUrl'] = input.metadataUrl;
  if (input.clientId !== undefined) updates['clientId'] = input.clientId;
  if (input.clientSecret !== undefined) {
    if (input.clientSecret === null) {
      updates['clientSecretEncrypted'] = null;
    } else {
      updates['clientSecretEncrypted'] = encryptClientSecret(input.clientSecret);
    }
  }
  if (input.isActive !== undefined) updates['isActive'] = input.isActive;
  if (input.roleMappingRules !== undefined) updates['roleMappingRules'] = input.roleMappingRules;
  if (input.defaultRole !== undefined) updates['defaultRole'] = input.defaultRole;

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
    provider: 'oidc',
    name: updated.name,
    metadataUrl: updated.metadataUrl,
    clientId: updated.clientId,
    clientSecretEncrypted: updated.clientSecretEncrypted,
    idpCertificate: null,
    spPrivateKey: null,
    spCertificate: null,
    isActive: updated.isActive,
    roleMappingRules: existing.roleMappingRules,
    defaultRole: existing.defaultRole,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
};

export const deleteOIDCProvider = async (
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

export const testOIDCProviderConnection = async (
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
    await fetchAndParseOIDCDiscovery(provider.metadataUrl);
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
    roleMappingRules: (row as { roleMappingRules?: RoleMappingRule[] }).roleMappingRules ?? null,
    defaultRole: (row as { defaultRole?: string }).defaultRole ?? 'learner',
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

export interface CreateSSOUserInput {
  tenantId: string;
  email: string;
  displayName?: string;
  role?: string;
  isJitCreated?: boolean;
  idpSource?: 'saml' | 'oidc';
  department?: string;
  title?: string;
  managerEmail?: string;
  idpAttributes?: Record<string, unknown>;
}

export const createSSOUser = async (input: CreateSSOUserInput): Promise<string> => {
  const {
    tenantId,
    email,
    displayName,
    role = 'learner',
    isJitCreated = false,
    idpSource,
    department,
    title,
    idpAttributes,
  } = input;

  const [user] = await db
    .insert(users)
    .values({
      tenantId,
      email: email.toLowerCase(),
      displayName: displayName ?? null,
      role,
      passwordHash: null,
      isActive: true,
      isJitCreated,
      idpSource: idpSource ?? null,
      department: department ?? null,
      title: title ?? null,
      idpAttributes: idpAttributes ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ userId: users.userId });

  if (!user) {
    throw new Error('Failed to create SSO user');
  }

  return user.userId;
};

export interface NotifyJITUserCreatedOptions {
  tenantId: string;
  jitUserId: string;
  jitUserEmail: string;
  jitUserDisplayName?: string;
  idpSource: 'saml' | 'oidc';
  idpProviderName: string;
}

export const notifyJITUserCreated = async (options: NotifyJITUserCreatedOptions): Promise<void> => {
  const { tenantId, jitUserId, jitUserEmail, jitUserDisplayName, idpSource, idpProviderName } =
    options;

  const tenantAdmins = await db
    .select({
      userId: users.userId,
      email: users.email,
      displayName: users.displayName,
    })
    .from(users)
    .where(
      and(eq(users.tenantId, tenantId), eq(users.role, 'tenant_admin'), eq(users.isActive, true)),
    );

  const notificationTitle = 'New JIT User Provisioned';
  const notificationMessage = `A new user "${jitUserDisplayName || jitUserEmail}" (${jitUserEmail}) was automatically provisioned via ${idpSource.toUpperCase()} provider "${idpProviderName}". Review the user and assign appropriate permissions.`;

  for (const admin of tenantAdmins) {
    console.warn(
      `[JIT Notification] Notifying tenant admin ${admin.email} about new JIT user: ${jitUserEmail} (${jitUserId}) from ${idpSource} provider "${idpProviderName}"`,
    );

    await db.insert(adminNotifications).values({
      tenantId,
      adminUserId: admin.userId,
      notificationType: 'jit_user_provisioned',
      title: notificationTitle,
      message: notificationMessage,
      metadata: {
        jitUserId,
        jitUserEmail,
        jitUserDisplayName,
        idpSource,
        idpProviderName,
      },
    });
  }
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
  const department = idTokenClaims['department'] as string | undefined;
  const title = idTokenClaims['title'] as string | undefined;
  const manager = idTokenClaims['manager'] as string | undefined;

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
      department,
      title,
      manager,
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
      department: attributes?.['department'] as string | undefined,
      title: attributes?.['title'] as string | undefined,
      manager: attributes?.['manager'] as string | undefined,
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

    const department =
      (attributes[attributeMapping.department] as string | undefined) ||
      (attributes['department'] as string | undefined) ||
      (attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/department'] as
        | string
        | undefined);

    const title =
      (attributes[attributeMapping.title] as string | undefined) ||
      (attributes['title'] as string | undefined) ||
      (attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/jobtitle'] as
        | string
        | undefined);

    const manager =
      (attributes['manager'] as string | undefined) ||
      (attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/manager'] as
        | string
        | undefined);

    const emailValue: string | undefined = emailRaw ? String(emailRaw).toLowerCase() : undefined;

    const displayNameValue =
      firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || undefined;

    const claims: SSOIdentityClaim = {
      subject: subjectValue as string,
      email: emailValue,
      displayName: displayNameValue,
      groups,
      department,
      title,
      manager,
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
  transitiveGroups: string[] = [],
): string => {
  const allGroups = [...new Set([...groups, ...transitiveGroups])];

  for (const rule of roleMappingRules) {
    if (allGroups.includes(rule.idpGroup)) {
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

export interface OIDCIdPMetadata {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint?: string;
  jwksUri?: string;
  endSessionEndpoint?: string;
  introspectionEndpoint?: string;
  revocationEndpoint?: string;
  scopesSupported?: string[];
  responseTypesSupported?: string[];
  responseModesSupported?: string[];
  tokenEndpointAuthMethodsSupported?: string[];
  grantTypesSupported?: string[];
}

const oidcMetadataCache: Map<string, { metadata: OIDCIdPMetadata; expiresAt: number }> = new Map();

export const fetchAndParseOIDCDiscovery = async (
  metadataUrl: string,
  cacheDurationMs: number = 3600000,
): Promise<OIDCIdPMetadata> => {
  const cached = oidcMetadataCache.get(metadataUrl);
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
        message: `Failed to fetch OIDC Discovery metadata: HTTP ${response.status}`,
        code: ErrorCodes.SSO_METADATA_FETCH_FAILED,
        statusCode: 502,
      });
    }

    const discovery = (await response.json()) as Record<string, unknown>;

    const issuer = discovery['issuer'] as string | undefined;
    if (!issuer) {
      throw new SSOError({
        message: 'Invalid OIDC Discovery metadata: missing issuer',
        code: ErrorCodes.SSO_METADATA_INVALID,
        statusCode: 400,
      });
    }

    const authorizationEndpoint = discovery['authorization_endpoint'] as string | undefined;
    if (!authorizationEndpoint) {
      throw new SSOError({
        message: 'Invalid OIDC Discovery metadata: missing authorization_endpoint',
        code: ErrorCodes.SSO_METADATA_INVALID,
        statusCode: 400,
      });
    }

    const tokenEndpoint = discovery['token_endpoint'] as string | undefined;
    if (!tokenEndpoint) {
      throw new SSOError({
        message: 'Invalid OIDC Discovery metadata: missing token_endpoint',
        code: ErrorCodes.SSO_METADATA_INVALID,
        statusCode: 400,
      });
    }

    const userinfoEndpoint = discovery['userinfo_endpoint'] as string | undefined;
    const jwksUri = discovery['jwks_uri'] as string | undefined;
    const endSessionEndpoint = discovery['end_session_endpoint'] as string | undefined;
    const introspectionEndpoint = discovery['introspection_endpoint'] as string | undefined;
    const revocationEndpoint = discovery['revocation_endpoint'] as string | undefined;
    const scopesSupported = discovery['scopes_supported'] as string[] | undefined;
    const responseTypesSupported = discovery['response_types_supported'] as string[] | undefined;
    const responseModesSupported = discovery['response_modes_supported'] as string[] | undefined;
    const tokenEndpointAuthMethodsSupported = discovery['token_endpoint_auth_methods_supported'] as
      | string[]
      | undefined;
    const grantTypesSupported = discovery['grant_types_supported'] as string[] | undefined;

    const metadata: OIDCIdPMetadata = {
      issuer,
      authorizationEndpoint,
      tokenEndpoint,
      ...(userinfoEndpoint && { userinfoEndpoint }),
      ...(jwksUri && { jwksUri }),
      ...(endSessionEndpoint && { endSessionEndpoint }),
      ...(introspectionEndpoint && { introspectionEndpoint }),
      ...(revocationEndpoint && { revocationEndpoint }),
      ...(scopesSupported && { scopesSupported }),
      ...(responseTypesSupported && { responseTypesSupported }),
      ...(responseModesSupported && { responseModesSupported }),
      ...(tokenEndpointAuthMethodsSupported && { tokenEndpointAuthMethodsSupported }),
      ...(grantTypesSupported && { grantTypesSupported }),
    };

    oidcMetadataCache.set(metadataUrl, {
      metadata,
      expiresAt: Date.now() + cacheDurationMs,
    });

    return metadata;
  } catch (error) {
    if (error instanceof SSOError) {
      throw error;
    }
    throw new SSOError({
      message: `Failed to parse OIDC Discovery metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
      code: ErrorCodes.SSO_METADATA_FETCH_FAILED,
      statusCode: 502,
    });
  }
};

export const clearOIDCMetadataCache = (metadataUrl?: string): void => {
  if (metadataUrl) {
    oidcMetadataCache.delete(metadataUrl);
  } else {
    oidcMetadataCache.clear();
  }
};

export interface OIDCTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
}

export interface OIDCTokens {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn: number;
  scope?: string;
}

export const exchangeCodeForTokens = async (
  tokenEndpoint: string,
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<OIDCTokens> => {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage = 'Token exchange failed';
    try {
      const errorJson = JSON.parse(errorBody) as { error_description?: string; error?: string };
      errorMessage = errorJson.error_description || errorJson.error || errorMessage;
    } catch {
      errorMessage = errorBody || errorMessage;
    }

    throw new SSOError({
      message: `Token exchange failed: ${errorMessage}`,
      code: ErrorCodes.SSO_TOKEN_EXCHANGE_FAILED,
      statusCode: 400,
    });
  }

  const tokenData = (await response.json()) as OIDCTokenResponse;

  const idToken = tokenData.id_token;
  const refreshToken = tokenData.refresh_token;
  const scope = tokenData.scope;

  const tokens: OIDCTokens = {
    accessToken: tokenData.access_token,
    tokenType: tokenData.token_type,
    expiresIn: tokenData.expires_in,
    ...(idToken && { idToken }),
    ...(refreshToken && { refreshToken }),
    ...(scope && { scope }),
  };

  return tokens;
};

export interface RefreshedTokens {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn: number;
}

export const refreshAccessToken = async (
  tokenEndpoint: string,
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<RefreshedTokens> => {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage = 'Token refresh failed';
    try {
      const errorJson = JSON.parse(errorBody) as { error_description?: string; error?: string };
      errorMessage = errorJson.error_description || errorJson.error || errorMessage;
    } catch {
      errorMessage = errorBody || errorMessage;
    }

    throw new SSOError({
      message: `Token refresh failed: ${errorMessage}`,
      code: ErrorCodes.SSO_TOKEN_INVALID,
      statusCode: 401,
    });
  }

  const tokenData = (await response.json()) as {
    access_token: string;
    id_token?: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope?: string;
  };

  const result: RefreshedTokens = {
    accessToken: tokenData.access_token,
    expiresIn: tokenData.expires_in,
  };

  if (tokenData.id_token) {
    result.idToken = tokenData.id_token;
  }

  if (tokenData.refresh_token) {
    result.refreshToken = tokenData.refresh_token;
  }

  return result;
};

export interface OIDCUserInfoResponse {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  profile?: string;
  email_verified?: boolean;
  phone_number?: string;
  phone_number_verified?: boolean;
  [key: string]: unknown;
}

export const fetchOIDCUserInfo = async (
  userinfoEndpoint: string,
  accessToken: string,
): Promise<OIDCUserInfoResponse> => {
  const response = await fetch(userinfoEndpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new SSOError({
      message: `UserInfo request failed: HTTP ${response.status}`,
      code: ErrorCodes.SSO_USERINFO_FAILED,
      statusCode: 400,
    });
  }

  return (await response.json()) as OIDCUserInfoResponse;
};

export const fetchTransitiveGroupMemberships = async (
  accessToken: string,
  userId: string,
): Promise<string[]> => {
  const graphApiUrl = 'https://graph.microsoft.com/v1.0';

  try {
    const response = await fetch(
      `${graphApiUrl}/users/${userId}/transitiveMemberOf?$select=displayName&$top=999`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as {
      value?: Array<{ displayName?: string; '@odata.type'?: string }>;
    };

    const groups: string[] = [];
    if (data.value) {
      for (const member of data.value) {
        if (member['@odata.type'] === '#microsoft.graph.group' && member.displayName) {
          groups.push(member.displayName);
        }
      }
    }

    return groups;
  } catch {
    return [];
  }
};

interface JWKSKey {
  kty: string;
  use?: string;
  kid?: string;
  alg?: string;
  n?: string;
  e?: string;
  x?: string;
  y?: string;
  crv?: string;
}

export interface JWKS {
  keys: JWKSKey[];
}

const jwksCache: Map<string, { jwks: JWKS; expiresAt: number }> = new Map();

export const fetchJWKS = async (
  jwksUri: string,
  cacheDurationMs: number = 3600000,
): Promise<JWKS> => {
  const cached = jwksCache.get(jwksUri);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.jwks;
  }

  const response = await fetch(jwksUri, {
    method: 'GET',
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new SSOError({
      message: `Failed to fetch JWKS: HTTP ${response.status}`,
      code: ErrorCodes.SSO_JWKS_FETCH_FAILED,
      statusCode: 502,
    });
  }

  const jwks = (await response.json()) as JWKS;

  jwksCache.set(jwksUri, {
    jwks,
    expiresAt: Date.now() + cacheDurationMs,
  });

  return jwks;
};

const base64UrlDecode = (str: string): string => {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  if (padding) {
    base64 += '='.repeat(4 - padding);
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
};

export interface DecodedJWT {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  raw: { header: string; payload: string; signature: string };
}

export const decodeJWT = (token: string): DecodedJWT => {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new SSOError({
      message: 'Invalid JWT format',
      code: ErrorCodes.SSO_TOKEN_INVALID,
      statusCode: 400,
    });
  }

  const header = JSON.parse(base64UrlDecode(parts[0]!)) as Record<string, unknown>;
  const payload = JSON.parse(base64UrlDecode(parts[1]!)) as Record<string, unknown>;
  const signature = parts[2]!;

  return {
    header,
    payload,
    signature,
    raw: {
      header: parts[0]!,
      payload: parts[1]!,
      signature,
    },
  };
};

const createPublicKeyFromJWK = (jwk: JWKSKey): crypto.KeyObject => {
  if (jwk.kty === 'RSA') {
    const jwkJson = {
      kty: 'RSA',
      n: jwk.n,
      e: jwk.e,
    };

    return crypto.createPublicKey({
      key: JSON.stringify(jwkJson),
      format: 'jwk',
    });
  }

  if (jwk.kty === 'EC') {
    const jwkJson = {
      kty: 'EC',
      crv: jwk.crv,
      x: jwk.x,
      y: jwk.y,
    };

    return crypto.createPublicKey({
      key: JSON.stringify(jwkJson),
      format: 'jwk',
    });
  }

  throw new SSOError({
    message: `Unsupported JWK key type: ${jwk.kty}`,
    code: ErrorCodes.SSO_TOKEN_INVALID,
    statusCode: 400,
  });
};

const verifyJWSSignature = (
  jwk: JWKSKey,
  signature: string,
  signingInput: string,
  algorithm: string,
): boolean => {
  try {
    const publicKey = createPublicKeyFromJWK(jwk);

    const signatureBuffer = Buffer.from(signature.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

    const algorithmMap: Record<string, string> = {
      RS256: 'RSA-SHA256',
      RS384: 'RSA-SHA384',
      RS512: 'RSA-SHA512',
      ES256: 'ECDSA-SHA256',
      ES384: 'ECDSA-SHA384',
      ES512: 'ECDSA-SHA512',
      PS256: 'RSA-SHA256',
      PS384: 'RSA-SHA384',
      PS512: 'RSA-SHA512',
    };

    const cryptoAlg = algorithmMap[algorithm];
    if (!cryptoAlg) {
      throw new SSOError({
        message: `Unsupported algorithm: ${algorithm}`,
        code: ErrorCodes.SSO_TOKEN_INVALID,
        statusCode: 400,
      });
    }

    const verifier = crypto.createVerify(cryptoAlg);
    verifier.update(signingInput);
    verifier.end();

    if (algorithm.startsWith('ES')) {
      return verifier.verify(publicKey, signatureBuffer);
    }

    return verifier.verify(publicKey, signatureBuffer);
  } catch {
    return false;
  }
};

export const verifyOIDCJWT = async (
  token: string,
  jwks: JWKS,
  expectedAlg: string,
  expectedIssuer: string,
  expectedAudience: string,
): Promise<DecodedJWT> => {
  const decoded = decodeJWT(token);

  const headerAlg = decoded.header['alg'] as string | undefined;
  if (headerAlg !== expectedAlg) {
    throw new SSOError({
      message: `JWT algorithm mismatch: expected ${expectedAlg}, got ${headerAlg}`,
      code: ErrorCodes.SSO_TOKEN_INVALID,
      statusCode: 400,
    });
  }

  const kid = decoded.header['kid'] as string | undefined;

  let key: JWKSKey | undefined;
  if (kid) {
    key = jwks.keys.find((k) => k.kid === kid);
  } else {
    key = jwks.keys.find((k) => k.alg === expectedAlg || k.use === 'sig');
  }

  if (!key) {
    throw new SSOError({
      message: 'No matching key found in JWKS',
      code: ErrorCodes.SSO_TOKEN_INVALID,
      statusCode: 400,
    });
  }

  const signingInput = `${decoded.raw.header}.${decoded.raw.payload}`;

  const isSignatureValid = verifyJWSSignature(
    key,
    decoded.raw.signature,
    signingInput,
    expectedAlg,
  );
  if (!isSignatureValid) {
    throw new SSOError({
      message: 'Invalid JWT signature',
      code: ErrorCodes.SSO_INVALID_SIGNATURE,
      statusCode: 400,
    });
  }

  const payload = decoded.payload;
  const iss = payload['iss'] as string | undefined;
  const aud = payload['aud'] as string | string[] | undefined;
  const exp = payload['exp'] as number | undefined;
  const iat = payload['iat'] as number | undefined;

  if (iss !== expectedIssuer) {
    throw new SSOError({
      message: `Issuer mismatch: expected ${expectedIssuer}, got ${iss}`,
      code: ErrorCodes.SSO_ISSUER_MISMATCH,
      statusCode: 400,
    });
  }

  const audValue = Array.isArray(aud) ? aud[0] : aud;
  if (audValue !== expectedAudience) {
    throw new SSOError({
      message: `Audience mismatch: expected ${expectedAudience}, got ${audValue}`,
      code: ErrorCodes.SSO_AUDIENCE_MISMATCH,
      statusCode: 400,
    });
  }

  const now = Math.floor(Date.now() / 1000);
  if (exp && exp < now) {
    throw new SSOError({
      message: 'Token expired',
      code: ErrorCodes.SSO_TOKEN_EXPIRED,
      statusCode: 400,
    });
  }

  if (iat && iat > now + 60) {
    throw new SSOError({
      message: 'Token issued in the future',
      code: ErrorCodes.SSO_TOKEN_EARLY,
      statusCode: 400,
    });
  }

  return decoded;
};

export const validateOIDCIdToken = async (
  idToken: string,
  jwksUri: string,
  issuer: string,
  clientId: string,
  expectedNonce?: string,
  _allowedClockSkewSeconds: number = 60,
): Promise<{
  valid: boolean;
  claims?: Record<string, unknown>;
  failureReason?: string;
}> => {
  try {
    const jwks = await fetchJWKS(jwksUri);

    const decoded = await verifyOIDCJWT(idToken, jwks, 'RS256', issuer, clientId);

    const payload = decoded.payload;

    if (expectedNonce) {
      const nonce = payload['nonce'] as string | undefined;
      if (nonce !== expectedNonce) {
        return {
          valid: false,
          failureReason: 'nonce_mismatch',
        };
      }
    }

    return {
      valid: true,
      claims: payload,
    };
  } catch (error) {
    if (error instanceof SSOError) {
      return {
        valid: false,
        failureReason: error.failureReason || error.code,
      };
    }
    return {
      valid: false,
      failureReason: 'invalid_token',
    };
  }
};

export const buildOIDCLogoutUrl = (
  endSessionEndpoint: string,
  idTokenHint: string,
  postLogoutRedirectUri?: string,
  state?: string,
): string => {
  const params = new URLSearchParams({
    id_token_hint: idTokenHint,
  });

  if (postLogoutRedirectUri) {
    params.append('post_logout_redirect_uri', postLogoutRedirectUri);
  }

  if (state) {
    params.append('state', state);
  }

  return `${endSessionEndpoint}?${params.toString()}`;
};

export interface OIDCProviderConfigInput {
  metadataUrl: string;
  clientId: string;
  clientSecret: string;
}

export const getOIDCProviderConfig = async (
  provider: SSOProvider,
): Promise<{
  metadata: OIDCIdPMetadata;
  clientId: string;
  clientSecret: string;
}> => {
  if (!provider.metadataUrl) {
    throw new SSOError({
      message: 'OIDC provider metadata URL not configured',
      code: ErrorCodes.SSO_CONFIGURATION_ERROR,
      statusCode: 400,
    });
  }

  if (!provider.clientId || !provider.clientSecretEncrypted) {
    throw new SSOError({
      message: 'OIDC client credentials not configured',
      code: ErrorCodes.SSO_CONFIGURATION_ERROR,
      statusCode: 400,
    });
  }

  const metadata = await fetchAndParseOIDCDiscovery(provider.metadataUrl);

  const decryptedClientSecret = decryptClientSecret(provider.clientSecretEncrypted);

  return {
    metadata,
    clientId: provider.clientId,
    clientSecret: decryptedClientSecret,
  };
};
