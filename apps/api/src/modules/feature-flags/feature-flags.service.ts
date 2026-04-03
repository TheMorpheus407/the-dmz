import { eq, and } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  featureFlags,
  featureFlagOverrides,
  abTestAssignments,
  type FeatureFlag,
  type FeatureFlagOverride,
} from '../../db/schema/feature-flags/index.js';
import {
  getCachedFeatureFlags,
  setCachedFeatureFlags,
  invalidateFeatureFlagsCache,
} from '../../shared/cache/index.js';
import { createAuditLog } from '../audit/index.js';

import type { AppConfig } from '../../config.js';

export interface CreateFeatureFlagInput {
  name: string;
  description?: string | null;
  key: string;
  enabledByDefault?: boolean;
  rolloutPercentage?: number;
  userSegments?: Record<string, unknown>[];
  isActive?: boolean;
}

export interface UpdateFeatureFlagInput {
  name?: string;
  description?: string | null;
  enabledByDefault?: boolean;
  rolloutPercentage?: number;
  userSegments?: Record<string, unknown>[];
  isActive?: boolean;
}

export interface FeatureFlagOverrideInput {
  tenantId: string;
  enabled: boolean;
  rolloutPercentage?: number | null;
}

export interface FeatureFlagWithOverride extends FeatureFlag {
  override?: FeatureFlagOverride | null;
}

export async function createFeatureFlag(
  config: AppConfig,
  tenantId: string,
  input: CreateFeatureFlagInput,
  userId?: string,
): Promise<FeatureFlag> {
  const db = getDatabaseClient(config);

  const [flag] = await db
    .insert(featureFlags)
    .values({
      tenantId,
      name: input.name,
      description: input.description ?? null,
      key: input.key,
      enabledByDefault: input.enabledByDefault ?? false,
      rolloutPercentage: input.rolloutPercentage ?? 0,
      userSegments: input.userSegments ?? [],
      isActive: input.isActive ?? true,
    })
    .returning();

  await invalidateFeatureFlagsCache(config, tenantId);

  if (userId) {
    await createAuditLog(
      {
        tenantId,
        userId,
        action: 'feature_flag_created',
        resourceType: 'feature_flag',
        resourceId: flag!.id,
        metadata: {
          name: input.name,
          key: input.key,
          enabledByDefault: input.enabledByDefault ?? false,
          rolloutPercentage: input.rolloutPercentage ?? 0,
          isActive: input.isActive ?? true,
        },
      },
      config,
    );
  }

  return flag!;
}

export async function getFeatureFlagById(
  config: AppConfig,
  tenantId: string,
  flagId: string,
): Promise<FeatureFlagWithOverride | null> {
  const db = getDatabaseClient(config);

  const flag = await db.query.featureFlags.findFirst({
    where: and(eq(featureFlags.id, flagId), eq(featureFlags.tenantId, tenantId)),
  });

  if (!flag) {
    return null;
  }

  const override = await db.query.featureFlagOverrides.findFirst({
    where: and(eq(featureFlagOverrides.flagId, flagId)),
  });

  return { ...flag, override: override ?? null };
}

export async function getFeatureFlagByKey(
  config: AppConfig,
  tenantId: string,
  key: string,
): Promise<FeatureFlag | null> {
  const db = getDatabaseClient(config);

  const flag = await db.query.featureFlags.findFirst({
    where: and(eq(featureFlags.key, key), eq(featureFlags.tenantId, tenantId)),
  });

  return flag ?? null;
}

export async function listFeatureFlags(
  config: AppConfig,
  tenantId: string,
  options?: { includeInactive?: boolean },
): Promise<FeatureFlag[]> {
  const db = getDatabaseClient(config);

  const query = db.query.featureFlags.findMany({
    where: eq(featureFlags.tenantId, tenantId),
  });

  const flags = await query;

  if (!options?.includeInactive) {
    return flags.filter((f: FeatureFlag) => f.isActive);
  }

  return flags;
}

export async function updateFeatureFlag(
  config: AppConfig,
  tenantId: string,
  flagId: string,
  input: UpdateFeatureFlagInput,
  userId?: string,
): Promise<FeatureFlag | null> {
  const db = getDatabaseClient(config);

  const existing = await db.query.featureFlags.findFirst({
    where: and(eq(featureFlags.id, flagId), eq(featureFlags.tenantId, tenantId)),
  });

  if (!existing) {
    return null;
  }

  const [updated] = await db
    .update(featureFlags)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.enabledByDefault !== undefined && { enabledByDefault: input.enabledByDefault }),
      ...(input.rolloutPercentage !== undefined && { rolloutPercentage: input.rolloutPercentage }),
      ...(input.userSegments !== undefined && { userSegments: input.userSegments }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      updatedAt: new Date(),
    })
    .where(and(eq(featureFlags.id, flagId), eq(featureFlags.tenantId, tenantId)))
    .returning();

  await invalidateFeatureFlagsCache(config, tenantId);

  if (userId) {
    await createAuditLog(
      {
        tenantId,
        userId,
        action: 'feature_flag_updated',
        resourceType: 'feature_flag',
        resourceId: flagId,
        metadata: {
          previousValues: {
            name: existing.name,
            description: existing.description,
            enabledByDefault: existing.enabledByDefault,
            rolloutPercentage: existing.rolloutPercentage,
            isActive: existing.isActive,
          },
          newValues: input,
        },
      },
      config,
    );
  }

  return updated ?? null;
}

export async function deleteFeatureFlag(
  config: AppConfig,
  tenantId: string,
  flagId: string,
  userId?: string,
): Promise<boolean> {
  const db = getDatabaseClient(config);

  const existing = await db.query.featureFlags.findFirst({
    where: and(eq(featureFlags.id, flagId), eq(featureFlags.tenantId, tenantId)),
  });

  if (!existing) {
    return false;
  }

  await db
    .delete(featureFlags)
    .where(and(eq(featureFlags.id, flagId), eq(featureFlags.tenantId, tenantId)));

  await invalidateFeatureFlagsCache(config, tenantId);

  if (userId) {
    await createAuditLog(
      {
        tenantId,
        userId,
        action: 'feature_flag_deleted',
        resourceType: 'feature_flag',
        resourceId: flagId,
        metadata: {
          name: existing.name,
          key: existing.key,
        },
      },
      config,
    );
  }

  return true;
}

export async function setTenantOverride(
  config: AppConfig,
  tenantId: string,
  flagId: string,
  override: FeatureFlagOverrideInput,
  userId?: string,
): Promise<FeatureFlagOverride> {
  const db = getDatabaseClient(config);

  const existingFlag = await db.query.featureFlags.findFirst({
    where: and(eq(featureFlags.id, flagId), eq(featureFlags.tenantId, tenantId)),
  });

  if (!existingFlag) {
    throw new Error('Feature flag not found');
  }

  const [result] = await db
    .insert(featureFlagOverrides)
    .values({
      flagId,
      tenantId: override.tenantId,
      enabled: override.enabled,
      rolloutPercentage: override.rolloutPercentage ?? null,
    })
    .onConflictDoUpdate({
      target: [featureFlagOverrides.flagId, featureFlagOverrides.tenantId],
      set: {
        enabled: override.enabled,
        rolloutPercentage: override.rolloutPercentage ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  await invalidateFeatureFlagsCache(config, tenantId);

  if (userId) {
    await createAuditLog(
      {
        tenantId,
        userId,
        action: 'feature_flag_override_set',
        resourceType: 'feature_flag',
        resourceId: flagId,
        metadata: {
          targetTenantId: override.tenantId,
          enabled: override.enabled,
          rolloutPercentage: override.rolloutPercentage,
        },
      },
      config,
    );
  }

  return result!;
}

export async function getActiveFlagsForTenant(
  config: AppConfig,
  tenantId: string,
): Promise<Record<string, boolean>> {
  const cached = await getCachedFeatureFlags(config, tenantId);
  if (cached) {
    return cached.flags;
  }

  const db = getDatabaseClient(config);

  const flags = await db.query.featureFlags.findMany({
    where: and(eq(featureFlags.tenantId, tenantId), eq(featureFlags.isActive, true)),
  });

  const flagsMap: Record<string, boolean> = {};
  for (const flag of flags) {
    flagsMap[flag.key] = flag.enabledByDefault;
  }

  await setCachedFeatureFlags(config, tenantId, flagsMap);

  return flagsMap;
}

export async function evaluateFlag(
  config: AppConfig,
  tenantId: string,
  flagKey: string,
  userId?: string,
): Promise<boolean> {
  const cached = await getCachedFeatureFlags(config, tenantId, userId);
  if (cached) {
    return cached.flags[flagKey] ?? false;
  }

  const db = getDatabaseClient(config);

  const flag = await db.query.featureFlags.findFirst({
    where: and(eq(featureFlags.key, flagKey), eq(featureFlags.tenantId, tenantId)),
  });

  if (!flag || !flag.isActive) {
    return false;
  }

  let enabled = flag.enabledByDefault;
  let percentage = flag.rolloutPercentage;

  const override = await db.query.featureFlagOverrides.findFirst({
    where: and(eq(featureFlagOverrides.flagId, flag.id)),
  });

  if (override) {
    enabled = override.enabled;
    percentage = override.rolloutPercentage ?? flag.rolloutPercentage;
  }

  if (percentage > 0 && percentage < 100 && userId) {
    const assignment = await db.query.abTestAssignments.findFirst({
      where: and(
        eq(abTestAssignments.flagId, flag.id),
        eq(abTestAssignments.userId, userId),
        eq(abTestAssignments.tenantId, tenantId),
      ),
    });

    if (assignment) {
      return assignment.variant === 'treatment';
    }

    const hash = hashUserToBucket(userId, flag.id);
    const isInTreatment = hash < percentage;

    await db.insert(abTestAssignments).values({
      flagId: flag.id,
      userId,
      tenantId,
      variant: isInTreatment ? 'treatment' : 'control',
    });

    await createAuditLog(
      {
        tenantId,
        userId,
        action: 'ab_test_assigned',
        resourceType: 'feature_flag',
        resourceId: flag.id,
        metadata: {
          flagKey: flag.key,
          variant: isInTreatment ? 'treatment' : 'control',
          rolloutPercentage: percentage,
        },
      },
      config,
    );

    return isInTreatment;
  }

  return enabled;
}

function hashUserToBucket(userId: string, flagId: string): number {
  const str = `${userId}:${flagId}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash % 100);
}

export async function recordConversion(
  config: AppConfig,
  tenantId: string,
  flagId: string,
  userId: string,
): Promise<void> {
  const db = getDatabaseClient(config);

  await db
    .update(abTestAssignments)
    .set({ convertedAt: new Date() })
    .where(
      and(
        eq(abTestAssignments.flagId, flagId),
        eq(abTestAssignments.userId, userId),
        eq(abTestAssignments.tenantId, tenantId),
      ),
    );
}
