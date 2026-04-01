import { randomBytes } from 'crypto';

import * as argon2 from 'argon2';

import { CredentialType } from '@the-dmz/shared/auth/api-key-contract';

export function generateSecret(prefix: string, length: number = 40): string {
  const randomPart = randomBytes(length).toString('hex');
  return `${prefix}${randomPart}`;
}

export async function hashSecret(secret: string): Promise<string> {
  const hash = await argon2.hash(secret, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
  return hash;
}

export function getKeyPrefix(type: CredentialType): string {
  return type === CredentialType.PAT ? 'dmz_pat_' : 'dmz_ak_';
}
