import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('./client', () => ({
  apiClient: {
    patch: vi.fn(),
    getCsrfToken: vi.fn().mockReturnValue('test-csrf-token'),
  },
}));

const { apiClient } = await import('./client');

const { updatePreferences } = await import('./auth');

describe('updatePreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls PATCH /auth/profile with preferences', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: {
        profileId: '12345678-1234-1234-1234-123456789012',
        tenantId: '12345678-1234-1234-1234-123456789013',
        userId: '12345678-1234-1234-1234-123456789014',
        locale: 'en',
        timezone: 'UTC',
        preferences: {
          themePreferences: { theme: 'green' },
          accessibilityPreferences: { reducedMotion: true },
          animationPreferences: { enableAnimations: true },
          gameplayPreferences: { difficulty: 'normal' },
          audioPreferences: { masterVolume: 80 },
          accountPreferences: { privacyMode: 'public' },
        },
        policyLockedPreferences: {},
        accessibilitySettings: {},
        notificationSettings: {},
      },
    });

    const result = await updatePreferences({
      themePreferences: { theme: 'green' },
      accessibilityPreferences: { reducedMotion: true },
    });

    expect(apiClient.patch).toHaveBeenCalledWith('/auth/profile', {
      themePreferences: { theme: 'green' },
      accessibilityPreferences: { reducedMotion: true },
    });
    expect(result.data).toBeDefined();
    expect(result.data?.profileId).toBe('12345678-1234-1234-1234-123456789012');
  });

  it('accepts all six preference categories from shared schema', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: {
        profileId: '12345678-1234-1234-1234-123456789012',
        tenantId: '12345678-1234-1234-1234-123456789013',
        userId: '12345678-1234-1234-1234-123456789014',
        locale: 'en',
        timezone: 'UTC',
        preferences: {
          themePreferences: {
            theme: 'amber',
            enableTerminalEffects: true,
            effectIntensity: {
              scanlines: 70,
              curvature: 50,
              glow: 60,
              noise: 30,
              vignette: 50,
              flicker: 40,
            },
            terminalGlowIntensity: 75,
          },
          accessibilityPreferences: {
            reducedMotion: false,
            highContrast: true,
            fontSize: 16,
            colorBlindMode: 'protanopia',
            screenReaderAnnouncements: true,
            keyboardNavigationHints: false,
            focusIndicatorStyle: 'strong',
          },
          animationPreferences: {
            enableAnimations: true,
            enableGlowPulse: false,
            enableTypewriter: true,
            enableScreenFlicker: false,
            typewriterSpeed: 60,
          },
          gameplayPreferences: {
            difficulty: 'hard',
            notificationVolume: 90,
            notificationCategoryVolumes: { master: 90, alerts: 80, ui: 70, ambient: 60 },
            notificationDuration: 10,
            autoAdvanceTiming: 5,
            queueBuildupRate: 7,
          },
          audioPreferences: {
            masterVolume: 85,
            categoryVolumes: { alerts: 90, ui: 70, ambient: 60, narrative: 80, effects: 85 },
            muteAll: false,
            textToSpeechEnabled: true,
            textToSpeechSpeed: 120,
          },
          accountPreferences: {
            displayName: 'TestPlayer',
            privacyMode: 'friends',
          },
        },
        policyLockedPreferences: {},
        accessibilitySettings: {},
        notificationSettings: {},
      },
    });

    const result = await updatePreferences({
      themePreferences: {
        theme: 'amber',
        enableTerminalEffects: true,
        effectIntensity: {
          scanlines: 70,
          curvature: 50,
          glow: 60,
          noise: 30,
          vignette: 50,
          flicker: 40,
        },
        terminalGlowIntensity: 75,
      },
      accessibilityPreferences: {
        reducedMotion: false,
        highContrast: true,
        fontSize: 16,
        colorBlindMode: 'protanopia',
        screenReaderAnnouncements: true,
        keyboardNavigationHints: false,
        focusIndicatorStyle: 'strong',
      },
      animationPreferences: {
        enableAnimations: true,
        enableGlowPulse: false,
        enableTypewriter: true,
        enableScreenFlicker: false,
        typewriterSpeed: 60,
      },
      gameplayPreferences: {
        difficulty: 'hard',
        notificationVolume: 90,
        notificationCategoryVolumes: { master: 90, alerts: 80, ui: 70, ambient: 60 },
        notificationDuration: 10,
        autoAdvanceTiming: 5,
        queueBuildupRate: 7,
      },
      audioPreferences: {
        masterVolume: 85,
        categoryVolumes: { alerts: 90, ui: 70, ambient: 60, narrative: 80, effects: 85 },
        muteAll: false,
        textToSpeechEnabled: true,
        textToSpeechSpeed: 120,
      },
      accountPreferences: {
        displayName: 'TestPlayer',
        privacyMode: 'friends',
      },
    });

    expect(apiClient.patch).toHaveBeenCalled();
    expect(result.data).toBeDefined();
    expect(result.data?.profileId).toBe('12345678-1234-1234-1234-123456789012');
  });

  it('returns ProfileData with all required fields', async () => {
    const mockProfileData = {
      profileId: '12345678-1234-1234-1234-123456789012',
      tenantId: '12345678-1234-1234-1234-123456789013',
      userId: '12345678-1234-1234-1234-123456789014',
      locale: 'en-US',
      timezone: 'America/New_York',
      preferences: {
        themePreferences: { theme: 'green', fontSize: 14 },
        accessibilityPreferences: { reducedMotion: true },
        animationPreferences: { enableAnimations: false },
        gameplayPreferences: { difficulty: 'easy' },
        audioPreferences: { masterVolume: 50 },
        accountPreferences: { privacyMode: 'private' },
      },
      policyLockedPreferences: { theme: true },
      accessibilitySettings: { screenReader: true },
      notificationSettings: { email: true },
    };

    vi.mocked(apiClient.patch).mockResolvedValue({
      data: mockProfileData,
    });

    const result = await updatePreferences({
      themePreferences: { theme: 'green' },
    });

    expect(result.data).toBeDefined();
    expect(result.data?.profileId).toBeDefined();
    expect(result.data?.tenantId).toBeDefined();
    expect(result.data?.userId).toBeDefined();
    expect(result.data?.locale).toBeDefined();
    expect(result.data?.timezone).toBeDefined();
    expect(result.data?.preferences).toBeDefined();
    expect(result.data?.policyLockedPreferences).toBeDefined();
    expect(result.data?.accessibilitySettings).toBeDefined();
    expect(result.data?.notificationSettings).toBeDefined();
  });

  it('returns error on API error', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      error: {
        category: 'server',
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        status: 500,
        retryable: true,
      },
    });

    const result = await updatePreferences({
      themePreferences: { theme: 'green' },
    });

    expect(result.error).toBeDefined();
    expect(result.error?.category).toBe('server');
    expect(result.error?.code).toBe('INTERNAL_ERROR');
  });

  it('returns error when response has no data', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: undefined,
    });

    const result = await updatePreferences({
      themePreferences: { theme: 'green' },
    });

    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe('INVALID_RESPONSE');
  });

  it('accepts effectIntensity with all effect properties', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: {
        profileId: '12345678-1234-1234-1234-123456789012',
        tenantId: '12345678-1234-1234-1234-123456789013',
        userId: '12345678-1234-1234-1234-123456789014',
        locale: 'en',
        timezone: 'UTC',
        preferences: {
          themePreferences: {
            theme: 'green',
            effectIntensity: {
              scanlines: 100,
              curvature: 100,
              glow: 100,
              noise: 100,
              vignette: 100,
              flicker: 100,
            },
          },
          accessibilityPreferences: {},
          animationPreferences: {},
          gameplayPreferences: {},
          audioPreferences: {},
          accountPreferences: {},
        },
        policyLockedPreferences: {},
        accessibilitySettings: {},
        notificationSettings: {},
      },
    });

    const result = await updatePreferences({
      themePreferences: {
        theme: 'green',
        effectIntensity: {
          scanlines: 100,
          curvature: 100,
          glow: 100,
          noise: 100,
          vignette: 100,
          flicker: 100,
        },
      },
    });

    expect(apiClient.patch).toHaveBeenCalled();
    expect(result.data).toBeDefined();
  });

  it('accepts colorBlindMode and focusIndicatorStyle in accessibilityPreferences', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: {
        profileId: '12345678-1234-1234-1234-123456789012',
        tenantId: '12345678-1234-1234-1234-123456789013',
        userId: '12345678-1234-1234-1234-123456789014',
        locale: 'en',
        timezone: 'UTC',
        preferences: {
          themePreferences: {},
          accessibilityPreferences: {
            colorBlindMode: 'deuteranopia',
            focusIndicatorStyle: 'subtle',
          },
          animationPreferences: {},
          gameplayPreferences: {},
          audioPreferences: {},
          accountPreferences: {},
        },
        policyLockedPreferences: {},
        accessibilitySettings: {},
        notificationSettings: {},
      },
    });

    const result = await updatePreferences({
      accessibilityPreferences: {
        colorBlindMode: 'deuteranopia',
        focusIndicatorStyle: 'subtle',
      },
    });

    expect(apiClient.patch).toHaveBeenCalled();
    expect(result.data).toBeDefined();
  });

  it('accepts terminalGlowIntensity in themePreferences', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: {
        profileId: '12345678-1234-1234-1234-123456789012',
        tenantId: '12345678-1234-1234-1234-123456789013',
        userId: '12345678-1234-1234-1234-123456789014',
        locale: 'en',
        timezone: 'UTC',
        preferences: {
          themePreferences: {
            terminalGlowIntensity: 50,
          },
          accessibilityPreferences: {},
          animationPreferences: {},
          gameplayPreferences: {},
          audioPreferences: {},
          accountPreferences: {},
        },
        policyLockedPreferences: {},
        accessibilitySettings: {},
        notificationSettings: {},
      },
    });

    const result = await updatePreferences({
      themePreferences: {
        terminalGlowIntensity: 50,
      },
    });

    expect(apiClient.patch).toHaveBeenCalled();
    expect(result.data).toBeDefined();
  });
});
