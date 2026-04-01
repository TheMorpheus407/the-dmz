import { eq, and } from 'drizzle-orm';

import { ErrorCodes } from '@the-dmz/shared/constants';

import { ssoConnections } from '../../db/schema/auth/sso-connections.js';
import { getDatabaseClient } from '../../shared/database/connection.js';

import { SSOError, encryptClientSecret } from './sso-shared.js';
import { fetchAndParseIdPMetadata } from './sso-saml.service.js';
import { fetchAndParseOIDCDiscovery } from './sso-oidc.service.js';

import type { SSOProvider, RoleMappingRule } from './sso-shared.js';

const db = getDatabaseClient();

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
