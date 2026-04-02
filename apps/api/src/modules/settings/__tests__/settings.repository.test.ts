import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

import { getDatabaseClient } from '../../../shared/database/connection.js';
import { SettingsRepository, type UserProfileRow } from '../settings.repository.js';

import type { DatabaseClient } from '../../../shared/database/connection.js';

describe('SettingsRepository', () => {
  let mockDb: DatabaseClient;
  let repository: SettingsRepository;

  const createMockDb = (): DatabaseClient => {
    return {
      query: {
        userProfiles: {
          findFirst: vi.fn(),
        },
      },
      update: vi.fn().mockImplementation(() => ({
        set: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockResolvedValue(undefined),
        })),
      })),
    } as unknown as DatabaseClient;
  };

  const mockProfileRow: UserProfileRow = {
    profileId: 'profile-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    locale: 'en',
    timezone: 'UTC',
    preferences: {
      display: { theme: 'green' },
      gameplay: { difficulty: 'hard' },
    },
    accessibilitySettings: {
      reducedMotion: true,
      highContrast: false,
    },
    notificationSettings: {},
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb);
    repository = new SettingsRepository(mockDb);
  });

  describe('findUserProfile', () => {
    it('returns profile when user exists', async () => {
      mockDb.query.userProfiles.findFirst = vi.fn().mockResolvedValue({
        profileId: 'profile-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        locale: 'en',
        timezone: 'UTC',
        preferences: {
          display: { theme: 'green' },
          gameplay: { difficulty: 'hard' },
        },
        accessibilitySettings: { reducedMotion: true, highContrast: false },
        notificationSettings: {},
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      });

      const result = await repository.findUserProfile('user-1', 'tenant-1');

      expect(result).toEqual(mockProfileRow);
      expect(mockDb.query.userProfiles.findFirst).toHaveBeenCalledWith({
        where: expect.anything(),
      });
    });

    it('returns undefined when user does not exist', async () => {
      mockDb.query.userProfiles.findFirst = vi.fn().mockResolvedValue(undefined);

      const result = await repository.findUserProfile('nonexistent-user', 'tenant-1');

      expect(result).toBeUndefined();
    });

    it('correctly maps database columns to UserProfileRow', async () => {
      const dbProfile = {
        profileId: 'profile-2',
        tenantId: 'tenant-2',
        userId: 'user-2',
        locale: 'de',
        timezone: 'Europe/Berlin',
        preferences: { audio: { masterVolume: 50 } },
        accessibilitySettings: { colorBlindMode: 'protanopia' },
        notificationSettings: { email: true },
        createdAt: new Date('2024-03-01'),
        updatedAt: new Date('2024-03-15'),
      };

      mockDb.query.userProfiles.findFirst = vi.fn().mockResolvedValue(dbProfile);

      const result = await repository.findUserProfile('user-2', 'tenant-2');

      expect(result).toEqual({
        profileId: 'profile-2',
        tenantId: 'tenant-2',
        userId: 'user-2',
        locale: 'de',
        timezone: 'Europe/Berlin',
        preferences: { audio: { masterVolume: 50 } },
        accessibilitySettings: { colorBlindMode: 'protanopia' },
        notificationSettings: { email: true },
        createdAt: dbProfile.createdAt,
        updatedAt: dbProfile.updatedAt,
      });
    });
  });

  describe('updateUserSettings', () => {
    it('updates preferences and accessibilitySettings', async () => {
      const mockSet = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      const mockUpdate = vi.fn().mockReturnValue({
        set: mockSet,
      });
      mockDb.update = mockUpdate as unknown as DatabaseClient['update'];

      const updateData = {
        preferences: { display: { theme: 'blue' } },
        accessibilitySettings: { reducedMotion: false },
      };

      await repository.updateUserSettings('user-1', 'tenant-1', updateData);

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith({
        preferences: { display: { theme: 'blue' } },
        accessibilitySettings: { reducedMotion: false },
        updatedAt: expect.any(Date),
      });
    });

    it('throws on database error', async () => {
      const mockUpdate = vi.fn().mockImplementation(() => {
        throw new Error('Database error');
      });
      mockDb.update = mockUpdate as unknown as DatabaseClient['update'];

      const updateData = {
        preferences: { display: { theme: 'blue' } },
        accessibilitySettings: { reducedMotion: false },
      };

      await expect(repository.updateUserSettings('user-1', 'tenant-1', updateData)).rejects.toThrow(
        'Database error',
      );
    });
  });
});
