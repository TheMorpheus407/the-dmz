import { describe, expect, it } from 'vitest';

import type { DecisionType, EmailInstance, GameThreatTier } from '@the-dmz/shared';
import {
  formatFileSize,
  extractDomain,
  formatDate,
  truncateHash,
  getAuthResultInfo,
  isEmailValid,
} from '$lib/game/components/email-viewer';

const createMockEmail = (id: string, overrides: Partial<EmailInstance> = {}): EmailInstance => ({
  emailId: id,
  sessionId: 'session-1',
  dayNumber: 1,
  difficulty: 1,
  intent: 'legitimate',
  technique: 'phishing',
  threatTier: 'LOW' as GameThreatTier,
  faction: 'The Sovereign Compact',
  sender: {
    displayName: 'John Doe',
    emailAddress: 'john@example.com',
    domain: 'example.com',
    jobRole: 'Manager',
    organization: 'Test Org',
    relationshipHistory: 0,
  },
  headers: {
    messageId: `<msg-${id}>`,
    returnPath: 'john@example.com',
    received: ['from mail.example.com by mx.matrices-gmbh.net'],
    spfResult: 'pass',
    dkimResult: 'pass',
    dmarcResult: 'pass',
    originalDate: '2026-01-01T00:00:00Z',
    subject: `Test Email ${id}`,
  },
  body: {
    preview: 'Preview',
    fullBody: 'This is the full body of the email.',
    embeddedLinks: [],
  },
  attachments: [
    {
      attachmentId: 'att-1',
      fileName: 'document.pdf',
      fileType: 'application/pdf',
      fileSize: 102400,
      hash: 'abc123def456',
      isSuspicious: false,
    },
  ],
  accessRequest: {
    applicantName: 'John Doe',
    applicantRole: 'Manager',
    organization: 'Test Org',
    requestedAssets: ['asset1'],
    requestedServices: ['service1'],
    justification: 'Need access',
    urgency: 'medium',
    value: 100,
  },
  indicators: [],
  groundTruth: {
    isMalicious: false,
    correctDecision: 'approve' as DecisionType,
    riskScore: 0.1,
    explanation: 'Legitimate request',
    consequences: {
      approved: { trustImpact: 10, fundsImpact: 100, factionImpact: 5, threatImpact: 0 },
      denied: { trustImpact: -10, fundsImpact: -100, factionImpact: -5, threatImpact: 0 },
      flagged: { trustImpact: 0, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
      deferred: { trustImpact: -5, fundsImpact: -50, factionImpact: 0, threatImpact: 0 },
    },
  },
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('email-viewer utilities', () => {
  describe('formatFileSize', () => {
    it('formats bytes correctly', () => {
      expect(formatFileSize(500)).toBe('500 B');
    });

    it('formats kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('formats megabytes correctly', () => {
      expect(formatFileSize(1048576)).toBe('1.0 MB');
      expect(formatFileSize(5242880)).toBe('5.0 MB');
    });
  });

  describe('extractDomain', () => {
    it('extracts domain from email address', () => {
      expect(extractDomain('john@example.com')).toBe('example.com');
    });

    it('handles email without @', () => {
      expect(extractDomain('example.com')).toBe('example.com');
    });

    it('handles email with subdomain', () => {
      expect(extractDomain('john@sub.example.com')).toBe('sub.example.com');
    });
  });

  describe('formatDate', () => {
    it('formats date correctly', () => {
      const result = formatDate('2026-01-15T14:30:00Z');
      expect(result).toContain('Jan');
      expect(result).toContain('15');
      expect(result).toContain('2026');
    });
  });

  describe('truncateHash', () => {
    it('returns full hash if shorter than max length', () => {
      expect(truncateHash('abc', 12)).toBe('abc');
    });

    it('truncates hash if longer than max length', () => {
      expect(truncateHash('abcdef123456', 8)).toBe('abcde...');
    });

    it('uses default max length of 12', () => {
      expect(truncateHash('abcdefghijklmnop')).toBe('abcdefghi...');
    });
  });

  describe('getAuthResultInfo', () => {
    it('returns correct info for pass', () => {
      const result = getAuthResultInfo('pass');
      expect(result.label).toBe('PASS');
      expect(result.color).toBe('var(--color-safe)');
    });

    it('returns correct info for fail', () => {
      const result = getAuthResultInfo('fail');
      expect(result.label).toBe('FAIL');
      expect(result.color).toBe('var(--color-danger)');
    });

    it('returns correct info for softfail', () => {
      const result = getAuthResultInfo('softfail');
      expect(result.label).toBe('SOFTFAIL');
      expect(result.color).toBe('var(--color-warning)');
    });

    it('returns correct info for none', () => {
      const result = getAuthResultInfo('none');
      expect(result.label).toBe('NONE');
      expect(result.color).toBe('var(--color-archived)');
    });
  });

  describe('isEmailValid', () => {
    it('returns true for valid email', () => {
      const email = createMockEmail('email-1');
      expect(isEmailValid(email)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isEmailValid(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isEmailValid(null)).toBe(false);
    });

    it('returns false for email without emailId', () => {
      const email = createMockEmail('email-1', { emailId: '' });
      expect(isEmailValid(email)).toBe(false);
    });

    it('returns false for email without sender emailAddress', () => {
      const email = createMockEmail('email-1', {
        sender: {
          displayName: 'John',
          emailAddress: '',
          domain: 'example.com',
          jobRole: 'Manager',
          organization: 'Test',
          relationshipHistory: 0,
        },
      });
      expect(isEmailValid(email)).toBe(false);
    });
  });
});
