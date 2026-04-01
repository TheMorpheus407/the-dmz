import { eq, sql } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../config.js';
import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  tenants,
  type OnboardingState,
  type OnboardingStep,
  type RegulatoryRegion,
  type ComplianceCoordinatorContact,
} from '../../shared/database/schema/index.js';
import { createAuditLog } from '../audit/audit.service.js'; // eslint-disable-line import-x/no-restricted-paths

import {
  DEFAULT_ONBOARDING_STATE,
  getNextStep,
  OnboardingError,
} from './onboarding-coordinator.service.js';

export interface ComplianceResult {
  tenantId: string;
  state: OnboardingState;
  frameworks: string[];
  regulatoryRegion: RegulatoryRegion | undefined;
  complianceCoordinatorContact: ComplianceCoordinatorContact | undefined;
  completed: boolean;
  nextStep: OnboardingStep | null;
}

export const saveComplianceFrameworks = async (
  tenantId: string,
  userId: string,
  data: {
    frameworks: string[];
    regulatoryRegion: RegulatoryRegion | undefined;
    complianceCoordinatorContact: ComplianceCoordinatorContact | undefined;
  },
  config: AppConfig = loadConfig(),
): Promise<ComplianceResult> => {
  const { frameworks, regulatoryRegion, complianceCoordinatorContact } = data;
  const db = getDatabaseClient(config);

  const [tenant] = await db
    .select({
      tenantId: tenants.tenantId,
      onboardingState: tenants.onboardingState,
    })
    .from(tenants)
    .where(eq(tenants.tenantId, tenantId))
    .limit(1);

  if (!tenant) {
    throw new OnboardingError('Tenant not found', 'TENANT_NOT_FOUND', 404);
  }

  const currentState = (tenant.onboardingState as OnboardingState) || DEFAULT_ONBOARDING_STATE;

  if (!currentState.completedSteps.includes('scim_token')) {
    throw new OnboardingError(
      'Must generate SCIM token before selecting compliance frameworks',
      'INVALID_STEP',
      400,
    );
  }

  const completedSteps = currentState.completedSteps.includes('compliance')
    ? currentState.completedSteps
    : [...currentState.completedSteps, 'compliance'];

  const nextStep = getNextStep('compliance');

  const newState: OnboardingState = {
    ...currentState,
    currentStep: nextStep ?? 'compliance',
    completedSteps: completedSteps as OnboardingStep[],
    complianceFrameworks: frameworks,
    regulatoryRegion,
    complianceCoordinatorContact,
  };

  await db
    .update(tenants)
    .set({
      complianceFrameworks: frameworks as unknown as Record<string, unknown>,
      onboardingState: newState,
      updatedAt: sql`now()`,
    })
    .where(eq(tenants.tenantId, tenantId));

  await createAuditLog(
    {
      tenantId,
      userId,
      action: 'onboarding_compliance_frameworks_saved',
      resourceType: 'tenant',
      resourceId: tenantId,
      metadata: { frameworks },
    },
    config,
  );

  return {
    tenantId,
    state: newState,
    frameworks,
    regulatoryRegion,
    complianceCoordinatorContact,
    completed: completedSteps.includes('compliance'),
    nextStep,
  };
};
