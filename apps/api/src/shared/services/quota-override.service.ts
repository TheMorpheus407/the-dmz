import { eq, and, desc } from 'drizzle-orm';

import {
  tenantQuotaOverrideSchema,
  type TenantTier,
  type CreateQuotaOverrideInput,
  type UpdateQuotaOverrideInput,
  type RevokeQuotaOverrideInput,
} from '@the-dmz/shared/contracts';

import { getDatabaseClient } from '../database/connection.js';
import { tenantQuotaOverrides, tenantQuotaAuditLogs } from '../database/schema/tenant-quota.js';
import { tenants } from '../database/schema/tenants.js';

export interface CreateQuotaOverrideParams {
  tenantId: string;
  requestedBy: string;
  input: CreateQuotaOverrideInput;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export interface UpdateQuotaOverrideParams {
  overrideId: string;
  tenantId: string;
  actorId: string;
  input: UpdateQuotaOverrideInput;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export interface RevokeQuotaOverrideParams {
  overrideId: string;
  tenantId: string;
  actorId: string;
  input: RevokeQuotaOverrideInput;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export interface ListQuotaOverridesParams {
  tenantId: string;
  status?: 'pending' | 'active' | 'expired' | 'revoked';
}

const mapDbToOverride = (row: typeof tenantQuotaOverrides.$inferSelect) => ({
  id: row.id,
  tenantId: row.tenantId,
  tier: row.tier as TenantTier,
  requestsPerMinute: Number(row.requestsPerMinute),
  requestsPerHour: Number(row.requestsPerHour),
  burstLimit: Number(row.burstLimit),
  credentialClasses: row.credentialClasses as string[],
  status: row.status as 'pending' | 'active' | 'expired' | 'revoked',
  requestedBy: row.requestedBy,
  approvedBy: row.approvedBy,
  requestedAt: row.requestedAt?.toISOString() ?? '',
  effectiveFrom: row.effectiveFrom?.toISOString() ?? '',
  effectiveUntil: row.effectiveUntil?.toISOString() ?? null,
  revokedAt: row.revokedAt?.toISOString() ?? null,
  revokedBy: row.revokedBy,
  reason: row.reason,
  policyVersion: row.policyVersion,
});

export const createQuotaOverride = async (params: CreateQuotaOverrideParams) => {
  const db = getDatabaseClient();
  const { tenantId, requestedBy, input, ipAddress, userAgent } = params;

  const [existing] = await db.select().from(tenants).where(eq(tenants.tenantId, tenantId));
  if (!existing) {
    throw new Error('TENANT_NOT_FOUND');
  }

  const [created] = await db
    .insert(tenantQuotaOverrides)
    .values({
      tenantId,
      tier: input.tier,
      requestsPerMinute: String(input.requestsPerMinute),
      requestsPerHour: String(input.requestsPerHour),
      burstLimit: String(input.burstLimit),
      credentialClasses: input.credentialClasses,
      status: 'pending',
      requestedBy,
      effectiveFrom: new Date(input.effectiveFrom),
      effectiveUntil: input.effectiveUntil ? new Date(input.effectiveUntil) : null,
      reason: input.reason ?? null,
      policyVersion: '1.0.0',
    })
    .returning();

  if (!created) {
    throw new Error('Failed to create quota override');
  }

  await db.insert(tenantQuotaAuditLogs).values({
    overrideId: created.id,
    tenantId,
    actorId: requestedBy,
    action: 'CREATE',
    newValues: input,
    reason: input.reason ?? null,
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
  });

  return tenantQuotaOverrideSchema.parse(mapDbToOverride(created));
};

export const listQuotaOverrides = async (params: ListQuotaOverridesParams) => {
  const db = getDatabaseClient();
  const { tenantId, status } = params;

  const conditions = [eq(tenantQuotaOverrides.tenantId, tenantId)];
  if (status) {
    conditions.push(eq(tenantQuotaOverrides.status, status));
  }

  const overrides = await db
    .select()
    .from(tenantQuotaOverrides)
    .where(and(...conditions))
    .orderBy(desc(tenantQuotaOverrides.createdAt));

  return overrides.map(mapDbToOverride);
};

export const getQuotaOverrideById = async (overrideId: string, tenantId: string) => {
  const db = getDatabaseClient();

  const [override] = await db
    .select()
    .from(tenantQuotaOverrides)
    .where(
      and(eq(tenantQuotaOverrides.id, overrideId), eq(tenantQuotaOverrides.tenantId, tenantId)),
    );

  if (!override) {
    throw new Error('OVERRIDE_NOT_FOUND');
  }

  return tenantQuotaOverrideSchema.parse(mapDbToOverride(override));
};

export const updateQuotaOverride = async (params: UpdateQuotaOverrideParams) => {
  const db = getDatabaseClient();
  const { overrideId, tenantId, actorId, input, ipAddress, userAgent } = params;

  const [existing] = await db
    .select()
    .from(tenantQuotaOverrides)
    .where(
      and(eq(tenantQuotaOverrides.id, overrideId), eq(tenantQuotaOverrides.tenantId, tenantId)),
    );

  if (!existing) {
    throw new Error('OVERRIDE_NOT_FOUND');
  }

  const oldValues = mapDbToOverride(existing);
  const updateData: {
    updatedAt: Date;
    requestsPerMinute?: string;
    requestsPerHour?: string;
    burstLimit?: string;
    effectiveUntil?: Date;
    reason?: string;
  } = {
    updatedAt: new Date(),
  };

  if (input.requestsPerMinute !== undefined) {
    updateData.requestsPerMinute = String(input.requestsPerMinute);
  }
  if (input.requestsPerHour !== undefined) {
    updateData.requestsPerHour = String(input.requestsPerHour);
  }
  if (input.burstLimit !== undefined) {
    updateData.burstLimit = String(input.burstLimit);
  }
  if (input.effectiveUntil !== undefined) {
    updateData.effectiveUntil = new Date(input.effectiveUntil);
  }
  if (input.reason !== undefined) {
    updateData.reason = input.reason;
  }

  const [updated] = await db
    .update(tenantQuotaOverrides)
    .set(updateData)
    .where(
      and(eq(tenantQuotaOverrides.id, overrideId), eq(tenantQuotaOverrides.tenantId, tenantId)),
    )
    .returning();

  if (!updated) {
    throw new Error('Failed to update quota override');
  }

  await db.insert(tenantQuotaAuditLogs).values({
    overrideId,
    tenantId,
    actorId,
    action: 'UPDATE',
    oldValues,
    newValues: input,
    reason: input.reason ?? null,
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
  });

  return tenantQuotaOverrideSchema.parse(mapDbToOverride(updated));
};

export const revokeQuotaOverride = async (params: RevokeQuotaOverrideParams) => {
  const db = getDatabaseClient();
  const { overrideId, tenantId, actorId, input, ipAddress, userAgent } = params;

  const [existing] = await db
    .select()
    .from(tenantQuotaOverrides)
    .where(
      and(eq(tenantQuotaOverrides.id, overrideId), eq(tenantQuotaOverrides.tenantId, tenantId)),
    );

  if (!existing) {
    throw new Error('OVERRIDE_NOT_FOUND');
  }

  const oldValues = mapDbToOverride(existing);

  const [updated] = await db
    .update(tenantQuotaOverrides)
    .set({
      status: 'revoked',
      revokedAt: new Date(),
      revokedBy: actorId,
      reason: input.reason ?? null,
      updatedAt: new Date(),
    })
    .where(
      and(eq(tenantQuotaOverrides.id, overrideId), eq(tenantQuotaOverrides.tenantId, tenantId)),
    )
    .returning();

  if (!updated) {
    throw new Error('Failed to revoke quota override');
  }

  await db.insert(tenantQuotaAuditLogs).values({
    overrideId,
    tenantId,
    actorId,
    action: 'REVOKE',
    oldValues,
    newValues: { status: 'revoked', reason: input.reason ?? null },
    reason: input.reason ?? null,
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
  });

  return tenantQuotaOverrideSchema.parse(mapDbToOverride(updated));
};

export const approveQuotaOverride = async (
  overrideId: string,
  tenantId: string,
  actorId: string,
) => {
  const db = getDatabaseClient();

  const [existing] = await db
    .select()
    .from(tenantQuotaOverrides)
    .where(
      and(eq(tenantQuotaOverrides.id, overrideId), eq(tenantQuotaOverrides.tenantId, tenantId)),
    );

  if (!existing) {
    throw new Error('OVERRIDE_NOT_FOUND');
  }

  const oldValues = mapDbToOverride(existing);

  const [updated] = await db
    .update(tenantQuotaOverrides)
    .set({
      status: 'active',
      approvedBy: actorId,
      updatedAt: new Date(),
    })
    .where(
      and(eq(tenantQuotaOverrides.id, overrideId), eq(tenantQuotaOverrides.tenantId, tenantId)),
    )
    .returning();

  if (!updated) {
    throw new Error('Failed to approve quota override');
  }

  await db.insert(tenantQuotaAuditLogs).values({
    overrideId,
    tenantId,
    actorId,
    action: 'APPROVE',
    oldValues,
    newValues: { status: 'active', approvedBy: actorId },
    reason: null,
    ipAddress: null,
    userAgent: null,
  });

  return tenantQuotaOverrideSchema.parse(mapDbToOverride(updated));
};
