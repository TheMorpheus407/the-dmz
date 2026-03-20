import { eq } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  type SocialProfileMode,
  tenantPrivacySettings,
  type TenantPrivacySettings,
  type NewTenantPrivacySettings,
  DEFAULT_PRIVACY_SETTINGS,
} from '../../shared/database/schema/tenant-privacy-settings.js';
import { tenants } from '../../shared/database/schema/tenants.js';

import type { AppConfig } from '../../config.js';

export type { SocialProfileMode, TenantPrivacySettings, NewTenantPrivacySettings };

export interface UpdateTenantPrivacySettingsInput {
  socialProfileMode?: SocialProfileMode;
  requireConsentForSocialFeatures?: boolean;
  allowPublicProfiles?: boolean;
  enforceRealNamePolicy?: boolean;
  shareAchievementsWithEmployer?: boolean;
  shareLeaderboardWithEmployer?: boolean;
  dataRetentionDays?: number | null;
}

export interface PseudonymResult {
  pseudonym: string;
  playerId: string;
}

const PSEUDONYM_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const PSEUDONYM_LENGTH = 4;

export function generatePseudonym(playerId: string): string {
  const hash = simpleHash(playerId);
  const segment1 = generatePseudonymSegmentFromHash(hash);
  const segment2 = generatePseudonymSegmentFromHash(hash ^ 0xdeadbeef);
  return `Operator-${segment1}${segment2}`;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function generatePseudonymSegmentFromHash(hash: number): string {
  let result = '';
  let value = hash;
  for (let i = 0; i < PSEUDONYM_LENGTH; i++) {
    const index = Math.abs(value % PSEUDONYM_CHARS.length);
    result += PSEUDONYM_CHARS[index];
    value = Math.floor(value / PSEUDONYM_CHARS.length);
    if (value === 0) {
      value = hash ^ 0x12345678;
    }
  }
  return result;
}

export function isValidSocialProfileMode(mode: string): mode is SocialProfileMode {
  return ['anonymous_tenant', 'pseudonymous_tenant', 'employee_identifiable'].includes(mode);
}

export async function getTenantPrivacySettings(
  config: AppConfig,
  tenantId: string,
): Promise<TenantPrivacySettings | null> {
  const db = getDatabaseClient(config);

  const settings = await db.query.tenantPrivacySettings.findFirst({
    where: eq(tenantPrivacySettings.tenantId, tenantId),
  });

  return settings ?? null;
}

export async function getOrCreateTenantPrivacySettings(
  config: AppConfig,
  tenantId: string,
): Promise<TenantPrivacySettings> {
  const db = getDatabaseClient(config);

  let settings = await db.query.tenantPrivacySettings.findFirst({
    where: eq(tenantPrivacySettings.tenantId, tenantId),
  });

  if (!settings) {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.tenantId, tenantId),
    });

    let defaultMode: SocialProfileMode = 'anonymous_tenant';
    if (tenant?.tier === 'enterprise' || tenant?.tier === 'government') {
      defaultMode = 'anonymous_tenant';
    }

    const [created] = await db
      .insert(tenantPrivacySettings)
      .values({
        tenantId,
        socialProfileMode: defaultMode,
        requireConsentForSocialFeatures: DEFAULT_PRIVACY_SETTINGS.requireConsentForSocialFeatures,
        allowPublicProfiles: DEFAULT_PRIVACY_SETTINGS.allowPublicProfiles,
        enforceRealNamePolicy: DEFAULT_PRIVACY_SETTINGS.enforceRealNamePolicy,
        shareAchievementsWithEmployer: DEFAULT_PRIVACY_SETTINGS.shareAchievementsWithEmployer,
        shareLeaderboardWithEmployer: DEFAULT_PRIVACY_SETTINGS.shareLeaderboardWithEmployer,
        dataRetentionDays: DEFAULT_PRIVACY_SETTINGS.dataRetentionDays,
      })
      .returning();

    settings = created;
  }

  return settings!;
}

export async function updateTenantPrivacySettings(
  config: AppConfig,
  tenantId: string,
  input: UpdateTenantPrivacySettingsInput,
): Promise<TenantPrivacySettings | null> {
  const db = getDatabaseClient(config);

  const existing = await db.query.tenantPrivacySettings.findFirst({
    where: eq(tenantPrivacySettings.tenantId, tenantId),
  });

  if (!existing) {
    return null;
  }

  if (input.socialProfileMode !== undefined && !isValidSocialProfileMode(input.socialProfileMode)) {
    return null;
  }

  const [updated] = await db
    .update(tenantPrivacySettings)
    .set({
      ...(input.socialProfileMode !== undefined && { socialProfileMode: input.socialProfileMode }),
      ...(input.requireConsentForSocialFeatures !== undefined && {
        requireConsentForSocialFeatures: input.requireConsentForSocialFeatures,
      }),
      ...(input.allowPublicProfiles !== undefined && {
        allowPublicProfiles: input.allowPublicProfiles,
      }),
      ...(input.enforceRealNamePolicy !== undefined && {
        enforceRealNamePolicy: input.enforceRealNamePolicy,
      }),
      ...(input.shareAchievementsWithEmployer !== undefined && {
        shareAchievementsWithEmployer: input.shareAchievementsWithEmployer,
      }),
      ...(input.shareLeaderboardWithEmployer !== undefined && {
        shareLeaderboardWithEmployer: input.shareLeaderboardWithEmployer,
      }),
      ...(input.dataRetentionDays !== undefined && { dataRetentionDays: input.dataRetentionDays }),
      updatedAt: new Date(),
    })
    .where(eq(tenantPrivacySettings.tenantId, tenantId))
    .returning();

  return updated ?? null;
}

export async function getEffectivePrivacyMode(
  config: AppConfig,
  tenantId: string,
): Promise<SocialProfileMode> {
  const settings = await getOrCreateTenantPrivacySettings(config, tenantId);
  return settings.socialProfileMode as SocialProfileMode;
}

export function applyPrivacyMode(
  displayName: string,
  realName: string | null,
  mode: SocialProfileMode,
  playerId: string,
): { displayName: string; isPseudonymized: boolean } {
  switch (mode) {
    case 'anonymous_tenant':
      return {
        displayName: generatePseudonym(playerId),
        isPseudonymized: true,
      };
    case 'pseudonymous_tenant':
      return {
        displayName: generatePseudonym(playerId),
        isPseudonymized: true,
      };
    case 'employee_identifiable':
      return {
        displayName: realName || displayName,
        isPseudonymized: false,
      };
    default:
      return {
        displayName,
        isPseudonymized: false,
      };
  }
}

export function shouldHidePresence(mode: SocialProfileMode): boolean {
  return mode === 'anonymous_tenant';
}

export function shouldHideProfile(mode: SocialProfileMode): boolean {
  return mode === 'anonymous_tenant';
}

export function shouldHideAchievements(mode: SocialProfileMode): boolean {
  return mode === 'anonymous_tenant';
}

export function shouldUsePseudonymOnLeaderboard(mode: SocialProfileMode): boolean {
  return mode === 'anonymous_tenant' || mode === 'pseudonymous_tenant';
}

export function shouldShowAnonymousAggregate(mode: SocialProfileMode): boolean {
  return mode === 'anonymous_tenant';
}

export function getPrivacyLevel(
  mode: SocialProfileMode,
): 'full_name' | 'pseudonym' | 'anonymous_aggregate' {
  switch (mode) {
    case 'anonymous_tenant':
      return 'anonymous_aggregate';
    case 'pseudonymous_tenant':
      return 'pseudonym';
    case 'employee_identifiable':
      return 'full_name';
    default:
      return 'full_name';
  }
}
