import { EXECUTABLE_ATTACHMENT_TYPES } from './safety-validator.data.js';
import { checkBlocklistForStrings } from './blocklist-validator.js';
import {
  containsIpLiteral,
  detectEntityReferences,
  detectPhoneNumbers,
  detectActionablePatterns,
  detectUrls,
  detectEmails,
} from './entity-detector.js';

import type {
  PromptTemplateCategory,
  SafetyFinding,
  SafetyValidationResult,
} from './ai-pipeline.types.js';

import { isRecord } from '../../shared/utils/type-guards.js';

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

  checkBlocklistForStrings(strings, findings);
  detectEntityReferences(strings, findings);

  for (const entry of strings) {
    if (containsIpLiteral(entry.value)) {
      addFinding(findings, 'IP_ADDRESS_DETECTED', 'IP addresses are not allowed', entry.path);
    }
  }

  detectPhoneNumbers(strings, findings);
  detectActionablePatterns(strings, findings);
  detectUrls(strings, findings);
  detectEmails(strings, findings);
  validateAttachmentTypes(content, findings);

  const flags = findings.length === 0 ? ['ok'] : findings.map((finding) => finding.code);

  return {
    ok: findings.length === 0,
    flags,
    findings,
  };
};
