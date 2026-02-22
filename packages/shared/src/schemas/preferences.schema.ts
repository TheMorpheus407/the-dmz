import { z } from 'zod';

import { THEME_IDS, SURFACE_IDS } from '../constants/taxonomy.js';

export const effectStateSchema = z
  .object({
    scanlines: z.boolean(),
    curvature: z.boolean(),
    glow: z.boolean(),
    noise: z.boolean(),
    vignette: z.boolean(),
  })
  .strict();

export type EffectState = z.infer<typeof effectStateSchema>;

export const defaultEffectStates: Record<string, EffectState> = {
  green: {
    scanlines: true,
    curvature: true,
    glow: true,
    noise: false,
    vignette: true,
  },
  amber: {
    scanlines: true,
    curvature: true,
    glow: true,
    noise: false,
    vignette: true,
  },
  'high-contrast': {
    scanlines: false,
    curvature: false,
    glow: false,
    noise: false,
    vignette: false,
  },
  enterprise: {
    scanlines: false,
    curvature: false,
    glow: false,
    noise: false,
    vignette: false,
  },
};

export const themePreferencesSchema = z
  .object({
    theme: z.enum(THEME_IDS).optional(),
    enableTerminalEffects: z.boolean().optional(),
    effects: effectStateSchema.optional(),
    fontSize: z.number().min(12).max(32).optional(),
  })
  .strict();

export type ThemePreferences = z.infer<typeof themePreferencesSchema>;

export const accessibilityPreferencesSchema = z
  .object({
    reducedMotion: z.boolean().optional(),
    highContrast: z.boolean().optional(),
    fontSize: z.number().min(12).max(32).optional(),
  })
  .strict();

export type AccessibilityPreferences = z.infer<typeof accessibilityPreferencesSchema>;

export const userPreferencesSchema = z
  .object({
    themePreferences: themePreferencesSchema.optional(),
    accessibilityPreferences: accessibilityPreferencesSchema.optional(),
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
    fontSize: effectivePreferenceValueSchema.nullable(),
  })
  .strict();

export type EffectiveThemePreferences = z.infer<typeof effectiveThemePreferencesSchema>;

export const effectiveAccessibilityPreferencesSchema = z
  .object({
    reducedMotion: effectivePreferenceValueSchema.nullable(),
    highContrast: effectivePreferenceValueSchema.nullable(),
    fontSize: effectivePreferenceValueSchema.nullable(),
  })
  .strict();

export type EffectiveAccessibilityPreferences = z.infer<
  typeof effectiveAccessibilityPreferencesSchema
>;

export const effectivePreferencesSchema = z
  .object({
    themePreferences: effectiveThemePreferencesSchema.optional(),
    accessibilityPreferences: effectiveAccessibilityPreferencesSchema.optional(),
  })
  .strict();

export type EffectivePreferences = z.infer<typeof effectivePreferencesSchema>;

export const updatePreferencesSchema = z
  .object({
    themePreferences: themePreferencesSchema.optional(),
    accessibilityPreferences: accessibilityPreferencesSchema.optional(),
  })
  .strict();

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

export const policyLockedPreferencesSchema = z
  .object({
    theme: z.boolean().optional(),
    enableTerminalEffects: z.boolean().optional(),
    effects: z.record(z.boolean()).optional(),
    fontSize: z.boolean().optional(),
    reducedMotion: z.boolean().optional(),
    highContrast: z.boolean().optional(),
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
