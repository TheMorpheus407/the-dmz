import { describe, it, expect } from 'vitest';

import {
  SESSION_MACRO_STATES,
  DAY_PHASES,
  type GameState,
  type EmailState,
  type EmailInstance,
  createInitialBreachState,
} from '@the-dmz/shared';

import { reduce } from '../reducer.js';

const createTestState = (overrides?: Partial<GameState>): GameState => {
  const baseState: GameState = {
    sessionId: 'test-session-id',
    userId: 'test-user-id',
    tenantId: 'test-tenant-id',
    seed: 12345,
    currentDay: 1,
    currentMacroState: SESSION_MACRO_STATES.SESSION_ACTIVE,
    currentPhase: DAY_PHASES.PHASE_TRIAGE,
    funds: 1000,
    trustScore: 50,
    intelFragments: 0,
    playerLevel: 1,
    playerXP: 0,
    threatTier: 'low',
    facilityTier: 'outpost',
    facility: {
      tier: 'outpost',
      capacities: {
        rackCapacityU: 42,
        powerCapacityKw: 10,
        coolingCapacityTons: 5,
        bandwidthCapacityMbps: 100,
      },
      usage: {
        rackUsedU: 0,
        powerUsedKw: 0,
        coolingUsedTons: 0,
        bandwidthUsedMbps: 0,
      },
      clients: [],
      upgrades: [],
      maintenanceDebt: 0,
      facilityHealth: 100,
      operatingCostPerDay: 50,
      securityToolOpExPerDay: 0,
      attackSurfaceScore: 10,
      lastTickDay: 1,
    },
    inbox: [],
    emailInstances: {},
    verificationPackets: {},
    incidents: [],
    threats: [],
    breachState: createInitialBreachState(),
    narrativeState: {
      currentChapter: 1,
      activeTriggers: [],
      completedEvents: [],
    },
    factionRelations: {
      sovereign_compact: 50,
      nexion_industries: 50,
      librarians: 50,
      hacktivists: 50,
      criminals: 50,
    },
    blacklist: [],
    whitelist: [],
    analyticsState: {
      totalEmailsProcessed: 0,
      totalDecisions: 0,
      approvals: 0,
      denials: 0,
      flags: 0,
      verificationsRequested: 0,
      incidentsTriggered: 0,
      breaches: 0,
    },
    sequenceNumber: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return { ...baseState, ...overrides };
};

const createEmailInstance = (emailId: string): EmailInstance => ({
  emailId,
  sessionId: 'test-session-id',
  dayNumber: 1,
  difficulty: 3,
  intent: 'legitimate',
  technique: 'phishing',
  threatTier: 'low',
  faction: 'nexion_industries',
  sender: {
    displayName: 'Test Sender',
    emailAddress: 'test@example.com',
    domain: 'example.com',
    jobRole: 'Manager',
    organization: 'Test Org',
    relationshipHistory: 5,
  },
  headers: {
    messageId: '<test-message-id>',
    returnPath: 'test@example.com',
    received: ['from mail.example.com'],
    spfResult: 'pass',
    dkimResult: 'pass',
    dmarcResult: 'pass',
    originalDate: new Date().toISOString(),
    subject: 'Test Email',
  },
  body: {
    preview: 'Test email body preview',
    fullBody: 'Full test email body content',
    embeddedLinks: [],
  },
  attachments: [],
  accessRequest: {
    applicantName: 'Applicant',
    applicantRole: 'Employee',
    organization: 'Test Org',
    requestedAssets: ['server room access'],
    requestedServices: ['server access'],
    justification: 'Testing',
    urgency: 'medium',
    value: 1000,
  },
  indicators: [],
  groundTruth: {
    isMalicious: false,
    correctDecision: 'deny',
    riskScore: 30,
    explanation: 'Test email',
    consequences: {
      approved: { trustImpact: -20, fundsImpact: -100, factionImpact: -5, threatImpact: 10 },
      denied: { trustImpact: 10, fundsImpact: 0, factionImpact: 5, threatImpact: 0 },
      flagged: { trustImpact: 5, fundsImpact: 0, factionImpact: 0, threatImpact: 5 },
      deferred: { trustImpact: 0, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
    },
  },
  createdAt: new Date().toISOString(),
});

const createEmailState = (emailId: string, overrides?: Partial<EmailState>): EmailState => ({
  emailId,
  status: 'pending',
  indicators: [],
  verificationRequested: false,
  timeSpentMs: 0,
  ...overrides,
});

describe('email-handler-submit-decision', () => {
  describe('handleSubmitDecision', () => {
    it('should return early when email not found in inbox', () => {
      const state = createTestState({
        inbox: [createEmailState('other-email')],
        emailInstances: {
          'email-1': createEmailInstance('email-1'),
        },
      });

      const action = {
        type: 'SUBMIT_DECISION' as const,
        emailId: 'email-1',
        decision: 'approve' as const,
        timeSpentMs: 5000,
      };

      const result = reduce(state, action);

      expect(result.success).toBe(true);
      const newState = result.newState;
      expect(newState.inbox.find((e) => e.emailId === 'email-1')).toBeUndefined();
    });

    it('should handle evaluation error when emailInstance does not exist', () => {
      const state = createTestState({
        inbox: [createEmailState('email-1', { indicators: ['suspicious_link'] })],
        emailInstances: {},
        analyticsState: {
          totalEmailsProcessed: 0,
          totalDecisions: 0,
          approvals: 0,
          denials: 0,
          flags: 0,
          verificationsRequested: 0,
          incidentsTriggered: 0,
          breaches: 0,
        },
      });

      const action = {
        type: 'SUBMIT_DECISION' as const,
        emailId: 'email-1',
        decision: 'approve' as const,
        timeSpentMs: 5000,
      };

      const result = reduce(state, action);

      expect(result.success).toBe(true);
      const newState = result.newState;
      const email = newState.inbox.find((e) => e.emailId === 'email-1');
      expect(email?.status).toBe('approved');
      expect(email?.timeSpentMs).toBe(5000);
      expect(newState.analyticsState.totalDecisions).toBe(1);
      expect(newState.analyticsState.approvals).toBe(1);
      expect(result.events.length).toBeGreaterThan(0);
      const decisionSubmittedEvent = result.events.find(
        (e) => e.eventType === 'game.email.decision_submitted',
      );
      expect(decisionSubmittedEvent).toBeDefined();
      expect(
        (decisionSubmittedEvent as { payload?: { evaluationError?: boolean } }).payload
          ?.evaluationError,
      ).toBe(true);
    });

    it('should process decision when email found and emailInstance exists', () => {
      const state = createTestState({
        inbox: [createEmailState('email-1', { indicators: ['suspicious_link'] })],
        emailInstances: {
          'email-1': createEmailInstance('email-1'),
        },
        funds: 1000,
        trustScore: 50,
        analyticsState: {
          totalEmailsProcessed: 0,
          totalDecisions: 0,
          approvals: 0,
          denials: 0,
          flags: 0,
          verificationsRequested: 0,
          incidentsTriggered: 0,
          breaches: 0,
        },
      });

      const action = {
        type: 'SUBMIT_DECISION' as const,
        emailId: 'email-1',
        decision: 'approve' as const,
        timeSpentMs: 5000,
      };

      const result = reduce(state, action);

      expect(result.success).toBe(true);
      const newState = result.newState;
      const email = newState.inbox.find((e) => e.emailId === 'email-1');
      expect(email?.status).toBe('approved');
      expect(email?.timeSpentMs).toBe(5000);
      expect(newState.analyticsState.totalDecisions).toBe(1);
      expect(newState.analyticsState.approvals).toBe(1);
      expect(result.events.length).toBeGreaterThan(0);
    });

    it('should update email status correctly for different decisions', () => {
      const testCases: Array<{
        decision: 'approve' | 'deny' | 'flag' | 'request_verification' | 'defer';
        expectedStatus: 'approved' | 'denied' | 'flagged' | 'request_verification' | 'deferred';
      }> = [
        { decision: 'approve', expectedStatus: 'approved' },
        { decision: 'deny', expectedStatus: 'denied' },
        { decision: 'flag', expectedStatus: 'flagged' },
        { decision: 'request_verification', expectedStatus: 'request_verification' },
        { decision: 'defer', expectedStatus: 'deferred' },
      ];

      for (const { decision, expectedStatus } of testCases) {
        const state = createTestState({
          inbox: [createEmailState('email-1')],
          emailInstances: {},
        });

        const action = {
          type: 'SUBMIT_DECISION' as const,
          emailId: 'email-1',
          decision,
          timeSpentMs: 3000,
        };

        const result = reduce(state, action);

        expect(result.success).toBe(true);
        const email = result.newState.inbox.find((e) => e.emailId === 'email-1');
        expect(email?.status).toBe(expectedStatus);
      }
    });
  });
});
