import * as crypto from 'crypto';

import type { SSOIdentityClaim, SSOTrustFailureReason } from '@the-dmz/shared/auth';
import { ErrorCodes } from '@the-dmz/shared/constants';

import { loadConfig } from '../../config.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;

const deriveKey = (encryptionKey: string, salt: Buffer): Buffer => {
  return crypto.scryptSync(encryptionKey, salt, 32);
};

const getEncryptionKey = (): string => {
  const config = loadConfig();
  return config.JWT_PRIVATE_KEY_ENCRYPTION_KEY;
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

export const DEFAULT_ROLE_MAPPING: RoleMappingRule[] = [];

export const DEFAULT_SESSION_TIMEOUT = 8 * 60 * 60 * 1000;
export const REMEMBER_ME_TIMEOUT = 30 * 24 * 60 * 60 * 1000;
