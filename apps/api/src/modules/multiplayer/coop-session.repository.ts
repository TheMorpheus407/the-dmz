import { eq, and, sql } from 'drizzle-orm';

import {
  coopSession,
  coopRoleAssignment,
  coopDecisionProposal,
  type CoopSession,
  type CoopRole,
  type RolePreference,
  type CoopDecisionProposal,
} from '../../db/schema/multiplayer/index.js';
import { party } from '../../db/schema/multiplayer/index.js';
import { playerProfiles } from '../../db/schema/social/player-profiles.js';
import { gameSessions } from '../../db/schema/game/game-sessions.js';

import type { DatabaseClient } from '../../shared/database/connection.js';

export interface CoopSessionWithRoles extends CoopSession {
  roles: CoopRoleAssignmentResult[];
}

export interface CoopRoleAssignmentResult {
  assignmentId: string;
  playerId: string;
  role: CoopRole;
  isAuthority: boolean;
  assignedAt: Date;
}

interface FindSessionParams {
  tenantId: string;
  sessionId: string;
}

interface FindSessionByPartyParams {
  tenantId: string;
  partyId: string;
}

interface FindRoleAssignmentParams {
  sessionId: string;
  playerId?: string;
  assignmentId?: string;
}

interface CreateSessionParams {
  tenantId: string;
  partyId: string;
  seed: string;
  leaderId: string;
}

interface UpdateSessionParams {
  sessionId: string;
  updates: Partial<{
    status: string;
    authorityPlayerId: string;
    dayNumber: number;
    scenarioId: string;
    difficultyTier: string;
    gameSessionId: string;
    completedAt: Date;
  }>;
}

interface CreateRoleAssignmentParams {
  sessionId: string;
  playerId: string;
  role: CoopRole;
  isAuthority: boolean;
}

interface UpdateRoleAssignmentParams {
  assignmentId: string;
  updates: Partial<{
    role: CoopRole;
    isAuthority: boolean;
    rolePreference: RolePreference;
  }>;
}

interface CreateProposalParams {
  sessionId: string;
  playerId: string;
  role: CoopRole;
  emailId: string;
  action: string;
}

interface UpdateProposalParams {
  proposalId: string;
  updates: Partial<{
    status: string;
    authorityAction: string;
    conflictFlag: boolean;
    conflictReason: string | null;
    rationale: string | null;
    resolvedAt: Date;
  }>;
}

export class CoopSessionRepository {
  private readonly db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.db = db;
  }

  public async findSession(params: FindSessionParams): Promise<CoopSession | undefined> {
    const session = await this.db.query.coopSession.findFirst({
      where: and(
        eq(coopSession.sessionId, params.sessionId),
        eq(coopSession.tenantId, params.tenantId),
      ),
    });
    return session ?? undefined;
  }

  public async findSessionByParty(
    params: FindSessionByPartyParams,
  ): Promise<CoopSession | undefined> {
    const session = await this.db.query.coopSession.findFirst({
      where: and(
        eq(coopSession.partyId, params.partyId),
        eq(coopSession.tenantId, params.tenantId),
      ),
    });
    return session;
  }

  public async findSessionWithRoles(
    params: FindSessionParams,
  ): Promise<CoopSessionWithRoles | null> {
    const sessionRow = await this.findSession(params);
    if (!sessionRow) {
      return null;
    }

    const roleRows = await this.findRoleAssignments({ sessionId: params.sessionId });

    const roles: CoopRoleAssignmentResult[] = roleRows.map((r) => ({
      assignmentId: r.assignmentId,
      playerId: r.playerId,
      role: r.role,
      isAuthority: r.isAuthority,
      assignedAt: r.assignedAt,
    }));

    return { ...sessionRow, roles };
  }

  public async createSession(params: CreateSessionParams): Promise<CoopSession | undefined> {
    const [newSession] = await this.db
      .insert(coopSession)
      .values({
        tenantId: params.tenantId,
        partyId: params.partyId,
        seed: params.seed,
        status: 'lobby',
        authorityPlayerId: params.leaderId,
        dayNumber: 1,
      })
      .returning();
    return newSession;
  }

  public async updateSession(params: UpdateSessionParams): Promise<CoopSession | undefined> {
    const [updatedSession] = await this.db
      .update(coopSession)
      .set(params.updates)
      .where(eq(coopSession.sessionId, params.sessionId))
      .returning();
    return updatedSession;
  }

  public async findRoleAssignments(params: {
    sessionId: string;
  }): Promise<CoopRoleAssignmentResult[]> {
    const roleRows = await this.db.query.coopRoleAssignment.findMany({
      where: eq(coopRoleAssignment.sessionId, params.sessionId),
    });

    return roleRows.map((r) => ({
      assignmentId: r.assignmentId,
      playerId: r.playerId,
      role: r.role as CoopRole,
      isAuthority: r.isAuthority,
      assignedAt: r.assignedAt,
    }));
  }

  public async findRoleAssignment(
    params: FindRoleAssignmentParams,
  ): Promise<CoopRoleAssignmentResult | undefined> {
    const conditions = [eq(coopRoleAssignment.sessionId, params.sessionId)];

    if (params.playerId) {
      conditions.push(eq(coopRoleAssignment.playerId, params.playerId));
    }
    if (params.assignmentId) {
      conditions.push(eq(coopRoleAssignment.assignmentId, params.assignmentId));
    }

    const roleRow = await this.db.query.coopRoleAssignment.findFirst({
      where: and(...conditions),
    });

    if (!roleRow) {
      return undefined;
    }

    return {
      assignmentId: roleRow.assignmentId,
      playerId: roleRow.playerId,
      role: roleRow.role as CoopRole,
      isAuthority: roleRow.isAuthority,
      assignedAt: roleRow.assignedAt,
    };
  }

  public async findRoleAssignmentByPlayer(
    sessionId: string,
    playerId: string,
  ): Promise<CoopRoleAssignmentResult | undefined> {
    return this.findRoleAssignment({ sessionId, playerId });
  }

  public async createRoleAssignments(
    params: CreateRoleAssignmentParams[],
  ): Promise<CoopRoleAssignmentResult[]> {
    if (params.length === 0) {
      return [];
    }

    const insertedRows = await this.db
      .insert(coopRoleAssignment)
      .values(
        params.map((p) => ({
          sessionId: p.sessionId,
          playerId: p.playerId,
          role: p.role,
          isAuthority: p.isAuthority,
        })),
      )
      .returning();

    if (!insertedRows || insertedRows.length === 0) {
      return [];
    }

    for (let i = 0; i < params.length; i++) {
      if (!insertedRows[i]?.assignmentId) {
        throw new Error(
          'Failed to retrieve assignment IDs from database insert — database may not support RETURNING clause',
        );
      }
    }

    return params.map((p, index) => ({
      assignmentId: insertedRows[index]!.assignmentId,
      playerId: p.playerId,
      role: p.role,
      isAuthority: p.isAuthority,
      assignedAt: new Date(),
    }));
  }

  public async updateRoleAssignment(
    params: UpdateRoleAssignmentParams,
  ): Promise<CoopRoleAssignmentResult | undefined> {
    const [updatedRow] = await this.db
      .update(coopRoleAssignment)
      .set(params.updates)
      .where(eq(coopRoleAssignment.assignmentId, params.assignmentId))
      .returning();

    if (!updatedRow) {
      return undefined;
    }

    return {
      assignmentId: updatedRow.assignmentId,
      playerId: updatedRow.playerId,
      role: updatedRow.role as CoopRole,
      isAuthority: updatedRow.isAuthority,
      assignedAt: updatedRow.assignedAt,
    };
  }

  public async deleteRoleAssignments(sessionId: string): Promise<void> {
    await this.db.delete(coopRoleAssignment).where(eq(coopRoleAssignment.sessionId, sessionId));
  }

  public async clearAuthorityFlags(sessionId: string): Promise<void> {
    await this.db
      .update(coopRoleAssignment)
      .set({ isAuthority: false })
      .where(
        and(eq(coopRoleAssignment.sessionId, sessionId), eq(coopRoleAssignment.isAuthority, true)),
      );
  }

  public async findProposal(params: {
    proposalId: string;
    sessionId: string;
  }): Promise<CoopDecisionProposal | undefined> {
    const proposal = await this.db.query.coopDecisionProposal.findFirst({
      where: and(
        eq(coopDecisionProposal.proposalId, params.proposalId),
        eq(coopDecisionProposal.sessionId, params.sessionId),
      ),
    });
    return proposal;
  }

  public async createProposal(
    params: CreateProposalParams,
  ): Promise<CoopDecisionProposal | undefined> {
    const [proposal] = await this.db
      .insert(coopDecisionProposal)
      .values({
        sessionId: params.sessionId,
        playerId: params.playerId,
        role: params.role,
        emailId: params.emailId,
        action: params.action,
        status: 'proposed',
        conflictFlag: false,
      })
      .returning();
    return proposal;
  }

  public async updateProposal(
    params: UpdateProposalParams,
  ): Promise<CoopDecisionProposal | undefined> {
    const [updatedProposal] = await this.db
      .update(coopDecisionProposal)
      .set(params.updates)
      .where(eq(coopDecisionProposal.proposalId, params.proposalId))
      .returning();
    return updatedProposal;
  }

  public async updatePartyStatus(partyId: string, tenantId: string, status: string): Promise<void> {
    await this.db
      .update(party)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(party.partyId, partyId), eq(party.tenantId, tenantId)));
  }

  public async findPlayerProfile(params: {
    profileId: string;
    tenantId: string;
  }): Promise<{ profileId: string; userId: string } | undefined> {
    const profile = await this.db.query.playerProfiles.findFirst({
      where: and(
        eq(playerProfiles.profileId, params.profileId),
        eq(playerProfiles.tenantId, params.tenantId),
      ),
    });
    return profile ? { profileId: profile.profileId, userId: profile.userId } : undefined;
  }

  public async createGameSession(params: {
    tenantId: string;
    userId: string;
    seed: string;
  }): Promise<{ id: string } | undefined> {
    const seedBigInt = BigInt(params.seed);

    const [gameSession] = await this.db
      .insert(gameSessions)
      .values({
        tenantId: params.tenantId,
        userId: params.userId,
        seed: seedBigInt,
        day: 1,
        funds: 0,
        trustScore: 50,
        intelFragments: 0,
        playerLevel: 1,
        playerXP: 0,
        clientCount: 0,
        threatLevel: 'low',
        defenseLevel: 1,
        serverLevel: 1,
        networkLevel: 1,
        isActive: sql`uuid_generate_v7()`,
      })
      .returning();

    return gameSession ? { id: gameSession.id } : undefined;
  }
}
