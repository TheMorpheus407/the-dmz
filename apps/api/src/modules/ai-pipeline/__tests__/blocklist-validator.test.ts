import { describe, expect, it } from 'vitest';

import { checkBlocklist, checkBlocklistForStrings } from '../blocklist-validator.js';

describe('blocklist-validator', () => {
  describe('checkBlocklist', () => {
    it('detects blocked brand in value', () => {
      const findings: Parameters<typeof checkBlocklist>[2] = [];
      checkBlocklist('Contact Microsoft support', '$.body.justification', findings);

      expect(findings).toHaveLength(1);
      expect(findings[0]?.code).toBe('REAL_BRAND_DETECTED');
      expect(findings[0]?.message).toBe('Generated content references a blocked real-world brand');
      expect(findings[0]?.path).toBe('$.body.justification');
    });

    it('detects blocked person in value', () => {
      const findings: Parameters<typeof checkBlocklist>[2] = [];
      checkBlocklist('Contact bill gates for help', '$.body.signature', findings);

      expect(findings).toHaveLength(1);
      expect(findings[0]?.code).toBe('REAL_PERSON_DETECTED');
      expect(findings[0]?.message).toBe('Generated content references a blocked real-world person');
    });

    it('does not flag safe content', () => {
      const findings: Parameters<typeof checkBlocklist>[2] = [];
      checkBlocklist('Contact Nexion Industries support', '$.body.justification', findings);

      expect(findings).toHaveLength(0);
    });
  });

  describe('checkBlocklistForStrings', () => {
    it('checks multiple string entries', () => {
      const findings: Parameters<typeof checkBlocklistForStrings>[1] = [];
      const strings = [
        { path: '$.body.justification', value: 'Contact Microsoft support' },
        { path: '$.body.signature', value: 'bill gates' },
      ];

      checkBlocklistForStrings(strings, findings);

      expect(findings).toHaveLength(2);
      expect(findings.some((f) => f.code === 'REAL_BRAND_DETECTED')).toBe(true);
      expect(findings.some((f) => f.code === 'REAL_PERSON_DETECTED')).toBe(true);
    });

    it('handles empty strings array', () => {
      const findings: Parameters<typeof checkBlocklistForStrings>[1] = [];
      checkBlocklistForStrings([], findings);

      expect(findings).toHaveLength(0);
    });
  });
});
