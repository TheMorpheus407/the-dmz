import { describe, expect, it } from 'vitest';

import {
  GAME_ENGINE_EVENTS,
  createSessionStartedEvent,
  createSessionEndedEvent,
  createEmailReceivedEvent,
  createEmailHeaderViewedEvent,
  createEmailUrlHoveredEvent,
  createEmailAttachmentPreviewedEvent,
  createDecisionApprovedEvent,
  createDecisionDeniedEvent,
  createDecisionFlaggedEvent,
  createVerificationPacketOpenedEvent,
  createVerificationResultEvent,
  createThreatAttackLaunchedEvent,
  createThreatAttackMitigatedEvent,
  createThreatAttackSucceededEvent,
  createThreatLevelChangedEvent,
  createIncidentResponseActionTakenEvent,
} from '../engine.events.js';

describe('Game Engine Event Types', () => {
  it('defines all required session events', () => {
    expect(GAME_ENGINE_EVENTS.SESSION_STARTED).toBe('game.session.started');
    expect(GAME_ENGINE_EVENTS.SESSION_ENDED).toBe('game.session.ended');
    expect(GAME_ENGINE_EVENTS.SESSION_PAUSED).toBe('game.session.paused');
    expect(GAME_ENGINE_EVENTS.SESSION_RESUMED).toBe('game.session.resumed');
    expect(GAME_ENGINE_EVENTS.SESSION_COMPLETED).toBe('game.session.completed');
    expect(GAME_ENGINE_EVENTS.SESSION_ABANDONED).toBe('game.session.abandoned');
  });

  it('defines all email events', () => {
    expect(GAME_ENGINE_EVENTS.EMAIL_RECEIVED).toBe('game.email.received');
    expect(GAME_ENGINE_EVENTS.EMAIL_OPENED).toBe('game.email.opened');
    expect(GAME_ENGINE_EVENTS.EMAIL_INDICATOR_MARKED).toBe('game.email.indicator.marked');
    expect(GAME_ENGINE_EVENTS.EMAIL_HEADER_VIEWED).toBe('game.email.header.viewed');
    expect(GAME_ENGINE_EVENTS.EMAIL_URL_HOVERED).toBe('game.email.url.hovered');
    expect(GAME_ENGINE_EVENTS.EMAIL_ATTACHMENT_PREVIEWED).toBe('game.email.attachment.previewed');
  });

  it('defines all decision events', () => {
    expect(GAME_ENGINE_EVENTS.DECISION_APPROVED).toBe('game.decision.approved');
    expect(GAME_ENGINE_EVENTS.DECISION_DENIED).toBe('game.decision.denied');
    expect(GAME_ENGINE_EVENTS.DECISION_FLAGGED).toBe('game.decision.flagged');
    expect(GAME_ENGINE_EVENTS.DECISION_VERIFICATION_REQUESTED).toBe(
      'game.decision.verification_requested',
    );
  });

  it('defines all verification events', () => {
    expect(GAME_ENGINE_EVENTS.VERIFICATION_PACKET_OPENED).toBe('game.verification.packet_opened');
    expect(GAME_ENGINE_EVENTS.VERIFICATION_OUT_OF_BAND_INITIATED).toBe(
      'game.verification.out_of_band_initiated',
    );
    expect(GAME_ENGINE_EVENTS.VERIFICATION_RESULT).toBe('game.verification.result');
  });

  it('defines all threat events', () => {
    expect(GAME_ENGINE_EVENTS.THREAT_ATTACK_LAUNCHED).toBe('threat.attack.launched');
    expect(GAME_ENGINE_EVENTS.THREAT_ATTACK_MITIGATED).toBe('threat.attack.mitigated');
    expect(GAME_ENGINE_EVENTS.THREAT_ATTACK_SUCCEEDED).toBe('threat.attack.succeeded');
    expect(GAME_ENGINE_EVENTS.THREAT_LEVEL_CHANGED).toBe('threat.level.changed');
  });

  it('defines incident response event', () => {
    expect(GAME_ENGINE_EVENTS.INCIDENT_RESPONSE_ACTION_TAKEN).toBe(
      'incident.response.action_taken',
    );
  });
});

describe('createSessionStartedEvent', () => {
  it('creates event with required fields', () => {
    const event = createSessionStartedEvent({
      source: 'game-engine',
      correlationId: 'corr-id',
      tenantId: 'tenant-id',
      userId: 'user-id',
      version: 1,
      payload: {
        sessionId: 'session-id',
        userId: 'user-id',
        tenantId: 'tenant-id',
        day: 1,
        seed: 12345,
      },
    });

    expect(event.eventType).toBe('game.session.started');
    expect(event.eventId).toBeDefined();
    expect(event.timestamp).toBeDefined();
    expect(event.payload.sessionId).toBe('session-id');
  });

  it('includes optional difficultyTier', () => {
    const event = createSessionStartedEvent({
      source: 'game-engine',
      correlationId: 'corr-id',
      tenantId: 'tenant-id',
      userId: 'user-id',
      version: 1,
      payload: {
        sessionId: 'session-id',
        userId: 'user-id',
        tenantId: 'tenant-id',
        day: 1,
        seed: 12345,
        difficultyTier: 'tier_3',
      },
    });

    expect(event.payload.difficultyTier).toBe('tier_3');
  });
});

describe('createSessionEndedEvent', () => {
  it('creates session ended event', () => {
    const event = createSessionEndedEvent({
      source: 'game-engine',
      correlationId: 'corr-id',
      tenantId: 'tenant-id',
      userId: 'user-id',
      version: 1,
      payload: {
        sessionId: 'session-id',
        userId: 'user-id',
        reason: 'completed',
        durationMs: 3600000,
      },
    });

    expect(event.eventType).toBe('game.session.ended');
    expect(event.payload.durationMs).toBe(3600000);
  });
});

describe('createEmailReceivedEvent', () => {
  it('creates email received event with analytics fields', () => {
    const event = createEmailReceivedEvent({
      source: 'game-engine',
      correlationId: 'corr-id',
      tenantId: 'tenant-id',
      userId: 'user-id',
      version: 1,
      payload: {
        sessionId: 'session-id',
        emailId: 'email-123',
        difficultyTier: 'tier_2',
        scenarioId: 'scenario-456',
        contentVersion: '1.0.0',
        competencyTags: ['phishing_detection'],
      },
    });

    expect(event.eventType).toBe('game.email.received');
    expect(event.payload.difficultyTier).toBe('tier_2');
    expect(event.payload.competencyTags).toContain('phishing_detection');
  });
});

describe('createEmailHeaderViewedEvent', () => {
  it('creates email header viewed event', () => {
    const event = createEmailHeaderViewedEvent({
      source: 'game-engine',
      correlationId: 'corr-id',
      tenantId: 'tenant-id',
      userId: 'user-id',
      version: 1,
      payload: {
        sessionId: 'session-id',
        emailId: 'email-123',
        headerName: 'From',
      },
    });

    expect(event.eventType).toBe('game.email.header.viewed');
    expect(event.payload.headerName).toBe('From');
  });
});

describe('createEmailUrlHoveredEvent', () => {
  it('creates email URL hovered event', () => {
    const event = createEmailUrlHoveredEvent({
      source: 'game-engine',
      correlationId: 'corr-id',
      tenantId: 'tenant-id',
      userId: 'user-id',
      version: 1,
      payload: {
        sessionId: 'session-id',
        emailId: 'email-123',
        url: 'https://example.com/malicious',
      },
    });

    expect(event.eventType).toBe('game.email.url.hovered');
    expect(event.payload.url).toBe('https://example.com/malicious');
  });
});

describe('createEmailAttachmentPreviewedEvent', () => {
  it('creates email attachment previewed event', () => {
    const event = createEmailAttachmentPreviewedEvent({
      source: 'game-engine',
      correlationId: 'corr-id',
      tenantId: 'tenant-id',
      userId: 'user-id',
      version: 1,
      payload: {
        sessionId: 'session-id',
        emailId: 'email-123',
        attachmentId: 'att-456',
        attachmentName: 'invoice.pdf',
      },
    });

    expect(event.eventType).toBe('game.email.attachment.previewed');
    expect(event.payload.attachmentName).toBe('invoice.pdf');
  });
});

describe('createDecisionApprovedEvent', () => {
  it('creates decision approved event with competency tags', () => {
    const event = createDecisionApprovedEvent({
      source: 'game-engine',
      correlationId: 'corr-id',
      tenantId: 'tenant-id',
      userId: 'user-id',
      version: 1,
      payload: {
        sessionId: 'session-id',
        emailId: 'email-123',
        decision: 'approved',
        timeToDecisionMs: 15000,
        outcome: 'correct',
        competencyTags: ['phishing_detection', 'social_engineering_resistance'],
      },
    });

    expect(event.eventType).toBe('game.decision.approved');
    expect(event.payload.outcome).toBe('correct');
    expect(event.payload.competencyTags).toHaveLength(2);
  });
});

describe('createDecisionDeniedEvent', () => {
  it('creates decision denied event', () => {
    const event = createDecisionDeniedEvent({
      source: 'game-engine',
      correlationId: 'corr-id',
      tenantId: 'tenant-id',
      userId: 'user-id',
      version: 1,
      payload: {
        sessionId: 'session-id',
        emailId: 'email-123',
        decision: 'denied',
        timeToDecisionMs: 20000,
        outcome: 'correct',
      },
    });

    expect(event.eventType).toBe('game.decision.denied');
    expect(event.payload.outcome).toBe('correct');
  });
});

describe('createDecisionFlaggedEvent', () => {
  it('creates decision flagged event', () => {
    const event = createDecisionFlaggedEvent({
      source: 'game-engine',
      correlationId: 'corr-id',
      tenantId: 'tenant-id',
      userId: 'user-id',
      version: 1,
      payload: {
        sessionId: 'session-id',
        emailId: 'email-123',
        decision: 'flagged',
        timeToDecisionMs: 10000,
        outcome: 'partial',
      },
    });

    expect(event.eventType).toBe('game.decision.flagged');
    expect(event.payload.outcome).toBe('partial');
  });
});

describe('createVerificationPacketOpenedEvent', () => {
  it('creates verification packet opened event', () => {
    const event = createVerificationPacketOpenedEvent({
      source: 'game-engine',
      correlationId: 'corr-id',
      tenantId: 'tenant-id',
      userId: 'user-id',
      version: 1,
      payload: {
        sessionId: 'session-id',
        emailId: 'email-123',
        packetId: 'packet-456',
      },
    });

    expect(event.eventType).toBe('game.verification.packet_opened');
    expect(event.payload.packetId).toBe('packet-456');
  });
});

describe('createVerificationResultEvent', () => {
  it('creates verification result event', () => {
    const event = createVerificationResultEvent({
      source: 'game-engine',
      correlationId: 'corr-id',
      tenantId: 'tenant-id',
      userId: 'user-id',
      version: 1,
      payload: {
        sessionId: 'session-id',
        emailId: 'email-123',
        packetId: 'packet-456',
        result: 'valid',
        isValid: true,
      },
    });

    expect(event.eventType).toBe('game.verification.result');
    expect(event.payload.isValid).toBe(true);
  });
});

describe('createThreatAttackLaunchedEvent', () => {
  it('creates threat attack launched event', () => {
    const event = createThreatAttackLaunchedEvent({
      source: 'game-engine',
      correlationId: 'corr-id',
      tenantId: 'tenant-id',
      userId: 'user-id',
      version: 1,
      payload: {
        sessionId: 'session-id',
        attackId: 'attack-123',
        threatTier: 'HIGH',
        attackType: 'phishing',
      },
    });

    expect(event.eventType).toBe('threat.attack.launched');
    expect(event.payload.threatTier).toBe('HIGH');
  });
});

describe('createThreatAttackMitigatedEvent', () => {
  it('creates threat attack mitigated event', () => {
    const event = createThreatAttackMitigatedEvent({
      source: 'game-engine',
      correlationId: 'corr-id',
      tenantId: 'tenant-id',
      userId: 'user-id',
      version: 1,
      payload: {
        sessionId: 'session-id',
        attackId: 'attack-123',
        threatTier: 'ELEVATED',
        mitigationMethod: 'user_report',
      },
    });

    expect(event.eventType).toBe('threat.attack.mitigated');
    expect(event.payload.mitigationMethod).toBe('user_report');
  });
});

describe('createThreatAttackSucceededEvent', () => {
  it('creates threat attack succeeded event', () => {
    const event = createThreatAttackSucceededEvent({
      source: 'game-engine',
      correlationId: 'corr-id',
      tenantId: 'tenant-id',
      userId: 'user-id',
      version: 1,
      payload: {
        sessionId: 'session-id',
        attackId: 'attack-123',
        threatTier: 'SEVERE',
        impact: 5000,
      },
    });

    expect(event.eventType).toBe('threat.attack.succeeded');
    expect(event.payload.impact).toBe(5000);
  });
});

describe('createThreatLevelChangedEvent', () => {
  it('creates threat level changed event', () => {
    const event = createThreatLevelChangedEvent({
      source: 'game-engine',
      correlationId: 'corr-id',
      tenantId: 'tenant-id',
      userId: 'user-id',
      version: 1,
      payload: {
        sessionId: 'session-id',
        previousLevel: 'LOW',
        newLevel: 'HIGH',
        reason: 'breach_detected',
      },
    });

    expect(event.eventType).toBe('threat.level.changed');
    expect(event.payload.previousLevel).toBe('LOW');
    expect(event.payload.newLevel).toBe('HIGH');
  });
});

describe('createIncidentResponseActionTakenEvent', () => {
  it('creates incident response action taken event with competency tags', () => {
    const event = createIncidentResponseActionTakenEvent({
      source: 'game-engine',
      correlationId: 'corr-id',
      tenantId: 'tenant-id',
      userId: 'user-id',
      version: 1,
      payload: {
        sessionId: 'session-id',
        incidentId: 'incident-123',
        actionType: 'containment',
        actionResult: 'success',
        competencyTags: ['incident_response'],
      },
    });

    expect(event.eventType).toBe('incident.response.action_taken');
    expect(event.payload.competencyTags).toContain('incident_response');
  });
});
