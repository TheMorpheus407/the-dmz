import { eq, and } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  playerConsents,
  type PlayerConsent,
  type NewPlayerConsent,
  type ConsentType,
  consentTypes,
  CONSENT_FEATURE_MAP,
} from '../../db/schema/social/index.js';
import { tenantPrivacySettings } from '../../shared/database/schema/index.js';

import type { AppConfig } from '../../config.js';

export type { PlayerConsent, NewPlayerConsent, ConsentType };

export interface GrantConsentInput {
  playerId: string;
  consentType: ConsentType;
  ipAddressHash?: string;
  userAgent?: string;
}

export interface RevokeConsentInput {
  playerId: string;
  consentType: ConsentType;
}

export interface ConsentResult {
  success: boolean;
  consent?: PlayerConsent;
  error?: string;
}

export interface CheckConsentResult {
  hasConsent: boolean;
  consent: PlayerConsent | undefined;
  tenantRequiresConsent: boolean;
}

export interface PlayerConsentSummary {
  playerId: string;
  consents: {
    consentType: ConsentType;
    granted: boolean;
    grantedAt: Date | null;
    revokedAt: Date | null;
  }[];
}

export function isValidConsentType(type: string): type is ConsentType {
  return consentTypes.includes(type as ConsentType);
}

export function getRequiredConsentTypes(feature: string): ConsentType[] {
  return CONSENT_FEATURE_MAP[feature] || [];
}

export async function grantConsent(
  config: AppConfig,
  tenantId: string,
  input: GrantConsentInput,
): Promise<ConsentResult> {
  const { consentType } = input;
  if (!isValidConsentType(consentType)) {
    return { success: false, error: `Invalid consent type: ${String(consentType)}` };
  }

  const db = getDatabaseClient(config);

  const existing = await db.query.playerConsents.findFirst({
    where: and(
      eq(playerConsents.playerId, input.playerId),
      eq(playerConsents.tenantId, tenantId),
      eq(playerConsents.consentType, consentType),
    ),
  });

  if (existing) {
    if (existing.granted && !existing.revokedAt) {
      return { success: false, error: 'Consent already granted' };
    }

    const [updated] = await db
      .update(playerConsents)
      .set({
        granted: true,
        grantedAt: new Date(),
        revokedAt: null,
        ipAddressHash: input.ipAddressHash ?? null,
        userAgent: input.userAgent ?? null,
      })
      .where(eq(playerConsents.id, existing.id))
      .returning();

    if (!updated) {
      return { success: false, error: 'Failed to update consent' };
    }
    return { success: true, consent: updated };
  }

  const [created] = await db
    .insert(playerConsents)
    .values({
      playerId: input.playerId,
      tenantId,
      consentType,
      granted: true,
      grantedAt: new Date(),
      ipAddressHash: input.ipAddressHash ?? null,
      userAgent: input.userAgent ?? null,
    })
    .returning();

  if (!created) {
    return { success: false, error: 'Failed to create consent' };
  }
  return { success: true, consent: created };
}

export async function revokeConsent(
  config: AppConfig,
  tenantId: string,
  input: RevokeConsentInput,
): Promise<ConsentResult> {
  const { consentType } = input;
  if (!isValidConsentType(consentType)) {
    return { success: false, error: `Invalid consent type: ${String(consentType)}` };
  }

  const db = getDatabaseClient(config);

  const existing = await db.query.playerConsents.findFirst({
    where: and(
      eq(playerConsents.playerId, input.playerId),
      eq(playerConsents.tenantId, tenantId),
      eq(playerConsents.consentType, consentType),
    ),
  });

  if (!existing) {
    return { success: false, error: 'Consent record not found' };
  }

  if (!existing.granted || existing.revokedAt) {
    return { success: false, error: 'Consent not currently granted' };
  }

  const [updated] = await db
    .update(playerConsents)
    .set({
      granted: false,
      revokedAt: new Date(),
    })
    .where(eq(playerConsents.id, existing.id))
    .returning();

  if (!updated) {
    return { success: false, error: 'Failed to revoke consent' };
  }
  return { success: true, consent: updated };
}

export async function checkConsent(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  consentType: ConsentType,
): Promise<CheckConsentResult> {
  const db = getDatabaseClient(config);

  const tenantPrivacy = await db.query.tenantPrivacySettings.findFirst({
    where: eq(tenantPrivacySettings.tenantId, tenantId),
  });

  const tenantRequiresConsent = tenantPrivacy?.requireConsentForSocialFeatures ?? true;

  const consent = await db.query.playerConsents.findFirst({
    where: and(
      eq(playerConsents.playerId, playerId),
      eq(playerConsents.tenantId, tenantId),
      eq(playerConsents.consentType, consentType),
    ),
  });

  const hasConsent = consent?.granted === true && !consent?.revokedAt;

  return {
    hasConsent,
    consent,
    tenantRequiresConsent,
  };
}

export async function checkFeatureConsent(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  feature: string,
): Promise<{ allowed: boolean; missingConsents: ConsentType[] }> {
  const requiredTypes = getRequiredConsentTypes(feature);

  if (requiredTypes.length === 0) {
    return { allowed: true, missingConsents: [] };
  }

  const missingConsents: ConsentType[] = [];

  for (const consentType of requiredTypes) {
    const result = await checkConsent(config, tenantId, playerId, consentType);
    if (!result.hasConsent && result.tenantRequiresConsent) {
      missingConsents.push(consentType);
    }
  }

  return {
    allowed: missingConsents.length === 0,
    missingConsents,
  };
}

export async function getPlayerConsents(
  config: AppConfig,
  tenantId: string,
  playerId: string,
): Promise<PlayerConsentSummary> {
  const db = getDatabaseClient(config);

  const consents = await db.query.playerConsents.findMany({
    where: and(eq(playerConsents.playerId, playerId), eq(playerConsents.tenantId, tenantId)),
  });

  const consentMap = new Map(consents.map((c) => [c.consentType, c]));

  const summary: PlayerConsentSummary = {
    playerId,
    consents: consentTypes.map((type) => {
      const consent = consentMap.get(type);
      return {
        consentType: type,
        granted: consent?.granted ?? false,
        grantedAt: consent?.grantedAt ?? null,
        revokedAt: consent?.revokedAt ?? null,
      };
    }),
  };

  return summary;
}

export async function getDataExport(
  config: AppConfig,
  tenantId: string,
  playerId: string,
): Promise<{ consents: PlayerConsent[] }> {
  const db = getDatabaseClient(config);

  const consents = await db.query.playerConsents.findMany({
    where: and(eq(playerConsents.playerId, playerId), eq(playerConsents.tenantId, tenantId)),
  });

  return { consents };
}
