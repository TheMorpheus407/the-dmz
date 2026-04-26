import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  createProfile,
  findProfileByUserId,
  updateProfile,
  backfillProfiles,
  type ProfileData,
  type UpdateProfileData,
} from '../profile.repo.js';

import type { DB } from '../../../../shared/database/connection.js';

vi.mock('../../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

describe('profile.repo', () => {
  let mockDb: DB;

  const mockProfile = {
    profileId: 'profile-123',
    tenantId: 'tenant-456',
    userId: 'user-789',
    locale: 'en',
    timezone: 'UTC',
    preferences: { themePreferences: { theme: 'green' } },
    accessibilitySettings: { reducedMotion: false },
    notificationSettings: {},
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      query: {
        userProfiles: {
          findFirst: vi.fn(),
        },
      },
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
      where: vi.fn(),
      execute: vi.fn(),
    } as unknown as DB;
  });

  describe('createProfile', () => {
    it('should create profile with default locale and timezone', async () => {
      const createdProfile = {
        profileId: mockProfile.profileId,
        tenantId: mockProfile.tenantId,
        userId: mockProfile.userId,
        locale: 'en',
        timezone: 'UTC',
        accessibilitySettings: {},
        notificationSettings: {},
      };

      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdProfile]),
        }),
      });

      const data: ProfileData = {
        tenantId: mockProfile.tenantId,
        userId: mockProfile.userId,
      };

      const result = await createProfile(mockDb, data);

      expect(result).toMatchObject({
        profileId: mockProfile.profileId,
        tenantId: mockProfile.tenantId,
        userId: mockProfile.userId,
        locale: 'en',
        timezone: 'UTC',
      });
    });

    it('should create profile with custom locale and timezone', async () => {
      const createdProfile = {
        profileId: mockProfile.profileId,
        tenantId: mockProfile.tenantId,
        userId: mockProfile.userId,
        locale: 'de',
        timezone: 'Europe/Berlin',
        accessibilitySettings: {},
        notificationSettings: {},
      };

      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdProfile]),
        }),
      });

      const data: ProfileData = {
        tenantId: mockProfile.tenantId,
        userId: mockProfile.userId,
        locale: 'de',
        timezone: 'Europe/Berlin',
      };

      const result = await createProfile(mockDb, data);

      expect(result.locale).toBe('de');
      expect(result.timezone).toBe('Europe/Berlin');
    });

    it('should create profile with preferences', async () => {
      const createdProfile = {
        profileId: mockProfile.profileId,
        tenantId: mockProfile.tenantId,
        userId: mockProfile.userId,
        locale: 'en',
        timezone: 'UTC',
        accessibilitySettings: { theme: 'green' },
        notificationSettings: { email: true },
      };

      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdProfile]),
        }),
      });

      const data: ProfileData = {
        tenantId: mockProfile.tenantId,
        userId: mockProfile.userId,
        preferences: {
          themePreferences: { theme: 'green' },
        },
        notificationSettings: { email: true },
      };

      const result = await createProfile(mockDb, data);

      expect(result.preferences).toEqual(data.preferences);
      expect(result.notificationSettings).toEqual({ email: true });
    });
  });

  describe('findProfileByUserId', () => {
    it('should return profile when found', async () => {
      mockDb.query.userProfiles.findFirst = vi.fn().mockResolvedValue(mockProfile);

      const result = await findProfileByUserId(mockDb, mockProfile.userId, mockProfile.tenantId);

      expect(result).toMatchObject({
        profileId: mockProfile.profileId,
        tenantId: mockProfile.tenantId,
        userId: mockProfile.userId,
        locale: mockProfile.locale,
        timezone: mockProfile.timezone,
      });
    });

    it('should return null when profile not found', async () => {
      mockDb.query.userProfiles.findFirst = vi.fn().mockResolvedValue(null);

      const result = await findProfileByUserId(mockDb, 'nonexistent', mockProfile.tenantId);

      expect(result).toBeNull();
    });

    it('should return null when tenant does not match', async () => {
      mockDb.query.userProfiles.findFirst = vi.fn().mockResolvedValue(null);

      const result = await findProfileByUserId(mockDb, mockProfile.userId, 'wrong-tenant');

      expect(result).toBeNull();
    });

    it('should correctly parse accessibility settings into preferences structure', async () => {
      const profileWithSettings = {
        ...mockProfile,
        accessibilitySettings: {
          theme: 'amber',
          enableTerminalEffects: true,
          fontSize: 14,
          reducedMotion: true,
          highContrast: false,
        },
      };

      mockDb.query.userProfiles.findFirst = vi.fn().mockResolvedValue(profileWithSettings);

      const result = await findProfileByUserId(mockDb, mockProfile.userId, mockProfile.tenantId);

      expect(result?.preferences).toMatchObject({
        themePreferences: {
          theme: 'amber',
          enableTerminalEffects: true,
          fontSize: 14,
        },
        accessibilityPreferences: {
          reducedMotion: true,
          highContrast: false,
          fontSize: 14,
        },
      });
    });
  });

  describe('updateProfile', () => {
    it('should update profile locale', async () => {
      const existingProfile = { ...mockProfile };

      mockDb.query.userProfiles.findFirst = vi.fn().mockResolvedValue(existingProfile);
      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                ...existingProfile,
                locale: 'de',
              },
            ]),
          }),
        }),
      });

      const updateData: UpdateProfileData = {
        locale: 'de',
      };

      const result = await updateProfile(
        mockDb,
        mockProfile.userId,
        mockProfile.tenantId,
        updateData,
      );

      expect(result?.locale).toBe('de');
    });

    it('should update profile timezone', async () => {
      const existingProfile = { ...mockProfile };

      mockDb.query.userProfiles.findFirst = vi.fn().mockResolvedValue(existingProfile);
      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                ...existingProfile,
                timezone: 'America/New_York',
              },
            ]),
          }),
        }),
      });

      const updateData: UpdateProfileData = {
        timezone: 'America/New_York',
      };

      const result = await updateProfile(
        mockDb,
        mockProfile.userId,
        mockProfile.tenantId,
        updateData,
      );

      expect(result?.timezone).toBe('America/New_York');
    });

    it('should merge accessibility settings', async () => {
      const existingProfile = {
        ...mockProfile,
        accessibilitySettings: { theme: 'green', reducedMotion: false },
      };

      mockDb.query.userProfiles.findFirst = vi.fn().mockResolvedValue(existingProfile);
      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                ...existingProfile,
                accessibilitySettings: { theme: 'amber', reducedMotion: false },
              },
            ]),
          }),
        }),
      });

      const updateData: UpdateProfileData = {
        preferences: {
          themePreferences: { theme: 'amber' },
        },
      };

      const result = await updateProfile(
        mockDb,
        mockProfile.userId,
        mockProfile.tenantId,
        updateData,
      );

      expect(result).toBeDefined();
    });

    it('should return null when profile not found', async () => {
      mockDb.query.userProfiles.findFirst = vi.fn().mockResolvedValue(null);
      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const updateData: UpdateProfileData = {
        locale: 'de',
      };

      const result = await updateProfile(mockDb, 'nonexistent', mockProfile.tenantId, updateData);

      expect(result).toBeNull();
    });

    it('should return existing profile when no updates provided', async () => {
      mockDb.query.userProfiles.findFirst = vi.fn().mockResolvedValue(mockProfile);

      const updateData: UpdateProfileData = {};

      const result = await updateProfile(
        mockDb,
        mockProfile.userId,
        mockProfile.tenantId,
        updateData,
      );

      expect(result?.profileId).toBe(mockProfile.profileId);
    });

    it('should update notification settings', async () => {
      const existingProfile = { ...mockProfile };

      mockDb.query.userProfiles.findFirst = vi.fn().mockResolvedValue(existingProfile);
      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                ...existingProfile,
                notificationSettings: { email: false, push: true },
              },
            ]),
          }),
        }),
      });

      const updateData: UpdateProfileData = {
        notificationSettings: { email: false, push: true },
      };

      const result = await updateProfile(
        mockDb,
        mockProfile.userId,
        mockProfile.tenantId,
        updateData,
      );

      expect(result?.notificationSettings).toEqual({ email: false, push: true });
    });
  });

  describe('backfillProfiles', () => {
    it('should return number of profiles created', async () => {
      mockDb.execute = vi.fn().mockResolvedValue({ rowCount: 5 });

      const result = await backfillProfiles(mockDb);

      expect(result).toBe(5);
    });

    it('should return 0 when no profiles created', async () => {
      mockDb.execute = vi.fn().mockResolvedValue({ rowCount: 0 });

      const result = await backfillProfiles(mockDb);

      expect(result).toBe(0);
    });
  });
});
