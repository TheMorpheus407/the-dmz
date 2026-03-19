import {
  dataCategories,
  actionOnExpiryOptions,
  type DataCategory,
  type ActionOnExpiry,
  type RetentionPolicy,
  type ArchivedData,
  DEFAULT_RETENTION_DAYS,
  MIN_AUDIT_RETENTION_DAYS,
  FRAMEWORK_RETENTION_DAYS,
} from '../../db/schema/retention/index.js';

export {
  dataCategories,
  actionOnExpiryOptions,
  DEFAULT_RETENTION_DAYS,
  MIN_AUDIT_RETENTION_DAYS,
  FRAMEWORK_RETENTION_DAYS,
};
export type { DataCategory, ActionOnExpiry, RetentionPolicy, ArchivedData };

export interface CreateRetentionPolicyInput {
  dataCategory: DataCategory;
  retentionDays: number;
  actionOnExpiry: ActionOnExpiry;
}

export interface UpdateRetentionPolicyInput {
  retentionDays?: number;
  actionOnExpiry?: ActionOnExpiry;
  legalHold?: boolean;
}

export interface RetentionPolicyWithEffectiveDays extends RetentionPolicy {
  effectiveRetentionDays: number;
  effectiveAction: ActionOnExpiry;
}

export interface ArchivedDataRetrieval {
  id: string;
  tenantId: string;
  dataCategory: DataCategory;
  originalId: string;
  archiveData: Record<string, unknown>;
  metadata: Record<string, unknown>;
  archivedAt: Date;
  expiresAt: Date | null;
  retrievalCount: number;
}

export interface RetentionJobResult {
  tenantId: string;
  dataCategory: DataCategory;
  jobType: string;
  recordsProcessed: number;
  recordsArchived: number;
  recordsDeleted: number;
  recordsAnonymized: number;
  errors: string[];
  durationMs: number;
}

export interface AnonymizationResult {
  success: boolean;
  originalId: string;
  anonymizedId?: string;
  fieldsAnonymized: string[];
  error?: string;
}

export interface ArchiveResult {
  success: boolean;
  archiveId?: string;
  originalId: string;
  dataCategory: DataCategory;
  compressedSize?: number;
  error?: string;
}

export interface RetentionBatchResult {
  processed: number;
  archived: number;
  deleted: number;
  anonymized: number;
  errors: string[];
}

export interface ComplianceFrameworkTemplate {
  id: string;
  name: string;
  description: string;
  retentionDays: Partial<Record<DataCategory, number>>;
}

export const COMPLIANCE_FRAMEWORK_TEMPLATES: ComplianceFrameworkTemplate[] = [
  {
    id: 'gdpr',
    name: 'GDPR',
    description: 'General Data Protection Regulation (EU)',
    retentionDays: {
      events: 365,
      sessions: 365,
      analytics: 730,
      audit_logs: 2555,
      user_data: -1,
    },
  },
  {
    id: 'hipaa',
    name: 'HIPAA',
    description: 'Health Insurance Portability and Accountability Act (US)',
    retentionDays: {
      events: 2190,
      sessions: 2190,
      analytics: 2190,
      audit_logs: 2190,
      user_data: 2190,
    },
  },
  {
    id: 'sox',
    name: 'SOC 2',
    description: 'Sarbanes-Oxley Act / SOC 2',
    retentionDays: {
      events: 2555,
      sessions: 2555,
      analytics: 2555,
      audit_logs: 2555,
      user_data: 2555,
    },
  },
  {
    id: 'fedramp',
    name: 'FedRAMP',
    description: 'Federal Risk and Authorization Management Program (US)',
    retentionDays: {
      events: 1095,
      sessions: 1095,
      analytics: 1095,
      audit_logs: 1095,
      user_data: 1095,
    },
  },
  {
    id: 'dora',
    name: 'DORA',
    description: 'Digital Operational Resilience Act (EU)',
    retentionDays: {
      events: 1825,
      sessions: 1825,
      analytics: 1825,
      audit_logs: 1825,
      user_data: 1825,
    },
  },
  {
    id: 'pci-dss',
    name: 'PCI-DSS',
    description: 'Payment Card Industry Data Security Standard',
    retentionDays: {
      events: 1095,
      sessions: 1095,
      analytics: 1095,
      audit_logs: 1460,
      user_data: 365,
    },
  },
];

export const BATCH_SIZE = 1000;
export const MAX_CURSOR_AGE_DAYS = 30;
export const ARCHIVE_EXPIRY_DAYS = 30;
export const COMPRESSION_LEVEL = 6;
