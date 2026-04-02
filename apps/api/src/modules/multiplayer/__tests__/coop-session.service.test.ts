import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

vi.mock('../../../shared/cache/index.js', () => ({
  getCachedCoopSession: vi.fn(),
  setCachedCoopSession: vi.fn(),
  deleteCachedCoopSession: vi.fn(),
}));

vi.mock('../../feature-flags/feature-flags.service.js', () => ({
  evaluateFlag: vi.fn(),
}));

import { getDatabaseClient } from '../../../shared/database/connection.js';
import {
  getCachedCoopSession,
  setCachedCoopSession,
  deleteCachedCoopSession,
} from '../../../shared/cache/index.js';
import { evaluateFlag } from '../../feature-flags/feature-flags.service.js'; // eslint-disable-line import-x/no-restricted-paths
import {
  DEFAULT_PERMISSION_MATRIX,
  getRolePermissionsForPhase,
  isActionPermitted,
} from '../permissions/permission-matrix.js';
import { PermissionDeniedError, checkPermission } from '../permissions/permission.enforcer.js';
import { createCoopSessionService, type CoopSessionService } from '../coop-session.service.js';

import type { AppConfig } from '../../../config.js';
import type { IEventBus } from '../../../shared/events/event-types.js';
import type { DatabaseClient } from '../../../shared/database/connection.js';

const mockConfig = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  REDIS_URL: 'redis://localhost:6379',
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
} as unknown as AppConfig;

const TENANT_ID = 'tenant-1';
const LEADER_ID = 'leader-profile-1';
const PLAYER_1_ID = 'player-1-profile';
const PLAYER_2_ID = 'player-2-profile';
const SESSION_ID = 'session-1';
const PARTY_ID = 'party-1';

const createMockEventBus = (): IEventBus => ({
  publish: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
});

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
    insert: vi.fn().mockImplementation(() => ({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockQueryResults.insert]),
      }),
    })),
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
  sessionId: SESSION_ID,
  tenantId: TENANT_ID,
  partyId: PARTY_ID,
  seed: 'TESTSEED123456789012345678901234',
  status: 'lobby',
  authorityPlayerId: LEADER_ID,
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
  sessionId: SESSION_ID,
  playerId: PLAYER_1_ID,
  role: 'triage_lead',
  rolePreference: null,
  isAuthority: true,
  assignedAt: new Date(),
  ...overrides,
});

const setupMockDb = (
  mockDb: DatabaseClient,
  mockSession: Record<string, unknown> | null,
  mockRoles: Record<string, unknown>[] = [],
) => {
  (mockDb.query.coopSession.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
  (mockDb.query.coopRoleAssignment.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
    mockRoles[0] || null,
  );
  (mockDb.query.coopRoleAssignment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
    mockRoles,
  );
};

describe('coop-session service', () => {
  let mockDb: DatabaseClient;
  let mockEventBus: IEventBus;
  let service: CoopSessionService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    mockEventBus = createMockEventBus();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb);
    vi.mocked(evaluateFlag).mockResolvedValue(true);
    vi.mocked(getCachedCoopSession).mockResolvedValue(null);
    vi.mocked(setCachedCoopSession).mockResolvedValue(undefined);
    vi.mocked(deleteCachedCoopSession).mockResolvedValue(undefined);
    service = createCoopSessionService(mockConfig, mockDb, mockEventBus);
  });

  describe('createSession', () => {
    it('should create a co-op session successfully', async () => {
      const mockSession = createMockCoopSession();
      let callCount = 0;

      const findFirstMock = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(null);
        }
        return Promise.resolve(mockSession);
      });

      (mockDb.query.coopSession.findFirst as ReturnType<typeof vi.fn>).mockImplementation(
        findFirstMock,
      );
      (mockDb.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockSession]),
        }),
      });
      (mockDb.query.playerProfiles.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockDb.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ ...mockSession, status: 'in_session' }]),
        }),
      });
      (mockDb.query.coopRoleAssignment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await service.createSession(TENANT_ID, LEADER_ID, {
        partyId: PARTY_ID,
        seed: 'TESTSEED123456789012345678901234',
      });

      expect(result.success).toBe(true);
      expect(result.session).toBeDefined();
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should fail when coop feature is disabled', async () => {
      vi.mocked(evaluateFlag).mockResolvedValue(false);

      const result = await service.createSession(TENANT_ID, LEADER_ID, {
        partyId: PARTY_ID,
        seed: 'TESTSEED123456789012345678901234',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Co-op system is disabled');
    });

    it('should fail when session already exists for party', async () => {
      setupMockDb(mockDb, createMockCoopSession());

      const result = await service.createSession(TENANT_ID, LEADER_ID, {
        partyId: PARTY_ID,
        seed: 'TESTSEED123456789012345678901234',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Co-op session already exists for this party');
    });
  });

  describe('getSession', () => {
    it('should return session from database when not cached', async () => {
      const mockSession = createMockCoopSession();
      setupMockDb(mockDb, mockSession, []);

      const result = await service.getSession(TENANT_ID, SESSION_ID);

      expect(result.success).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.session?.sessionId).toBe(SESSION_ID);
      expect(setCachedCoopSession).toHaveBeenCalled();
    });

    it('should return error when session not found', async () => {
      setupMockDb(mockDb, null);

      const result = await service.getSession(TENANT_ID, SESSION_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Co-op session not found');
    });
  });

  describe('assignRoles', () => {
    it('should assign roles and change status to active', async () => {
      const mockSession = createMockCoopSession({ status: 'lobby' });
      setupMockDb(mockDb, mockSession);

      (mockDb.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            createMockRoleAssignment(),
            createMockRoleAssignment({
              assignmentId: 'assignment-2',
              playerId: PLAYER_2_ID,
              role: 'verification_lead',
              isAuthority: false,
            }),
          ]),
        }),
      });

      const result = await service.assignRoles(TENANT_ID, SESSION_ID, PLAYER_1_ID, {
        player1Id: PLAYER_1_ID,
        player2Id: PLAYER_2_ID,
      });

      expect(result.success).toBe(true);
      expect(result.session).toBeDefined();
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should fail when session not in lobby status', async () => {
      const mockSession = createMockCoopSession({ status: 'active' });
      setupMockDb(mockDb, mockSession);

      const result = await service.assignRoles(TENANT_ID, SESSION_ID, PLAYER_1_ID, {
        player1Id: PLAYER_1_ID,
        player2Id: PLAYER_2_ID,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Can only assign roles in lobby status');
    });

    it('should fail when coop feature is disabled', async () => {
      vi.mocked(evaluateFlag).mockResolvedValue(false);

      const result = await service.assignRoles(TENANT_ID, SESSION_ID, PLAYER_1_ID, {
        player1Id: PLAYER_1_ID,
        player2Id: PLAYER_2_ID,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Co-op system is disabled');
    });
  });

  describe('startSession', () => {
    it('should start session when in lobby and player is authority', async () => {
      const mockSession = createMockCoopSession({
        status: 'lobby',
        authorityPlayerId: PLAYER_1_ID,
      });
      setupMockDb(mockDb, mockSession);

      (mockDb.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockSession, status: 'active' }]),
          }),
        }),
      });

      const result = await service.startSession(TENANT_ID, SESSION_ID, PLAYER_1_ID, {
        scenarioId: 'scenario-1',
        difficultyTier: 'standard',
      });

      expect(result.success).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should fail when session not in lobby', async () => {
      const mockSession = createMockCoopSession({ status: 'active' });
      setupMockDb(mockDb, mockSession);

      const result = await service.startSession(TENANT_ID, SESSION_ID, PLAYER_1_ID, {
        scenarioId: 'scenario-1',
        difficultyTier: 'standard',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Can only start a session that is in lobby status');
    });

    it('should fail when player is not authority', async () => {
      const mockSession = createMockCoopSession({
        status: 'lobby',
        authorityPlayerId: PLAYER_2_ID,
      });
      setupMockDb(mockDb, mockSession);

      const result = await service.startSession(TENANT_ID, SESSION_ID, PLAYER_1_ID, {
        scenarioId: 'scenario-1',
        difficultyTier: 'standard',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only the session authority can start the session');
    });
  });

  describe('advanceDay', () => {
    it('should advance day and rotate authority', async () => {
      const mockSession = createMockCoopSession({
        status: 'active',
        authorityPlayerId: PLAYER_1_ID,
        dayNumber: 1,
      });
      setupMockDb(mockDb, mockSession, [
        createMockRoleAssignment({ playerId: PLAYER_1_ID, isAuthority: true }),
        createMockRoleAssignment({
          playerId: PLAYER_2_ID,
          isAuthority: false,
          assignmentId: 'assignment-2',
        }),
      ]);

      (mockDb.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi
              .fn()
              .mockResolvedValue([
                { ...mockSession, dayNumber: 2, authorityPlayerId: PLAYER_2_ID },
              ]),
          }),
        }),
      });

      const result = await service.advanceDay(TENANT_ID, SESSION_ID, PLAYER_1_ID);

      expect(result.success).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should fail when player is not authority', async () => {
      const mockSession = createMockCoopSession({
        status: 'active',
        authorityPlayerId: PLAYER_2_ID,
      });
      setupMockDb(mockDb, mockSession);

      const result = await service.advanceDay(TENANT_ID, SESSION_ID, PLAYER_1_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only the authority can advance the day');
    });

    it('should fail when session is not active', async () => {
      const mockSession = createMockCoopSession({
        status: 'lobby',
        authorityPlayerId: PLAYER_1_ID,
      });
      setupMockDb(mockDb, mockSession);

      const result = await service.advanceDay(TENANT_ID, SESSION_ID, PLAYER_1_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Can only advance day in active session');
    });
  });

  describe('rotateAuthority', () => {
    it('should rotate authority to other player', async () => {
      const mockSession = createMockCoopSession({
        status: 'active',
        authorityPlayerId: PLAYER_1_ID,
      });
      setupMockDb(mockDb, mockSession, [
        createMockRoleAssignment({ playerId: PLAYER_1_ID, isAuthority: true }),
        createMockRoleAssignment({
          playerId: PLAYER_2_ID,
          isAuthority: false,
          assignmentId: 'assignment-2',
        }),
      ]);

      (mockDb.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi
              .fn()
              .mockResolvedValue([{ ...mockSession, authorityPlayerId: PLAYER_2_ID }]),
          }),
        }),
      });

      const result = await service.rotateAuthority(TENANT_ID, SESSION_ID, PLAYER_1_ID);

      expect(result.success).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should fail when player is not current authority', async () => {
      const mockSession = createMockCoopSession({
        status: 'active',
        authorityPlayerId: PLAYER_2_ID,
      });
      setupMockDb(mockDb, mockSession);

      const result = await service.rotateAuthority(TENANT_ID, SESSION_ID, PLAYER_1_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only the current authority can transfer authority');
    });
  });

  describe('endSession', () => {
    it('should end session successfully', async () => {
      const mockSession = createMockCoopSession({
        status: 'active',
        authorityPlayerId: PLAYER_1_ID,
      });
      setupMockDb(mockDb, mockSession);

      (mockDb.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi
              .fn()
              .mockResolvedValue([
                { ...mockSession, status: 'completed', completedAt: new Date() },
              ]),
          }),
        }),
      });

      const result = await service.endSession(TENANT_ID, SESSION_ID, PLAYER_1_ID);

      expect(result.success).toBe(true);
      expect(deleteCachedCoopSession).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should fail when session already terminated', async () => {
      const mockSession = createMockCoopSession({
        status: 'completed',
        authorityPlayerId: PLAYER_1_ID,
      });
      setupMockDb(mockDb, mockSession);

      const result = await service.endSession(TENANT_ID, SESSION_ID, PLAYER_1_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session is already terminated');
    });

    it('should fail when player is not authority', async () => {
      const mockSession = createMockCoopSession({
        status: 'active',
        authorityPlayerId: PLAYER_2_ID,
      });
      setupMockDb(mockDb, mockSession);

      const result = await service.endSession(TENANT_ID, SESSION_ID, PLAYER_1_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only the authority can end the session');
    });
  });

  describe('abandonSession', () => {
    it('should abandon session successfully', async () => {
      const mockSession = createMockCoopSession({ status: 'active' });
      setupMockDb(mockDb, mockSession, [createMockRoleAssignment({ playerId: PLAYER_1_ID })]);

      (mockDb.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi
              .fn()
              .mockResolvedValue([
                { ...mockSession, status: 'abandoned', completedAt: new Date() },
              ]),
          }),
        }),
      });

      const result = await service.abandonSession(TENANT_ID, SESSION_ID, PLAYER_1_ID);

      expect(result.success).toBe(true);
      expect(deleteCachedCoopSession).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should fail when session already terminated', async () => {
      const mockSession = createMockCoopSession({ status: 'abandoned' });
      setupMockDb(mockDb, mockSession, [createMockRoleAssignment({ playerId: PLAYER_1_ID })]);

      const result = await service.abandonSession(TENANT_ID, SESSION_ID, PLAYER_1_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session is already terminated');
    });

    it('should fail when player is not part of session', async () => {
      const mockSession = createMockCoopSession({ status: 'active' });
      setupMockDb(mockDb, mockSession, []);

      const result = await service.abandonSession(TENANT_ID, SESSION_ID, PLAYER_1_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Player is not part of this co-op session');
    });
  });

  describe('submitRolePreference', () => {
    it('should submit role preference successfully', async () => {
      const mockSession = createMockCoopSession({ status: 'lobby' });
      setupMockDb(mockDb, mockSession, [createMockRoleAssignment({ playerId: PLAYER_1_ID })]);

      (mockDb.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi
              .fn()
              .mockResolvedValue([createMockRoleAssignment({ playerId: PLAYER_1_ID })]),
          }),
        }),
      });

      const result = await service.submitRolePreference(TENANT_ID, SESSION_ID, {
        playerId: PLAYER_1_ID,
        preference: 'triage_lead',
      });

      expect(result.success).toBe(true);
    });

    it('should fail when session not in lobby', async () => {
      const mockSession = createMockCoopSession({ status: 'active' });
      setupMockDb(mockDb, mockSession, [createMockRoleAssignment({ playerId: PLAYER_1_ID })]);

      const result = await service.submitRolePreference(TENANT_ID, SESSION_ID, {
        playerId: PLAYER_1_ID,
        preference: 'triage_lead',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Can only submit role preference in lobby status');
    });
  });

  describe('authorityConfirm', () => {
    it('should confirm proposal and publish event', async () => {
      const mockSession = createMockCoopSession({
        status: 'active',
        authorityPlayerId: PLAYER_1_ID,
      });
      setupMockDb(mockDb, mockSession, [
        createMockRoleAssignment({ playerId: PLAYER_1_ID, isAuthority: true }),
        createMockRoleAssignment({
          playerId: PLAYER_2_ID,
          isAuthority: false,
          assignmentId: 'assignment-2',
        }),
      ]);

      (mockDb.query.coopDecisionProposal.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        proposalId: 'proposal-1',
        sessionId: SESSION_ID,
        playerId: PLAYER_2_ID,
        role: 'verification_lead',
        emailId: 'email-1',
        action: 'quarantine',
        status: 'proposed',
        conflictFlag: false,
      });

      (mockDb.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                proposalId: 'proposal-1',
                status: 'confirmed',
                authorityAction: 'confirm',
              },
            ]),
          }),
        }),
      });

      const result = await service.authorityConfirm(TENANT_ID, SESSION_ID, PLAYER_1_ID, {
        proposalId: 'proposal-1',
        action: 'confirm',
      });

      expect(result.success).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should fail when authority tries to confirm own proposal', async () => {
      const mockSession = createMockCoopSession({
        status: 'active',
        authorityPlayerId: PLAYER_1_ID,
      });
      setupMockDb(mockDb, mockSession, [
        createMockRoleAssignment({ playerId: PLAYER_1_ID, isAuthority: true }),
      ]);

      (mockDb.query.coopDecisionProposal.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        proposalId: 'proposal-1',
        sessionId: SESSION_ID,
        playerId: PLAYER_1_ID,
        status: 'proposed',
      });

      const result = await service.authorityConfirm(TENANT_ID, SESSION_ID, PLAYER_1_ID, {
        proposalId: 'proposal-1',
        action: 'confirm',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authority cannot finalize own proposal');
    });
  });

  describe('authorityOverride', () => {
    it('should override proposal with reason', async () => {
      const mockSession = createMockCoopSession({
        status: 'active',
        authorityPlayerId: PLAYER_1_ID,
      });
      setupMockDb(mockDb, mockSession, [
        createMockRoleAssignment({ playerId: PLAYER_1_ID, isAuthority: true }),
        createMockRoleAssignment({
          playerId: PLAYER_2_ID,
          isAuthority: false,
          assignmentId: 'assignment-2',
        }),
      ]);

      (mockDb.query.coopDecisionProposal.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        proposalId: 'proposal-1',
        sessionId: SESSION_ID,
        playerId: PLAYER_2_ID,
        role: 'verification_lead',
        status: 'proposed',
      });

      (mockDb.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                proposalId: 'proposal-1',
                status: 'overridden',
                authorityAction: 'override',
                conflictFlag: true,
                conflictReason: 'insufficient_verification',
              },
            ]),
          }),
        }),
      });

      const result = await service.authorityOverride(TENANT_ID, SESSION_ID, PLAYER_1_ID, {
        proposalId: 'proposal-1',
        action: 'override',
        conflictReason: 'insufficient_verification',
      });

      expect(result.success).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should fail when proposal not found', async () => {
      const mockSession = createMockCoopSession({
        status: 'active',
        authorityPlayerId: PLAYER_1_ID,
      });
      setupMockDb(mockDb, mockSession, [
        createMockRoleAssignment({ playerId: PLAYER_1_ID, isAuthority: true }),
      ]);

      (mockDb.query.coopDecisionProposal.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );

      const result = await service.authorityOverride(TENANT_ID, SESSION_ID, PLAYER_1_ID, {
        proposalId: 'proposal-1',
        action: 'override',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Proposal not found');
    });
  });

  describe('submitProposal', () => {
    it('should fail when feature flag is disabled', async () => {
      vi.mocked(evaluateFlag).mockResolvedValue(false);

      const result = await service.submitProposal(TENANT_ID, SESSION_ID, PLAYER_1_ID, {
        emailId: 'email-1',
        action: 'quarantine',
        playerId: PLAYER_1_ID,
        role: 'triage_lead',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Co-op system is disabled');
    });

    it('should fail when session not found', async () => {
      setupMockDb(mockDb, null);

      const result = await service.submitProposal(TENANT_ID, SESSION_ID, PLAYER_1_ID, {
        emailId: 'email-1',
        action: 'quarantine',
        playerId: PLAYER_1_ID,
        role: 'triage_lead',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Co-op session not found');
    });

    it('should fail when session is not active', async () => {
      const mockSession = createMockCoopSession({ status: 'lobby' });
      setupMockDb(mockDb, mockSession);

      const result = await service.submitProposal(TENANT_ID, SESSION_ID, PLAYER_1_ID, {
        emailId: 'email-1',
        action: 'quarantine',
        playerId: PLAYER_1_ID,
        role: 'triage_lead',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Can only submit proposals in active session');
    });

    it('should fail when player is not assigned to session', async () => {
      const mockSession = createMockCoopSession({ status: 'active' });
      setupMockDb(mockDb, mockSession, []);

      const result = await service.submitProposal(TENANT_ID, SESSION_ID, PLAYER_1_ID, {
        emailId: 'email-1',
        action: 'quarantine',
        playerId: PLAYER_1_ID,
        role: 'triage_lead',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Player is not part of this co-op session');
    });

    it('should fail when permission denied', async () => {
      const mockSession = createMockCoopSession({
        status: 'active',
        authorityPlayerId: PLAYER_2_ID,
      });
      setupMockDb(mockDb, mockSession, [
        createMockRoleAssignment({ playerId: PLAYER_1_ID, role: 'triage_lead' }),
      ]);

      const result = await service.submitProposal(
        TENANT_ID,
        SESSION_ID,
        PLAYER_1_ID,
        {
          emailId: 'email-1',
          action: 'quarantine',
          playerId: PLAYER_1_ID,
          role: 'triage_lead',
        },
        'PHASE_VERIFICATION',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot perform');
    });

    it('should successfully submit proposal', async () => {
      const mockSession = createMockCoopSession({
        status: 'active',
        authorityPlayerId: PLAYER_2_ID,
      });
      setupMockDb(mockDb, mockSession, [
        createMockRoleAssignment({ playerId: PLAYER_1_ID, role: 'triage_lead' }),
      ]);

      const mockProposal = {
        proposalId: 'proposal-1',
        sessionId: SESSION_ID,
        playerId: PLAYER_1_ID,
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

      const result = await service.submitProposal(
        TENANT_ID,
        SESSION_ID,
        PLAYER_1_ID,
        {
          emailId: 'email-1',
          action: 'quarantine',
          playerId: PLAYER_1_ID,
          role: 'triage_lead',
        },
        'PHASE_EMAIL_INTAKE',
      );

      expect(result.success).toBe(true);
      expect(deleteCachedCoopSession).toHaveBeenCalledWith(mockConfig, TENANT_ID, SESSION_ID);
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should fail when proposal creation returns empty', async () => {
      const mockSession = createMockCoopSession({
        status: 'active',
        authorityPlayerId: PLAYER_2_ID,
      });
      setupMockDb(mockDb, mockSession, [
        createMockRoleAssignment({ playerId: PLAYER_1_ID, role: 'triage_lead' }),
      ]);

      (mockDb.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.submitProposal(
        TENANT_ID,
        SESSION_ID,
        PLAYER_1_ID,
        {
          emailId: 'email-1',
          action: 'quarantine',
          playerId: PLAYER_1_ID,
          role: 'triage_lead',
        },
        'PHASE_EMAIL_INTAKE',
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to submit proposal');
    });
  });
});

describe('coop session service - phase-based permission enforcement', () => {
  const DAY_PHASES = {
    PHASE_DAY_START: 'PHASE_DAY_START',
    PHASE_EMAIL_INTAKE: 'PHASE_EMAIL_INTAKE',
    PHASE_TRIAGE: 'PHASE_TRIAGE',
    PHASE_VERIFICATION: 'PHASE_VERIFICATION',
    PHASE_DECISION: 'PHASE_DECISION',
    PHASE_CONSEQUENCES: 'PHASE_CONSEQUENCES',
    PHASE_THREAT_PROCESSING: 'PHASE_THREAT_PROCESSING',
    PHASE_INCIDENT_RESPONSE: 'PHASE_INCIDENT_RESPONSE',
    PHASE_RANSOM: 'PHASE_RANSOM',
    PHASE_RECOVERY: 'PHASE_RECOVERY',
    PHASE_RESOURCE_MANAGEMENT: 'PHASE_RESOURCE_MANAGEMENT',
    PHASE_UPGRADE: 'PHASE_UPGRADE',
    PHASE_DAY_END: 'PHASE_DAY_END',
  } as const;

  describe('submitProposal permission - triage_lead', () => {
    const triageLeadRole = 'triage_lead';
    const triageLeadId = 'triage-lead-player';
    const authorityPlayerId = 'authority-player';

    it('triage_lead CAN submit proposal (email.propose_decision) during PHASE_EMAIL_INTAKE', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        triageLeadRole,
        DAY_PHASES.PHASE_EMAIL_INTAKE,
        'email.propose_decision',
      );
      expect(result).toBe(true);
    });

    it('triage_lead CAN submit proposal (email.propose_decision) during PHASE_TRIAGE', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        triageLeadRole,
        DAY_PHASES.PHASE_TRIAGE,
        'email.propose_decision',
      );
      expect(result).toBe(true);
    });

    it('triage_lead CANNOT submit proposal during PHASE_VERIFICATION', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        triageLeadRole,
        DAY_PHASES.PHASE_VERIFICATION,
        'email.propose_decision',
      );
      expect(result).toBe(false);
    });

    it('triage_lead CANNOT submit proposal during PHASE_DECISION', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        triageLeadRole,
        DAY_PHASES.PHASE_DECISION,
        'email.propose_decision',
      );
      expect(result).toBe(false);
    });

    it('triage_lead submitProposal checkPermission succeeds in EMAIL_INTAKE phase', () => {
      expect(() =>
        checkPermission({
          action: 'email.propose_decision',
          actorRole: triageLeadRole as 'triage_lead',
          actorId: triageLeadId,
          authorityPlayerId,
          phase: DAY_PHASES.PHASE_EMAIL_INTAKE,
          matrix: DEFAULT_PERMISSION_MATRIX,
        }),
      ).not.toThrow();
    });

    it('triage_lead submitProposal checkPermission fails in VERIFICATION phase', () => {
      expect(() =>
        checkPermission({
          action: 'email.propose_decision',
          actorRole: triageLeadRole as 'triage_lead',
          actorId: triageLeadId,
          authorityPlayerId,
          phase: DAY_PHASES.PHASE_VERIFICATION,
          matrix: DEFAULT_PERMISSION_MATRIX,
        }),
      ).toThrow(PermissionDeniedError);
    });
  });

  describe('submitProposal permission - verification_lead', () => {
    const verificationLeadRole = 'verification_lead';
    const verificationLeadId = 'verification-lead-player';
    const nonAuthorityPlayerId = 'other-player';

    it('verification_lead CANNOT submit proposal (email.propose_decision) during PHASE_EMAIL_INTAKE', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        verificationLeadRole,
        DAY_PHASES.PHASE_EMAIL_INTAKE,
        'email.propose_decision',
      );
      expect(result).toBe(false);
    });

    it('verification_lead CANNOT submit proposal during PHASE_TRIAGE', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        verificationLeadRole,
        DAY_PHASES.PHASE_TRIAGE,
        'email.propose_decision',
      );
      expect(result).toBe(false);
    });

    it('verification_lead CANNOT submit email proposal during PHASE_VERIFICATION (they have verification.propose_decision instead)', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        verificationLeadRole,
        DAY_PHASES.PHASE_VERIFICATION,
        'email.propose_decision',
      );
      expect(result).toBe(false);
    });

    it('verification_lead CAN submit verification.propose_decision during PHASE_VERIFICATION', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        verificationLeadRole,
        DAY_PHASES.PHASE_VERIFICATION,
        'verification.propose_decision',
      );
      expect(result).toBe(true);
    });

    it('verification_lead CANNOT submit proposal during PHASE_DECISION', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        verificationLeadRole,
        DAY_PHASES.PHASE_DECISION,
        'email.propose_decision',
      );
      expect(result).toBe(false);
    });

    it('verification_lead submitProposal checkPermission fails in EMAIL_INTAKE phase', () => {
      expect(() =>
        checkPermission({
          action: 'email.propose_decision',
          actorRole: verificationLeadRole as 'verification_lead',
          actorId: verificationLeadId,
          authorityPlayerId: nonAuthorityPlayerId,
          phase: DAY_PHASES.PHASE_EMAIL_INTAKE,
          matrix: DEFAULT_PERMISSION_MATRIX,
        }),
      ).toThrow(PermissionDeniedError);
    });

    it('verification_lead submitProposal checkPermission fails in VERIFICATION phase (email.propose_decision not available)', () => {
      expect(() =>
        checkPermission({
          action: 'email.propose_decision',
          actorRole: verificationLeadRole as 'verification_lead',
          actorId: verificationLeadId,
          authorityPlayerId: nonAuthorityPlayerId,
          phase: DAY_PHASES.PHASE_VERIFICATION,
          matrix: DEFAULT_PERMISSION_MATRIX,
        }),
      ).toThrow(PermissionDeniedError);
    });
  });

  describe('authorityConfirm and authorityOverride permission - action.confirm and action.override', () => {
    const triageLeadRole = 'triage_lead';
    const verificationLeadRole = 'verification_lead';
    const authorityPlayerId = 'authority-player';
    const nonAuthorityPlayerId = 'non-authority-player';

    it('action.confirm returns Authority for triage_lead in DECISION phase', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        triageLeadRole,
        DAY_PHASES.PHASE_DECISION,
        'action.confirm',
      );
      expect(result).toBe('Authority');
    });

    it('action.confirm returns Authority for verification_lead in DECISION phase', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        verificationLeadRole,
        DAY_PHASES.PHASE_DECISION,
        'action.confirm',
      );
      expect(result).toBe('Authority');
    });

    it('action.confirm returns false for triage_lead in EMAIL_INTAKE phase', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        triageLeadRole,
        DAY_PHASES.PHASE_EMAIL_INTAKE,
        'action.confirm',
      );
      expect(result).toBe(false);
    });

    it('action.confirm returns false for verification_lead in VERIFICATION phase', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        verificationLeadRole,
        DAY_PHASES.PHASE_VERIFICATION,
        'action.confirm',
      );
      expect(result).toBe(false);
    });

    it('authority player CAN confirm (has authority and is in DECISION phase)', () => {
      expect(() =>
        checkPermission({
          action: 'action.confirm',
          actorRole: triageLeadRole as 'triage_lead',
          actorId: authorityPlayerId,
          authorityPlayerId,
          phase: DAY_PHASES.PHASE_DECISION,
          matrix: DEFAULT_PERMISSION_MATRIX,
        }),
      ).not.toThrow();
    });

    it('non-authority player CANNOT confirm even in DECISION phase', () => {
      expect(() =>
        checkPermission({
          action: 'action.confirm',
          actorRole: triageLeadRole as 'triage_lead',
          actorId: nonAuthorityPlayerId,
          authorityPlayerId,
          phase: DAY_PHASES.PHASE_DECISION,
          matrix: DEFAULT_PERMISSION_MATRIX,
        }),
      ).toThrow(PermissionDeniedError);
    });

    it('authority player CAN override (has authority and is in DECISION phase)', () => {
      expect(() =>
        checkPermission({
          action: 'action.override',
          actorRole: triageLeadRole as 'triage_lead',
          actorId: authorityPlayerId,
          authorityPlayerId,
          phase: DAY_PHASES.PHASE_DECISION,
          matrix: DEFAULT_PERMISSION_MATRIX,
        }),
      ).not.toThrow();
    });

    it('non-authority player CANNOT override even in DECISION phase', () => {
      expect(() =>
        checkPermission({
          action: 'action.override',
          actorRole: triageLeadRole as 'triage_lead',
          actorId: nonAuthorityPlayerId,
          authorityPlayerId,
          phase: DAY_PHASES.PHASE_DECISION,
          matrix: DEFAULT_PERMISSION_MATRIX,
        }),
      ).toThrow(PermissionDeniedError);
    });

    it('non-authority player CANNOT override with AUTHORITY_REQUIRED reason', () => {
      try {
        checkPermission({
          action: 'action.override',
          actorRole: triageLeadRole as 'triage_lead',
          actorId: nonAuthorityPlayerId,
          authorityPlayerId,
          phase: DAY_PHASES.PHASE_DECISION,
          matrix: DEFAULT_PERMISSION_MATRIX,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(PermissionDeniedError);
        expect((error as PermissionDeniedError).reason).toBe('AUTHORITY_REQUIRED');
      }
    });
  });

  describe('phase-specific role permissions matrix verification', () => {
    it('triage_lead has correct permissions in each phase', () => {
      const emailIntakePerms = getRolePermissionsForPhase(
        DEFAULT_PERMISSION_MATRIX,
        'triage_lead',
        DAY_PHASES.PHASE_EMAIL_INTAKE,
      );
      expect(emailIntakePerms).toContain('view.inbox');
      expect(emailIntakePerms).toContain('email.mark_indicator');
      expect(emailIntakePerms).toContain('email.propose_decision');
      expect(emailIntakePerms).toContain('verification.request');

      const triagePerms = getRolePermissionsForPhase(
        DEFAULT_PERMISSION_MATRIX,
        'triage_lead',
        DAY_PHASES.PHASE_TRIAGE,
      );
      expect(triagePerms).toContain('email.propose_decision');

      const verificationPerms = getRolePermissionsForPhase(
        DEFAULT_PERMISSION_MATRIX,
        'triage_lead',
        DAY_PHASES.PHASE_VERIFICATION,
      );
      expect(verificationPerms).toHaveLength(0);

      const decisionPerms = getRolePermissionsForPhase(
        DEFAULT_PERMISSION_MATRIX,
        'triage_lead',
        DAY_PHASES.PHASE_DECISION,
      );
      expect(decisionPerms).toContain('action.confirm');
      expect(decisionPerms).toContain('action.override');
    });

    it('verification_lead has correct permissions in each phase', () => {
      const emailIntakePerms = getRolePermissionsForPhase(
        DEFAULT_PERMISSION_MATRIX,
        'verification_lead',
        DAY_PHASES.PHASE_EMAIL_INTAKE,
      );
      expect(emailIntakePerms).toHaveLength(0);

      const triagePerms = getRolePermissionsForPhase(
        DEFAULT_PERMISSION_MATRIX,
        'verification_lead',
        DAY_PHASES.PHASE_TRIAGE,
      );
      expect(triagePerms).toHaveLength(0);

      const verificationPerms = getRolePermissionsForPhase(
        DEFAULT_PERMISSION_MATRIX,
        'verification_lead',
        DAY_PHASES.PHASE_VERIFICATION,
      );
      expect(verificationPerms).toContain('view.verification_packet');
      expect(verificationPerms).toContain('verification.mark_inconsistency');
      expect(verificationPerms).toContain('verification.propose_decision');

      const decisionPerms = getRolePermissionsForPhase(
        DEFAULT_PERMISSION_MATRIX,
        'verification_lead',
        DAY_PHASES.PHASE_DECISION,
      );
      expect(decisionPerms).toContain('action.confirm');
      expect(decisionPerms).toContain('action.override');
    });
  });
});
