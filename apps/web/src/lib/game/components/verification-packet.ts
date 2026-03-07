import type {
  VerificationPacket,
  VerificationArtifact,
  VerificationDocumentType,
} from '@the-dmz/shared';

export interface IdentityData {
  requesterName: string;
  requesterRole: string;
  organization: string;
  contactEmail: string;
  contactPhone: string;
  verificationStatus: 'verified' | 'unverified' | 'flagged' | 'suspended';
  discrepancies: Discrepancy[];
}

export interface OwnershipData {
  assetName: string;
  assetType: string;
  currentOwner: string;
  custodian: string;
  authorizationChain: AuthorizationEntry[];
  previousAccessHistory: AccessHistoryEntry[];
  discrepancies: Discrepancy[];
}

export interface ChainOfCustodyData {
  timeline: TimelineEntry[];
  approvers: ApproverEntry[];
  auditTrail: AuditEntry[];
  discrepancies: Discrepancy[];
}

export interface Discrepancy {
  fieldId: string;
  fieldLabel: string;
  claimedValue: string;
  verifiedValue: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface AuthorizationEntry {
  id: string;
  authorizedBy: string;
  role: string;
  authorizedDate: string;
  scope: string;
}

export interface AccessHistoryEntry {
  id: string;
  accessor: string;
  accessDate: string;
  action: string;
  result: 'approved' | 'denied' | 'flagged';
}

export interface TimelineEntry {
  id: string;
  timestamp: string;
  event: string;
  actor: string;
  details: string;
}

export interface ApproverEntry {
  id: string;
  name: string;
  role: string;
  approvalDate: string;
  status: 'approved' | 'pending' | 'rejected';
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
  result: string;
}

export interface FlaggedDiscrepancy {
  fieldId: string;
  fieldLabel: string;
  notes: string;
  flaggedAt: string;
}

export const VALIDITY_COLORS: Record<VerificationArtifact['validityIndicator'], string> = {
  valid: 'var(--color-safe)',
  suspicious: 'var(--color-warning)',
  invalid: 'var(--color-danger)',
  unknown: 'var(--color-archived)',
};

export const VALIDITY_LABELS: Record<VerificationArtifact['validityIndicator'], string> = {
  valid: 'VALID',
  suspicious: 'SUSPICIOUS',
  invalid: 'INVALID',
  unknown: 'UNKNOWN',
};

export function getValidityColor(indicator: VerificationArtifact['validityIndicator']): string {
  return VALIDITY_COLORS[indicator] || VALIDITY_COLORS.unknown;
}

export function getValidityLabel(indicator: VerificationArtifact['validityIndicator']): string {
  return VALIDITY_LABELS[indicator] || VALIDITY_LABELS.unknown;
}

export function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  };
  return date.toLocaleString('en-US', options);
}

const DOCUMENT_TYPE_LABELS: Record<VerificationDocumentType, string> = {
  id_document: 'ID Document',
  employee_badge: 'Employee Badge',
  account_record: 'Account Record',
  registration: 'Registration',
  transfer_log: 'Transfer Log',
  approval_chain: 'Approval Chain',
  threat_assessment: 'Threat Assessment',
  faction_report: 'Faction Report',
};

export function getDocumentTypeLabel(type: VerificationDocumentType): string {
  return DOCUMENT_TYPE_LABELS[type] || type;
}

function getMetadataValue(obj: Record<string, unknown>, key: string): string {
  const value = obj[key];
  return typeof value === 'string' ? value : '';
}

function getMetadataArray<T>(obj: Record<string, unknown>, key: string): T[] {
  const value = obj[key];
  return Array.isArray(value) ? (value as T[]) : [];
}

export function extractIdentityData(artifacts: VerificationArtifact[]): IdentityData {
  const idDoc = artifacts.find((a) => a.documentType === 'id_document');
  const badge = artifacts.find((a) => a.documentType === 'employee_badge');
  const registration = artifacts.find((a) => a.documentType === 'registration');

  const metadata: Record<string, unknown> = {
    ...(idDoc?.metadata || {}),
    ...(badge?.metadata || {}),
    ...(registration?.metadata || {}),
  };

  const discrepancies: Discrepancy[] = [];
  if (idDoc?.validityIndicator === 'suspicious' || idDoc?.validityIndicator === 'invalid') {
    discrepancies.push({
      fieldId: 'id_document',
      fieldLabel: 'ID Document',
      claimedValue: getMetadataValue(metadata, 'claimedName') || 'N/A',
      verifiedValue: getMetadataValue(metadata, 'verifiedName') || 'N/A',
      severity: idDoc.validityIndicator === 'invalid' ? 'high' : 'medium',
      description: 'ID document verification failed',
    });
  }

  return {
    requesterName: getMetadataValue(metadata, 'requesterName') || 'Unknown',
    requesterRole: getMetadataValue(metadata, 'requesterRole') || 'Unknown',
    organization: getMetadataValue(metadata, 'organization') || 'Unknown',
    contactEmail: getMetadataValue(metadata, 'contactEmail') || 'Unknown',
    contactPhone: getMetadataValue(metadata, 'contactPhone') || '',
    verificationStatus:
      idDoc?.validityIndicator === 'valid'
        ? 'verified'
        : idDoc?.validityIndicator === 'invalid'
          ? 'flagged'
          : 'unverified',
    discrepancies,
  };
}

export function extractOwnershipData(artifacts: VerificationArtifact[]): OwnershipData {
  const accountRecord = artifacts.find((a) => a.documentType === 'account_record');
  const transferLog = artifacts.find((a) => a.documentType === 'transfer_log');

  const metadata: Record<string, unknown> = {
    ...(accountRecord?.metadata || {}),
    ...(transferLog?.metadata || {}),
  };

  const discrepancies: Discrepancy[] = [];
  if (
    accountRecord?.validityIndicator === 'suspicious' ||
    accountRecord?.validityIndicator === 'invalid'
  ) {
    discrepancies.push({
      fieldId: 'account_record',
      fieldLabel: 'Account Record',
      claimedValue: getMetadataValue(metadata, 'claimedOwner') || 'N/A',
      verifiedValue: getMetadataValue(metadata, 'verifiedOwner') || 'N/A',
      severity: accountRecord.validityIndicator === 'invalid' ? 'high' : 'medium',
      description: 'Account ownership verification failed',
    });
  }

  const authChain = getMetadataArray<AuthorizationEntry>(metadata, 'authorizationChain');
  const accessHistory = getMetadataArray<AccessHistoryEntry>(metadata, 'previousAccessHistory');

  return {
    assetName: getMetadataValue(metadata, 'assetName') || 'Unknown Asset',
    assetType: getMetadataValue(metadata, 'assetType') || 'Unknown',
    currentOwner: getMetadataValue(metadata, 'currentOwner') || 'Unknown',
    custodian: getMetadataValue(metadata, 'custodian') || 'Unknown',
    authorizationChain: authChain,
    previousAccessHistory: accessHistory,
    discrepancies,
  };
}

export function extractChainOfCustodyData(artifacts: VerificationArtifact[]): ChainOfCustodyData {
  const approvalChain = artifacts.find((a) => a.documentType === 'approval_chain');
  const threatAssessment = artifacts.find((a) => a.documentType === 'threat_assessment');

  const metadata: Record<string, unknown> = {
    ...(approvalChain?.metadata || {}),
    ...(threatAssessment?.metadata || {}),
  };

  const discrepancies: Discrepancy[] = [];
  if (
    approvalChain?.validityIndicator === 'suspicious' ||
    approvalChain?.validityIndicator === 'invalid'
  ) {
    discrepancies.push({
      fieldId: 'approval_chain',
      fieldLabel: 'Approval Chain',
      claimedValue: 'Chain verified',
      verifiedValue:
        approvalChain.validityIndicator === 'invalid' ? 'Invalid' : 'Discrepancies found',
      severity: approvalChain.validityIndicator === 'invalid' ? 'high' : 'medium',
      description: 'Approval chain verification failed',
    });
  }

  const timeline = getMetadataArray<TimelineEntry>(metadata, 'timeline');
  const approvers = getMetadataArray<ApproverEntry>(metadata, 'approvers');
  const auditTrail = getMetadataArray<AuditEntry>(metadata, 'auditTrail');

  return {
    timeline,
    approvers,
    auditTrail,
    discrepancies,
  };
}

export interface VerificationPacketViewerProps {
  packet: VerificationPacket;
  emailId: string;
  onFlagDiscrepancy?: (discrepancy: FlaggedDiscrepancy) => void;
  onClose?: () => void;
}

export type TabId = 'identity' | 'ownership' | 'chain-of-custody';
