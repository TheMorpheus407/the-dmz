import { isIP } from 'node:net';

import type {
  PromptTemplateCategory,
  SafetyFinding,
  SafetyValidationResult,
} from './ai-pipeline.types.js';

const RESERVED_TLDS = ['.example', '.invalid', '.test'];
const BRAND_BLOCKLIST = [
  'google',
  'microsoft',
  'amazon',
  'apple',
  'meta',
  'facebook',
  'instagram',
  'whatsapp',
  'linkedin',
  'youtube',
  'paypal',
  'github',
  'fedex',
  'dhl',
  'netflix',
  'openai',
];
const PERSON_BLOCKLIST = [
  'elon musk',
  'bill gates',
  'tim cook',
  'satya nadella',
  'mark zuckerberg',
  'sundar pichai',
];
const ENTITY_ALLOWLIST = new Set([
  'sovereign compact',
  'nexion industries',
  'librarians',
  'hacktivists',
  'criminal networks',
  'morpheus',
  'sysop-7',
  'kade morrow',
  'alina reyes',
  'dr alina reyes',
  'voss imani',
  'relay wardens',
  'grey freight couriers',
  'nidhogg',
]);
const GENERIC_TITLE_CASE_WORDS = new Set([
  'access',
  'accounts',
  'alert',
  'archive',
  'assessment',
  'audit',
  'brief',
  'call',
  'change',
  'compact',
  'conditions',
  'coordinator',
  'credential',
  'credentials',
  'customer',
  'delayed',
  'deliverables',
  'desk',
  'director',
  'gatekeeper',
  'greeting',
  'guidance',
  'incident',
  'indicators',
  'intake',
  'intelligence',
  'justification',
  'ledger',
  'liaison',
  'maintenance',
  'message',
  'networks',
  'notice',
  'office',
  'packet',
  'portal',
  'posture',
  'records',
  'relay',
  'report',
  'request',
  'required',
  'response',
  'review',
  'scenario',
  'security',
  'shift',
  'signals',
  'summary',
  'support',
  'team',
  'telemetry',
  'threat',
  'triggers',
  'update',
  'verification',
]);
const COMMON_SENTENCE_WORDS = new Set([
  'a',
  'an',
  'and',
  'before',
  'best',
  'call',
  'complete',
  'coordinate',
  'dear',
  'failure',
  'for',
  'greetings',
  'hello',
  'hi',
  'if',
  'immediate',
  'maintain',
  'open',
  'please',
  'priority',
  'regards',
  'review',
  'send',
  'thanks',
  'the',
  'to',
  'urgent',
  'use',
  'we',
  'your',
]);
const ORGANIZATION_CONTEXT_WORDS = [
  'account',
  'accounts',
  'admin',
  'billing',
  'cloud',
  'compliance',
  'finance',
  'helpdesk',
  'hr',
  'it',
  'legal',
  'license',
  'login',
  'mail',
  'payroll',
  'portal',
  'security',
  'services',
  'software',
  'subscription',
  'support',
  'systems',
  'team',
  'vendor',
  'workspace',
] as const;
const ORGANIZATION_SUFFIXES = new Set([
  'bank',
  'corp',
  'corporation',
  'group',
  'holdings',
  'inc',
  'industries',
  'labs',
  'llc',
  'logistics',
  'ltd',
  'networks',
  'partners',
  'services',
  'software',
  'solutions',
  'systems',
  'technologies',
  'university',
]);
const PERSON_CONTEXT_REGEX =
  /\b(?:contact|coordinate with|reply to|reach out to|speak with|escalate to|cc|from)\s+$/i;
const HONORIFIC_NAME_REGEX =
  /\b(?:Mr|Mrs|Ms|Mx|Dr|Prof)\.?\s+([A-Z][a-z]+(?:[A-Z][a-z]+)*(?:\s+[A-Z][a-z]+(?:[A-Z][a-z]+)*){1,2})\b/g;
const ENTITY_SEQUENCE_REGEX =
  /\b(?:[A-Z][a-z]+(?:[A-Z][a-z]+)*|[A-Z]{2,}(?:-[A-Z0-9]+)*)(?:\s+(?:[A-Z][a-z]+(?:[A-Z][a-z]+)*|[A-Z]{2,}(?:-[A-Z0-9]+)*)){0,3}\b/g;
const ACTIONABLE_PATTERNS = [
  /powershell\s+-enc/i,
  /curl\s+https?:\/\/\S+\s*\|\s*(?:bash|sh)/i,
  /invoke-webrequest/i,
  /chmod\s+\+x/i,
  /rundll32/i,
  /mshta/i,
  /certutil\s+-decode/i,
];
const EXECUTABLE_ATTACHMENT_TYPES = new Set([
  'exe',
  'msi',
  'dll',
  'ps1',
  'bat',
  'cmd',
  'js',
  'vbs',
  'scr',
]);
const PHONE_REGEX = /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)|\d{2,4})[\s.-]?\d{3}[\s.-]?\d{3,4}/;
const IP_TOKEN_REGEX = /[A-Fa-f0-9:.[\]%]+/g;
const URL_REGEX =
  /(?<![@/])(?:https?:\/\/)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?::\d{2,5})?(?:\/[^\s)"'<>]*)?/gi;
const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const FILE_EXTENSION_TLDS = new Set([
  'csv',
  'doc',
  'docx',
  'eml',
  'html',
  'json',
  'msg',
  'pdf',
  'ppt',
  'pptx',
  'rtf',
  'txt',
  'xls',
  'xlsx',
  'xml',
  'zip',
]);
const CONTENT_FIELD_REFERENCE_REGEX =
  /^(?:attachments|body|headers|links|metadata|signals)\.[a-z_]+(?:\.[a-z_]+)*$/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

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

const collectStrings = (
  value: unknown,
  output: Array<{ path: string; value: string }>,
  path = '$',
): void => {
  if (typeof value === 'string') {
    output.push({ path, value });
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectStrings(entry, output, `${path}[${index}]`));
    return;
  }

  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, entry]) =>
      collectStrings(entry, output, `${path}.${key}`),
    );
  }
};

const addFinding = (
  findings: SafetyFinding[],
  code: string,
  message: string,
  path?: string,
): void => {
  findings.push({
    code,
    message,
    ...(path ? { path } : {}),
  });
};

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

const containsIpLiteral = (value: string): boolean => {
  const matches = value.match(IP_TOKEN_REGEX) ?? [];

  return matches.some((match) => {
    if (!/\d/.test(match) || (!match.includes('.') && !match.includes(':'))) {
      return false;
    }

    const normalized = normalizeIpCandidate(match);
    return normalized.length > 0 && isIP(normalized) !== 0;
  });
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

  addFinding(findings, code, message, path);
};

const isAllowedEntity = (candidate: string): boolean => {
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

const validateEntityReferences = (
  strings: Array<{ path: string; value: string }>,
  findings: SafetyFinding[],
): void => {
  for (const entry of strings) {
    const lower = entry.value.toLowerCase();

    if (BRAND_BLOCKLIST.some((brand) => lower.includes(brand))) {
      addUniqueFinding(
        findings,
        'REAL_BRAND_DETECTED',
        'Generated content references a blocked real-world brand',
        entry.path,
      );
    }

    if (PERSON_BLOCKLIST.some((person) => lower.includes(person))) {
      addUniqueFinding(
        findings,
        'REAL_PERSON_DETECTED',
        'Generated content references a blocked real-world person',
        entry.path,
      );
    }

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

const validateUrls = (
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

const validateEmails = (
  strings: Array<{ path: string; value: string }>,
  findings: SafetyFinding[],
): void => {
  for (const entry of strings) {
    const matches = entry.value.match(EMAIL_REGEX) ?? [];
    for (const match of matches) {
      const [, domain = ''] = match.split('@');
      if (!usesReservedTld(domain)) {
        addFinding(
          findings,
          'REAL_EMAIL_DOMAIN_DETECTED',
          'Email addresses must use reserved TLDs only',
          entry.path,
        );
      }
    }
  }
};

const validateAttachmentTypes = (
  content: Record<string, unknown>,
  findings: SafetyFinding[],
): void => {
  const attachments = Array.isArray(content['attachments']) ? content['attachments'] : [];
  attachments.forEach((attachment, index) => {
    if (!isRecord(attachment)) {
      return;
    }
    const type = typeof attachment['type'] === 'string' ? attachment['type'].toLowerCase() : '';
    if (EXECUTABLE_ATTACHMENT_TYPES.has(type)) {
      addFinding(
        findings,
        'EXECUTABLE_ATTACHMENT',
        'Executable attachment types are not allowed in generated content',
        `$.attachments[${index}].type`,
      );
    }
  });
};

export const validateGeneratedContentSafety = (
  _category: PromptTemplateCategory,
  content: Record<string, unknown>,
): SafetyValidationResult => {
  const findings: SafetyFinding[] = [];
  const strings: Array<{ path: string; value: string }> = [];
  collectStrings(content, strings);
  validateEntityReferences(strings, findings);

  for (const entry of strings) {
    if (PHONE_REGEX.test(entry.value)) {
      addFinding(findings, 'PHONE_NUMBER_DETECTED', 'Phone numbers are not allowed', entry.path);
    }

    if (containsIpLiteral(entry.value)) {
      addFinding(findings, 'IP_ADDRESS_DETECTED', 'IP addresses are not allowed', entry.path);
    }

    if (ACTIONABLE_PATTERNS.some((pattern) => pattern.test(entry.value))) {
      addFinding(
        findings,
        'ACTIONABLE_MALWARE_CONTENT',
        'Generated content includes actionable malware-style instructions',
        entry.path,
      );
    }
  }

  validateUrls(strings, findings);
  validateEmails(strings, findings);
  validateAttachmentTypes(content, findings);

  const flags = findings.length === 0 ? ['ok'] : findings.map((finding) => finding.code);

  return {
    ok: findings.length === 0,
    flags,
    findings,
  };
};
