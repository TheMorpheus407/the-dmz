const INVITE_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const INVITE_CODE_LENGTH = 8;
const INVITE_CODE_TTL_MS = 60 * 60 * 1000;

export function generateInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(INVITE_CODE_LENGTH));
  return Array.from(bytes)
    .map((b) => INVITE_CODE_CHARS[b % INVITE_CODE_CHARS.length])
    .join('');
}

export interface InviteCodeInfo {
  code: string;
  expiresAt: Date;
}

export function createInviteCode(): InviteCodeInfo {
  return {
    code: generateInviteCode(),
    expiresAt: new Date(Date.now() + INVITE_CODE_TTL_MS),
  };
}

export function isInviteCodeValid(
  inviteCode: string | null,
  inviteCodeExpiresAt: Date | null,
): boolean {
  if (!inviteCode || !inviteCodeExpiresAt) {
    return false;
  }
  return new Date(inviteCodeExpiresAt) > new Date();
}

export function getInviteCodeTTL(): number {
  return INVITE_CODE_TTL_MS;
}
