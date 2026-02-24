import {
  m1AuthAbusePolicyManifest,
  AuthAbuseLevel,
  getThresholdForLevel,
} from '@the-dmz/shared/contracts';

import { AppError } from '../middleware/error-handler.js';

import type { AbuseCounterResult } from '../services/abuse-counter.service.js';
import type { FastifyReply } from 'fastify';

const ABUSE_LEVEL_TO_ERROR_CODE: Record<AuthAbuseLevel, string> = {
  [AuthAbuseLevel.NORMAL]: 'AUTH_INVALID_CREDENTIALS',
  [AuthAbuseLevel.COOLDOWN]: 'AUTH_ABUSE_COOLDOWN',
  [AuthAbuseLevel.LOCKED]: 'AUTH_ABUSE_LOCKED',
  [AuthAbuseLevel.CHALLENGE_REQUIRED]: 'AUTH_ABUSE_CHALLENGE_REQUIRED',
  [AuthAbuseLevel.IP_BLOCKED]: 'AUTH_ABUSE_IP_BLOCKED',
};

export const evaluateAbuseResult = (abuseResult: AbuseCounterResult | null): void => {
  if (!abuseResult) {
    return;
  }

  if (abuseResult.level === AuthAbuseLevel.NORMAL) {
    return;
  }

  const errorCode = ABUSE_LEVEL_TO_ERROR_CODE[abuseResult.level];
  const threshold = getThresholdForLevel(abuseResult.level);

  if (!threshold) {
    return;
  }

  const retryAfterSeconds = abuseResult.retryAfterSeconds ?? Math.ceil(threshold.windowMs / 1000);

  let message: string;
  switch (abuseResult.level) {
    case AuthAbuseLevel.COOLDOWN:
      message = 'Too many failed login attempts. Please wait before trying again.';
      break;
    case AuthAbuseLevel.LOCKED:
      message = 'Account temporarily locked due to repeated failed login attempts.';
      break;
    case AuthAbuseLevel.CHALLENGE_REQUIRED:
      message = 'MFA verification required due to suspicious login activity.';
      break;
    case AuthAbuseLevel.IP_BLOCKED:
      message = 'IP address temporarily blocked due to repeated authentication failures.';
      break;
    default:
      message = 'Authentication abuse detected.';
  }

  const details: Record<string, unknown> = {
    abuseLevel: abuseResult.level,
    failureCount: abuseResult.failureCount,
    windowExpiresAt: abuseResult.windowExpiresAt.toISOString(),
  };

  if (abuseResult.level === AuthAbuseLevel.COOLDOWN && retryAfterSeconds) {
    details['retryAfterSeconds'] = retryAfterSeconds;
  }

  throw new AppError({
    code: errorCode,
    message,
    statusCode: threshold.responseStatus,
    details,
  });
};

export const setAbuseHeaders = (
  reply: FastifyReply,
  abuseResult: AbuseCounterResult | null,
): void => {
  if (!abuseResult || abuseResult.level === AuthAbuseLevel.NORMAL) {
    return;
  }

  reply.header('x-abuse-level', abuseResult.level);

  if (abuseResult.level === AuthAbuseLevel.COOLDOWN && abuseResult.retryAfterSeconds) {
    reply.header('retry-after', abuseResult.retryAfterSeconds);
    reply.header('x-retry-after-seconds', abuseResult.retryAfterSeconds);
  }

  if (abuseResult.level !== AuthAbuseLevel.COOLDOWN) {
    reply.header('x-abuse-reason', `failure_count_${abuseResult.failureCount}`);
  }
};

export const getClientIp = (request: { headers: Record<string, unknown> }): string | undefined => {
  const forwarded = request.headers['x-forwarded-for'];
  if (forwarded && typeof forwarded === 'string') {
    const firstIp = forwarded.split(',')[0];
    return firstIp?.trim();
  }

  const realIp = request.headers['x-real-ip'];
  if (typeof realIp === 'string') {
    return realIp;
  }

  return undefined;
};

export const isAbuseProtectionEnabled = (): boolean => {
  return m1AuthAbusePolicyManifest.enabled;
};

export const getPolicyThresholds = () => {
  return m1AuthAbusePolicyManifest.thresholds;
};

export const getPolicyScope = () => {
  return m1AuthAbusePolicyManifest.scope;
};

export const getCoveredEndpoints = () => {
  return m1AuthAbusePolicyManifest.coveredEndpoints;
};
