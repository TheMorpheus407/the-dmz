import type { DecisionType, GameThreatTier } from '../types/game-engine.js';

export interface EmailInstance {
  emailId: string;
  sessionId: string;
  dayNumber: number;
  difficulty: EmailDifficulty;
  intent: EmailIntent;
  technique: EmailTechnique;
  threatTier: GameThreatTier;
  faction: string;
  sender: EmailSender;
  headers: EmailHeaders;
  body: EmailBody;
  attachments: EmailAttachment[];
  accessRequest: AccessRequest;
  indicators: EmailIndicator[];
  groundTruth: EmailGroundTruth;
  createdAt: string;
}

export interface EmailSender {
  displayName: string;
  emailAddress: string;
  domain: string;
  jobRole: string;
  organization: string;
  relationshipHistory: number;
}

export interface EmailHeaders {
  messageId: string;
  returnPath: string;
  received: string[];
  spfResult: 'pass' | 'fail' | 'softfail' | 'none';
  dkimResult: 'pass' | 'fail' | 'none';
  dmarcResult: 'pass' | 'fail' | 'none';
  originalDate: string;
  subject: string;
}

export interface EmailBody {
  preview: string;
  fullBody: string;
  embeddedLinks: EmbeddedLink[];
}

export interface EmbeddedLink {
  displayText: string;
  actualUrl: string;
  isSuspicious: boolean;
}

export interface EmailAttachment {
  attachmentId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  hash: string;
  isSuspicious: boolean;
}

export interface AccessRequest {
  applicantName: string;
  applicantRole: string;
  organization: string;
  requestedAssets: string[];
  requestedServices: string[];
  justification: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  value: number;
}

export interface EmailIndicator {
  indicatorId: string;
  type: IndicatorType;
  location: IndicatorLocation;
  description: string;
  severity: number;
  isVisible: boolean;
}

export type IndicatorType =
  | 'domain_mismatch'
  | 'sender_display_mismatch'
  | 'suspicious_link'
  | 'url_mismatch'
  | 'urgency_cue'
  | 'authority_claim'
  | 'grammar_anomaly'
  | 'tone_mismatch'
  | 'attachment_suspicious'
  | 'attachment_mismatch'
  | 'date_inconsistency'
  | 'signature_missing'
  | 'organization_mismatch'
  | 'request_anomaly';

export type IndicatorLocation = 'sender' | 'subject' | 'body' | 'header' | 'attachment' | 'link';

export interface EmailGroundTruth {
  isMalicious: boolean;
  correctDecision: DecisionType;
  riskScore: number;
  explanation: string;
  consequences: GroundTruthConsequences;
}

export interface GroundTruthConsequences {
  approved: ConsequenceDetails;
  denied: ConsequenceDetails;
  flagged: ConsequenceDetails;
  deferred: ConsequenceDetails;
}

export interface ConsequenceDetails {
  trustImpact: number;
  fundsImpact: number;
  factionImpact: number;
  threatImpact: number;
}

export type EmailDifficulty = 1 | 2 | 3 | 4 | 5;

export type EmailIntent = 'legitimate' | 'malicious' | 'ambiguous';

export type EmailTechnique =
  | 'phishing'
  | 'spear_phishing'
  | 'bec'
  | 'credential_harvesting'
  | 'malware_delivery'
  | 'pretexting'
  | 'supply_chain'
  | 'insider_threat';

export const EMAIL_STATUS = {
  PENDING: 'pending',
  OPENED: 'opened',
  FLAGGED: 'flagged',
  REQUEST_VERIFICATION: 'request_verification',
  APPROVED: 'approved',
  DENIED: 'denied',
  DEFERRED: 'deferred',
} as const;

export type EmailStatus = (typeof EMAIL_STATUS)[keyof typeof EMAIL_STATUS];

export interface EmailQueueItem {
  email: EmailInstance;
  status: EmailStatus;
  receivedAt: string;
  age: number;
  order: number;
}

export type VerificationDocumentType =
  | 'id_document'
  | 'employee_badge'
  | 'account_record'
  | 'registration'
  | 'transfer_log'
  | 'approval_chain'
  | 'threat_assessment'
  | 'faction_report';

export interface VerificationArtifact {
  artifactId: string;
  documentType: VerificationDocumentType;
  title: string;
  description: string;
  issuer: string;
  issuedDate: string;
  validityIndicator: 'valid' | 'suspicious' | 'invalid' | 'unknown';
  metadata: Record<string, unknown>;
}

export interface VerificationPacket {
  packetId: string;
  emailId: string;
  sessionId: string;
  createdAt: string;
  artifacts: VerificationArtifact[];
  hasIntelligenceBrief: boolean;
}

export interface VerificationState {
  currentPacket: VerificationPacket | null;
  flaggedDiscrepancies: string[];
  reviewedArtifacts: string[];
}
