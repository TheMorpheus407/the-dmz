import { eq, and } from 'drizzle-orm';

import { type DB } from '../../shared/database/connection.js';
import { oauthClients } from '../../db/schema/auth/oauth-clients.js';
import { assertCreated } from '../../shared/utils/db-utils.js';

export type OAuthClientData = {
  tenantId: string;
  name: string;
  secretHash: string;
  scopes: string;
  expiresAt: Date | null;
};

export const createOAuthClient = async (
  db: DB,
  data: OAuthClientData,
): Promise<{
  id: string;
  clientId: string;
  tenantId: string;
  name: string;
  scopes: string;
  createdAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
}> => {
  const [created] = await db
    .insert(oauthClients)
    .values({
      tenantId: data.tenantId,
      name: data.name,
      secretHash: data.secretHash,
      scopes: data.scopes,
      expiresAt: data.expiresAt,
    })
    .returning({
      id: oauthClients.id,
      clientId: oauthClients.clientId,
      tenantId: oauthClients.tenantId,
      name: oauthClients.name,
      scopes: oauthClients.scopes,
      createdAt: oauthClients.createdAt,
      expiresAt: oauthClients.expiresAt,
      revokedAt: oauthClients.revokedAt,
      lastUsedAt: oauthClients.lastUsedAt,
    });

  return assertCreated(created, 'OAuth client');
};

export const findOAuthClientByClientIdOnly = async (
  db: DB,
  clientId: string,
): Promise<{
  id: string;
  clientId: string;
  tenantId: string;
  name: string;
  secretHash: string;
  previousSecretHash: string | null;
  rotationGracePeriodHours: string;
  rotationGraceEndsAt: Date | null;
  scopes: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
} | null> => {
  const client = await db.query.oauthClients.findFirst({
    where: eq(oauthClients.clientId, clientId),
  });

  if (!client) {
    return null;
  }

  return {
    id: client.id,
    clientId: client.clientId,
    tenantId: client.tenantId,
    name: client.name,
    secretHash: client.secretHash,
    previousSecretHash: client.previousSecretHash,
    rotationGracePeriodHours: client.rotationGracePeriodHours,
    rotationGraceEndsAt: client.rotationGraceEndsAt,
    scopes: client.scopes,
    expiresAt: client.expiresAt,
    revokedAt: client.revokedAt,
    lastUsedAt: client.lastUsedAt,
    createdAt: client.createdAt,
  };
};

export const findOAuthClientByClientId = async (
  db: DB,
  clientId: string,
  tenantId: string,
): Promise<{
  id: string;
  clientId: string;
  tenantId: string;
  name: string;
  secretHash: string;
  previousSecretHash: string | null;
  rotationGracePeriodHours: string;
  rotationGraceEndsAt: Date | null;
  scopes: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
} | null> => {
  const client = await db.query.oauthClients.findFirst({
    where: and(eq(oauthClients.clientId, clientId), eq(oauthClients.tenantId, tenantId)),
  });

  if (!client) {
    return null;
  }

  return {
    id: client.id,
    clientId: client.clientId,
    tenantId: client.tenantId,
    name: client.name,
    secretHash: client.secretHash,
    previousSecretHash: client.previousSecretHash,
    rotationGracePeriodHours: client.rotationGracePeriodHours,
    rotationGraceEndsAt: client.rotationGraceEndsAt,
    scopes: client.scopes,
    expiresAt: client.expiresAt,
    revokedAt: client.revokedAt,
    lastUsedAt: client.lastUsedAt,
    createdAt: client.createdAt,
  };
};

export const findOAuthClientsByTenantId = async (
  db: DB,
  tenantId: string,
): Promise<
  Array<{
    id: string;
    clientId: string;
    tenantId: string;
    name: string;
    scopes: string;
    createdAt: Date;
    expiresAt: Date | null;
    revokedAt: Date | null;
    lastUsedAt: Date | null;
  }>
> => {
  return db.query.oauthClients.findMany({
    where: eq(oauthClients.tenantId, tenantId),
    columns: {
      id: true,
      clientId: true,
      tenantId: true,
      name: true,
      scopes: true,
      createdAt: true,
      expiresAt: true,
      revokedAt: true,
      lastUsedAt: true,
    },
  });
};

export const rotateOAuthClientSecret = async (
  db: DB,
  clientId: string,
  tenantId: string,
  newSecretHash: string,
): Promise<void> => {
  const client = await findOAuthClientByClientId(db, clientId, tenantId);
  if (!client) {
    throw new Error('OAuth client not found');
  }

  const gracePeriodHours = parseInt(client.rotationGracePeriodHours, 10) || 1;
  const rotationGraceEndsAt = new Date(Date.now() + gracePeriodHours * 60 * 60 * 1000);

  await db
    .update(oauthClients)
    .set({
      secretHash: newSecretHash,
      previousSecretHash: client.secretHash,
      rotationGraceEndsAt,
      updatedAt: new Date(),
    })
    .where(and(eq(oauthClients.clientId, clientId), eq(oauthClients.tenantId, tenantId)));
};

export const revokeOAuthClient = async (
  db: DB,
  clientId: string,
  tenantId: string,
): Promise<void> => {
  await db
    .update(oauthClients)
    .set({
      revokedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(oauthClients.clientId, clientId), eq(oauthClients.tenantId, tenantId)));
};

export const updateOAuthClientLastUsed = async (
  db: DB,
  clientId: string,
  tenantId: string,
): Promise<void> => {
  await db
    .update(oauthClients)
    .set({
      lastUsedAt: new Date(),
    })
    .where(and(eq(oauthClients.clientId, clientId), eq(oauthClients.tenantId, tenantId)));
};

export const deleteOAuthClient = async (
  db: DB,
  clientId: string,
  tenantId: string,
): Promise<void> => {
  await db
    .delete(oauthClients)
    .where(and(eq(oauthClients.clientId, clientId), eq(oauthClients.tenantId, tenantId)));
};
