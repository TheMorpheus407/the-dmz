import { describe, expect, it } from 'vitest';

import type { EmailInstance } from '@the-dmz/shared';
import {
  classifyIndicatorType,
  createWorksheetAnalysis,
  calculateAutoScore,
  getRiskLabel,
  getRiskColor,
  toggleIndicator,
  setIndicatorNote,
  setOverrideScore,
  setColumnNotes,
  type WorksheetIndicator,
} from '$lib/game/components/phishing-worksheet';

const createMockEmail = (id: string, overrides: Partial<EmailInstance> = {}): EmailInstance => ({
  emailId: id,
  sessionId: 'session-1',
  dayNumber: 1,
  difficulty: 1,
  intent: 'legitimate',
  technique: 'phishing',
  threatTier: 'low' as const,
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
  attachments: [],
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
  indicators: [
    {
      indicatorId: 'ind-1',
      type: 'domain_mismatch',
      location: 'sender',
      description: 'Domain does not match organization',
      severity: 3,
      isVisible: true,
    },
    {
      indicatorId: 'ind-2',
      type: 'urgency_cue',
      location: 'body',
      description: 'Uses urgent language',
      severity: 2,
      isVisible: true,
    },
    {
      indicatorId: 'ind-3',
      type: 'signature_missing',
      location: 'body',
      description: 'No signature present',
      severity: 1,
      isVisible: true,
    },
  ],
  groundTruth: {
    isMalicious: false,
    correctDecision: 'approve',
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

describe('phishing-worksheet utilities', () => {
  describe('classifyIndicatorType', () => {
    it('classifies domain_mismatch as red flag', () => {
      expect(classifyIndicatorType('domain_mismatch')).toBe('redFlag');
    });

    it('classifies urgency_cue as red flag', () => {
      expect(classifyIndicatorType('urgency_cue')).toBe('redFlag');
    });

    it('classifies signature_missing as legitimacy signal', () => {
      expect(classifyIndicatorType('signature_missing')).toBe('legitimacySignal');
    });
  });

  describe('createWorksheetAnalysis', () => {
    it('creates analysis with correct structure', () => {
      const email = createMockEmail('email-1');
      const analysis = createWorksheetAnalysis(email);

      expect(analysis.emailId).toBe('email-1');
      expect(analysis.redFlags).toHaveLength(2);
      expect(analysis.legitimacySignals).toHaveLength(1);
      expect(analysis.autoScore).toBe(50);
      expect(analysis.overrideScore).toBeNull();
      expect(analysis.finalScore).toBe(50);
    });

    it('separates red flags from legitimacy signals', () => {
      const email = createMockEmail('email-1');
      const analysis = createWorksheetAnalysis(email);

      const redFlagTypes = analysis.redFlags.map((rf) => rf.type);
      expect(redFlagTypes).toContain('domain_mismatch');
      expect(redFlagTypes).toContain('urgency_cue');

      const legitimacyTypes = analysis.legitimacySignals.map((ls) => ls.type);
      expect(legitimacyTypes).toContain('signature_missing');
    });

    it('initializes all indicators as unchecked with empty notes', () => {
      const email = createMockEmail('email-1');
      const analysis = createWorksheetAnalysis(email);

      analysis.redFlags.forEach((rf) => {
        expect(rf.isChecked).toBe(false);
        expect(rf.note).toBe('');
      });

      analysis.legitimacySignals.forEach((ls) => {
        expect(ls.isChecked).toBe(false);
        expect(ls.note).toBe('');
      });
    });

    it('handles email with no indicators', () => {
      const email = createMockEmail('email-1', { indicators: [] });
      const analysis = createWorksheetAnalysis(email);

      expect(analysis.redFlags).toHaveLength(0);
      expect(analysis.legitimacySignals).toHaveLength(0);
      expect(analysis.autoScore).toBe(50);
    });
  });

  describe('calculateAutoScore', () => {
    it('returns base score of 50 with no checked indicators', () => {
      const redFlags: WorksheetIndicator[] = [
        {
          indicatorId: '1',
          type: 'domain_mismatch',
          name: 'Test',
          description: 'Test',
          location: 'sender',
          isChecked: false,
          note: '',
        },
        {
          indicatorId: '2',
          type: 'urgency_cue',
          name: 'Test',
          description: 'Test',
          location: 'body',
          isChecked: false,
          note: '',
        },
      ];
      const legitimacySignals: WorksheetIndicator[] = [
        {
          indicatorId: '3',
          type: 'signature_missing',
          name: 'Test',
          description: 'Test',
          location: 'body',
          isChecked: false,
          note: '',
        },
      ];

      expect(calculateAutoScore(redFlags, legitimacySignals)).toBe(50);
    });

    it('increases score by 10 for each checked red flag', () => {
      const redFlags: WorksheetIndicator[] = [
        {
          indicatorId: '1',
          type: 'domain_mismatch',
          name: 'Test',
          description: 'Test',
          location: 'sender',
          isChecked: true,
          note: '',
        },
        {
          indicatorId: '2',
          type: 'urgency_cue',
          name: 'Test',
          description: 'Test',
          location: 'body',
          isChecked: true,
          note: '',
        },
      ];
      const legitimacySignals: WorksheetIndicator[] = [
        {
          indicatorId: '3',
          type: 'signature_missing',
          name: 'Test',
          description: 'Test',
          location: 'body',
          isChecked: false,
          note: '',
        },
      ];

      expect(calculateAutoScore(redFlags, legitimacySignals)).toBe(70);
    });

    it('decreases score by 5 for each checked legitimacy signal', () => {
      const redFlags: WorksheetIndicator[] = [
        {
          indicatorId: '1',
          type: 'domain_mismatch',
          name: 'Test',
          description: 'Test',
          location: 'sender',
          isChecked: false,
          note: '',
        },
      ];
      const legitimacySignals: WorksheetIndicator[] = [
        {
          indicatorId: '2',
          type: 'signature_missing',
          name: 'Test',
          description: 'Test',
          location: 'body',
          isChecked: true,
          note: '',
        },
        {
          indicatorId: '3',
          type: 'signature_missing',
          name: 'Test',
          description: 'Test',
          location: 'body',
          isChecked: true,
          note: '',
        },
      ];

      expect(calculateAutoScore(redFlags, legitimacySignals)).toBe(40);
    });

    it('clamps score to 0-100 range', () => {
      const redFlags: WorksheetIndicator[] = Array(10).fill({
        indicatorId: '1',
        type: 'domain_mismatch',
        name: 'Test',
        description: 'Test',
        location: 'sender',
        isChecked: true,
        note: '',
      });
      const legitimacySignals: WorksheetIndicator[] = [];

      expect(calculateAutoScore(redFlags, legitimacySignals)).toBe(100);
    });

    it('handles empty arrays', () => {
      expect(calculateAutoScore([], [])).toBe(50);
    });
  });

  describe('getRiskLabel', () => {
    it('returns CRITICAL for scores >= 80', () => {
      expect(getRiskLabel(80)).toBe('CRITICAL');
      expect(getRiskLabel(100)).toBe('CRITICAL');
    });

    it('returns HIGH for scores >= 60 and < 80', () => {
      expect(getRiskLabel(60)).toBe('HIGH');
      expect(getRiskLabel(79)).toBe('HIGH');
    });

    it('returns MEDIUM for scores >= 40 and < 60', () => {
      expect(getRiskLabel(40)).toBe('MEDIUM');
      expect(getRiskLabel(59)).toBe('MEDIUM');
    });

    it('returns LOW for scores >= 20 and < 40', () => {
      expect(getRiskLabel(20)).toBe('LOW');
      expect(getRiskLabel(39)).toBe('LOW');
    });

    it('returns SAFE for scores < 20', () => {
      expect(getRiskLabel(0)).toBe('SAFE');
      expect(getRiskLabel(19)).toBe('SAFE');
    });
  });

  describe('getRiskColor', () => {
    it('returns critical color for high scores', () => {
      expect(getRiskColor(80)).toBe('var(--color-critical)');
    });

    it('returns warning color for medium scores', () => {
      expect(getRiskColor(40)).toBe('var(--color-warning)');
    });

    it('returns safe color for low scores', () => {
      expect(getRiskColor(10)).toBe('var(--color-safe)');
    });
  });

  describe('toggleIndicator', () => {
    it('toggles red flag indicator on', () => {
      const email = createMockEmail('email-1');
      let analysis = createWorksheetAnalysis(email);

      analysis = toggleIndicator(analysis, 'ind-1');

      const redFlag = analysis.redFlags[0];
      expect(redFlag).toBeDefined();
      expect(redFlag?.isChecked).toBe(true);
      expect(analysis.autoScore).toBe(60);
      expect(analysis.finalScore).toBe(60);
    });

    it('toggles red flag indicator off', () => {
      const email = createMockEmail('email-1');
      let analysis = createWorksheetAnalysis(email);

      analysis = toggleIndicator(analysis, 'ind-1');
      analysis = toggleIndicator(analysis, 'ind-1');

      const redFlag = analysis.redFlags[0];
      expect(redFlag).toBeDefined();
      expect(redFlag?.isChecked).toBe(false);
      expect(analysis.autoScore).toBe(50);
    });

    it('toggles legitimacy signal indicator', () => {
      const email = createMockEmail('email-1');
      let analysis = createWorksheetAnalysis(email);

      analysis = toggleIndicator(analysis, 'ind-3');

      const legitimacySignal = analysis.legitimacySignals[0];
      expect(legitimacySignal).toBeDefined();
      expect(legitimacySignal?.isChecked).toBe(true);
      expect(analysis.autoScore).toBe(45);
    });
  });

  describe('setIndicatorNote', () => {
    it('updates note for red flag indicator', () => {
      const email = createMockEmail('email-1');
      let analysis = createWorksheetAnalysis(email);

      analysis = setIndicatorNote(analysis, 'ind-1', 'This domain looks suspicious');

      const redFlag = analysis.redFlags[0];
      expect(redFlag).toBeDefined();
      expect(redFlag?.note).toBe('This domain looks suspicious');
    });

    it('updates note for legitimacy signal indicator', () => {
      const email = createMockEmail('email-1');
      let analysis = createWorksheetAnalysis(email);

      analysis = setIndicatorNote(analysis, 'ind-3', 'Missing signature is concerning');

      const legitimacySignal = analysis.legitimacySignals[0];
      expect(legitimacySignal).toBeDefined();
      expect(legitimacySignal?.note).toBe('Missing signature is concerning');
    });
  });

  describe('setOverrideScore', () => {
    it('sets override score and updates final score', () => {
      const email = createMockEmail('email-1');
      let analysis = createWorksheetAnalysis(email);

      analysis = setOverrideScore(analysis, 75);

      expect(analysis.overrideScore).toBe(75);
      expect(analysis.finalScore).toBe(75);
    });

    it('clears override when null is passed', () => {
      const email = createMockEmail('email-1');
      let analysis = createWorksheetAnalysis(email);

      analysis = setOverrideScore(analysis, 75);
      analysis = setOverrideScore(analysis, null);

      expect(analysis.overrideScore).toBeNull();
      expect(analysis.finalScore).toBe(analysis.autoScore);
    });
  });

  describe('setColumnNotes', () => {
    it('sets notes for red flags column', () => {
      const email = createMockEmail('email-1');
      let analysis = createWorksheetAnalysis(email);

      analysis = setColumnNotes(analysis, 'redFlags', 'Multiple suspicious indicators');

      expect(analysis.redFlagsNotes).toBe('Multiple suspicious indicators');
    });

    it('sets notes for legitimacy column', () => {
      const email = createMockEmail('email-1');
      let analysis = createWorksheetAnalysis(email);

      analysis = setColumnNotes(analysis, 'legitimacy', 'Looks mostly legitimate');

      expect(analysis.legitimacyNotes).toBe('Looks mostly legitimate');
    });
  });
});
