import { BRAND_BLOCKLIST, PERSON_BLOCKLIST } from './safety-validator.data.js';

import type { SafetyFinding } from './ai-pipeline.types.js';

export const checkBlocklist = (value: string, path: string, findings: SafetyFinding[]): void => {
  const lower = value.toLowerCase();

  if (BRAND_BLOCKLIST.some((brand) => lower.includes(brand))) {
    findings.push({
      code: 'REAL_BRAND_DETECTED',
      message: 'Generated content references a blocked real-world brand',
      path,
    });
  }

  if (PERSON_BLOCKLIST.some((person) => lower.includes(person))) {
    findings.push({
      code: 'REAL_PERSON_DETECTED',
      message: 'Generated content references a blocked real-world person',
      path,
    });
  }
};

export const checkBlocklistForStrings = (
  strings: Array<{ path: string; value: string }>,
  findings: SafetyFinding[],
): void => {
  for (const entry of strings) {
    checkBlocklist(entry.value, entry.path, findings);
  }
};
