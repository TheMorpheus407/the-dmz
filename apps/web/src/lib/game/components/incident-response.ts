export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export type IncidentStatus =
  | 'open'
  | 'investigating'
  | 'contained'
  | 'eradicated'
  | 'recovered'
  | 'closed';

export type EvidenceEventType = 'breach' | 'escalation' | 'response' | 'detection' | 'containment';

export interface EvidenceLogEntry {
  id: string;
  timestamp: string;
  day: number;
  eventType: EvidenceEventType;
  affectedSystem: string;
  severity: IncidentSeverity;
  description: string;
  rawLogData: string[];
}

export interface ContainmentAction {
  id: string;
  type: 'isolate' | 'lockdown' | 'patch';
  name: string;
  description: string;
  costCredits: number;
  riskLevel: 'low' | 'medium' | 'high';
  expectedOutcome: string;
  requiresBandwidth?: boolean;
  bandwidthCost?: number;
  affectsTrust?: boolean;
  trustImpact?: number;
}

export interface RecoveryAction {
  id: string;
  type: 'restore' | 'negotiate' | 'investigate';
  name: string;
  description: string;
  costCredits: number;
  successProbability: number;
  timeRequired: number;
  requiresRackSpace?: boolean;
  rackSpaceCost?: number;
  isRansomActive?: boolean;
}

export interface IncidentResponseData {
  incidentId: string;
  title: string;
  type: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  detectedAt: string;
  detectedDay: number;
  affectedSystems: string[];
  currentFunds: number;
  currentBandwidth: number;
  currentRackSpace: number;
  currentTrust: number;
  hasActiveRansom: boolean;
  ransomAmount?: number;
  evidenceLog: EvidenceLogEntry[];
  containmentActions: ContainmentAction[];
  recoveryActions: RecoveryAction[];
  availableResponseActions: string[];
}

export interface PlayerResources {
  credits: number;
  bandwidth: number;
  rackSpace: number;
  trust: number;
}
