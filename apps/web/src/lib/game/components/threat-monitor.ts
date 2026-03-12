import type { ThreatTier } from '@the-dmz/shared/constants';

export type ThreatStatus = 'ACTIVE' | 'MONITORING' | 'CONTAINED' | 'RESOLVED';

export type SecurityToolStatus = 'ACTIVE' | 'NOT_INSTALLED' | 'OFFLINE';

export interface ActiveThreat {
  id: string;
  name: string;
  type: string;
  description: string;
  detectedAt: string;
  detectedDay: number;
  status: ThreatStatus;
  metrics: {
    blocked?: number;
    intercepted?: number;
    missed?: number;
    alerts?: number;
    flagged?: number;
  };
}

export interface SecurityTool {
  id: string;
  name: string;
  status: SecurityToolStatus;
  icon: string;
  dailyMetrics: {
    blockingCount?: number;
    alerts?: number;
    flagged?: number;
  };
  cost?: number;
}

export interface ThreatHistoryDay {
  day: number;
  label: string;
  threatLevel: ThreatTier | null;
  hasBreach: boolean;
}

export interface ThreatMonitorData {
  currentThreatLevel: ThreatTier;
  threatLevelSince: string;
  threatLevelSinceDay: number;
  activeThreats: ActiveThreat[];
  securityTools: SecurityTool[];
  threatHistory: ThreatHistoryDay[];
}
