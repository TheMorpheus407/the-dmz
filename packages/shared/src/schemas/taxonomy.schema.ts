import { z } from 'zod';

import {
  THREAT_TIERS,
  THEME_IDS,
  SURFACE_IDS,
  type ThreatTier,
  type ThemeId,
  type SurfaceId,
} from '../constants/taxonomy.js';

export const threatTierSchema = z.enum(THREAT_TIERS);

export type ThreatTierInput = z.input<typeof threatTierSchema>;
export type ThreatTierOutput = z.output<typeof threatTierSchema>;

export const themeIdSchema = z.enum(THEME_IDS);

export type ThemeIdInput = z.input<typeof themeIdSchema>;
export type ThemeIdOutput = z.output<typeof themeIdSchema>;

export const surfaceIdSchema = z.enum(SURFACE_IDS);

export type SurfaceIdInput = z.input<typeof surfaceIdSchema>;
export type SurfaceIdOutput = z.output<typeof surfaceIdSchema>;

export function parseThreatTier(input: ThreatTierInput): ThreatTier {
  return threatTierSchema.parse(input);
}

export function parseThemeId(input: ThemeIdInput): ThemeId {
  return themeIdSchema.parse(input);
}

export function parseSurfaceId(input: SurfaceIdInput): SurfaceId {
  return surfaceIdSchema.parse(input);
}

export function safeParseThreatTier(input: ThreatTierInput): ThreatTier | null {
  const result = threatTierSchema.safeParse(input);
  return result.success ? result.data : null;
}

export function safeParseThemeId(input: ThemeIdInput): ThemeId | null {
  const result = themeIdSchema.safeParse(input);
  return result.success ? result.data : null;
}

export function safeParseSurfaceId(input: SurfaceIdInput): SurfaceId | null {
  const result = surfaceIdSchema.safeParse(input);
  return result.success ? result.data : null;
}
