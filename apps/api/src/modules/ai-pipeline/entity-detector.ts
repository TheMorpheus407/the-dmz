import { isIP } from 'node:net';

import {
  GENERIC_TITLE_CASE_WORDS,
  COMMON_SENTENCE_WORDS,
  ORGANIZATION_CONTEXT_WORDS,
  ORGANIZATION_SUFFIXES,
  PERSON_CONTEXT_REGEX,
  HONORIFIC_NAME_REGEX,
  ENTITY_SEQUENCE_REGEX,
  ACTIONABLE_PATTERNS,
  PHONE_REGEX,
  IP_TOKEN_REGEX,
  URL_REGEX,
  EMAIL_REGEX,
  FILE_EXTENSION_TLDS,
  CONTENT_FIELD_REFERENCE_REGEX,
  RESERVED_TLDS,
} from './safety-validator.data.js';
import { isAllowedEntity } from './allowlist-validator.js';

import type { SafetyFinding } from './ai-pipeline.types.js';

const usesReservedTld = (value: string): boolean =>
  RESERVED_TLDS.some((suffix) => value.toLowerCase().endsWith(suffix));

const normalizeIpCandidate = (value: string): string =>
  value
    .replace(/^[\s"'(<[]+/, '')
    .replace(/[\s"',;!?)]*$/, '')
    .replace(/\]+$/, '')
    .replace(/\.+$/, '')
    .replace(/%.+$/, '');

const normalizeUrlCandidate = (value: string): string =>
  value
    .replace(/^[\s"'(<[]+/, '')
    .replace(/[\s"',;!?)]*$/, '')
    .replace(/\]+$/, '')
    .replace(/\.+$/, '');

const isLikelyFileName = (rawValue: string, hostname: string): boolean => {
  if (rawValue.includes('/') || rawValue.includes(':') || /^https?:\/\//i.test(rawValue)) {
    return false;
  }

  const labels = hostname.toLowerCase().split('.');
  if (labels.length !== 2) {
    return false;
  }

  const [, tld] = labels;
  return FILE_EXTENSION_TLDS.has(tld ?? '');
};

const isStructuredFieldReference = (value: string): boolean =>
  CONTENT_FIELD_REFERENCE_REGEX.test(value);

export const containsIpLiteral = (value: string): boolean => {
  const matches = value.match(IP_TOKEN_REGEX) ?? [];

  return matches.some((match) => {
    if (!/\d/.test(match) || (!match.includes('.') && !match.includes(':'))) {
      return false;
    }

    const normalized = normalizeIpCandidate(match);
    return normalized.length > 0 && isIP(normalized) !== 0;
  });
};

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

const hasSingleTokenOrganizationContext = (
  source: string,
  candidate: string,
  index: number,
): boolean => {
  const escapedCandidate = candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const trailingRegex = new RegExp(
    `\\b${escapedCandidate}\\b\\s+(?:${ORGANIZATION_CONTEXT_WORDS.join('|')})\\b`,
    'i',
  );
  const leadingRegex = new RegExp(
    `\\b(?:${ORGANIZATION_CONTEXT_WORDS.join('|')})\\b\\s+${escapedCandidate}\\b`,
    'i',
  );
  const contextWindow = source.slice(
    Math.max(0, index - 32),
    Math.min(source.length, index + candidate.length + 32),
  );

  return trailingRegex.test(contextWindow) || leadingRegex.test(contextWindow);
};

const looksLikeStandaloneSignatureName = (
  source: string,
  candidate: string,
  index: number,
): boolean => {
  const lineStart = source.lastIndexOf('\n', index) + 1;
  const nextNewline = source.indexOf('\n', index);
  const lineEnd = nextNewline === -1 ? source.length : nextNewline;
  const line = source.slice(lineStart, lineEnd).trim();

  return normalizeEntity(line) === normalizeEntity(candidate);
};

const addUniqueFinding = (
  findings: SafetyFinding[],
  code: string,
  message: string,
  path?: string,
): void => {
  if (findings.some((finding) => finding.code === code && finding.path === path)) {
    return;
  }

  findings.push({
    code,
    message,
    ...(path ? { path } : {}),
  });
};

export const detectEntityReferences = (
  strings: Array<{ path: string; value: string }>,
  findings: SafetyFinding[],
): void => {
  for (const entry of strings) {
    for (const match of entry.value.matchAll(HONORIFIC_NAME_REGEX)) {
      const candidate = match[1];
      if (!candidate || isAllowedEntity(candidate)) {
        continue;
      }

      addUniqueFinding(
        findings,
        'REAL_PERSON_DETECTED',
        'Generated content references a likely real-world person name',
        entry.path,
      );
    }

    for (const match of entry.value.matchAll(ENTITY_SEQUENCE_REGEX)) {
      const candidate = match[0];
      const index = match.index ?? 0;
      const tokens = tokenizeEntity(candidate);
      const lastToken = tokens.at(-1);
      const prefix = entry.value.slice(Math.max(0, index - 32), index);

      if (
        candidate.length < 3 ||
        isAllowedEntity(candidate) ||
        (tokens.length === 1 && COMMON_SENTENCE_WORDS.has(tokens[0] ?? ''))
      ) {
        continue;
      }

      if (
        tokens.length >= 2 &&
        !tokens.some((token) => GENERIC_TITLE_CASE_WORDS.has(token)) &&
        (PERSON_CONTEXT_REGEX.test(prefix) ||
          looksLikeStandaloneSignatureName(entry.value, candidate, index))
      ) {
        addUniqueFinding(
          findings,
          'REAL_PERSON_DETECTED',
          'Generated content references a likely real-world person name',
          entry.path,
        );
        continue;
      }

      if (
        lastToken &&
        (ORGANIZATION_SUFFIXES.has(lastToken) ||
          (tokens.length === 1 && hasSingleTokenOrganizationContext(entry.value, candidate, index)))
      ) {
        addUniqueFinding(
          findings,
          'REAL_BRAND_DETECTED',
          'Generated content references a likely real-world organization or brand',
          entry.path,
        );
      }
    }
  }
};

export const detectPhoneNumbers = (
  strings: Array<{ path: string; value: string }>,
  findings: SafetyFinding[],
): void => {
  for (const entry of strings) {
    if (PHONE_REGEX.test(entry.value)) {
      findings.push({
        code: 'PHONE_NUMBER_DETECTED',
        message: 'Phone numbers are not allowed',
        path: entry.path,
      });
    }
  }
};

export const detectActionablePatterns = (
  strings: Array<{ path: string; value: string }>,
  findings: SafetyFinding[],
): void => {
  for (const entry of strings) {
    if (ACTIONABLE_PATTERNS.some((pattern) => pattern.test(entry.value))) {
      findings.push({
        code: 'ACTIONABLE_MALWARE_CONTENT',
        message: 'Generated content includes actionable malware-style instructions',
        path: entry.path,
      });
    }
  }
};

export const detectUrls = (
  strings: Array<{ path: string; value: string }>,
  findings: SafetyFinding[],
): void => {
  for (const entry of strings) {
    if (isStructuredFieldReference(entry.value.trim())) {
      continue;
    }

    const matches = entry.value.match(URL_REGEX) ?? [];
    for (const match of matches) {
      const normalized = normalizeUrlCandidate(match);
      const candidate = /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`;

      try {
        const url = new URL(candidate);
        if (isLikelyFileName(normalized, url.hostname)) {
          continue;
        }

        if (!usesReservedTld(url.hostname)) {
          addUniqueFinding(
            findings,
            'REAL_URL_DETECTED',
            'Only reserved TLDs (.example, .invalid, .test) are allowed',
            entry.path,
          );
        }
      } catch {
        addUniqueFinding(
          findings,
          'INVALID_URL',
          'Generated content contains an invalid URL',
          entry.path,
        );
      }
    }
  }
};

export const detectEmails = (
  strings: Array<{ path: string; value: string }>,
  findings: SafetyFinding[],
): void => {
  for (const entry of strings) {
    const matches = entry.value.match(EMAIL_REGEX) ?? [];
    for (const match of matches) {
      const [, domain = ''] = match.split('@');
      if (!usesReservedTld(domain)) {
        findings.push({
          code: 'REAL_EMAIL_DOMAIN_DETECTED',
          message: 'Email addresses must use reserved TLDs only',
          path: entry.path,
        });
      }
    }
  }
};
