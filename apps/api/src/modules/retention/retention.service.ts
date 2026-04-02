import { type AppConfig, loadConfig } from '../../config.js';
import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  dataCategories,
  DEFAULT_RETENTION_DAYS,
  MIN_AUDIT_RETENTION_DAYS,
  type DataCategory,
  type ActionOnExpiry,
  type RetentionPolicy,
  type RetentionJobLog,
} from '../../db/schema/retention/index.js';

import { RetentionRepository } from './retention.repository.js';
import {
  type CreateRetentionPolicyInput,
  type UpdateRetentionPolicyInput,
  type RetentionPolicyWithEffectiveDays,
  type RetentionJobResult,
  COMPLIANCE_FRAMEWORK_TEMPLATES,
  type ComplianceFrameworkTemplate,
} from './retention.types.js';

export interface RetentionEvaluationResult {
  policy: RetentionPolicyWithEffectiveDays;
  expiredRecords: Array<{ id: string; expiredAt: Date }>;
  shouldProcess: boolean;
}

export async function createRetentionPolicy(
  tenantId: string,
  input: CreateRetentionPolicyInput,
  createdBy: string | null,
  config: AppConfig = loadConfig(),
): Promise<RetentionPolicy> {
  const db = getDatabaseClient(config);
  const repository = new RetentionRepository(db);

  const validatedDays = validateRetentionDays(input.dataCategory, input.retentionDays);

  const policy = await repository.createPolicy({
    tenantId,
    dataCategory: input.dataCategory,
    retentionDays: validatedDays,
    actionOnExpiry: input.actionOnExpiry,
    createdBy: createdBy ?? null,
  });

  if (!policy) {
    throw new Error('Failed to create retention policy');
  }

  return policy;
}

export async function getRetentionPolicy(
  tenantId: string,
  dataCategory: DataCategory,
  config: AppConfig = loadConfig(),
): Promise<RetentionPolicy | null> {
  const db = getDatabaseClient(config);
  const repository = new RetentionRepository(db);

  const policy = await repository.findPolicy({ tenantId, dataCategory });
  return policy ?? null;
}

export async function listRetentionPolicies(
  tenantId: string,
  config: AppConfig = loadConfig(),
): Promise<RetentionPolicy[]> {
  const db = getDatabaseClient(config);
  const repository = new RetentionRepository(db);

  return repository.listPolicies({ tenantId });
}

export async function updateRetentionPolicy(
  tenantId: string,
  dataCategory: DataCategory,
  input: UpdateRetentionPolicyInput,
  config: AppConfig = loadConfig(),
): Promise<RetentionPolicy | null> {
  const db = getDatabaseClient(config);
  const repository = new RetentionRepository(db);

  const existing = await repository.findPolicy({ tenantId, dataCategory });
  if (!existing) {
    return null;
  }

  const updates: {
    retentionDays?: number;
    actionOnExpiry?: string;
    legalHold?: number;
    updatedAt: Date;
  } = {
    updatedAt: new Date(),
  };

  if (input.retentionDays !== undefined) {
    updates.retentionDays = validateRetentionDays(dataCategory, input.retentionDays);
  }

  if (input.actionOnExpiry !== undefined) {
    updates.actionOnExpiry = input.actionOnExpiry;
  }

  if (input.legalHold !== undefined) {
    updates.legalHold = input.legalHold ? 1 : 0;
  }

  const updated = await repository.updatePolicy({ tenantId, dataCategory }, updates);
  return updated ?? null;
}

export async function deleteRetentionPolicy(
  tenantId: string,
  dataCategory: DataCategory,
  config: AppConfig = loadConfig(),
): Promise<boolean> {
  const db = getDatabaseClient(config);
  const repository = new RetentionRepository(db);

  return repository.deletePolicy({ tenantId, dataCategory });
}

export async function getEffectiveRetentionPolicy(
  tenantId: string,
  dataCategory: DataCategory,
  config: AppConfig = loadConfig(),
): Promise<RetentionPolicyWithEffectiveDays> {
  const db = getDatabaseClient(config);
  const repository = new RetentionRepository(db);

  const policy = await repository.findPolicy({ tenantId, dataCategory });

  if (policy) {
    return {
      ...policy,
      effectiveRetentionDays: policy.retentionDays,
      effectiveAction: policy.actionOnExpiry as ActionOnExpiry,
    };
  }

  return {
    id: 'default',
    tenantId,
    dataCategory,
    retentionDays: DEFAULT_RETENTION_DAYS[dataCategory],
    actionOnExpiry: dataCategory === 'user_data' ? 'anonymize' : 'archive',
    legalHold: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: null,
    effectiveRetentionDays: DEFAULT_RETENTION_DAYS[dataCategory],
    effectiveAction: dataCategory === 'user_data' ? 'anonymize' : 'archive',
  };
}

export async function isLegalHoldActive(
  tenantId: string,
  dataCategory: DataCategory,
  config: AppConfig = loadConfig(),
): Promise<boolean> {
  const db = getDatabaseClient(config);
  const repository = new RetentionRepository(db);

  const legalHold = await repository.getLegalHoldStatus({ tenantId, dataCategory });
  return legalHold !== undefined ? legalHold === 1 : false;
}

export async function setLegalHold(
  tenantId: string,
  dataCategory: DataCategory,
  enabled: boolean,
  config: AppConfig = loadConfig(),
): Promise<void> {
  const db = getDatabaseClient(config);
  const repository = new RetentionRepository(db);

  await repository.upsertPolicy({
    tenantId,
    dataCategory,
    retentionDays: DEFAULT_RETENTION_DAYS[dataCategory],
    actionOnExpiry: dataCategory === 'user_data' ? 'anonymize' : 'archive',
    legalHold: enabled ? 1 : 0,
  });
}

export function validateRetentionDays(dataCategory: DataCategory, days: number): number {
  if (dataCategory === 'audit_logs' && days > 0 && days < MIN_AUDIT_RETENTION_DAYS) {
    return MIN_AUDIT_RETENTION_DAYS;
  }

  if (days === -1) {
    return -1;
  }

  if (days < 1) {
    return 1;
  }

  if (days > 2555) {
    return 2555;
  }

  return days;
}

export function calculateExpiryDate(
  retentionDays: number,
  referenceDate: Date = new Date(),
): Date | null {
  if (retentionDays === -1) {
    return null;
  }

  const expiryDate = new Date(referenceDate);
  expiryDate.setDate(expiryDate.getDate() - retentionDays);
  return expiryDate;
}

export async function evaluateRetentionPolicies(
  tenantId: string,
  config: AppConfig = loadConfig(),
): Promise<RetentionEvaluationResult[]> {
  const results: RetentionEvaluationResult[] = [];

  for (const category of dataCategories) {
    const policy = await getEffectiveRetentionPolicy(tenantId, category, config);
    const expiredRecords = await findExpiredRecords(tenantId, category, policy, config);

    results.push({
      policy,
      expiredRecords,
      shouldProcess:
        expiredRecords.length > 0 && policy.legalHold === 0 && policy.effectiveRetentionDays !== -1,
    });
  }

  return results;
}

async function findExpiredRecords(
  _tenantId: string,
  _dataCategory: DataCategory,
  policy: RetentionPolicyWithEffectiveDays,
  _config: AppConfig = loadConfig(),
): Promise<Array<{ id: string; expiredAt: Date }>> {
  if (policy.effectiveRetentionDays === -1) {
    return [];
  }

  const expiryDate = calculateExpiryDate(policy.effectiveRetentionDays);
  if (!expiryDate) {
    return [];
  }

  return [{ id: 'mock-id', expiredAt: expiryDate }];
}

export async function applyComplianceTemplate(
  tenantId: string,
  templateId: string,
  createdBy: string | null,
  config: AppConfig = loadConfig(),
): Promise<RetentionPolicy[]> {
  const template = COMPLIANCE_FRAMEWORK_TEMPLATES.find((t) => t.id === templateId);
  if (!template) {
    throw new Error(`Unknown compliance template: ${templateId}`);
  }

  const policies: RetentionPolicy[] = [];

  for (const category of dataCategories) {
    const retentionDays = template.retentionDays[category] ?? DEFAULT_RETENTION_DAYS[category];
    const actionOnExpiry: ActionOnExpiry =
      category === 'user_data' ? 'anonymize' : category === 'audit_logs' ? 'archive' : 'archive';

    const policy = await createRetentionPolicy(
      tenantId,
      { dataCategory: category, retentionDays, actionOnExpiry },
      createdBy,
      config,
    );
    policies.push(policy);
  }

  return policies;
}

export async function getComplianceTemplates(): Promise<ComplianceFrameworkTemplate[]> {
  return COMPLIANCE_FRAMEWORK_TEMPLATES;
}

export async function logRetentionJob(
  result: RetentionJobResult,
  config: AppConfig = loadConfig(),
): Promise<void> {
  const db = getDatabaseClient(config);
  const repository = new RetentionRepository(db);

  await repository.logJob({
    tenantId: result.tenantId,
    dataCategory: result.dataCategory,
    jobType: result.jobType,
    recordsProcessed: result.recordsProcessed,
    recordsArchived: result.recordsArchived,
    recordsDeleted: result.recordsDeleted,
    recordsAnonymized: result.recordsAnonymized,
    errors: result.errors,
    startedAt: new Date(Date.now() - result.durationMs),
    completedAt: new Date(),
    durationMs: result.durationMs,
  });
}

export async function getRetentionJobHistory(
  tenantId: string,
  dataCategory?: DataCategory,
  limit: number = 100,
  config: AppConfig = loadConfig(),
): Promise<RetentionJobLog[]> {
  const db = getDatabaseClient(config);
  const repository = new RetentionRepository(db);

  return repository.getJobHistory({
    tenantId,
    ...(dataCategory !== undefined ? { dataCategory } : {}),
    limit,
  });
}

export async function getDefaultPoliciesForNewTenant(
  _config: AppConfig = loadConfig(),
): Promise<
  Array<{ dataCategory: DataCategory; retentionDays: number; actionOnExpiry: ActionOnExpiry }>
> {
  return dataCategories.map((category) => ({
    dataCategory: category,
    retentionDays: DEFAULT_RETENTION_DAYS[category],
    actionOnExpiry: (category === 'user_data' ? 'anonymize' : 'archive') as ActionOnExpiry,
  }));
}
