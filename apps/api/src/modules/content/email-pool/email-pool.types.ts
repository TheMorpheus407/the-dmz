export interface PooledEmail {
  emailId: string;
  templateId: string;
  difficulty: number;
  quality: number;
  intent: 'legitimate' | 'malicious' | 'ambiguous';
  attackType?: string;
  faction?: string;
  season?: number;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface PoolMetadata {
  difficulty: number;
  count: number;
  targetSize: number;
  lowWatermark: number;
  highWatermark: number;
  lastRefillAt?: string;
  lastGenerationLatencyMs?: number;
}

export interface PoolHealth {
  difficulty: number;
  currentCount: number;
  targetSize: number;
  percentage: number;
  isLow: boolean;
  isHigh: boolean;
  needsRefill: boolean;
}

export interface PoolMetrics {
  totalPoolSize: number;
  tierMetrics: PoolHealth[];
  lastRefillAt?: string;
  generationLatencyMs?: number;
}

export interface AddEmailOptions {
  emailId: string;
  templateId: string;
  difficulty: number;
  quality: number;
  intent: 'legitimate' | 'malicious' | 'ambiguous';
  attackType?: string;
  faction?: string;
  season?: number;
  metadata?: Record<string, unknown>;
}

export interface PopEmailResult {
  email: PooledEmail;
  quality: number;
  selectionMethod: 'weighted' | 'random';
}

export const DIFFICULTY_TIERS = [1, 2, 3, 4, 5] as const;
export type DifficultyTier = (typeof DIFFICULTY_TIERS)[number];

export const POOL_CONFIG = {
  TARGET_TOTAL_SIZE: 200,
  TARGET_PER_TIER: 40,
  LOW_WATERMARK_PERCENT: 0.2,
  HIGH_WATERMARK_PERCENT: 0.8,
} as const;

export const POOL_KEYS = {
  pool: (difficulty: number, tenantId: string) =>
    `email_pool:difficulty:${difficulty}:tenant:${tenantId}`,
  qualitySet: (difficulty: number, tenantId: string) =>
    `email_pool:quality:${difficulty}:tenant:${tenantId}`,
  metadata: (difficulty: number, tenantId: string) =>
    `email_pool:metadata:${difficulty}:tenant:${tenantId}`,
  totalCount: (tenantId: string) => `email_pool:total:tenant:${tenantId}`,
} as const;
