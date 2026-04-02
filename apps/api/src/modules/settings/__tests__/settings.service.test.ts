import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getUserSettings,
  updateUserSettings,
  exportUserSettings,
  requestDataExport,
  requestAccountDeletion,
  defaultSettings,
} from '../settings.service.js';

import type { SettingsRepository, UserProfileRow } from '../settings.repository.js';

const mockRepository = {
  findUserProfile: vi.fn(),
  updateUserSettings: vi.fn(),
} as unknown as SettingsRepository;

const TENANT_ID = 'tenant-1';
const USER_ID = 'user-1';

const createMockProfile = (overrides: Partial<UserProfileRow> = {}): UserProfileRow => ({
  profileId: 'profile-1',
  tenantId: TENANT_ID,
  userId: USER_ID,
  locale: 'en',
  timezone: 'UTC',
  preferences: {},
  accessibilitySettings: {},
  notificationSettings: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('settings service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('defaultSettings', () => {
    it('has all required categories', () => {
      expect(defaultSettings).toHaveProperty('display');
      expect(defaultSettings).toHaveProperty('accessibility');
      expect(defaultSettings).toHaveProperty('gameplay');
      expect(defaultSettings).toHaveProperty('audio');
      expect(defaultSettings).toHaveProperty('account');
    });

    it('display has correct default theme', () => {
      expect(defaultSettings.display?.theme).toBe('green');
    });

    it('accessibility has correct defaults', () => {
      expect(defaultSettings.accessibility?.reducedMotion).toBe(false);
      expect(defaultSettings.accessibility?.colorBlindMode).toBe('none');
    });

    it('gameplay has correct defaults', () => {
      expect(defaultSettings.gameplay?.difficulty).toBe('normal');
      expect(defaultSettings.gameplay?.notificationVolume).toBe(80);
    });

    it('audio has correct defaults', () => {
      expect(defaultSettings.audio?.masterVolume).toBe(80);
      expect(defaultSettings.audio?.muteAll).toBe(false);
    });

    it('account has correct defaults', () => {
      expect(defaultSettings.account?.privacyMode).toBe('public');
    });
  });

  describe('getUserSettings', () => {
    it('returns defaultSettings when profile not found', async () => {
      mockRepository.findUserProfile.mockResolvedValue(undefined);

      const result = await getUserSettings(mockRepository, USER_ID, TENANT_ID);

      expect(result).toEqual(defaultSettings);
    });

    it('merges profile preferences with defaults correctly', async () => {
      mockRepository.findUserProfile.mockResolvedValue(
        createMockProfile({
          preferences: {
            display: { theme: 'amber' },
            gameplay: { difficulty: 'hard' },
          },
        }),
      );

      const result = await getUserSettings(mockRepository, USER_ID, TENANT_ID);

      expect(result.display?.theme).toBe('amber');
      expect(result.display?.fontSize).toBe(defaultSettings.display?.fontSize);
      expect(result.gameplay?.difficulty).toBe('hard');
      expect(result.gameplay?.notificationVolume).toBe(
        defaultSettings.gameplay?.notificationVolume,
      );
    });

    it('handles null/missing preference categories', async () => {
      mockRepository.findUserProfile.mockResolvedValue(
        createMockProfile({
          preferences: null as unknown as Record<string, unknown>,
          accessibilitySettings: null as unknown as Record<string, unknown>,
        }),
      );

      const result = await getUserSettings(mockRepository, USER_ID, TENANT_ID);

      expect(result).toEqual(defaultSettings);
    });

    it('merges accessibility settings separately from other categories', async () => {
      mockRepository.findUserProfile.mockResolvedValue(
        createMockProfile({
          preferences: { display: { theme: 'amber' } },
          accessibilitySettings: { reducedMotion: true, highContrast: true },
        }),
      );

      const result = await getUserSettings(mockRepository, USER_ID, TENANT_ID);

      expect(result.display?.theme).toBe('amber');
      expect(result.accessibility?.reducedMotion).toBe(true);
      expect(result.accessibility?.highContrast).toBe(true);
      expect(result.accessibility?.colorBlindMode).toBe('none');
    });

    it('returns full defaults when profile has empty preferences', async () => {
      mockRepository.findUserProfile.mockResolvedValue(
        createMockProfile({
          preferences: {},
          accessibilitySettings: {},
        }),
      );

      const result = await getUserSettings(mockRepository, USER_ID, TENANT_ID);

      expect(result.display?.theme).toBe(defaultSettings.display?.theme);
      expect(result.accessibility?.reducedMotion).toBe(
        defaultSettings.accessibility?.reducedMotion,
      );
    });
  });

  describe('updateUserSettings', () => {
    it('validates input via validateSettingsInput for display category', async () => {
      mockRepository.findUserProfile.mockResolvedValue(createMockProfile());
      mockRepository.updateUserSettings.mockResolvedValue(undefined);

      await updateUserSettings(mockRepository, USER_ID, TENANT_ID, 'display', {
        theme: 'amber',
        fontSize: 18,
      });

      expect(mockRepository.updateUserSettings).toHaveBeenCalledWith(USER_ID, TENANT_ID, {
        preferences: { display: { theme: 'amber', fontSize: 18 } },
        accessibilitySettings: {},
      });
    });

    it('validates input via validateSettingsInput for gameplay category', async () => {
      mockRepository.findUserProfile.mockResolvedValue(createMockProfile());
      mockRepository.updateUserSettings.mockResolvedValue(undefined);

      await updateUserSettings(mockRepository, USER_ID, TENANT_ID, 'gameplay', {
        difficulty: 'hard',
        notificationVolume: 50,
      });

      expect(mockRepository.updateUserSettings).toHaveBeenCalledWith(USER_ID, TENANT_ID, {
        preferences: { gameplay: { difficulty: 'hard', notificationVolume: 50 } },
        accessibilitySettings: {},
      });
    });

    it('validates input via validateSettingsInput for audio category', async () => {
      mockRepository.findUserProfile.mockResolvedValue(createMockProfile());
      mockRepository.updateUserSettings.mockResolvedValue(undefined);

      await updateUserSettings(mockRepository, USER_ID, TENANT_ID, 'audio', {
        masterVolume: 50,
        muteAll: true,
      });

      expect(mockRepository.updateUserSettings).toHaveBeenCalledWith(USER_ID, TENANT_ID, {
        preferences: { audio: { masterVolume: 50, muteAll: true } },
        accessibilitySettings: {},
      });
    });

    it('merges accessibility settings separately from other categories', async () => {
      const existingProfile = createMockProfile({
        preferences: { display: { theme: 'green' } },
        accessibilitySettings: { reducedMotion: true },
      });
      mockRepository.findUserProfile.mockResolvedValue(existingProfile);
      mockRepository.updateUserSettings.mockResolvedValue(undefined);

      await updateUserSettings(mockRepository, USER_ID, TENANT_ID, 'accessibility', {
        highContrast: true,
      });

      expect(mockRepository.updateUserSettings).toHaveBeenCalledWith(USER_ID, TENANT_ID, {
        preferences: { display: { theme: 'green' } },
        accessibilitySettings: { reducedMotion: true, highContrast: true },
      });
    });

    it('returns updated settings via getUserSettings after update', async () => {
      const profile = createMockProfile({
        preferences: { display: { theme: 'green' } },
        accessibilitySettings: { reducedMotion: false },
      });
      mockRepository.findUserProfile.mockResolvedValueOnce(profile).mockResolvedValueOnce({
        ...profile,
        preferences: { display: { theme: 'amber' } },
      });
      mockRepository.updateUserSettings.mockResolvedValue(undefined);

      const result = await updateUserSettings(mockRepository, USER_ID, TENANT_ID, 'display', {
        theme: 'amber',
        fontSize: 16,
      });

      expect(result.display?.theme).toBe('amber');
    });

    it('creates new preferences entry when profile does not exist', async () => {
      mockRepository.findUserProfile.mockResolvedValue(undefined);
      mockRepository.updateUserSettings.mockResolvedValue(undefined);

      await updateUserSettings(mockRepository, USER_ID, TENANT_ID, 'display', {
        theme: 'amber',
        fontSize: 16,
      });

      expect(mockRepository.updateUserSettings).toHaveBeenCalledWith(USER_ID, TENANT_ID, {
        preferences: { display: { theme: 'amber', fontSize: 16 } },
        accessibilitySettings: {},
      });
    });

    it('merges partial updates with existing preferences', async () => {
      const existingProfile = createMockProfile({
        preferences: {
          display: { theme: 'green', fontSize: 18 },
          gameplay: { difficulty: 'hard' },
        },
        accessibilitySettings: {},
      });
      mockRepository.findUserProfile.mockResolvedValue(existingProfile);
      mockRepository.updateUserSettings.mockResolvedValue(undefined);

      await updateUserSettings(mockRepository, USER_ID, TENANT_ID, 'display', {
        theme: 'amber',
        fontSize: 18,
      });

      expect(mockRepository.updateUserSettings).toHaveBeenCalledWith(USER_ID, TENANT_ID, {
        preferences: {
          display: { theme: 'amber', fontSize: 18 },
          gameplay: { difficulty: 'hard' },
        },
        accessibilitySettings: {},
      });
    });

    it('rejects invalid display settings', async () => {
      mockRepository.findUserProfile.mockResolvedValue(createMockProfile());

      await expect(
        updateUserSettings(mockRepository, USER_ID, TENANT_ID, 'display', {
          theme: 'invalid-theme',
        }),
      ).rejects.toThrow();
    });

    it('rejects invalid accessibility settings', async () => {
      mockRepository.findUserProfile.mockResolvedValue(createMockProfile());

      await expect(
        updateUserSettings(mockRepository, USER_ID, TENANT_ID, 'accessibility', {
          colorBlindMode: 'invalid-mode',
        }),
      ).rejects.toThrow();
    });

    it('rejects invalid gameplay settings', async () => {
      mockRepository.findUserProfile.mockResolvedValue(createMockProfile());

      await expect(
        updateUserSettings(mockRepository, USER_ID, TENANT_ID, 'gameplay', {
          difficulty: 'impossible',
        }),
      ).rejects.toThrow();
    });

    it('rejects invalid settings category', async () => {
      mockRepository.findUserProfile.mockResolvedValue(createMockProfile());

      await expect(
        updateUserSettings(mockRepository, USER_ID, TENANT_ID, 'invalid', {}),
      ).rejects.toThrow();
    });
  });

  describe('exportUserSettings', () => {
    it('returns settings with exportedAt timestamp', async () => {
      mockRepository.findUserProfile.mockResolvedValue(createMockProfile());

      const result = await exportUserSettings(mockRepository, USER_ID, TENANT_ID);

      expect(result.settings).toBeDefined();
      expect(result.exportedAt).toBeDefined();
      expect(new Date(result.exportedAt)).toBeInstanceOf(Date);
    });

    it('returns full settings structure', async () => {
      mockRepository.findUserProfile.mockResolvedValue(createMockProfile());

      const result = await exportUserSettings(mockRepository, USER_ID, TENANT_ID);

      expect(result.settings).toHaveProperty('display');
      expect(result.settings).toHaveProperty('accessibility');
      expect(result.settings).toHaveProperty('gameplay');
      expect(result.settings).toHaveProperty('audio');
      expect(result.settings).toHaveProperty('account');
    });
  });

  describe('requestDataExport', () => {
    it('returns success:true with requestId', async () => {
      const result = await requestDataExport(USER_ID, TENANT_ID);

      expect(result.success).toBe(true);
      expect(result.requestId).toBeDefined();
      expect(result.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('returns message about data export', async () => {
      const result = await requestDataExport(USER_ID, TENANT_ID);

      expect(result.message).toContain('Data export request');
    });
  });

  describe('requestAccountDeletion', () => {
    it('returns success:true with requestId', async () => {
      const result = await requestAccountDeletion(USER_ID, TENANT_ID);

      expect(result.success).toBe(true);
      expect(result.requestId).toBeDefined();
      expect(result.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('returns message about account deletion', async () => {
      const result = await requestAccountDeletion(USER_ID, TENANT_ID);

      expect(result.message).toContain('Account deletion request');
      expect(result.message).toContain('30 days');
    });
  });
});
