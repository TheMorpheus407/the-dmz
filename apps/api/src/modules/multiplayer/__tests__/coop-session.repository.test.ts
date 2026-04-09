import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CoopSessionRepository } from '../coop-session.repository.js';

import type { DatabaseClient } from '../../../shared/database/connection.js';

const createMockDb = (): DatabaseClient => {
  const mockQueryResults: Record<string, unknown> = {};

  return {
    query: {
      coopSession: {
        findFirst: vi.fn().mockResolvedValue(mockQueryResults.coopSessionFindFirst),
        findMany: vi.fn().mockResolvedValue(mockQueryResults.coopSessionFindMany),
      },
      coopRoleAssignment: {
        findFirst: vi.fn().mockResolvedValue(mockQueryResults.roleAssignmentFindFirst),
        findMany: vi.fn().mockResolvedValue(mockQueryResults.roleAssignmentFindMany),
      },
      coopDecisionProposal: {
        findFirst: vi.fn().mockResolvedValue(mockQueryResults.proposalFindFirst),
        findMany: vi.fn().mockResolvedValue(mockQueryResults.proposalFindMany),
      },
      playerProfiles: {
        findFirst: vi.fn().mockResolvedValue(mockQueryResults.playerProfileFindFirst),
      },
      party: {
        findFirst: vi.fn().mockResolvedValue(mockQueryResults.partyFindFirst),
      },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockQueryResults.insert]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockQueryResults.update]),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(mockQueryResults.delete),
    }),
  } as unknown as DatabaseClient;
};

const createMockCoopSession = (overrides: Partial<Record<string, unknown>> = {}) => ({
  sessionId: 'session-1',
  tenantId: 'tenant-1',
  partyId: 'party-1',
  seed: 'TESTSEED123456789012345678901234',
  status: 'lobby',
  authorityPlayerId: 'leader-1',
  gameSessionId: null,
  dayNumber: 1,
  sessionSeq: 0,
  lastSnapshotSeq: 0,
  lastSnapshotAt: null,
  createdAt: new Date(),
  completedAt: null,
  roleConfig: null,
  scenarioId: null,
  difficultyTier: null,
  ...overrides,
});

const createMockRoleAssignment = (overrides: Partial<Record<string, unknown>> = {}) => ({
  assignmentId: 'assignment-1',
  sessionId: 'session-1',
  playerId: 'player-1',
  role: 'triage_lead',
  rolePreference: null,
  isAuthority: true,
  assignedAt: new Date(),
  ...overrides,
});

describe('CoopSessionRepository', () => {
  let mockDb: DatabaseClient;
  let repository: CoopSessionRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    repository = new CoopSessionRepository(mockDb);
  });

  describe('findSession', () => {
    it('should find a session by tenantId and sessionId', async () => {
      const mockSession = createMockCoopSession();
      (mockDb.query.coopSession.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSession,
      );

      const result = await repository.findSession({
        tenantId: 'tenant-1',
        sessionId: 'session-1',
      });

      expect(result).toEqual(mockSession);
      expect(mockDb.query.coopSession.findFirst).toHaveBeenCalled();
    });

    it('should return undefined when session not found', async () => {
      (mockDb.query.coopSession.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await repository.findSession({
        tenantId: 'tenant-1',
        sessionId: 'non-existent',
      });

      expect(result).toBeUndefined();
    });
  });

  describe('findSessionByParty', () => {
    it('should find a session by tenantId and partyId', async () => {
      const mockSession = createMockCoopSession();
      (mockDb.query.coopSession.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSession,
      );

      const result = await repository.findSessionByParty({
        tenantId: 'tenant-1',
        partyId: 'party-1',
      });

      expect(result).toEqual(mockSession);
    });
  });

  describe('findSessionWithRoles', () => {
    it('should return session with roles', async () => {
      const mockSession = createMockCoopSession();
      const mockRoles = [
        createMockRoleAssignment(),
        createMockRoleAssignment({
          assignmentId: 'assignment-2',
          playerId: 'player-2',
          role: 'verification_lead',
          isAuthority: false,
        }),
      ];

      (mockDb.query.coopSession.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSession,
      );
      (mockDb.query.coopRoleAssignment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockRoles,
      );

      const result = await repository.findSessionWithRoles({
        tenantId: 'tenant-1',
        sessionId: 'session-1',
      });

      expect(result).not.toBeNull();
      expect(result?.sessionId).toBe('session-1');
      expect(result?.roles).toHaveLength(2);
      expect(result?.roles[0].role).toBe('triage_lead');
      expect(result?.roles[1].role).toBe('verification_lead');
    });

    it('should return null when session not found', async () => {
      (mockDb.query.coopSession.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await repository.findSessionWithRoles({
        tenantId: 'tenant-1',
        sessionId: 'non-existent',
      });

      expect(result).toBeNull();
    });
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      const mockSession = createMockCoopSession();
      (mockDb.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockSession]),
        }),
      });

      const result = await repository.createSession({
        tenantId: 'tenant-1',
        partyId: 'party-1',
        seed: 'TESTSEED123456789012345678901234',
        leaderId: 'leader-1',
      });

      expect(result).toEqual(mockSession);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('updateSession', () => {
    it('should update a session', async () => {
      const mockSession = createMockCoopSession({ status: 'active' });
      (mockDb.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockSession]),
          }),
        }),
      });

      const result = await repository.updateSession({
        sessionId: 'session-1',
        updates: { status: 'active' },
      });

      expect(result).toEqual(mockSession);
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('findRoleAssignments', () => {
    it('should find all role assignments for a session', async () => {
      const mockRoles = [createMockRoleAssignment()];
      (mockDb.query.coopRoleAssignment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockRoles,
      );

      const result = await repository.findRoleAssignments({ sessionId: 'session-1' });

      expect(result).toHaveLength(1);
      expect(result[0].playerId).toBe('player-1');
    });
  });

  describe('findRoleAssignment', () => {
    it('should find a role assignment by sessionId and playerId', async () => {
      const mockRole = createMockRoleAssignment();
      (mockDb.query.coopRoleAssignment.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockRole,
      );

      const result = await repository.findRoleAssignment({
        sessionId: 'session-1',
        playerId: 'player-1',
      });

      expect(result).toBeDefined();
      expect(result?.playerId).toBe('player-1');
    });

    it('should return undefined when role assignment not found', async () => {
      (mockDb.query.coopRoleAssignment.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );

      const result = await repository.findRoleAssignment({
        sessionId: 'session-1',
        playerId: 'non-existent',
      });

      expect(result).toBeUndefined();
    });
  });

  describe('createRoleAssignments', () => {
    it('should create role assignments', async () => {
      const mockRoles = [
        createMockRoleAssignment(),
        createMockRoleAssignment({
          assignmentId: 'assignment-2',
          playerId: 'player-2',
          role: 'verification_lead',
          isAuthority: false,
        }),
      ];
      (mockDb.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(mockRoles),
        }),
      });

      const result = await repository.createRoleAssignments([
        { sessionId: 'session-1', playerId: 'player-1', role: 'triage_lead', isAuthority: true },
        {
          sessionId: 'session-1',
          playerId: 'player-2',
          role: 'verification_lead',
          isAuthority: false,
        },
      ]);

      expect(result).toHaveLength(2);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('updateRoleAssignment', () => {
    it('should update a role assignment', async () => {
      const mockRole = createMockRoleAssignment({ rolePreference: 'triage_lead' });
      (mockDb.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockRole]),
          }),
        }),
      });

      const result = await repository.updateRoleAssignment({
        assignmentId: 'assignment-1',
        updates: { rolePreference: 'triage_lead' },
      });

      expect(result).toBeDefined();
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('deleteRoleAssignments', () => {
    it('should delete all role assignments for a session', async () => {
      (mockDb.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      await repository.deleteRoleAssignments('session-1');

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('clearAuthorityFlags', () => {
    it('should clear authority flags for a session', async () => {
      (mockDb.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ assignmentId: 'assignment-1' }]),
        }),
      });

      await repository.clearAuthorityFlags('session-1');

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('findProposal', () => {
    it('should find a proposal by proposalId and sessionId', async () => {
      const mockProposal = {
        proposalId: 'proposal-1',
        sessionId: 'session-1',
        playerId: 'player-1',
        role: 'triage_lead',
        emailId: 'email-1',
        action: 'quarantine',
        status: 'proposed',
        conflictFlag: false,
      };
      (mockDb.query.coopDecisionProposal.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockProposal,
      );

      const result = await repository.findProposal({
        proposalId: 'proposal-1',
        sessionId: 'session-1',
      });

      expect(result).toEqual(mockProposal);
    });
  });

  describe('createProposal', () => {
    it('should create a proposal', async () => {
      const mockProposal = {
        proposalId: 'proposal-1',
        sessionId: 'session-1',
        playerId: 'player-1',
        role: 'triage_lead',
        emailId: 'email-1',
        action: 'quarantine',
        status: 'proposed',
        conflictFlag: false,
      };
      (mockDb.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockProposal]),
        }),
      });

      const result = await repository.createProposal({
        sessionId: 'session-1',
        playerId: 'player-1',
        role: 'triage_lead',
        emailId: 'email-1',
        action: 'quarantine',
      });

      expect(result).toEqual(mockProposal);
    });
  });

  describe('updateProposal', () => {
    it('should update a proposal', async () => {
      const mockProposal = {
        proposalId: 'proposal-1',
        sessionId: 'session-1',
        status: 'confirmed',
        authorityAction: 'confirm',
      };
      (mockDb.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockProposal]),
          }),
        }),
      });

      const result = await repository.updateProposal({
        proposalId: 'proposal-1',
        updates: { status: 'confirmed', authorityAction: 'confirm' },
      });

      expect(result).toEqual(mockProposal);
    });
  });

  describe('updatePartyStatus', () => {
    it('should update party status', async () => {
      (mockDb.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ partyId: 'party-1', status: 'in_session' }]),
          }),
        }),
      });

      await repository.updatePartyStatus('party-1', 'tenant-1', 'in_session');

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('createGameSession', () => {
    it('should create a game session', async () => {
      const mockGameSession = { id: 'game-session-1' };
      (mockDb.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockGameSession]),
        }),
      });

      const result = await repository.createGameSession({
        tenantId: 'tenant-1',
        userId: 'user-1',
        seed: '12345678901234567890123456789012',
      });

      expect(result).toEqual(mockGameSession);
    });
  });
});
