import { and, eq } from 'drizzle-orm';

import { type AppConfig } from '../../config.js';
import { getDatabaseClient, type DatabaseClient } from '../../shared/database/connection.js';
import { userProfiles } from '../../db/schema/auth/user-profiles.js';

export interface UserProfileRow {
  profileId: string;
  tenantId: string;
  userId: string;
  locale: string;
  timezone: string;
  preferences: Record<string, unknown>;
  accessibilitySettings: Record<string, unknown>;
  notificationSettings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class SettingsRepository {
  private db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this.db = db;
  }

  static create(config: AppConfig): SettingsRepository {
    if (!config) {
      throw new TypeError('config is required');
    }
    return new SettingsRepository(getDatabaseClient(config));
  }

  async findUserProfile(userId: string, tenantId: string): Promise<UserProfileRow | undefined> {
    const profile = await this.db.query.userProfiles.findFirst({
      where: and(eq(userProfiles.userId, userId), eq(userProfiles.tenantId, tenantId)),
    });

    if (!profile) {
      return undefined;
    }

    return {
      profileId: profile.profileId,
      tenantId: profile.tenantId,
      userId: profile.userId,
      locale: profile.locale,
      timezone: profile.timezone,
      preferences: profile.preferences as Record<string, unknown>,
      accessibilitySettings: profile.accessibilitySettings as Record<string, unknown>,
      notificationSettings: profile.notificationSettings as Record<string, unknown>,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  async updateUserSettings(
    userId: string,
    tenantId: string,
    data: {
      preferences: Record<string, unknown>;
      accessibilitySettings: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.db
      .update(userProfiles)
      .set({
        preferences: data.preferences,
        accessibilitySettings: data.accessibilitySettings,
        updatedAt: new Date(),
      })
      .where(and(eq(userProfiles.userId, userId), eq(userProfiles.tenantId, tenantId)));
  }
}
