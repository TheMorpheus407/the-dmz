import type {
  SessionMacroState,
  DayPhase,
  DecisionType,
  GameThreatTier,
  FacilityTierLevel,
} from './game-engine.js';
import type {
  EmailInstance,
  EmailStatus,
  VerificationPacket,
  GeneratedAttack,
  BreachState,
  CoopContext,
} from '../game/index.js';

export interface GameState {
  sessionId: string;
  userId: string;
  tenantId: string;
  seed: number;
  currentDay: number;
  currentMacroState: SessionMacroState;
  currentPhase: DayPhase;
  funds: number;
  trustScore: number;
  intelFragments: number;
  playerLevel: number;
  playerXP: number;
  threatTier: GameThreatTier;
  facilityTier: FacilityTierLevel;
  facility: FacilityState;
  inbox: EmailState[];
  emailInstances: Record<string, EmailInstance>;
  verificationPackets: Record<string, VerificationPacket>;
  incidents: IncidentState[];
  threats: GeneratedAttack[];
  breachState: BreachState;
  narrativeState: NarrativeState;
  factionRelations: Record<string, number>;
  blacklist: string[];
  whitelist: string[];
  analyticsState: AnalyticsState;
  sequenceNumber: number;
  partyContext?: CoopContext;
  createdAt: string;
  updatedAt: string;
}

export interface EmailState {
  emailId: string;
  status: EmailStatus;
  indicators: string[];
  verificationRequested: boolean;
  timeSpentMs: number;
  openedAt?: string;
}

export interface IncidentState {
  incidentId: string;
  status: 'active' | 'resolved';
  severity: number;
  type: string;
  createdDay: number;
  resolvedDay?: number;
  responseActions: string[];
}

export interface NarrativeState {
  currentChapter: number;
  activeTriggers: string[];
  completedEvents: string[];
}

export interface AnalyticsState {
  totalEmailsProcessed: number;
  totalDecisions: number;
  approvals: number;
  denials: number;
  flags: number;
  verificationsRequested: number;
  incidentsTriggered: number;
  breaches: number;
}

export interface GameAction {
  actionId: string;
  actionType: string;
  sessionId: string;
  userId: string;
  tenantId: string;
  timestamp: string;
  payload: GameActionPayload;
  sequenceNumber: number;
}

export type GameActionPayload =
  | AckDayStartPayload
  | AdvanceDayPayload
  | LoadInboxPayload
  | OpenEmailPayload
  | MarkIndicatorPayload
  | RequestVerificationPayload
  | OpenVerificationPayload
  | CloseVerificationPayload
  | FlagDiscrepancyPayload
  | SubmitDecisionPayload
  | ApplyConsequencesPayload
  | ProcessThreatsPayload
  | ResolveIncidentPayload
  | TriggerBreachPayload
  | PayRansomPayload
  | RefuseRansomPayload
  | AdvanceRecoveryPayload
  | PurchaseUpgradePayload
  | AdjustResourcePayload
  | PauseSessionPayload
  | ResumeSessionPayload
  | AbandonSessionPayload
  | OnboardClientPayload
  | EvictClientPayload
  | UpgradeFacilityTierPayload
  | ProcessFacilityTickPayload
  | PurchaseFacilityUpgradePayload;

export interface LoadInboxPayload {
  type: 'LOAD_INBOX';
  emails: Array<{
    emailId: string;
    sessionId: string;
    dayNumber: number;
    difficulty: number;
    intent: string;
    technique: string;
    threatTier: string;
    faction: string;
    sender: {
      displayName: string;
      emailAddress: string;
      domain: string;
      jobRole: string;
      organization: string;
      relationshipHistory: number;
    };
    headers: {
      messageId: string;
      returnPath: string;
      received: string[];
      spfResult: string;
      dkimResult: string;
      dmarcResult: string;
      originalDate: string;
      subject: string;
    };
    body: {
      preview: string;
      fullBody: string;
      embeddedLinks: Array<{
        displayText: string;
        actualUrl: string;
        isSuspicious: boolean;
      }>;
    };
    attachments: Array<{
      attachmentId: string;
      fileName: string;
      fileType: string;
      fileSize: number;
      hash: string;
      isSuspicious: boolean;
    }>;
    accessRequest: {
      applicantName: string;
      applicantRole: string;
      organization: string;
      requestedAssets: string[];
      requestedServices: string[];
      justification: string;
      urgency: string;
      value: number;
    };
    indicators: Array<{
      indicatorId: string;
      type: string;
      location: string;
      description: string;
      severity: number;
      isVisible: boolean;
    }>;
    groundTruth: {
      isMalicious: boolean;
      correctDecision: string;
      riskScore: number;
      explanation: string;
      consequences: {
        approved: {
          trustImpact: number;
          fundsImpact: number;
          factionImpact: number;
          threatImpact: number;
        };
        denied: {
          trustImpact: number;
          fundsImpact: number;
          factionImpact: number;
          threatImpact: number;
        };
        flagged: {
          trustImpact: number;
          fundsImpact: number;
          factionImpact: number;
          threatImpact: number;
        };
        deferred: {
          trustImpact: number;
          fundsImpact: number;
          factionImpact: number;
          threatImpact: number;
        };
      };
    };
    createdAt: string;
  }>;
}

export interface AckDayStartPayload {
  type: 'ACK_DAY_START';
}

export interface AdvanceDayPayload {
  type: 'ADVANCE_DAY';
}

export interface OpenEmailPayload {
  type: 'OPEN_EMAIL';
  emailId: string;
  viewMode?: string;
}

export interface MarkIndicatorPayload {
  type: 'MARK_INDICATOR';
  emailId: string;
  indicatorType: string;
  location?: string;
  note?: string;
}

export interface RequestVerificationPayload {
  type: 'REQUEST_VERIFICATION';
  emailId: string;
}

export interface OpenVerificationPayload {
  type: 'OPEN_VERIFICATION';
  emailId: string;
  packetId?: string;
}

export interface CloseVerificationPayload {
  type: 'CLOSE_VERIFICATION';
  emailId: string;
}

export interface FlagDiscrepancyPayload {
  type: 'FLAG_DISCREPANCY';
  emailId: string;
  artifactId: string;
  reason: string;
}

export interface SubmitDecisionPayload {
  type: 'SUBMIT_DECISION';
  emailId: string;
  decision: DecisionType;
  timeSpentMs: number;
  indicators?: string[];
  notes?: string;
}

export interface ApplyConsequencesPayload {
  type: 'APPLY_CONSEQUENCES';
  dayNumber: number;
  summaryId?: string;
}

export interface ProcessThreatsPayload {
  type: 'PROCESS_THREATS';
  dayNumber: number;
  threatSeed?: number;
}

export interface ResolveIncidentPayload {
  type: 'RESOLVE_INCIDENT';
  incidentId: string;
  responseActions: string[];
  notes?: string;
}

export interface TriggerBreachPayload {
  type: 'TRIGGER_BREACH';
  triggerType: string;
  severity: 1 | 2 | 3 | 4;
  attackDifficulty?: number;
}

export interface PayRansomPayload {
  type: 'PAY_RANSOM';
  amount: number;
}

export interface RefuseRansomPayload {
  type: 'REFUSE_RANSOM';
}

export interface AdvanceRecoveryPayload {
  type: 'ADVANCE_RECOVERY';
}

export interface PurchaseUpgradePayload {
  type: 'PURCHASE_UPGRADE';
  upgradeId: string;
  purchaseContext?: string;
}

export interface AdjustResourcePayload {
  type: 'ADJUST_RESOURCE';
  resourceId: string;
  delta: number;
  reason?: string;
}

export interface PauseSessionPayload {
  type: 'PAUSE_SESSION';
}

export interface ResumeSessionPayload {
  type: 'RESUME_SESSION';
}

export interface AbandonSessionPayload {
  type: 'ABANDON_SESSION';
  reason?: string;
}

export type ResourceType = 'rack' | 'power' | 'cooling' | 'bandwidth';

export type UpgradeCategory = 'capacity' | 'efficiency' | 'security' | 'operations' | 'maintenance';

export type UpgradeStatus = 'available' | 'purchased' | 'installing' | 'completed' | 'maintained';

export type CapacityUpgradeType = 'rack' | 'power' | 'cooling' | 'bandwidth';

export type SecurityUpgradeType =
  | 'firewall'
  | 'ids'
  | 'ips'
  | 'siem'
  | 'edr'
  | 'waf'
  | 'threat_intel_feed'
  | 'soar'
  | 'honeypots'
  | 'zero_trust_gateway'
  | 'ai_anomaly_detection';

export type EfficiencyUpgradeType =
  | 'power_efficiency'
  | 'cooling_efficiency'
  | 'bandwidth_efficiency';

export type OperationsUpgradeType = 'monitoring' | 'maintenance_automation' | 'redundancy';

export type MaintenanceUpgradeType = 'preventive_maintenance' | 'rapid_repair' | 'diagnostics';

export type UpgradeType =
  | CapacityUpgradeType
  | SecurityUpgradeType
  | EfficiencyUpgradeType
  | OperationsUpgradeType
  | MaintenanceUpgradeType;

export interface ResourceDelta {
  rackCapacity?: number;
  powerCapacity?: number;
  coolingCapacity?: number;
  bandwidthCapacity?: number;
  rackUsage?: number;
  powerUsage?: number;
  coolingUsage?: number;
  bandwidthUsage?: number;
  efficiencyMultiplier?: number;
}

export interface SecurityDelta {
  breachProbabilityModifier?: number;
  detectionProbabilityModifier?: number;
  mitigationBonus?: number;
  threatVectorModifiers?: Record<string, number>;
}

export interface UpgradeDefinition {
  id: string;
  category: UpgradeCategory;
  name: string;
  description: string;
  baseCost: number;
  installationDays: number;
  installationOverhead?: number;
  minTier: string;
  prerequisites: string[];
  resourceDelta: ResourceDelta;
  securityDelta?: SecurityDelta;
  maintenanceDelta?: number;
  opExPerDay: number;
  threatSurfaceDelta: number;
}

export type ResourceUtilizationLevel = 'normal' | 'advisory' | 'critical' | 'failure';

export interface FacilityResourceCapacities {
  rackCapacityU: number;
  powerCapacityKw: number;
  coolingCapacityTons: number;
  bandwidthCapacityMbps: number;
}

export interface FacilityResourceUsage {
  rackUsedU: number;
  powerUsedKw: number;
  coolingUsedTons: number;
  bandwidthUsedMbps: number;
}

export interface ClientLease {
  clientId: string;
  clientName: string;
  organization: string;
  rackUnitsU: number;
  powerKw: number;
  coolingTons: number;
  bandwidthMbps: number;
  dailyRate: number;
  leaseStartDay: number;
  leaseEndDay: number | null;
  isActive: boolean;
  burstProfile: 'steady' | 'moderate' | 'spiky';
}

export interface FacilityUpgrade {
  upgradeId: string;
  upgradeType: UpgradeType;
  category: UpgradeCategory;
  tierLevel: number;
  status: UpgradeStatus;
  purchasedDay: number;
  completesDay?: number;
  isCompleted: boolean;
  completionDay?: number;
  resourceDelta: ResourceDelta;
  securityDelta?: SecurityDelta;
  maintenanceDelta?: number;
  opExPerDay: number;
  threatSurfaceDelta: number;
  installationOverhead?: number;
}

export interface FacilityState {
  tier: string;
  capacities: FacilityResourceCapacities;
  usage: FacilityResourceUsage;
  clients: ClientLease[];
  upgrades: FacilityUpgrade[];
  maintenanceDebt: number;
  facilityHealth: number;
  operatingCostPerDay: number;
  securityToolOpExPerDay: number;
  attackSurfaceScore: number;
  lastTickDay: number;
}

export interface OnboardClientPayload {
  type: 'ONBOARD_CLIENT';
  clientId: string;
  clientName: string;
  organization: string;
  rackUnitsU: number;
  powerKw: number;
  coolingTons: number;
  bandwidthMbps: number;
  dailyRate: number;
  durationDays?: number;
  burstProfile?: 'steady' | 'moderate' | 'spiky';
}

export interface EvictClientPayload {
  type: 'EVICT_CLIENT';
  clientId: string;
  reason?: string;
}

export interface UpgradeFacilityTierPayload {
  type: 'UPGRADE_FACILITY_TIER';
  targetTier: string;
}

export interface ProcessFacilityTickPayload {
  type: 'PROCESS_FACILITY_TICK';
  dayNumber: number;
}

export interface PurchaseFacilityUpgradePayload {
  type: 'PURCHASE_FACILITY_UPGRADE';
  upgradeType: UpgradeType;
  category: UpgradeCategory;
}
