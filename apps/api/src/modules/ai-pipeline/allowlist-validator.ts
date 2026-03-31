import { ENTITY_ALLOWLIST, GENERIC_TITLE_CASE_WORDS } from './safety-validator.data.js';

const normalizeEntity = (value: string): string =>
  value
    .replace(/[^\p{L}\p{N}\s-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const tokenizeEntity = (value: string): string[] =>
  normalizeEntity(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

export const isAllowedEntity = (candidate: string): boolean => {
  const normalized = normalizeEntity(candidate);
  if (normalized.length === 0) {
    return true;
  }

  if (ENTITY_ALLOWLIST.has(normalized)) {
    return true;
  }

  const tokens = tokenizeEntity(candidate);
  return tokens.length > 0 && tokens.every((token) => GENERIC_TITLE_CASE_WORDS.has(token));
};
