import { describe, expect, it } from 'vitest';

import { incidentStatusSchema, gameStateSchema } from './game-engine.schema.js';

describe('incidentStatusSchema', () => {
  it('should accept all 6 valid incident statuses', () => {
    const validStatuses = [
      'open',
      'investigating',
      'contained',
      'eradicated',
      'recovered',
      'closed',
    ] as const;

    for (const status of validStatuses) {
      const result = incidentStatusSchema.safeParse(status);
      expect(result.success, `Expected '${status}' to be valid`).toBe(true);
    }
  });

  it('should reject old status values', () => {
    const invalidStatuses = ['active', 'resolved'];

    for (const status of invalidStatuses) {
      const result = incidentStatusSchema.safeParse(status);
      expect(result.success, `Expected '${status}' to be invalid`).toBe(false);
    }
  });
});

describe('gameStateSchema', () => {
  it('should accept a game state with an incident having status "open"', () => {
    const validGameState = {
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      tenantId: '550e8400-e29b-41d4-a716-446655440002',
      seed: 12345,
      currentDay: 1,
      currentMacroState: 'SESSION_INIT',
      currentPhase: 'PHASE_DAY_START',
      funds: 1000,
      trustScore: 50,
      intelFragments: 0,
      playerLevel: 1,
      playerXP: 0,
      threatTier: 'low',
      facilityTier: 'outpost',
      inbox: [],
      incidents: [
        {
          incidentId: '550e8400-e29b-41d4-a716-446655440003',
          status: 'open',
          severity: 5,
          type: 'phishing',
          createdDay: 1,
          responseActions: [],
        },
      ],
      narrativeState: {
        currentChapter: 1,
        activeTriggers: [],
        completedEvents: [],
      },
      factionRelations: {},
      blacklist: [],
      whitelist: [],
      analyticsState: {
        totalEmailsProcessed: 0,
        totalDecisions: 0,
        approvals: 0,
        denials: 0,
        flags: 0,
        verificationsRequested: 0,
        incidentsTriggered: 1,
        breaches: 0,
      },
      sequenceNumber: 0,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const result = gameStateSchema.safeParse(validGameState);
    expect(
      result.success,
      `Expected valid game state: ${JSON.stringify(result.error?.format())}`,
    ).toBe(true);
  });

  it('should accept a game state with an incident having all valid statuses', () => {
    const statuses = [
      'open',
      'investigating',
      'contained',
      'eradicated',
      'recovered',
      'closed',
    ] as const;

    for (const status of statuses) {
      const gameState = {
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        tenantId: '550e8400-e29b-41d4-a716-446655440002',
        seed: 12345,
        currentDay: 1,
        currentMacroState: 'SESSION_INIT',
        currentPhase: 'PHASE_DAY_START',
        funds: 1000,
        trustScore: 50,
        intelFragments: 0,
        playerLevel: 1,
        playerXP: 0,
        threatTier: 'low',
        facilityTier: 'outpost',
        inbox: [],
        incidents: [
          {
            incidentId: '550e8400-e29b-41d4-a716-446655440003',
            status,
            severity: 5,
            type: 'phishing',
            createdDay: 1,
            responseActions: [],
          },
        ],
        narrativeState: {
          currentChapter: 1,
          activeTriggers: [],
          completedEvents: [],
        },
        factionRelations: {},
        blacklist: [],
        whitelist: [],
        analyticsState: {
          totalEmailsProcessed: 0,
          totalDecisions: 0,
          approvals: 0,
          denials: 0,
          flags: 0,
          verificationsRequested: 0,
          incidentsTriggered: 1,
          breaches: 0,
        },
        sequenceNumber: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const result = gameStateSchema.safeParse(gameState);
      expect(result.success, `Expected status '${status}' to be valid`).toBe(true);
    }
  });

  it('should reject a game state with an incident having invalid status', () => {
    const invalidGameState = {
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      tenantId: '550e8400-e29b-41d4-a716-446655440002',
      seed: 12345,
      currentDay: 1,
      currentMacroState: 'SESSION_INIT',
      currentPhase: 'PHASE_DAY_START',
      funds: 1000,
      trustScore: 50,
      intelFragments: 0,
      playerLevel: 1,
      playerXP: 0,
      threatTier: 'low',
      facilityTier: 'outpost',
      inbox: [],
      incidents: [
        {
          incidentId: '550e8400-e29b-41d4-a716-446655440003',
          status: 'active',
          severity: 5,
          type: 'phishing',
          createdDay: 1,
          responseActions: [],
        },
      ],
      narrativeState: {
        currentChapter: 1,
        activeTriggers: [],
        completedEvents: [],
      },
      factionRelations: {},
      blacklist: [],
      whitelist: [],
      analyticsState: {
        totalEmailsProcessed: 0,
        totalDecisions: 0,
        approvals: 0,
        denials: 0,
        flags: 0,
        verificationsRequested: 0,
        incidentsTriggered: 1,
        breaches: 0,
      },
      sequenceNumber: 0,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const result = gameStateSchema.safeParse(invalidGameState);
    expect(result.success).toBe(false);
  });
});
