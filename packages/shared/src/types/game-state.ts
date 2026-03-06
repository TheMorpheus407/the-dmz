import type {
  SessionMacroState,
  DayPhase,
  DecisionType,
  GameThreatTier,
  FacilityTierLevel,
} from './game-engine.js';
import type { EmailInstance, VerificationPacket } from '../game/email-instance.js';

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
  inbox: EmailState[];
  emailInstances: Record<string, EmailInstance>;
  verificationPackets: Record<string, VerificationPacket>;
  incidents: IncidentState[];
  narrativeState: NarrativeState;
  factionRelations: Record<string, number>;
  blacklist: string[];
  whitelist: string[];
  analyticsState: AnalyticsState;
  sequenceNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmailState {
  emailId: string;
  status:
    | 'pending'
    | 'opened'
    | 'flagged'
    | 'request_verification'
    | 'approved'
    | 'denied'
    | 'deferred';
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
  | PurchaseUpgradePayload
  | AdjustResourcePayload
  | PauseSessionPayload
  | ResumeSessionPayload
  | AbandonSessionPayload;

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
