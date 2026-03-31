import type { PrivacyLevel } from '../../../db/schema/social/index.js';

function applyPrivacyFilter<T extends { displayName?: string | null; playerId: string }>(
  entries: T[],
  privacyLevel: PrivacyLevel,
): T[] {
  switch (privacyLevel) {
    case 'full_name':
      return entries;
    case 'pseudonym':
      return entries.map((e) => ({
        ...e,
        displayName: `Player ${e.playerId.slice(0, 8)}`,
      }));
    case 'anonymous_aggregate':
      return entries.map((e) => ({
        ...e,
        displayName: undefined,
        playerId: 'anonymous' as string,
      }));
    default:
      return entries;
  }
}

export function filterEntriesByPrivacy<T extends { displayName?: string | null; playerId: string }>(
  entries: T[],
  privacyLevel: PrivacyLevel,
): T[] {
  return applyPrivacyFilter(entries, privacyLevel);
}

export { applyPrivacyFilter };
