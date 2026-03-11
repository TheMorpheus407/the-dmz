import type { DocumentType } from '@the-dmz/shared';

export type { DocumentType };

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
export type SystemStatus = 'online' | 'degraded' | 'offline';
export type UpgradePriority = 'low' | 'medium' | 'high';
export type ExceptionStatus = 'pending' | 'approved' | 'denied' | 'expired';

export interface IncidentEvent {
  id: string;
  timestamp: string;
  event: string;
  actor: string;
  system?: string;
}

export interface AffectedSystem {
  id: string;
  name: string;
  type: string;
  status: SystemStatus;
  lastHealthCheck: string;
}

export interface IncidentLogData {
  incidentId: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  detectedAt: string;
  lastUpdated: string;
  description: string;
  affectedSystems: AffectedSystem[];
  events: IncidentEvent[];
  assignedTo?: string;
  resolutionNotes?: string;
}

export interface ThreatIndicator {
  id: string;
  category: string;
  name: string;
  description: string;
  severity: RiskLevel;
  detected: boolean;
}

export interface FactionIntel {
  factionId: string;
  factionName: string;
  threatLevel: RiskLevel;
  knownActivities: string[];
  confidence: number;
}

export interface RecommendedAction {
  id: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  estimatedImpact: string;
}

export interface ThreatAssessmentData {
  assessmentId: string;
  emailId: string;
  overallRiskLevel: RiskLevel;
  overallScore: number;
  generatedAt: string;
  factionIntel: FactionIntel[];
  indicators: ThreatIndicator[];
  recommendedActions: RecommendedAction[];
  summary: string;
}

export interface DataSalvageContractData {
  contractId: string;
  clientName: string;
  clientId: string;
  dataTypes: string[];
  estimatedRecoveryPercentage: number;
  recoveryDeadline: string;
  serviceLevelAgreement: string;
  paymentTerms: string;
  liabilityClause: string;
  dataCustodian: string;
}

export interface StorageLeaseAgreementData {
  agreementId: string;
  providerName: string;
  rackUnits: number;
  powerAllocation: string;
  bandwidthLimit: string;
  monthlyCost: number;
  contractDuration: string;
  includedSupport: string;
  terminationClause: string;
  dataCenterLocation: string;
}

export interface UpgradeProposalData {
  proposalId: string;
  title: string;
  targetSystem: string;
  currentVersion: string;
  proposedVersion: string;
  benefits: string[];
  risks: string[];
  cost: number;
  estimatedDowntime: string;
  prerequisites: string[];
  expectedRoi: string;
  priority: UpgradePriority;
}

export interface BlacklistNoticeData {
  noticeId: string;
  entityId: string;
  entityName: string;
  reasonCode: string;
  reasonDescription: string;
  effectiveDate: string;
  expirationDate?: string;
  appealProcess: string;
  addedBy: string;
}

export interface WhitelistExceptionData {
  exceptionId: string;
  entityId: string;
  entityName: string;
  exceptionType: string;
  conditions: string[];
  approvedBy: string;
  approvalDate: string;
  expirationDate?: string;
  status: ExceptionStatus;
}

export interface SystemHealthMetric {
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
}

export interface SystemHealth {
  id: string;
  name: string;
  uptime: string;
  load: number;
  memory: number;
  cpu: number;
  lastUpdated: string;
}

export interface FacilityStatusReportData {
  reportId: string;
  facilityName: string;
  location: string;
  totalRackCapacity: number;
  occupiedRacks: number;
  totalPowerAvailable: string;
  powerConsumption: string;
  coolingStatus: string;
  securityLevel: string;
  lastInspection: string;
  systems: SystemHealth[];
  metrics: SystemHealthMetric[];
}

export interface IntelligenceBriefData {
  briefId: string;
  classification: ClassificationLevel;
  subject: string;
  threatSummary: string;
  affectedSectors: string[];
  recommendedActions: string[];
  sources: string[];
  confidenceLevel: string;
  validityPeriod: string;
  createdBy: string;
  createdAt: string;
}

export interface RansomNoteData {
  noteId: string;
  targetSystem: string;
  encryptionAlgorithm: string;
  ransomAmount: string;
  paymentDeadline: string;
  paymentInstructions: string;
  uniqueKey: string;
  message: string;
  affectedSystems: string[];
  missedIndicators: string[];
}

export type ThreatLevel = 'LOW' | 'GUARDED' | 'ELEVATED' | 'HIGH' | 'SEVERE';

export type ClassificationLevel = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';

export interface DocumentHeader {
  documentId: string;
  documentType: DocumentType;
  title: string;
  issuer: string;
  issuedDate: string;
  classification: ClassificationLevel;
}

export interface DocumentFooter {
  signatureBlock?: string;
  hashReference?: string;
  chainOfCustody?: string;
}

export interface CrossReference {
  targetDocumentId: string;
  targetField: string;
  sourceField: string;
}

export interface DocumentLink {
  id: string;
  displayText: string;
  targetDocumentId: string;
}

export interface DocumentAnnotation {
  id: string;
  fieldId: string;
  type: 'highlight' | 'flag' | 'note';
  content?: string;
  createdAt: string;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const RISK_COLORS: Record<RiskLevel, string> = {
  LOW: 'var(--color-safe)',
  MEDIUM: 'var(--color-warning)',
  HIGH: 'var(--color-danger)',
  CRITICAL: 'var(--color-critical)',
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

export function getRiskColor(level: RiskLevel): string {
  return RISK_COLORS[level];
}

export function getRiskLabel(level: RiskLevel): string {
  return RISK_LABELS[level];
}

export const CLASSIFICATION_COLORS: Record<ClassificationLevel, string> = {
  PUBLIC: 'var(--color-safe)',
  INTERNAL: 'var(--color-info)',
  CONFIDENTIAL: 'var(--color-warning)',
  RESTRICTED: 'var(--color-danger)',
};

export function getClassificationColor(level: ClassificationLevel): string {
  return CLASSIFICATION_COLORS[level];
}

export function getClassificationLabel(level: ClassificationLevel): string {
  return level;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  EMAIL: 'Email Access Request',
  PAW: 'Phishing Analysis Worksheet',
  VERIFICATION_PACKET: 'Verification Packet',
  THREAT_ASSESSMENT: 'Threat Assessment Sheet',
  INCIDENT_LOG: 'Incident Log',
  DATA_SALVAGE_CONTRACT: 'Data Salvage Contract',
  STORAGE_LEASE: 'Storage Lease Agreement',
  UPGRADE_PROPOSAL: 'Upgrade Proposal',
  BLACKLIST_NOTICE: 'Blacklist Notice',
  WHITELIST_EXCEPTION: 'Whitelist Exception',
  FACILITY_REPORT: 'Facility Status Report',
  INTELLIGENCE_BRIEF: 'Intelligence Brief',
  RANSOM_NOTE: 'Ransom Note',
};

export function getDocumentTypeLabel(type: DocumentType): string {
  return DOCUMENT_TYPE_LABELS[type];
}

export function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
