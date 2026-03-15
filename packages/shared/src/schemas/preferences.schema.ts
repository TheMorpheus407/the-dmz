import { z } from 'zod';

import { THEME_IDS, SURFACE_IDS } from '../constants/taxonomy.js';

export const DIFFICULTY_LEVELS = ['tutorial', 'easy', 'normal', 'hard'] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export const COLOR_BLIND_MODES = ['none', 'protanopia', 'deuteranopia', 'tritanopia'] as const;
export type ColorBlindMode = (typeof COLOR_BLIND_MODES)[number];

export const FOCUS_INDICATOR_STYLES = ['subtle', 'strong'] as const;
export type FocusIndicatorStyle = (typeof FOCUS_INDICATOR_STYLES)[number];

export const PRIVACY_MODES = ['public', 'friends', 'private'] as const;
export type PrivacyMode = (typeof PRIVACY_MODES)[number];

export const effectStateSchema = z
  .object({
    scanlines: z.boolean(),
    curvature: z.boolean(),
    glow: z.boolean(),
    noise: z.boolean(),
    vignette: z.boolean(),
    flicker: z.boolean(),
  })
  .strict();

export type EffectState = z.infer<typeof effectStateSchema>;

export const effectIntensitySchema = z
  .object({
    scanlines: z.number().min(0).max(100),
    curvature: z.number().min(0).max(100),
    glow: z.number().min(0).max(100),
    noise: z.number().min(0).max(100),
    vignette: z.number().min(0).max(100),
    flicker: z.number().min(0).max(100),
  })
  .strict();

export type EffectIntensity = z.infer<typeof effectIntensitySchema>;

export const defaultEffectIntensity: EffectIntensity = {
  scanlines: 70,
  curvature: 50,
  glow: 60,
  noise: 30,
  vignette: 50,
  flicker: 40,
};

export const defaultEffectStates: Record<string, EffectState> = {
  green: {
    scanlines: true,
    curvature: true,
    glow: true,
    noise: false,
    vignette: true,
    flicker: true,
  },
  amber: {
    scanlines: true,
    curvature: true,
    glow: true,
    noise: false,
    vignette: true,
    flicker: true,
  },
  'high-contrast': {
    scanlines: false,
    curvature: false,
    glow: false,
    noise: false,
    vignette: false,
    flicker: false,
  },
  enterprise: {
    scanlines: false,
    curvature: false,
    glow: false,
    noise: false,
    vignette: false,
    flicker: false,
  },
};

export const themePreferencesSchema = z
  .object({
    theme: z.enum(THEME_IDS).optional(),
    enableTerminalEffects: z.boolean().optional(),
    effects: effectStateSchema.optional(),
    effectIntensity: effectIntensitySchema.optional(),
    fontSize: z.number().min(12).max(32).optional(),
    terminalGlowIntensity: z.number().min(0).max(100).optional(),
  })
  .strict();

export type ThemePreferences = z.infer<typeof themePreferencesSchema>;

export const accessibilityPreferencesSchema = z
  .object({
    reducedMotion: z.boolean().optional(),
    highContrast: z.boolean().optional(),
    fontSize: z.number().min(12).max(32).optional(),
    colorBlindMode: z.enum(COLOR_BLIND_MODES).optional(),
    screenReaderAnnouncements: z.boolean().optional(),
    keyboardNavigationHints: z.boolean().optional(),
    focusIndicatorStyle: z.enum(FOCUS_INDICATOR_STYLES).optional(),
  })
  .strict();

export type AccessibilityPreferences = z.infer<typeof accessibilityPreferencesSchema>;

export const animationPreferencesSchema = z
  .object({
    enableAnimations: z.boolean().optional(),
    enableGlowPulse: z.boolean().optional(),
    enableTypewriter: z.boolean().optional(),
    enableScreenFlicker: z.boolean().optional(),
    typewriterSpeed: z.number().min(20).max(100).optional(),
  })
  .strict();

export type AnimationPreferences = z.infer<typeof animationPreferencesSchema>;

export const defaultAnimationPreferences: AnimationPreferences = {
  enableAnimations: true,
  enableGlowPulse: true,
  enableTypewriter: true,
  enableScreenFlicker: true,
  typewriterSpeed: 40,
};

export const AUDIO_CATEGORY_VOLUMES = ['alerts', 'ui', 'ambient', 'narrative', 'effects'] as const;
export type AudioCategoryVolume = (typeof AUDIO_CATEGORY_VOLUMES)[number];

export const NOTIFICATION_CATEGORY_VOLUMES = ['master', 'alerts', 'ui', 'ambient'] as const;
export type NotificationCategoryVolume = (typeof NOTIFICATION_CATEGORY_VOLUMES)[number];

export const gameplayPreferencesSchema = z
  .object({
    difficulty: z.enum(DIFFICULTY_LEVELS).optional(),
    notificationVolume: z.number().min(0).max(100).optional(),
    notificationCategoryVolumes: z
      .record(z.enum(NOTIFICATION_CATEGORY_VOLUMES), z.number().min(0).max(100))
      .optional(),
    notificationDuration: z.number().min(1).max(30).optional(),
    autoAdvanceTiming: z.number().min(0).max(30).optional(),
    queueBuildupRate: z.number().min(1).max(10).optional(),
  })
  .strict();

export type GameplayPreferences = z.infer<typeof gameplayPreferencesSchema>;

export const defaultGameplayPreferences: GameplayPreferences = {
  difficulty: 'normal',
  notificationVolume: 80,
  notificationCategoryVolumes: {
    master: 80,
    alerts: 80,
    ui: 60,
    ambient: 50,
  },
  notificationDuration: 5,
  autoAdvanceTiming: 0,
  queueBuildupRate: 3,
};

export const audioPreferencesSchema = z
  .object({
    masterVolume: z.number().min(0).max(100).optional(),
    categoryVolumes: z
      .record(z.enum(AUDIO_CATEGORY_VOLUMES), z.number().min(0).max(100))
      .optional(),
    muteAll: z.boolean().optional(),
    textToSpeechEnabled: z.boolean().optional(),
    textToSpeechSpeed: z.number().min(50).max(200).optional(),
  })
  .strict();

export type AudioPreferences = z.infer<typeof audioPreferencesSchema>;

export const defaultAudioPreferences: AudioPreferences = {
  masterVolume: 80,
  categoryVolumes: {
    alerts: 80,
    ui: 60,
    ambient: 50,
    narrative: 70,
    effects: 80,
  },
  muteAll: false,
  textToSpeechEnabled: false,
  textToSpeechSpeed: 100,
};

export const accountPreferencesSchema = z
  .object({
    displayName: z.string().min(1).max(50).optional(),
    privacyMode: z.enum(PRIVACY_MODES).optional(),
  })
  .strict();

export type AccountPreferences = z.infer<typeof accountPreferencesSchema>;

export const defaultAccountPreferences: AccountPreferences = {
  displayName: undefined,
  privacyMode: 'public',
};

export const userPreferencesSchema = z
  .object({
    themePreferences: themePreferencesSchema.optional(),
    accessibilityPreferences: accessibilityPreferencesSchema.optional(),
    animationPreferences: animationPreferencesSchema.optional(),
    gameplayPreferences: gameplayPreferencesSchema.optional(),
    audioPreferences: audioPreferencesSchema.optional(),
    accountPreferences: accountPreferencesSchema.optional(),
  })
  .strict();

export type UserPreferences = z.infer<typeof userPreferencesSchema>;

export const preferenceSourceSchema = z.enum(['policy', 'server', 'local', 'os', 'default']);

export type PreferenceSource = z.infer<typeof preferenceSourceSchema>;

export const effectivePreferenceValueSchema = z
  .object({
    value: z.unknown(),
    source: preferenceSourceSchema,
  })
  .strict();

export type EffectivePreferenceValue<T = unknown> = z.infer<
  typeof effectivePreferenceValueSchema
> & {
  value: T;
};

export const effectiveThemePreferencesSchema = z
  .object({
    theme: effectivePreferenceValueSchema.nullable(),
    enableTerminalEffects: effectivePreferenceValueSchema.nullable(),
    effects: effectivePreferenceValueSchema.nullable(),
    effectIntensity: effectivePreferenceValueSchema.nullable(),
    fontSize: effectivePreferenceValueSchema.nullable(),
    terminalGlowIntensity: effectivePreferenceValueSchema.nullable(),
  })
  .strict();

export type EffectiveThemePreferences = z.infer<typeof effectiveThemePreferencesSchema>;

export const effectiveAccessibilityPreferencesSchema = z
  .object({
    reducedMotion: effectivePreferenceValueSchema.nullable(),
    highContrast: effectivePreferenceValueSchema.nullable(),
    fontSize: effectivePreferenceValueSchema.nullable(),
    colorBlindMode: effectivePreferenceValueSchema.nullable(),
    screenReaderAnnouncements: effectivePreferenceValueSchema.nullable(),
    keyboardNavigationHints: effectivePreferenceValueSchema.nullable(),
    focusIndicatorStyle: effectivePreferenceValueSchema.nullable(),
  })
  .strict();

export type EffectiveAccessibilityPreferences = z.infer<
  typeof effectiveAccessibilityPreferencesSchema
>;

export const effectiveAnimationPreferencesSchema = z
  .object({
    enableAnimations: effectivePreferenceValueSchema.nullable().optional(),
    enableGlowPulse: effectivePreferenceValueSchema.nullable().optional(),
    enableTypewriter: effectivePreferenceValueSchema.nullable().optional(),
    enableScreenFlicker: effectivePreferenceValueSchema.nullable().optional(),
    typewriterSpeed: effectivePreferenceValueSchema.nullable().optional(),
  })
  .strict();

export type EffectiveAnimationPreferences = z.infer<typeof effectiveAnimationPreferencesSchema>;

export const effectiveGameplayPreferencesSchema = z
  .object({
    difficulty: effectivePreferenceValueSchema.nullable(),
    notificationVolume: effectivePreferenceValueSchema.nullable(),
    notificationCategoryVolumes: effectivePreferenceValueSchema.nullable(),
    notificationDuration: effectivePreferenceValueSchema.nullable(),
    autoAdvanceTiming: effectivePreferenceValueSchema.nullable(),
    queueBuildupRate: effectivePreferenceValueSchema.nullable(),
  })
  .strict();

export type EffectiveGameplayPreferences = z.infer<typeof effectiveGameplayPreferencesSchema>;

export const effectiveAudioPreferencesSchema = z
  .object({
    masterVolume: effectivePreferenceValueSchema.nullable(),
    categoryVolumes: effectivePreferenceValueSchema.nullable(),
    muteAll: effectivePreferenceValueSchema.nullable(),
    textToSpeechEnabled: effectivePreferenceValueSchema.nullable(),
    textToSpeechSpeed: effectivePreferenceValueSchema.nullable(),
  })
  .strict();

export type EffectiveAudioPreferences = z.infer<typeof effectiveAudioPreferencesSchema>;

export const effectiveAccountPreferencesSchema = z
  .object({
    displayName: effectivePreferenceValueSchema.nullable(),
    privacyMode: effectivePreferenceValueSchema.nullable(),
  })
  .strict();

export type EffectiveAccountPreferences = z.infer<typeof effectiveAccountPreferencesSchema>;

export const effectivePreferencesSchema = z
  .object({
    themePreferences: effectiveThemePreferencesSchema.optional(),
    accessibilityPreferences: effectiveAccessibilityPreferencesSchema.optional(),
    animationPreferences: effectiveAnimationPreferencesSchema.optional(),
    gameplayPreferences: effectiveGameplayPreferencesSchema.optional(),
    audioPreferences: effectiveAudioPreferencesSchema.optional(),
    accountPreferences: effectiveAccountPreferencesSchema.optional(),
  })
  .strict();

export type EffectivePreferences = z.infer<typeof effectivePreferencesSchema>;

export const updatePreferencesSchema = z
  .object({
    themePreferences: themePreferencesSchema.optional(),
    accessibilityPreferences: accessibilityPreferencesSchema.optional(),
    animationPreferences: animationPreferencesSchema.optional(),
    gameplayPreferences: gameplayPreferencesSchema.optional(),
    audioPreferences: audioPreferencesSchema.optional(),
    accountPreferences: accountPreferencesSchema.optional(),
  })
  .strict();

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

export const policyLockedPreferencesSchema = z
  .object({
    theme: z.boolean().optional(),
    enableTerminalEffects: z.boolean().optional(),
    effects: z.record(z.boolean()).optional(),
    effectIntensity: z.record(z.number()).optional(),
    fontSize: z.boolean().optional(),
    terminalGlowIntensity: z.boolean().optional(),
    reducedMotion: z.boolean().optional(),
    highContrast: z.boolean().optional(),
    colorBlindMode: z.boolean().optional(),
    screenReaderAnnouncements: z.boolean().optional(),
    keyboardNavigationHints: z.boolean().optional(),
    focusIndicatorStyle: z.boolean().optional(),
    enableAnimations: z.boolean().optional(),
    enableGlowPulse: z.boolean().optional(),
    enableTypewriter: z.boolean().optional(),
    enableScreenFlicker: z.boolean().optional(),
    difficulty: z.boolean().optional(),
    notificationVolume: z.boolean().optional(),
    notificationCategoryVolumes: z.boolean().optional(),
    notificationDuration: z.boolean().optional(),
    autoAdvanceTiming: z.boolean().optional(),
    queueBuildupRate: z.boolean().optional(),
    masterVolume: z.boolean().optional(),
    categoryVolumes: z.boolean().optional(),
    muteAll: z.boolean().optional(),
    textToSpeechEnabled: z.boolean().optional(),
    textToSpeechSpeed: z.boolean().optional(),
    displayName: z.boolean().optional(),
    privacyMode: z.boolean().optional(),
  })
  .strict();

export type PolicyLockedPreferences = z.infer<typeof policyLockedPreferencesSchema>;

export const routeDefaultsSchema = z.record(z.enum(SURFACE_IDS), userPreferencesSchema);

export type RouteDefaults = z.infer<typeof routeDefaultsSchema>;

export const defaultRoutePreferences: RouteDefaults = {
  game: {
    themePreferences: {
      theme: 'green',
    },
  },
  admin: {
    themePreferences: {
      theme: 'enterprise',
    },
  },
  auth: {
    themePreferences: {
      theme: 'enterprise',
    },
  },
  public: {
    themePreferences: {
      theme: 'enterprise',
    },
  },
};
