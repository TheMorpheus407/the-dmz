import { eq, and, or, sql } from 'drizzle-orm';

import {
  socialRelationships,
  type RelationshipType,
  type SocialRelationship,
} from '../../db/schema/social/index.js';

import type { DatabaseClient } from '../../shared/database/connection.js';

interface FindRelationshipsForPlayerParams {
  tenantId: string;
  playerId: string;
}

interface FindRelationshipBetweenPlayersParams {
  tenantId: string;
  playerId1: string;
  playerId2: string;
  relationshipType?: RelationshipType;
  status?: string;
}

interface FindPendingFriendRequestParams {
  tenantId: string;
  requesterId: string;
  addresseeId: string;
}

interface FindFriendRequestBetweenPlayersParams {
  tenantId: string;
  playerId1: string;
  playerId2: string;
}

interface FindBlockBetweenPlayersParams {
  tenantId: string;
  playerId1: string;
  playerId2: string;
}

interface FindExistingRelationshipParams {
  tenantId: string;
  playerId: string;
  targetPlayerId: string;
  relationshipType: RelationshipType;
}

interface FindFriendshipParams {
  tenantId: string;
  playerId: string;
  friendId: string;
}

interface FindFriendRequestsForPlayerParams {
  tenantId: string;
  playerId: string;
  status: string;
}

interface FindBlockedPlayersParams {
  tenantId: string;
  playerId: string;
}

interface FindMutedPlayersParams {
  tenantId: string;
  playerId: string;
}

interface CountByTypeParams {
  tenantId: string;
  playerId: string;
  type: RelationshipType;
}

interface CreateRelationshipParams {
  tenantId: string;
  requesterId: string;
  addresseeId: string;
  relationshipType: RelationshipType;
  status: string;
}

interface UpdateRelationshipParams {
  relationshipId: string;
  status: string;
}

interface DeleteRelationshipParams {
  relationshipId: string;
}

interface DeleteRelationshipsParams {
  relationshipIds: string[];
}

interface DeleteFriendShipsBetweenPlayersParams {
  tenantId: string;
  playerId: string;
  targetPlayerId: string;
}

export class SocialRelationshipRepository {
  private readonly db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.db = db;
  }

  public async findRelationshipsForPlayer(
    params: FindRelationshipsForPlayerParams,
  ): Promise<SocialRelationship[]> {
    const relationships = await this.db.query.socialRelationships.findMany({
      where: and(
        eq(socialRelationships.tenantId, params.tenantId),
        or(
          eq(socialRelationships.requesterId, params.playerId),
          eq(socialRelationships.addresseeId, params.playerId),
        ),
      ),
    });
    return relationships;
  }

  public async findRelationshipBetweenPlayers(
    params: FindRelationshipBetweenPlayersParams,
  ): Promise<SocialRelationship | undefined> {
    const conditions = [
      eq(socialRelationships.tenantId, params.tenantId),
      or(
        and(
          eq(socialRelationships.requesterId, params.playerId1),
          eq(socialRelationships.addresseeId, params.playerId2),
        ),
        and(
          eq(socialRelationships.requesterId, params.playerId2),
          eq(socialRelationships.addresseeId, params.playerId1),
        ),
      ),
    ];

    if (params.relationshipType) {
      conditions.push(eq(socialRelationships.relationshipType, params.relationshipType));
    }
    if (params.status) {
      conditions.push(eq(socialRelationships.status, params.status));
    }

    const relationship = await this.db.query.socialRelationships.findFirst({
      where: and(...conditions),
    });
    return relationship;
  }

  public async findPendingFriendRequest(
    params: FindPendingFriendRequestParams,
  ): Promise<SocialRelationship | undefined> {
    const relationship = await this.db.query.socialRelationships.findFirst({
      where: and(
        eq(socialRelationships.tenantId, params.tenantId),
        eq(socialRelationships.requesterId, params.requesterId),
        eq(socialRelationships.addresseeId, params.addresseeId),
        eq(socialRelationships.relationshipType, 'friend'),
        eq(socialRelationships.status, 'pending'),
      ),
    });
    return relationship;
  }

  public async findFriendRequestBetweenPlayers(
    params: FindFriendRequestBetweenPlayersParams,
  ): Promise<SocialRelationship | undefined> {
    const relationship = await this.db.query.socialRelationships.findFirst({
      where: and(
        eq(socialRelationships.tenantId, params.tenantId),
        or(
          and(
            eq(socialRelationships.requesterId, params.playerId1),
            eq(socialRelationships.addresseeId, params.playerId2),
          ),
          and(
            eq(socialRelationships.requesterId, params.playerId2),
            eq(socialRelationships.addresseeId, params.playerId1),
          ),
        ),
        eq(socialRelationships.relationshipType, 'friend'),
      ),
    });
    return relationship;
  }

  public async findBlockBetweenPlayers(
    params: FindBlockBetweenPlayersParams,
  ): Promise<SocialRelationship | undefined> {
    const relationship = await this.db.query.socialRelationships.findFirst({
      where: and(
        eq(socialRelationships.tenantId, params.tenantId),
        or(
          and(
            eq(socialRelationships.requesterId, params.playerId1),
            eq(socialRelationships.addresseeId, params.playerId2),
          ),
          and(
            eq(socialRelationships.requesterId, params.playerId2),
            eq(socialRelationships.addresseeId, params.playerId1),
          ),
        ),
        eq(socialRelationships.relationshipType, 'block'),
        eq(socialRelationships.status, 'accepted'),
      ),
    });
    return relationship;
  }

  public async findExistingRelationship(
    params: FindExistingRelationshipParams,
  ): Promise<SocialRelationship | undefined> {
    const relationship = await this.db.query.socialRelationships.findFirst({
      where: and(
        eq(socialRelationships.tenantId, params.tenantId),
        eq(socialRelationships.requesterId, params.playerId),
        eq(socialRelationships.addresseeId, params.targetPlayerId),
        eq(socialRelationships.relationshipType, params.relationshipType),
        eq(socialRelationships.status, 'accepted'),
      ),
    });
    return relationship;
  }

  public async findMuteRelationship(
    params: FindExistingRelationshipParams,
  ): Promise<SocialRelationship | undefined> {
    return this.findExistingRelationship(params);
  }

  public async findFriendship(params: FindFriendshipParams): Promise<SocialRelationship[]> {
    const relationships = await this.db.query.socialRelationships.findMany({
      where: and(
        eq(socialRelationships.tenantId, params.tenantId),
        eq(socialRelationships.relationshipType, 'friend'),
        eq(socialRelationships.status, 'accepted'),
        or(
          and(
            eq(socialRelationships.requesterId, params.playerId),
            eq(socialRelationships.addresseeId, params.friendId),
          ),
          and(
            eq(socialRelationships.requesterId, params.friendId),
            eq(socialRelationships.addresseeId, params.playerId),
          ),
        ),
      ),
    });
    return relationships;
  }

  public async findFriendRequestsForPlayer(
    params: FindFriendRequestsForPlayerParams,
  ): Promise<SocialRelationship[]> {
    const baseConditions = and(
      eq(socialRelationships.tenantId, params.tenantId),
      eq(socialRelationships.relationshipType, 'friend'),
      eq(socialRelationships.status, params.status),
    );

    let whereClause;
    if (params.status === 'accepted') {
      whereClause = and(
        baseConditions,
        or(
          eq(socialRelationships.requesterId, params.playerId),
          eq(socialRelationships.addresseeId, params.playerId),
        ),
      );
    } else if (params.status === 'pending') {
      whereClause = and(baseConditions, eq(socialRelationships.addresseeId, params.playerId));
    } else {
      whereClause = baseConditions;
    }

    const relationships = await this.db.query.socialRelationships.findMany({
      where: whereClause,
    });
    return relationships;
  }

  public async findBlockedPlayers(params: FindBlockedPlayersParams): Promise<SocialRelationship[]> {
    const relationships = await this.db.query.socialRelationships.findMany({
      where: and(
        eq(socialRelationships.tenantId, params.tenantId),
        eq(socialRelationships.relationshipType, 'block'),
        eq(socialRelationships.status, 'accepted'),
        eq(socialRelationships.requesterId, params.playerId),
      ),
    });
    return relationships;
  }

  public async findMutedPlayers(params: FindMutedPlayersParams): Promise<SocialRelationship[]> {
    const relationships = await this.db.query.socialRelationships.findMany({
      where: and(
        eq(socialRelationships.tenantId, params.tenantId),
        eq(socialRelationships.relationshipType, 'mute'),
        eq(socialRelationships.status, 'accepted'),
        eq(socialRelationships.requesterId, params.playerId),
      ),
    });
    return relationships;
  }

  public async countByType(params: CountByTypeParams): Promise<number> {
    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(socialRelationships)
      .where(
        and(
          eq(socialRelationships.tenantId, params.tenantId),
          or(
            eq(socialRelationships.requesterId, params.playerId),
            eq(socialRelationships.addresseeId, params.playerId),
          ),
          eq(socialRelationships.relationshipType, params.type),
          eq(socialRelationships.status, 'accepted'),
        ),
      );

    return countResult[0]?.count ?? 0;
  }

  public async createRelationship(
    params: CreateRelationshipParams,
  ): Promise<SocialRelationship | undefined> {
    const [relationship] = await this.db
      .insert(socialRelationships)
      .values({
        tenantId: params.tenantId,
        requesterId: params.requesterId,
        addresseeId: params.addresseeId,
        relationshipType: params.relationshipType,
        status: params.status,
      })
      .returning();
    return relationship;
  }

  public async updateRelationship(
    params: UpdateRelationshipParams,
  ): Promise<SocialRelationship | undefined> {
    const [relationship] = await this.db
      .update(socialRelationships)
      .set({
        status: params.status,
        updatedAt: new Date(),
      })
      .where(eq(socialRelationships.relationshipId, params.relationshipId))
      .returning();
    return relationship;
  }

  public async deleteRelationship(params: DeleteRelationshipParams): Promise<void> {
    await this.db
      .delete(socialRelationships)
      .where(eq(socialRelationships.relationshipId, params.relationshipId));
  }

  public async deleteRelationships(params: DeleteRelationshipsParams): Promise<void> {
    for (const relationshipId of params.relationshipIds) {
      await this.db
        .delete(socialRelationships)
        .where(eq(socialRelationships.relationshipId, relationshipId));
    }
  }

  public async deleteFriendShipsBetweenPlayers(
    params: DeleteFriendShipsBetweenPlayersParams,
  ): Promise<void> {
    await this.db
      .delete(socialRelationships)
      .where(
        and(
          eq(socialRelationships.tenantId, params.tenantId),
          or(
            and(
              eq(socialRelationships.requesterId, params.playerId),
              eq(socialRelationships.addresseeId, params.targetPlayerId),
            ),
            and(
              eq(socialRelationships.requesterId, params.targetPlayerId),
              eq(socialRelationships.addresseeId, params.playerId),
            ),
          ),
          eq(socialRelationships.relationshipType, 'friend'),
        ),
      );
  }
}
