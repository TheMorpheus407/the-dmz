import { describe, it, expect } from 'vitest';

import { DAY_PHASES } from '@the-dmz/shared';
import type { EmailInstance } from '@the-dmz/shared';

import {
  validateDecisionPhase,
  evaluateDecision,
  resolveDecision,
  DecisionResolutionError,
} from '../decision-resolution.service.js';

const createTestEmail = (overrides?: Partial<EmailInstance>): EmailInstance => {
  const baseEmail: EmailInstance = {
    emailId: 'test-email-1',
    sessionId: 'test-session',
    dayNumber: 1,
    difficulty: 3,
    intent: 'malicious',
    technique: 'phishing',
    threatTier: 'low',
    faction: 'criminals',
    sender: {
      displayName: 'John Doe',
      emailAddress: 'john.doe@example.com',
      domain: 'example.com',
      jobRole: 'Manager',
      organization: 'Acme Corp',
      relationshipHistory: 5,
    },
    headers: {
      messageId: '<test@example.com>',
      returnPath: 'bounce@example.com',
      received: [],
      spfResult: 'fail',
      dkimResult: 'none',
      dmarcResult: 'fail',
      originalDate: new Date().toISOString(),
      subject: 'Urgent: Account Verification Required',
    },
    body: {
      preview: 'Please verify your account',
      fullBody: 'Please verify your account immediately.',
      embeddedLinks: [
        {
          displayText: 'Click here',
          actualUrl: 'https://evil.com/steal',
          isSuspicious: true,
        },
      ],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'John Doe',
      applicantRole: 'Manager',
      organization: 'Acme Corp',
      requestedAssets: ['database'],
      requestedServices: ['read'],
      justification: 'Need access for project',
      urgency: 'high',
      value: 1000,
    },
    indicators: [
      {
        indicatorId: 'ind-1',
        type: 'suspicious_link',
        location: 'body',
        description: 'Link points to suspicious domain',
        severity: 8,
        isVisible: true,
      },
      {
        indicatorId: 'ind-2',
        type: 'domain_mismatch',
        location: 'sender',
        description: 'Sender domain does not match claimed organization',
        severity: 9,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: true,
      correctDecision: 'deny',
      riskScore: 85,
      explanation: 'This is a phishing attempt',
      consequences: {
        approved: {
          trustImpact: -20,
          fundsImpact: -500,
          factionImpact: -5,
          threatImpact: 10,
        },
        denied: {
          trustImpact: 5,
          fundsImpact: 0,
          factionImpact: 0,
          threatImpact: -5,
        },
        flagged: {
          trustImpact: 2,
          fundsImpact: 0,
          factionImpact: 0,
          threatImpact: 0,
        },
        deferred: {
          trustImpact: -3,
          fundsImpact: -50,
          factionImpact: 0,
          threatImpact: 2,
        },
      },
    },
    createdAt: new Date().toISOString(),
  };

  return { ...baseEmail, ...overrides };
};

describe('validateDecisionPhase', () => {
  it('should allow decision in TRIAGE phase', () => {
    const result = validateDecisionPhase(DAY_PHASES.PHASE_TRIAGE);
    expect(result.valid).toBe(true);
  });

  it('should allow decision in VERIFICATION phase', () => {
    const result = validateDecisionPhase(DAY_PHASES.PHASE_VERIFICATION);
    expect(result.valid).toBe(true);
  });

  it('should allow decision in DECISION phase', () => {
    const result = validateDecisionPhase(DAY_PHASES.PHASE_DECISION);
    expect(result.valid).toBe(true);
  });

  it('should reject decision in DAY_START phase', () => {
    const result = validateDecisionPhase(DAY_PHASES.PHASE_DAY_START);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('TRIAGE');
  });

  it('should reject decision in EMAIL_INTAKE phase', () => {
    const result = validateDecisionPhase(DAY_PHASES.PHASE_EMAIL_INTAKE);
    expect(result.valid).toBe(false);
  });
});

describe('evaluateDecision', () => {
  it('should return correct evaluation for correct decision', () => {
    const email = createTestEmail();
    const result = evaluateDecision({
      email,
      decision: 'deny',
      markedIndicators: ['suspicious_link'],
      timeSpentMs: 30000,
      currentPhase: DAY_PHASES.PHASE_TRIAGE,
    });

    expect(result.isCorrect).toBe(true);
    expect(result.trustImpact).toBeGreaterThan(0);
  });

  it('should return incorrect evaluation for wrong decision', () => {
    const email = createTestEmail();
    const result = evaluateDecision({
      email,
      decision: 'approve',
      markedIndicators: [],
      timeSpentMs: 30000,
      currentPhase: DAY_PHASES.PHASE_TRIAGE,
    });

    expect(result.isCorrect).toBe(false);
    expect(result.trustImpact).toBeLessThan(0);
  });

  it('should apply indicator bonus for finding indicators', () => {
    const email = createTestEmail();
    const result = evaluateDecision({
      email,
      decision: 'deny',
      markedIndicators: ['suspicious_link', 'domain_mismatch'],
      timeSpentMs: 30000,
      currentPhase: DAY_PHASES.PHASE_TRIAGE,
    });

    expect(result.indicatorsFound).toBe(2);
    expect(result.indicatorsMissed).toBe(0);
  });

  it('should apply speed bonus for slow but correct decisions', () => {
    const email = createTestEmail();
    const result = evaluateDecision({
      email,
      decision: 'deny',
      markedIndicators: ['suspicious_link'],
      timeSpentMs: 180000,
      currentPhase: DAY_PHASES.PHASE_TRIAGE,
    });

    expect(result.trustImpact).toBeGreaterThan(5);
  });

  it('should apply speed penalty for too quick decisions', () => {
    const email = createTestEmail();
    const result = evaluateDecision({
      email,
      decision: 'deny',
      markedIndicators: [],
      timeSpentMs: 2000,
      currentPhase: DAY_PHASES.PHASE_TRIAGE,
    });

    expect(result.trustImpact).toBeLessThan(5);
  });

  it('should determine risk alignment based on risk score', () => {
    const lowRiskEmail = createTestEmail({
      groundTruth: {
        ...createTestEmail().groundTruth,
        riskScore: 20,
      },
    });
    const resultLow = evaluateDecision({
      email: lowRiskEmail,
      decision: 'approve',
      markedIndicators: [],
      timeSpentMs: 30000,
      currentPhase: DAY_PHASES.PHASE_TRIAGE,
    });
    expect(resultLow.riskAlignment).toBe('risk_averse');

    const midRiskEmail = createTestEmail({
      groundTruth: {
        ...createTestEmail().groundTruth,
        riskScore: 50,
      },
    });
    const resultMid = evaluateDecision({
      email: midRiskEmail,
      decision: 'approve',
      markedIndicators: [],
      timeSpentMs: 30000,
      currentPhase: DAY_PHASES.PHASE_TRIAGE,
    });
    expect(resultMid.riskAlignment).toBe('risk_balanced');

    const highRiskEmail = createTestEmail({
      groundTruth: {
        ...createTestEmail().groundTruth,
        riskScore: 80,
      },
    });
    const resultHigh = evaluateDecision({
      email: highRiskEmail,
      decision: 'approve',
      markedIndicators: [],
      timeSpentMs: 30000,
      currentPhase: DAY_PHASES.PHASE_TRIAGE,
    });
    expect(resultHigh.riskAlignment).toBe('risk_permissive');
  });
});

describe('resolveDecision', () => {
  it('should resolve decision in valid phase', () => {
    const email = createTestEmail();
    const result = resolveDecision({
      email,
      decision: 'deny',
      markedIndicators: ['suspicious_link'],
      timeSpentMs: 30000,
      currentPhase: DAY_PHASES.PHASE_TRIAGE,
    });

    expect(result.isCorrect).toBe(true);
  });

  it('should throw error for invalid phase', () => {
    const email = createTestEmail();
    expect(() =>
      resolveDecision({
        email,
        decision: 'deny',
        markedIndicators: [],
        timeSpentMs: 30000,
        currentPhase: DAY_PHASES.PHASE_DAY_START,
      }),
    ).toThrow(DecisionResolutionError);
  });

  it('should throw error with INVALID_PHASE code', () => {
    const email = createTestEmail();
    try {
      resolveDecision({
        email,
        decision: 'deny',
        markedIndicators: [],
        timeSpentMs: 30000,
        currentPhase: DAY_PHASES.PHASE_DAY_START,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(DecisionResolutionError);
      expect((error as DecisionResolutionError).code).toBe('INVALID_PHASE');
    }
  });
});
