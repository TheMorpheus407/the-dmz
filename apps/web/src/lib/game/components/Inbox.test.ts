import { describe, expect, it } from 'vitest';

import type { DecisionType, GameThreatTier, EmailInstance, EmailState } from '@the-dmz/shared';
import {
  getEmailCategory,
  getUrgencyFromAccessRequest,
  getUrgencyFromThreatTier,
  getFactionColor,
  categorizeEmails,
  sortEmails,
  filterEmails,
} from '$lib/game/components/inbox';
import type { InboxEmailItem } from '$lib/game/components/inbox';

const createMockEmail = (
  id: string,
  urgency: 'low' | 'medium' | 'high' | 'critical' = 'low',
  day: number = 1,
): EmailInstance => ({
  emailId: id,
  sessionId: 'session-1',
  dayNumber: day,
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
    received: [],
    spfResult: 'pass',
    dkimResult: 'pass',
    dmarcResult: 'pass',
    originalDate: '2026-01-01T00:00:00Z',
    subject: `Test Email ${id}`,
  },
  body: {
    preview: 'Preview',
    fullBody: 'Full body',
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
    urgency: urgency as 'low' | 'medium' | 'high' | 'critical',
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
});

const createMockState = (id: string, status: EmailState['status']): EmailState => ({
  emailId: id,
  status: status,
  indicators: [],
  verificationRequested: false,
  timeSpentMs: 0,
});

describe('inbox utilities', () => {
  describe('getEmailCategory', () => {
    it('categorizes pending status as pending', () => {
      expect(getEmailCategory('pending')).toBe('pending');
    });

    it('categorizes opened status as pending', () => {
      expect(getEmailCategory('opened')).toBe('pending');
    });

    it('categorizes request_verification status as pending', () => {
      expect(getEmailCategory('request_verification')).toBe('pending');
    });

    it('categorizes flagged status as flagged', () => {
      expect(getEmailCategory('flagged')).toBe('flagged');
    });

    it('categorizes approved status as archived', () => {
      expect(getEmailCategory('approved')).toBe('archived');
    });

    it('categorizes denied status as archived', () => {
      expect(getEmailCategory('denied')).toBe('archived');
    });

    it('categorizes deferred status as archived', () => {
      expect(getEmailCategory('deferred')).toBe('archived');
    });

    it('categorizes new status as new', () => {
      expect(getEmailCategory('new' as EmailState['status'])).toBe('new');
    });
  });

  describe('getUrgencyFromAccessRequest', () => {
    it('returns critical for critical urgency', () => {
      expect(getUrgencyFromAccessRequest('critical')).toBe('critical');
    });

    it('returns high for high urgency', () => {
      expect(getUrgencyFromAccessRequest('high')).toBe('high');
    });

    it('returns medium for medium urgency', () => {
      expect(getUrgencyFromAccessRequest('medium')).toBe('medium');
    });

    it('returns low for low urgency', () => {
      expect(getUrgencyFromAccessRequest('low')).toBe('low');
    });

    it('returns low for unknown urgency', () => {
      expect(getUrgencyFromAccessRequest('unknown')).toBe('low');
    });
  });

  describe('getUrgencyFromThreatTier', () => {
    it('returns critical for SEVERE tier', () => {
      expect(getUrgencyFromThreatTier('SEVERE')).toBe('critical');
    });

    it('returns critical for HIGH tier', () => {
      expect(getUrgencyFromThreatTier('HIGH')).toBe('critical');
    });

    it('returns high for ELEVATED tier', () => {
      expect(getUrgencyFromThreatTier('ELEVATED')).toBe('high');
    });

    it('returns medium for GUARDED tier', () => {
      expect(getUrgencyFromThreatTier('GUARDED')).toBe('medium');
    });

    it('returns low for LOW tier', () => {
      expect(getUrgencyFromThreatTier('LOW')).toBe('low');
    });
  });

  describe('getFactionColor', () => {
    it('returns correct color for Sovereign Compact', () => {
      expect(getFactionColor('The Sovereign Compact')).toBe('var(--color-faction-sovereign)');
    });

    it('returns correct color for Nexion Industries', () => {
      expect(getFactionColor('Nexion Industries')).toBe('var(--color-faction-nexion)');
    });

    it('returns correct color for The Librarians', () => {
      expect(getFactionColor('The Librarians')).toBe('var(--color-faction-librarians)');
    });

    it('returns correct color for Hacktivist Collectives', () => {
      expect(getFactionColor('Hacktivist Collectives')).toBe('var(--color-faction-hacktivist)');
    });

    it('returns correct color for Criminal Networks', () => {
      expect(getFactionColor('Criminal Networks')).toBe('var(--color-faction-criminal)');
    });

    it('returns archived color for unknown faction', () => {
      expect(getFactionColor('Unknown Faction')).toBe('var(--color-archived)');
    });
  });

  describe('categorizeEmails', () => {
    it('categorizes emails correctly', () => {
      const email1 = createMockEmail('email-1');
      const email2 = createMockEmail('email-2');
      const emails = [email1, email2];
      const states = new Map<string, EmailState>([
        ['email-1', createMockState('email-1', 'pending')],
        ['email-2', createMockState('email-2', 'flagged')],
      ]);

      const result = categorizeEmails(emails, states, 1);

      expect(result.get('pending')?.length).toBe(1);
      expect(result.get('flagged')?.length).toBe(1);
    });

    it('calculates age correctly', () => {
      const email1 = createMockEmail('email-1', 'low', 1);
      const emails = [email1];
      const states = new Map<string, EmailState>([
        ['email-1', createMockState('email-1', 'pending')],
      ]);

      const result = categorizeEmails(emails, states, 3);

      const pendingEmails = result.get('pending')!;
      expect(pendingEmails.length).toBeGreaterThan(0);
      expect(pendingEmails[0]!.age).toBe(2);
    });
  });

  describe('sortEmails', () => {
    it('sorts by urgency descending by default', () => {
      const lowEmail = createMockEmail('email-low', 'low');
      const criticalEmail = createMockEmail('email-critical', 'critical');

      const item1: InboxEmailItem = {
        email: lowEmail,
        state: createMockState('email-low', 'pending'),
        category: 'pending',
        urgency: 'low',
        age: 0,
      };

      const item2: InboxEmailItem = {
        email: criticalEmail,
        state: createMockState('email-critical', 'pending'),
        category: 'pending',
        urgency: 'critical',
        age: 0,
      };

      const result = sortEmails([item1, item2], 'urgency');

      expect(result[0]!.email.emailId).toBe('email-critical');
      expect(result[1]!.email.emailId).toBe('email-low');
    });

    it('sorts by time received', () => {
      const oldEmail = createMockEmail('email-old', 'low', 1);
      oldEmail.createdAt = '2026-01-01T00:00:00Z';
      const newEmail = createMockEmail('email-new', 'low', 1);
      newEmail.createdAt = '2026-01-02T00:00:00Z';

      const oldItem: InboxEmailItem = {
        email: oldEmail,
        state: createMockState('email-old', 'pending'),
        category: 'pending',
        urgency: 'low',
        age: 0,
      };

      const newItem: InboxEmailItem = {
        email: newEmail,
        state: createMockState('email-new', 'pending'),
        category: 'pending',
        urgency: 'low',
        age: 0,
      };

      const result = sortEmails([newItem, oldItem], 'time');

      expect(result[0]!.email.emailId).toBe('email-new');
    });
  });

  describe('filterEmails', () => {
    it('returns all emails when filter is all', () => {
      const newEmail = createMockEmail('email-new');
      const flaggedEmail = createMockEmail('email-flagged');

      const newItem: InboxEmailItem = {
        email: newEmail,
        state: createMockState('email-new', 'pending'),
        category: 'new',
        urgency: 'low',
        age: 0,
      };

      const flaggedItem: InboxEmailItem = {
        email: flaggedEmail,
        state: createMockState('email-flagged', 'flagged'),
        category: 'flagged',
        urgency: 'high',
        age: 0,
      };

      const result = filterEmails([newItem, flaggedItem], 'all');
      expect(result.length).toBe(2);
    });

    it('filters by new category', () => {
      const newEmail = createMockEmail('email-new');
      const flaggedEmail = createMockEmail('email-flagged');

      const newItem: InboxEmailItem = {
        email: newEmail,
        state: createMockState('email-new', 'pending'),
        category: 'new',
        urgency: 'low',
        age: 0,
      };

      const flaggedItem: InboxEmailItem = {
        email: flaggedEmail,
        state: createMockState('email-flagged', 'flagged'),
        category: 'flagged',
        urgency: 'high',
        age: 0,
      };

      const result = filterEmails([newItem, flaggedItem], 'new');
      expect(result.length).toBe(1);
      expect(result[0]!.email.emailId).toBe('email-new');
    });

    it('filters by flagged category', () => {
      const newEmail = createMockEmail('email-new');
      const flaggedEmail = createMockEmail('email-flagged');

      const newItem: InboxEmailItem = {
        email: newEmail,
        state: createMockState('email-new', 'pending'),
        category: 'new',
        urgency: 'low',
        age: 0,
      };

      const flaggedItem: InboxEmailItem = {
        email: flaggedEmail,
        state: createMockState('email-flagged', 'flagged'),
        category: 'flagged',
        urgency: 'high',
        age: 0,
      };

      const result = filterEmails([newItem, flaggedItem], 'flagged');
      expect(result.length).toBe(1);
      expect(result[0]!.email.emailId).toBe('email-flagged');
    });

    it('filters undecided emails', () => {
      const newEmail = createMockEmail('email-new');
      const pendingEmail = createMockEmail('email-pending');
      const flaggedEmail = createMockEmail('email-flagged');

      const newItem: InboxEmailItem = {
        email: newEmail,
        state: createMockState('email-new', 'pending'),
        category: 'new',
        urgency: 'low',
        age: 0,
      };

      const pendingItem: InboxEmailItem = {
        email: pendingEmail,
        state: createMockState('email-pending', 'pending'),
        category: 'pending',
        urgency: 'medium',
        age: 0,
      };

      const flaggedItem: InboxEmailItem = {
        email: flaggedEmail,
        state: createMockState('email-flagged', 'flagged'),
        category: 'flagged',
        urgency: 'high',
        age: 0,
      };

      const result = filterEmails([newItem, flaggedItem, pendingItem], 'undecided');
      expect(result.length).toBe(2);
    });
  });
});
