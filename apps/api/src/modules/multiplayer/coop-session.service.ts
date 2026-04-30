/* eslint-disable max-lines */
import { DAY_PHASES, type DayPhase } from '@the-dmz/shared/game';

import { evaluateFlag } from '../feature-flags/index.js';
import {
  coopSessionStatuses,
  type CoopRole,
  type CoopSession,
  type CoopSessionStatus,
} from '../../db/schema/multiplayer/index.js';

import {
  CoopSessionRepository,
  type CoopSessionWithRoles,
  type CoopRoleAssignmentResult,
} from './coop-session.repository.js';
import { CoopSessionCacheService, toCacheData } from './coop-session.cache-service.js';
import { CoopSessionEventEmitter, type SessionData } from './coop-session-event-emitter.js';
import {
  PermissionDeniedError,
  checkPermission,
  createDefaultRoleConfig,
  getSessionRoleConfig,
  type PermissionMatrixConfig,
} from './permissions/index.js';

import type { EventBus } from '../../shared/events/event-types.js';
import type { DatabaseClient } from '../../shared/database/connection.js';
import type { AppConfig } from '../../config.js';

const STATUS_LOBBY = coopSessionStatuses[0];
const STATUS_ACTIVE = coopSessionStatuses[1];
const STATUS_COMPLETED = coopSessionStatuses[3];
const STATUS_ABANDONED = coopSessionStatuses[4];

export interface CoopSessionResult {
  success: boolean;
  session?: CoopSessionWithRoles;
  error?: string;
}

export interface CreateCoopSessionInput {
  partyId: string;
  seed: string;
}

export interface AssignRolesInput {
  player1Id: string;
  player2Id: string;
}

export interface StartCoopSessionInput {
  scenarioId: string;
  difficultyTier: string;
}

export interface SubmitRolePreferenceInput {
  playerId: string;
  preference: 'triage_lead' | 'verification_lead' | 'no_preference';
}

export interface SubmitProposalInput {
  playerId: string;
  role: CoopRole;
  emailId: string;
  action: string;
}

export interface AuthorityActionInput {
  proposalId: string;
  action: 'confirm' | 'override';
  rationale?: string | undefined;
  conflictReason?: string | undefined;
}

interface ValidateAuthorityActionOptions {
  tenantId: string;
  sessionId: string;
  playerId: string;
  permissionAction: string;
  currentPhase: DayPhase;
  requiredStatus?: CoopSessionStatus;
}

export class CoopSessionService {
  private readonly repository: CoopSessionRepository;
  private readonly cache: CoopSessionCacheService;
  private readonly events: CoopSessionEventEmitter;
  private readonly config: AppConfig;

  public constructor(
    config: AppConfig,
    repository: CoopSessionRepository,
    cache: CoopSessionCacheService,
    eventBus: EventBus | null,
  ) {
    this.config = config;
    this.repository = repository;
    this.cache = cache;
    this.events = new CoopSessionEventEmitter(eventBus);
  }

  private async checkCoopEnabled(tenantId: string): Promise<boolean> {
    return evaluateFlag(this.config, tenantId, 'multiplayer.coop_enabled');
  }

  private async getSessionWithRoles(
    tenantId: string,
    sessionId: string,
  ): Promise<CoopSessionWithRoles | null> {
    return this.repository.findSessionWithRoles({ tenantId, sessionId });
  }

  private async cacheSession(tenantId: string, session: CoopSessionWithRoles): Promise<void> {
    const cacheData = toCacheData(session.sessionId, tenantId, session);
    await this.cache.set(session.sessionId, tenantId, cacheData);
  }

  private async invalidateSessionCache(tenantId: string, sessionId: string): Promise<void> {
    await this.cache.invalidate(sessionId, tenantId);
  }

  private toSessionData(session: CoopSessionWithRoles): SessionData {
    return {
      sessionId: session.sessionId,
      partyId: session.partyId,
      authorityPlayerId: session.authorityPlayerId,
      seed: session.seed,
      dayNumber: session.dayNumber,
      status: session.status as CoopSessionStatus,
      roles: session.roles,
    };
  }

  /* eslint-disable max-params, @typescript-eslint/max-params, max-statements */
  private async validateAuthorityAction(
    options: ValidateAuthorityActionOptions,
  ): Promise<
    | { session: CoopSession; roleAssignment: CoopRoleAssignmentResult }
    | { success: false; error: string }
  > {
    const { tenantId, sessionId, playerId, permissionAction, currentPhase, requiredStatus } =
      options;
    const coopEnabled = await this.checkCoopEnabled(tenantId);
    if (!coopEnabled) {
      return { success: false, error: 'Co-op system is disabled' };
    }

    const session = await this.repository.findSession({ tenantId, sessionId });
    if (!session) {
      return { success: false, error: 'Co-op session not found' };
    }

    if (requiredStatus !== undefined && session.status !== requiredStatus) {
      return { success: false, error: 'Can only submit proposals in active session' };
    }

    const roleAssignment = await this.repository.findRoleAssignmentByPlayer(sessionId, playerId);
    if (!roleAssignment) {
      return { success: false, error: 'Player is not part of this co-op session' };
    }

    const roleConfigResult = await getSessionRoleConfig(this.config, tenantId, sessionId);
    const matrix: PermissionMatrixConfig = roleConfigResult.config ?? createDefaultRoleConfig();

    try {
      checkPermission({
        action: permissionAction,
        actorRole: roleAssignment.role,
        actorId: playerId,
        authorityPlayerId: session.authorityPlayerId,
        phase: currentPhase,
        matrix,
      });
    } catch (error) {
      if (error instanceof PermissionDeniedError) {
        this.events.emitPermissionDenied(
          tenantId,
          playerId,
          roleAssignment.role,
          permissionAction,
          currentPhase,
          error.reason,
          sessionId,
        );
        return { success: false, error: error.message };
      }
      throw error;
    }

    return { session, roleAssignment };
  }

  public async createSession(
    tenantId: string,
    leaderId: string,
    input: CreateCoopSessionInput,
  ): Promise<CoopSessionResult> {
    const coopEnabled = await this.checkCoopEnabled(tenantId);
    if (!coopEnabled) {
      return { success: false, error: 'Co-op system is disabled' };
    }

    const existingSession = await this.repository.findSessionByParty({
      tenantId,
      partyId: input.partyId,
    });
    if (existingSession) {
      return { success: false, error: 'Co-op session already exists for this party' };
    }

    const newSession = await this.repository.createSession({
      tenantId,
      partyId: input.partyId,
      seed: input.seed,
      leaderId,
    });
    if (!newSession) {
      return { success: false, error: 'Failed to create co-op session' };
    }

    const leaderProfile = await this.repository.findPlayerProfile({
      profileId: leaderId,
      tenantId,
    });

    if (leaderProfile) {
      const gameSession = await this.repository.createGameSession({
        tenantId,
        userId: leaderProfile.userId,
        seed: input.seed,
      });

      if (gameSession) {
        await this.repository.updateSession({
          sessionId: newSession.sessionId,
          updates: { gameSessionId: gameSession.id },
        });
      }
    }

    await this.repository.updatePartyStatus(input.partyId, tenantId, 'in_session');

    const sessionWithRoles = await this.getSessionWithRoles(tenantId, newSession.sessionId);
    if (!sessionWithRoles) {
      return { success: false, error: 'Failed to retrieve co-op session' };
    }

    await this.cacheSession(tenantId, sessionWithRoles);
    this.events.emitSessionCreated(tenantId, leaderId, this.toSessionData(sessionWithRoles));

    return { success: true, session: sessionWithRoles };
  }

  public async getSession(tenantId: string, sessionId: string): Promise<CoopSessionResult> {
    const cached = await this.cache.get(sessionId, tenantId);
    if (cached) {
      const sessionWithRoles: CoopSessionWithRoles = {
        sessionId: cached.sessionId,
        tenantId: cached.tenantId,
        partyId: cached.partyId,
        seed: cached.seed,
        status: cached.status,
        authorityPlayerId: cached.authorityPlayerId,
        dayNumber: cached.dayNumber,
        gameSessionId: null,
        sessionSeq: 0,
        lastSnapshotSeq: 0,
        lastSnapshotAt: null,
        createdAt: new Date(cached.updatedAt),
        completedAt: null,
        roleConfig: null,
        scenarioId: null,
        difficultyTier: null,
        roles: cached.roles.map((r) => ({
          assignmentId: r.assignmentId,
          playerId: r.playerId,
          role: r.role,
          isAuthority: r.isAuthority,
          assignedAt: new Date(),
        })),
      };
      return { success: true, session: sessionWithRoles };
    }

    const sessionWithRoles = await this.getSessionWithRoles(tenantId, sessionId);
    if (!sessionWithRoles) {
      return { success: false, error: 'Co-op session not found' };
    }

    await this.cacheSession(tenantId, sessionWithRoles);
    return { success: true, session: sessionWithRoles };
  }

  public async assignRoles(
    tenantId: string,
    sessionId: string,
    _playerId: string,
    input: AssignRolesInput,
  ): Promise<CoopSessionResult> {
    const coopEnabled = await this.checkCoopEnabled(tenantId);
    if (!coopEnabled) {
      return { success: false, error: 'Co-op system is disabled' };
    }

    const session = await this.repository.findSession({ tenantId, sessionId });
    if (!session) {
      return { success: false, error: 'Co-op session not found' };
    }

    if (session.status !== STATUS_LOBBY) {
      return { success: false, error: 'Can only assign roles in lobby status' };
    }

    await this.repository.deleteRoleAssignments(sessionId);

    const isPlayer1Authority = session.authorityPlayerId === input.player1Id;

    await this.repository.createRoleAssignments([
      {
        sessionId,
        playerId: input.player1Id,
        role: 'triage_lead',
        isAuthority: isPlayer1Authority,
      },
      {
        sessionId,
        playerId: input.player2Id,
        role: 'verification_lead',
        isAuthority: !isPlayer1Authority,
      },
    ]);

    await this.repository.updateSession({
      sessionId,
      updates: { status: STATUS_ACTIVE },
    });

    const sessionWithRoles = await this.getSessionWithRoles(tenantId, sessionId);
    if (!sessionWithRoles) {
      return { success: false, error: 'Failed to retrieve co-op session' };
    }

    await this.cacheSession(tenantId, sessionWithRoles);
    this.events.emitRoleAssigned(tenantId, input.player1Id, this.toSessionData(sessionWithRoles));

    return { success: true, session: sessionWithRoles };
  }

  public async startSession(
    tenantId: string,
    sessionId: string,
    playerId: string,
    input: StartCoopSessionInput,
  ): Promise<CoopSessionResult> {
    const coopEnabled = await this.checkCoopEnabled(tenantId);
    if (!coopEnabled) {
      return { success: false, error: 'Co-op system is disabled' };
    }

    const session = await this.repository.findSession({ tenantId, sessionId });
    if (!session) {
      return { success: false, error: 'Co-op session not found' };
    }

    if (session.status !== STATUS_LOBBY) {
      return { success: false, error: 'Can only start a session that is in lobby status' };
    }

    if (session.authorityPlayerId !== playerId) {
      return { success: false, error: 'Only the session authority can start the session' };
    }

    await this.repository.updateSession({
      sessionId,
      updates: {
        scenarioId: input.scenarioId,
        difficultyTier: input.difficultyTier,
        status: STATUS_ACTIVE,
      },
    });

    const sessionWithRoles = await this.getSessionWithRoles(tenantId, sessionId);
    if (!sessionWithRoles) {
      return { success: false, error: 'Failed to retrieve co-op session' };
    }

    await this.cacheSession(tenantId, sessionWithRoles);
    this.events.emitSessionStarted(
      tenantId,
      playerId,
      this.toSessionData(sessionWithRoles),
      input.scenarioId,
      input.difficultyTier,
    );

    return { success: true, session: sessionWithRoles };
  }

  public async submitRolePreference(
    tenantId: string,
    sessionId: string,
    input: SubmitRolePreferenceInput,
  ): Promise<CoopSessionResult> {
    const coopEnabled = await this.checkCoopEnabled(tenantId);
    if (!coopEnabled) {
      return { success: false, error: 'Co-op system is disabled' };
    }

    const session = await this.repository.findSession({ tenantId, sessionId });
    if (!session) {
      return { success: false, error: 'Co-op session not found' };
    }

    if (session.status !== STATUS_LOBBY) {
      return { success: false, error: 'Can only submit role preference in lobby status' };
    }

    const assignment = await this.repository.findRoleAssignmentByPlayer(sessionId, input.playerId);
    if (!assignment) {
      return { success: false, error: 'Player is not assigned to this session' };
    }

    await this.repository.updateRoleAssignment({
      assignmentId: assignment.assignmentId,
      updates: { rolePreference: input.preference },
    });

    const sessionWithRoles = await this.getSessionWithRoles(tenantId, sessionId);
    if (!sessionWithRoles) {
      return { success: false, error: 'Failed to retrieve co-op session' };
    }

    await this.cacheSession(tenantId, sessionWithRoles);
    return { success: true, session: sessionWithRoles };
  }

  public async rotateAuthority(
    tenantId: string,
    sessionId: string,
    playerId: string,
  ): Promise<CoopSessionResult> {
    const coopEnabled = await this.checkCoopEnabled(tenantId);
    if (!coopEnabled) {
      return { success: false, error: 'Co-op system is disabled' };
    }

    const session = await this.repository.findSession({ tenantId, sessionId });
    if (!session) {
      return { success: false, error: 'Co-op session not found' };
    }

    if (session.authorityPlayerId !== playerId) {
      return { success: false, error: 'Only the current authority can transfer authority' };
    }

    const roles = await this.repository.findRoleAssignments({ sessionId });
    const otherRole = roles.find((r) => r.playerId !== playerId);
    if (!otherRole) {
      return { success: false, error: 'No other player to transfer authority to' };
    }

    const previousAuthorityId = session.authorityPlayerId;

    await this.repository.clearAuthorityFlags(sessionId);

    await this.repository.updateRoleAssignment({
      assignmentId: otherRole.assignmentId,
      updates: { isAuthority: true },
    });

    await this.repository.updateSession({
      sessionId,
      updates: { authorityPlayerId: otherRole.playerId },
    });

    const sessionWithRoles = await this.getSessionWithRoles(tenantId, sessionId);
    if (!sessionWithRoles) {
      return { success: false, error: 'Failed to retrieve co-op session' };
    }

    await this.cacheSession(tenantId, sessionWithRoles);
    this.events.emitAuthorityTransferred(
      tenantId,
      playerId,
      this.toSessionData(sessionWithRoles),
      previousAuthorityId,
    );

    return { success: true, session: sessionWithRoles };
  }

  public async submitProposal(
    tenantId: string,
    sessionId: string,
    playerId: string,
    input: SubmitProposalInput,
    currentPhase: DayPhase = DAY_PHASES.PHASE_EMAIL_INTAKE,
  ): Promise<CoopSessionResult> {
    const validation = await this.validateAuthorityAction({
      tenantId,
      sessionId,
      playerId,
      permissionAction: 'email.propose_decision',
      currentPhase,
      requiredStatus: STATUS_ACTIVE,
    });

    if (!('session' in validation)) {
      return validation;
    }

    const { roleAssignment } = validation;

    const proposal = await this.repository.createProposal({
      sessionId,
      playerId,
      role: roleAssignment.role,
      emailId: input.emailId,
      action: input.action,
    });

    if (!proposal) {
      return { success: false, error: 'Failed to submit proposal' };
    }

    await this.invalidateSessionCache(tenantId, sessionId);

    this.events.emitProposalSubmitted(
      tenantId,
      playerId,
      sessionId,
      proposal.proposalId,
      playerId,
      roleAssignment.role,
      input.emailId,
      input.action,
    );

    return this.getSession(tenantId, sessionId);
  }

  public async authorityConfirm(
    tenantId: string,
    sessionId: string,
    playerId: string,
    input: AuthorityActionInput,
    currentPhase: DayPhase = DAY_PHASES.PHASE_DECISION,
  ): Promise<CoopSessionResult> {
    const validation = await this.validateAuthorityAction({
      tenantId,
      sessionId,
      playerId,
      permissionAction: 'action.confirm',
      currentPhase,
    });

    if (!('session' in validation)) {
      return validation;
    }

    const { session } = validation;

    if (session.authorityPlayerId !== playerId) {
      return { success: false, error: 'Only the authority can confirm proposals' };
    }

    const proposal = await this.repository.findProposal({
      proposalId: input.proposalId,
      sessionId,
    });
    if (!proposal) {
      return { success: false, error: 'Proposal not found' };
    }

    if (proposal.playerId === playerId) {
      return { success: false, error: 'Authority cannot finalize own proposal' };
    }

    if (proposal.status !== 'proposed') {
      return { success: false, error: 'Proposal is not in proposed status' };
    }

    await this.repository.updateProposal({
      proposalId: input.proposalId,
      updates: {
        status: 'confirmed',
        authorityAction: 'confirm',
        resolvedAt: new Date(),
      },
    });

    await this.invalidateSessionCache(tenantId, sessionId);

    this.events.emitProposalConfirmed(
      tenantId,
      playerId,
      sessionId,
      input.proposalId,
      proposal.playerId,
      playerId,
      proposal.action,
    );

    return this.getSession(tenantId, sessionId);
  }

  public async authorityOverride(
    tenantId: string,
    sessionId: string,
    playerId: string,
    input: AuthorityActionInput,
    currentPhase: DayPhase = DAY_PHASES.PHASE_DECISION,
  ): Promise<CoopSessionResult> {
    const validation = await this.validateAuthorityAction({
      tenantId,
      sessionId,
      playerId,
      permissionAction: 'action.override',
      currentPhase,
    });

    if (!('session' in validation)) {
      return validation;
    }

    const { session } = validation;

    if (session.authorityPlayerId !== playerId) {
      return { success: false, error: 'Only the authority can override proposals' };
    }

    const proposal = await this.repository.findProposal({
      proposalId: input.proposalId,
      sessionId,
    });
    if (!proposal) {
      return { success: false, error: 'Proposal not found' };
    }

    if (proposal.playerId === playerId) {
      return { success: false, error: 'Authority cannot override own proposal' };
    }

    if (proposal.status !== 'proposed') {
      return { success: false, error: 'Proposal is not in proposed status' };
    }

    await this.repository.updateProposal({
      proposalId: input.proposalId,
      updates: {
        status: 'overridden',
        authorityAction: 'override',
        conflictFlag: true,
        conflictReason: input.conflictReason ?? null,
        rationale: input.rationale ?? null,
      },
    });

    await this.invalidateSessionCache(tenantId, sessionId);

    this.events.emitProposalOverridden(
      tenantId,
      playerId,
      sessionId,
      input.proposalId,
      proposal.playerId,
      playerId,
      input.conflictReason,
    );

    return this.getSession(tenantId, sessionId);
  }

  public async advanceDay(
    tenantId: string,
    sessionId: string,
    playerId: string,
  ): Promise<CoopSessionResult> {
    const coopEnabled = await this.checkCoopEnabled(tenantId);
    if (!coopEnabled) {
      return { success: false, error: 'Co-op system is disabled' };
    }

    const session = await this.repository.findSession({ tenantId, sessionId });
    if (!session) {
      return { success: false, error: 'Co-op session not found' };
    }

    if (session.authorityPlayerId !== playerId) {
      return { success: false, error: 'Only the authority can advance the day' };
    }

    if (session.status !== STATUS_ACTIVE) {
      return { success: false, error: 'Can only advance day in active session' };
    }

    const roles = await this.repository.findRoleAssignments({ sessionId });
    const otherRole = roles.find((r) => r.playerId !== playerId);

    const previousAuthorityId = session.authorityPlayerId;

    await this.repository.clearAuthorityFlags(sessionId);

    if (otherRole) {
      await this.repository.updateRoleAssignment({
        assignmentId: otherRole.assignmentId,
        updates: { isAuthority: true },
      });
    }

    await this.repository.updateSession({
      sessionId,
      updates: {
        dayNumber: session.dayNumber + 1,
        authorityPlayerId: otherRole?.playerId ?? session.authorityPlayerId,
      },
    });

    const sessionWithRoles = await this.getSessionWithRoles(tenantId, sessionId);
    if (!sessionWithRoles) {
      return { success: false, error: 'Failed to retrieve co-op session' };
    }

    await this.cacheSession(tenantId, sessionWithRoles);
    this.events.emitDayAdvanced(
      tenantId,
      playerId,
      this.toSessionData(sessionWithRoles),
      previousAuthorityId,
    );

    return { success: true, session: sessionWithRoles };
  }

  public async endSession(
    tenantId: string,
    sessionId: string,
    playerId: string,
  ): Promise<CoopSessionResult> {
    const coopEnabled = await this.checkCoopEnabled(tenantId);
    if (!coopEnabled) {
      return { success: false, error: 'Co-op system is disabled' };
    }

    const session = await this.repository.findSession({ tenantId, sessionId });
    if (!session) {
      return { success: false, error: 'Co-op session not found' };
    }

    if (session.authorityPlayerId !== playerId) {
      return { success: false, error: 'Only the authority can end the session' };
    }

    if (session.status === STATUS_COMPLETED || session.status === STATUS_ABANDONED) {
      return { success: false, error: 'Session is already terminated' };
    }

    await this.repository.updateSession({
      sessionId,
      updates: { status: STATUS_COMPLETED, completedAt: new Date() },
    });

    const sessionWithRoles = await this.getSessionWithRoles(tenantId, sessionId);
    if (!sessionWithRoles) {
      return { success: false, error: 'Failed to retrieve co-op session' };
    }

    await this.invalidateSessionCache(tenantId, sessionId);
    this.events.emitSessionEnded(
      tenantId,
      playerId,
      this.toSessionData(sessionWithRoles),
      STATUS_COMPLETED,
    );

    return { success: true, session: sessionWithRoles };
  }

  public async abandonSession(
    tenantId: string,
    sessionId: string,
    playerId: string,
  ): Promise<CoopSessionResult> {
    const coopEnabled = await this.checkCoopEnabled(tenantId);
    if (!coopEnabled) {
      return { success: false, error: 'Co-op system is disabled' };
    }

    const session = await this.repository.findSession({ tenantId, sessionId });
    if (!session) {
      return { success: false, error: 'Co-op session not found' };
    }

    const roleAssignment = await this.repository.findRoleAssignmentByPlayer(sessionId, playerId);
    if (!roleAssignment) {
      return { success: false, error: 'Player is not part of this co-op session' };
    }

    if (session.status === STATUS_COMPLETED || session.status === STATUS_ABANDONED) {
      return { success: false, error: 'Session is already terminated' };
    }

    await this.repository.updateSession({
      sessionId,
      updates: { status: STATUS_ABANDONED, completedAt: new Date() },
    });

    const sessionWithRoles = await this.getSessionWithRoles(tenantId, sessionId);
    if (!sessionWithRoles) {
      return { success: false, error: 'Failed to retrieve co-op session' };
    }

    await this.invalidateSessionCache(tenantId, sessionId);
    this.events.emitSessionEnded(
      tenantId,
      playerId,
      this.toSessionData(sessionWithRoles),
      STATUS_ABANDONED,
    );

    return { success: true, session: sessionWithRoles };
  }
}

export function createCoopSessionService(
  config: AppConfig,
  db: DatabaseClient,
  eventBus: EventBus | null,
): CoopSessionService {
  const repository = new CoopSessionRepository(db);
  const cache = new CoopSessionCacheService(config);
  return new CoopSessionService(config, repository, cache, eventBus);
}

export {
  CoopSessionRepository,
  type CoopSessionWithRoles,
  type CoopRoleAssignmentResult,
} from './coop-session.repository.js';
export { CoopSessionCacheService } from './coop-session.cache-service.js';
export { CoopSessionEventEmitter, type SessionData } from './coop-session-event-emitter.js';
