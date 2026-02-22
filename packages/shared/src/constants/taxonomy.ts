export const THREAT_TIERS = ['LOW', 'GUARDED', 'ELEVATED', 'HIGH', 'SEVERE'] as const;

export type ThreatTier = (typeof THREAT_TIERS)[number];

export const THREAT_TIER_RANKS: Record<ThreatTier, number> = {
  LOW: 1,
  GUARDED: 2,
  ELEVATED: 3,
  HIGH: 4,
  SEVERE: 5,
};

export const THREAT_TIER_METADATA: Record<
  ThreatTier,
  {
    label: string;
    rank: number;
    narrativeContext: string;
    minDay: number;
  }
> = {
  LOW: {
    label: 'LOW',
    rank: 1,
    narrativeContext: 'Standard operational conditions with minimal security concerns.',
    minDay: 1,
  },
  GUARDED: {
    label: 'GUARDED',
    rank: 2,
    narrativeContext: 'Elevated awareness with increased monitoring but no active threats.',
    minDay: 1,
  },
  ELEVATED: {
    label: 'ELEVATED',
    rank: 3,
    narrativeContext: 'Active security concerns requiring heightened preparedness.',
    minDay: 1,
  },
  HIGH: {
    label: 'HIGH',
    rank: 4,
    narrativeContext: 'Imminent threat detected with significant risk of incursion.',
    minDay: 1,
  },
  SEVERE: {
    label: 'SEVERE',
    rank: 5,
    narrativeContext: 'Critical security breach with maximum threat level active.',
    minDay: 1,
  },
};

export const THEME_IDS = ['green', 'amber', 'high-contrast', 'enterprise'] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const SURFACE_IDS = ['game', 'admin', 'auth', 'public'] as const;

export type SurfaceId = (typeof SURFACE_IDS)[number];

export const THEME_METADATA: Record<
  ThemeId,
  {
    label: string;
    effectsEnabled: boolean;
    isAccessibility: boolean;
    defaultForSurfaces: SurfaceId[];
  }
> = {
  green: {
    label: 'Green',
    effectsEnabled: true,
    isAccessibility: false,
    defaultForSurfaces: ['game'],
  },
  amber: {
    label: 'Amber',
    effectsEnabled: true,
    isAccessibility: false,
    defaultForSurfaces: [],
  },
  'high-contrast': {
    label: 'High Contrast',
    effectsEnabled: false,
    isAccessibility: true,
    defaultForSurfaces: [],
  },
  enterprise: {
    label: 'Enterprise',
    effectsEnabled: false,
    isAccessibility: false,
    defaultForSurfaces: ['admin', 'auth', 'public'],
  },
};

export function isThreatTier(value: unknown): value is ThreatTier {
  return THREAT_TIERS.includes(value as ThreatTier);
}

export function isThemeId(value: unknown): value is ThemeId {
  return THEME_IDS.includes(value as ThemeId);
}

export function isSurfaceId(value: unknown): value is SurfaceId {
  return SURFACE_IDS.includes(value as SurfaceId);
}

export function getThreatTierRank(tier: ThreatTier): number {
  return THREAT_TIER_RANKS[tier];
}

export function compareThreatTiers(a: ThreatTier, b: ThreatTier): number {
  return THREAT_TIER_RANKS[a] - THREAT_TIER_RANKS[b];
}
