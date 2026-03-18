import { eq, and, isNull, sql } from 'drizzle-orm';
import { createRemoteJWKSet, jwtVerify, decodeJwt } from 'jose';

import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  ltiPlatforms,
  ltiNonces,
  ltiDeepLinkContent,
  ltiLineItems,
  ltiScores,
  ltiSessions,
  ltiStates,
  type LtiPlatform,
  type LtiLineItem,
  type LtiScore,
  type LtiDeepLinkContentItem,
  type LtiSession,
} from '../../db/schema/lti/index.js';

import type { AppConfig } from '../../config.js';
import type {
  CreateLtiPlatformInput,
  UpdateLtiPlatformInput,
  CreateLtiLineItemInput,
  UpdateLtiLineItemInput,
  CreateLtiScoreInput,
  CreateLtiDeepLinkContentInput,
  UpdateLtiDeepLinkContentInput,
  LtiOidcLoginParams,
  LtiOidcInitResponse,
  LtiLaunchData,
} from './lti.types.js';

export type {
  CreateLtiPlatformInput,
  UpdateLtiPlatformInput,
  CreateLtiLineItemInput,
  UpdateLtiLineItemInput,
  CreateLtiScoreInput,
  CreateLtiDeepLinkContentInput,
  UpdateLtiDeepLinkContentInput,
  LtiOidcLoginParams,
  LtiOidcInitResponse,
  LtiLaunchData,
};

export async function createLtiPlatform(
  config: AppConfig,
  tenantId: string,
  input: CreateLtiPlatformInput,
): Promise<LtiPlatform> {
  const db = getDatabaseClient(config);

  const [platform] = await db
    .insert(ltiPlatforms)
    .values({
      tenantId,
      name: input.name,
      platformUrl: input.platformUrl,
      clientId: input.clientId,
      deploymentId: input.deploymentId ?? null,
      publicKeysetUrl: input.publicKeysetUrl,
      authTokenUrl: input.authTokenUrl,
      authLoginUrl: input.authLoginUrl,
      toolUrl: input.toolUrl ?? null,
    })
    .returning();

  return platform!;
}

export async function getLtiPlatformById(
  config: AppConfig,
  tenantId: string,
  platformId: string,
): Promise<LtiPlatform | null> {
  const db = getDatabaseClient(config);

  const [platform] = await db
    .select()
    .from(ltiPlatforms)
    .where(and(eq(ltiPlatforms.platformId, platformId), eq(ltiPlatforms.tenantId, tenantId)))
    .limit(1);

  return platform ?? null;
}

export async function getLtiPlatformByClientId(
  config: AppConfig,
  clientId: string,
): Promise<LtiPlatform | null> {
  const db = getDatabaseClient(config);

  const [platform] = await db
    .select()
    .from(ltiPlatforms)
    .where(eq(ltiPlatforms.clientId, clientId))
    .limit(1);

  return platform ?? null;
}

export async function getLtiPlatformByUrl(
  config: AppConfig,
  platformUrl: string,
): Promise<LtiPlatform | null> {
  const db = getDatabaseClient(config);

  const [platform] = await db
    .select()
    .from(ltiPlatforms)
    .where(eq(ltiPlatforms.platformUrl, platformUrl))
    .limit(1);

  return platform ?? null;
}

export async function getLtiPlatformByInternalId(
  config: AppConfig,
  platformId: string,
): Promise<LtiPlatform | null> {
  const db = getDatabaseClient(config);

  const [platform] = await db
    .select()
    .from(ltiPlatforms)
    .where(eq(ltiPlatforms.platformId, platformId))
    .limit(1);

  return platform ?? null;
}

export async function listLtiPlatforms(
  config: AppConfig,
  tenantId: string,
): Promise<LtiPlatform[]> {
  const db = getDatabaseClient(config);

  return db.select().from(ltiPlatforms).where(eq(ltiPlatforms.tenantId, tenantId));
}

export async function updateLtiPlatform(
  config: AppConfig,
  tenantId: string,
  platformId: string,
  input: UpdateLtiPlatformInput,
): Promise<LtiPlatform | null> {
  const db = getDatabaseClient(config);

  const [platform] = await db
    .update(ltiPlatforms)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(and(eq(ltiPlatforms.platformId, platformId), eq(ltiPlatforms.tenantId, tenantId)))
    .returning();

  return platform ?? null;
}

export async function deleteLtiPlatform(
  config: AppConfig,
  tenantId: string,
  platformId: string,
): Promise<boolean> {
  const db = getDatabaseClient(config);

  const existing = await db
    .delete(ltiPlatforms)
    .where(and(eq(ltiPlatforms.platformId, platformId), eq(ltiPlatforms.tenantId, tenantId)))
    .returning();

  return existing.length > 0;
}

export async function createNonce(
  config: AppConfig,
  platformId: string,
  nonceValue: string,
  expiresAt: Date,
): Promise<void> {
  const db = getDatabaseClient(config);

  await db.insert(ltiNonces).values({
    platformId,
    nonceValue,
    expiresAt,
  });
}

export async function validateAndConsumeNonce(
  config: AppConfig,
  platformId: string,
  nonceValue: string,
): Promise<boolean> {
  const db = getDatabaseClient(config);
  const now = new Date();

  const [nonce] = await db
    .select()
    .from(ltiNonces)
    .where(
      and(
        eq(ltiNonces.nonceValue, nonceValue),
        eq(ltiNonces.platformId, platformId),
        isNull(ltiNonces.usedAt),
      ),
    )
    .limit(1);

  if (!nonce) {
    return false;
  }

  if (nonce.expiresAt < now) {
    return false;
  }

  await db.update(ltiNonces).set({ usedAt: now }).where(eq(ltiNonces.nonceId, nonce.nonceId));

  return true;
}

export async function cleanupExpiredNonces(config: AppConfig): Promise<number> {
  const db = getDatabaseClient(config);
  const now = new Date();

  const result = await db
    .delete(ltiNonces)
    .where(sql`${ltiNonces.expiresAt} < ${now}`)
    .returning();

  return result.length;
}

export async function createLtiLineItem(
  config: AppConfig,
  tenantId: string,
  input: CreateLtiLineItemInput,
): Promise<LtiLineItem> {
  const db = getDatabaseClient(config);

  const [lineItem] = await db
    .insert(ltiLineItems)
    .values({
      tenantId,
      platformId: input.platformId,
      resourceLinkId: input.resourceLinkId ?? null,
      label: input.label,
      scoreMaximum: input.scoreMaximum ?? 100,
      resourceId: input.resourceId ?? null,
      tag: input.tag ?? null,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
    })
    .returning();

  return lineItem!;
}

export async function getLtiLineItemById(
  config: AppConfig,
  tenantId: string,
  lineItemId: string,
): Promise<LtiLineItem | null> {
  const db = getDatabaseClient(config);

  const [lineItem] = await db
    .select()
    .from(ltiLineItems)
    .where(and(eq(ltiLineItems.lineItemId, lineItemId), eq(ltiLineItems.tenantId, tenantId)))
    .limit(1);

  return lineItem ?? null;
}

export async function getLtiLineItemByIdOnly(
  config: AppConfig,
  lineItemId: string,
): Promise<LtiLineItem | null> {
  const db = getDatabaseClient(config);

  const [lineItem] = await db
    .select()
    .from(ltiLineItems)
    .where(eq(ltiLineItems.lineItemId, lineItemId))
    .limit(1);

  return lineItem ?? null;
}

export async function getLtiLineItemByResourceLinkId(
  config: AppConfig,
  platformId: string,
  resourceLinkId: string,
): Promise<LtiLineItem | null> {
  const db = getDatabaseClient(config);

  const [lineItem] = await db
    .select()
    .from(ltiLineItems)
    .where(
      and(eq(ltiLineItems.platformId, platformId), eq(ltiLineItems.resourceLinkId, resourceLinkId)),
    )
    .limit(1);

  return lineItem ?? null;
}

export async function listLtiLineItems(
  config: AppConfig,
  tenantId: string,
  platformId?: string,
): Promise<LtiLineItem[]> {
  const db = getDatabaseClient(config);

  if (platformId) {
    return db
      .select()
      .from(ltiLineItems)
      .where(and(eq(ltiLineItems.tenantId, tenantId), eq(ltiLineItems.platformId, platformId)));
  }

  return db.select().from(ltiLineItems).where(eq(ltiLineItems.tenantId, tenantId));
}

export async function updateLtiLineItem(
  config: AppConfig,
  tenantId: string,
  lineItemId: string,
  input: UpdateLtiLineItemInput,
): Promise<LtiLineItem | null> {
  const db = getDatabaseClient(config);

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (input.label !== undefined) updateData['label'] = input.label;
  if (input.scoreMaximum !== undefined) updateData['scoreMaximum'] = input.scoreMaximum;
  if (input.resourceId !== undefined) updateData['resourceId'] = input.resourceId ?? null;
  if (input.tag !== undefined) updateData['tag'] = input.tag ?? null;
  if (input.startDate !== undefined)
    updateData['startDate'] = input.startDate ? new Date(input.startDate) : null;
  if (input.endDate !== undefined)
    updateData['endDate'] = input.endDate ? new Date(input.endDate) : null;

  const [lineItem] = await db
    .update(ltiLineItems)
    .set(updateData)
    .where(and(eq(ltiLineItems.lineItemId, lineItemId), eq(ltiLineItems.tenantId, tenantId)))
    .returning();

  return lineItem ?? null;
}

export async function deleteLtiLineItem(
  config: AppConfig,
  tenantId: string,
  lineItemId: string,
): Promise<boolean> {
  const db = getDatabaseClient(config);

  const existing = await db
    .delete(ltiLineItems)
    .where(and(eq(ltiLineItems.lineItemId, lineItemId), eq(ltiLineItems.tenantId, tenantId)))
    .returning();

  return existing.length > 0;
}

export async function createLtiScore(
  config: AppConfig,
  tenantId: string,
  input: CreateLtiScoreInput,
): Promise<LtiScore> {
  const db = getDatabaseClient(config);

  const [score] = await db
    .insert(ltiScores)
    .values({
      tenantId,
      lineItemId: input.lineItemId,
      userId: input.userId,
      scoreGiven: input.scoreGiven?.toString() ?? null,
      scoreMaximum: input.scoreMaximum ?? 100,
      activityProgress: input.activityProgress ?? 'initialized',
      gradingProgress: input.gradingProgress ?? 'pending',
      timestamp: input.timestamp ? new Date(input.timestamp) : new Date(),
    })
    .returning();

  return score!;
}

export async function getLtiScoreByUserAndLineItem(
  config: AppConfig,
  lineItemId: string,
  userId: string,
): Promise<LtiScore | null> {
  const db = getDatabaseClient(config);

  const [score] = await db
    .select()
    .from(ltiScores)
    .where(and(eq(ltiScores.lineItemId, lineItemId), eq(ltiScores.userId, userId)))
    .orderBy(ltiScores.timestamp)
    .limit(1);

  return score ?? null;
}

export async function listLtiScores(
  config: AppConfig,
  tenantId: string,
  lineItemId?: string,
): Promise<LtiScore[]> {
  const db = getDatabaseClient(config);

  if (lineItemId) {
    return db
      .select()
      .from(ltiScores)
      .where(and(eq(ltiScores.tenantId, tenantId), eq(ltiScores.lineItemId, lineItemId)));
  }

  return db.select().from(ltiScores).where(eq(ltiScores.tenantId, tenantId));
}

export async function createLtiDeepLinkContent(
  config: AppConfig,
  tenantId: string,
  input: CreateLtiDeepLinkContentInput,
): Promise<LtiDeepLinkContentItem> {
  const db = getDatabaseClient(config);

  const [content] = await db
    .insert(ltiDeepLinkContent)
    .values({
      tenantId,
      platformId: input.platformId,
      contentType: input.contentType,
      title: input.title,
      url: input.url ?? null,
      lineItemId: input.lineItemId ?? null,
      customParams: input.customParams ?? {},
      available: input.available ?? true,
    })
    .returning();

  return content!;
}

export async function getLtiDeepLinkContentById(
  config: AppConfig,
  tenantId: string,
  contentId: string,
): Promise<LtiDeepLinkContentItem | null> {
  const db = getDatabaseClient(config);

  const [content] = await db
    .select()
    .from(ltiDeepLinkContent)
    .where(
      and(eq(ltiDeepLinkContent.contentId, contentId), eq(ltiDeepLinkContent.tenantId, tenantId)),
    )
    .limit(1);

  return content ?? null;
}

export async function listLtiDeepLinkContent(
  config: AppConfig,
  tenantId: string,
  platformId?: string,
  available?: boolean,
): Promise<LtiDeepLinkContentItem[]> {
  const db = getDatabaseClient(config);

  if (platformId) {
    const contents = await db
      .select()
      .from(ltiDeepLinkContent)
      .where(
        and(
          eq(ltiDeepLinkContent.tenantId, tenantId),
          eq(ltiDeepLinkContent.platformId, platformId),
        ),
      );

    if (available !== undefined) {
      return contents.filter((c) => c.available === available);
    }
    return contents;
  }

  const contents = await db
    .select()
    .from(ltiDeepLinkContent)
    .where(eq(ltiDeepLinkContent.tenantId, tenantId));

  if (available !== undefined) {
    return contents.filter((c) => c.available === available);
  }

  return contents;
}

export async function updateLtiDeepLinkContent(
  config: AppConfig,
  tenantId: string,
  contentId: string,
  input: UpdateLtiDeepLinkContentInput,
): Promise<LtiDeepLinkContentItem | null> {
  const db = getDatabaseClient(config);

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (input.contentType !== undefined) updateData['contentType'] = input.contentType;
  if (input.title !== undefined) updateData['title'] = input.title;
  if (input.url !== undefined) updateData['url'] = input.url ?? null;
  if (input.lineItemId !== undefined) updateData['lineItemId'] = input.lineItemId ?? null;
  if (input.customParams !== undefined) updateData['customParams'] = input.customParams;
  if (input.available !== undefined) updateData['available'] = input.available;

  const [content] = await db
    .update(ltiDeepLinkContent)
    .set(updateData)
    .where(
      and(eq(ltiDeepLinkContent.contentId, contentId), eq(ltiDeepLinkContent.tenantId, tenantId)),
    )
    .returning();

  return content ?? null;
}

export async function deleteLtiDeepLinkContent(
  config: AppConfig,
  tenantId: string,
  contentId: string,
): Promise<boolean> {
  const db = getDatabaseClient(config);

  const existing = await db
    .delete(ltiDeepLinkContent)
    .where(
      and(eq(ltiDeepLinkContent.contentId, contentId), eq(ltiDeepLinkContent.tenantId, tenantId)),
    )
    .returning();

  return existing.length > 0;
}

export async function createLtiSession(
  config: AppConfig,
  tenantId: string,
  data: {
    platformId: string;
    userId?: string;
    resourceLinkId?: string;
    contextId?: string;
    roles?: string[];
    launchId?: string;
  },
): Promise<LtiSession> {
  const db = getDatabaseClient(config);

  const [session] = await db
    .insert(ltiSessions)
    .values({
      tenantId,
      platformId: data.platformId,
      userId: data.userId ?? null,
      resourceLinkId: data.resourceLinkId ?? null,
      contextId: data.contextId ?? null,
      roles: data.roles ?? [],
      launchId: data.launchId ?? null,
    })
    .returning();

  return session!;
}

export async function getLtiSessionByLaunchId(
  config: AppConfig,
  launchId: string,
): Promise<LtiSession | null> {
  const db = getDatabaseClient(config);

  const [session] = await db
    .select()
    .from(ltiSessions)
    .where(eq(ltiSessions.launchId, launchId))
    .limit(1);

  return session ?? null;
}

export async function listLtiSessions(
  config: AppConfig,
  tenantId: string,
  platformId?: string,
): Promise<LtiSession[]> {
  const db = getDatabaseClient(config);

  if (platformId) {
    return db
      .select()
      .from(ltiSessions)
      .where(and(eq(ltiSessions.tenantId, tenantId), eq(ltiSessions.platformId, platformId)));
  }

  return db.select().from(ltiSessions).where(eq(ltiSessions.tenantId, tenantId));
}

export function generateNonce(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function generateState(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function initiateOidcLogin(
  config: AppConfig,
  params: LtiOidcLoginParams,
): Promise<LtiOidcInitResponse | null> {
  const platform = await getLtiPlatformByUrl(config, params.iss);

  if (!platform) {
    return null;
  }

  const state = generateState();
  const nonce = generateNonce();
  const nonceExpiry = new Date(Date.now() + 10 * 60 * 1000);
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const stateExpiry = new Date(Date.now() + 10 * 60 * 1000);

  await createNonce(config, platform.platformId, nonce, nonceExpiry);
  await createState(
    config,
    platform.platformId,
    state,
    codeVerifier,
    params.targetLinkUri,
    stateExpiry,
  );

  const authUrl = new URL(platform.authLoginUrl);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', platform.clientId);
  authUrl.searchParams.set('redirect_uri', params.targetLinkUri);
  authUrl.searchParams.set('scope', 'openid');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('nonce', nonce);
  authUrl.searchParams.set('login_hint', params.loginHint);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  if (params.ltiMessageHint) {
    authUrl.searchParams.set('lti_message_hint', params.ltiMessageHint);
  }

  return {
    url: authUrl.toString(),
    state,
    nonce,
  };
}

export async function extractLtiLaunchData(
  config: AppConfig,
  payload: Record<string, unknown>,
): Promise<LtiLaunchData | null> {
  const rolesClaim = payload['https://purl.imsglobal.org/spec/lti/claim/roles'] as
    | string[]
    | undefined;
  const resourceLink = payload['https://purl.imsglobal.org/spec/lti/claim/resource_link'] as
    | { id: string }
    | undefined;
  const context = payload['https://purl.imsglobal.org/spec/lti/claim/context'] as
    | { id: string; title?: string }
    | undefined;
  const agsEndpoint = payload['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'] as
    | { lineitem?: string }
    | undefined;
  const nrpsClaim = payload['https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice'] as
    | { contextMembershipsUrl: string }
    | undefined;
  const customParams = payload['https://purl.imsglobal.org/spec/lti/claim/custom'] as
    | Record<string, string>
    | undefined;
  const deploymentId = payload['https://purl.imsglobal.org/spec/lti/claim/deployment_id'] as
    | string
    | undefined;

  const platform = payload['aud'] as string | undefined;
  const platformRecord = await getLtiPlatformByClientId(config, platform ?? '');

  if (!platformRecord) {
    return null;
  }

  return {
    platformId: platformRecord.platformId,
    deploymentId: deploymentId ?? '',
    userId: (payload['sub'] as string) ?? '',
    roles: rolesClaim ?? [],
    resourceLinkId: resourceLink?.id ?? '',
    ...(context?.id && { contextId: context.id }),
    ...(context?.title && { contextTitle: context.title }),
    ...(agsEndpoint?.lineitem && { lineItemUrl: agsEndpoint.lineitem }),
    ...(nrpsClaim?.contextMembershipsUrl && { membershipUrl: nrpsClaim.contextMembershipsUrl }),
    customParams: customParams ?? {},
  };
}

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export async function getJWKSet(
  _config: AppConfig,
  platform: LtiPlatform,
): Promise<ReturnType<typeof createRemoteJWKSet> | null> {
  const cached = jwksCache.get(platform.platformId);
  if (cached) {
    return cached;
  }

  if (!platform.publicKeysetUrl) {
    return null;
  }

  const jwks = createRemoteJWKSet(new URL(platform.publicKeysetUrl));
  jwksCache.set(platform.platformId, jwks);
  return jwks;
}

export async function refreshJWKSet(_config: AppConfig, platformId: string): Promise<void> {
  jwksCache.delete(platformId);
}

export interface JwtVerificationResult {
  payload: Record<string, unknown>;
  iss: string;
  aud: string | string[];
  sub: string;
  exp: number;
  iat: number;
  nonce?: string;
}

export async function verifyLtiJwt(
  config: AppConfig,
  platform: LtiPlatform,
  idToken: string,
  expectedNonce?: string,
): Promise<JwtVerificationResult> {
  const jwks = await getJWKSet(config, platform);

  if (!jwks) {
    throw new Error('No JWKS available for platform');
  }

  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: platform.platformUrl,
    audience: platform.clientId,
  });

  const decoded = decodeJwt(idToken);

  if (!decoded.iss || decoded.iss !== platform.platformUrl) {
    throw new Error('Invalid issuer');
  }

  if (!decoded.aud) {
    throw new Error('No audience claim');
  }

  const audiences = Array.isArray(decoded.aud) ? decoded.aud : [decoded.aud];
  if (!audiences.includes(platform.clientId)) {
    throw new Error('Invalid audience');
  }

  if (!decoded.exp || decoded.exp < Date.now() / 1000) {
    throw new Error('Token expired');
  }

  if (!decoded.iat || decoded.iat > Date.now() / 1000 + 60) {
    throw new Error('Token issued in the future');
  }

  if (expectedNonce && payload['nonce'] !== expectedNonce) {
    throw new Error('Invalid nonce');
  }

  return {
    payload,
    iss: decoded.iss,
    aud: decoded.aud,
    sub: decoded.sub!,
    exp: decoded.exp,
    iat: decoded.iat,
    nonce: (payload['nonce'] as string | undefined) ?? '',
  };
}

export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

export function base64UrlEncode(buffer: Uint8Array): string {
  return Buffer.from(buffer).toString('base64url');
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}

export async function createState(
  config: AppConfig,
  platformId: string,
  stateValue: string,
  codeVerifier: string,
  redirectUri: string,
  expiresAt: Date,
): Promise<void> {
  const db = getDatabaseClient(config);

  await db.insert(ltiStates).values({
    stateValue,
    platformId,
    codeVerifier,
    redirectUri,
    expiresAt,
  });
}

export async function validateAndConsumeState(
  config: AppConfig,
  stateValue: string,
): Promise<{ platformId: string; codeVerifier: string; redirectUri: string } | null> {
  const db = getDatabaseClient(config);
  const now = new Date();

  const [state] = await db
    .select()
    .from(ltiStates)
    .where(and(eq(ltiStates.stateValue, stateValue), isNull(ltiStates.usedAt)))
    .limit(1);

  if (!state) {
    return null;
  }

  if (state.expiresAt < now) {
    return null;
  }

  await db.update(ltiStates).set({ usedAt: now }).where(eq(ltiStates.stateId, state.stateId));

  return {
    platformId: state.platformId,
    codeVerifier: state.codeVerifier ?? '',
    redirectUri: state.redirectUri,
  };
}

export async function cleanupExpiredStates(config: AppConfig): Promise<number> {
  const db = getDatabaseClient(config);
  const now = new Date();

  const result = await db
    .delete(ltiStates)
    .where(sql`${ltiStates.expiresAt} < ${now}`)
    .returning();

  return result.length;
}
