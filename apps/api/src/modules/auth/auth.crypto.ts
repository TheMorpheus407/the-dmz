import { randomUUID } from 'crypto';

import * as argon2 from 'argon2';

import {
  m1PasswordPolicyManifest,
  evaluatePasswordPolicy,
  getTenantPolicy,
  type PasswordPolicyRequirements,
} from '@the-dmz/shared/contracts';

import { screenPassword } from '../../shared/services/compromised-credential.service.js';

import { signJWT } from './jwt-keys.service.js';
import { PasswordPolicyError } from './auth.errors.js';

import type { AppConfig } from '../../config.js';
import type { AuthUser, AuthTokens } from './auth.types.js';

export const REFRESH_TOKEN_EXPIRY_DAYS = 30;

export const hashToken = async (token: string, salt: string): Promise<string> => {
  return argon2.hash(token, {
    type: argon2.argon2id,
    salt: Buffer.from(salt),
    hashLength: 32,
  });
};

export const hashPassword = async (password: string): Promise<string> => {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
};

export const generateTokens = async (
  config: AppConfig,
  user: AuthUser,
  sessionId: string,
  providedRefreshToken?: string,
): Promise<AuthTokens> => {
  const accessToken = await signJWT(config, {
    sub: user.id,
    tenantId: user.tenantId,
    sessionId,
    role: user.role,
  });

  const refreshToken = providedRefreshToken ?? randomUUID();

  return {
    accessToken,
    refreshToken,
  };
};

export const validatePasswordAgainstPolicy = (
  password: string,
  _tenantId: string,
): PasswordPolicyRequirements => {
  const policy = getTenantPolicy(undefined, m1PasswordPolicyManifest);

  const result = evaluatePasswordPolicy(password, policy);

  if (!result.valid) {
    throw new PasswordPolicyError({
      policyRequirements: {
        minLength: policy.minLength,
        maxLength: policy.maxLength,
        requireUppercase: policy.requireUppercase,
        requireLowercase: policy.requireLowercase,
        requireNumber: policy.requireNumber,
        requireSpecial: policy.requireSpecial,
        characterClassesRequired: policy.characterClassesRequired,
        characterClassesMet: result.characterClassesMet,
      },
      violations: result.violations,
    });
  }

  return policy;
};

export const screenPasswordForCompromise = async (
  config: AppConfig,
  password: string,
): Promise<void> => {
  const compromisedResult = await screenPassword(config, password);
  if ('compromised' in compromisedResult && compromisedResult.compromised) {
    throw new PasswordPolicyError({
      policyRequirements: {
        minLength: 12,
        maxLength: 128,
        requireUppercase: true,
        requireLowercase: true,
        requireNumber: true,
        requireSpecial: true,
        characterClassesRequired: 3,
        characterClassesMet: 0,
      },
      violations: ['compromised'],
    });
  }
};
