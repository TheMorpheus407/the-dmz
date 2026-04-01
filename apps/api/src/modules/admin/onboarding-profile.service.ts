import { eq, sql } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../config.js';
import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  tenants,
  type OnboardingState,
  type OnboardingStep,
  type OrgProfileData,
} from '../../shared/database/schema/index.js';
import { createAuditLog } from '../audit/audit.service.js'; // eslint-disable-line import-x/no-restricted-paths

import {
  DEFAULT_ONBOARDING_STATE,
  getNextStep,
  OnboardingError,
} from './onboarding-coordinator.service.js';

export interface OrgProfileResult {
  tenantId: string;
  state: OnboardingState;
  completed: boolean;
  nextStep: OnboardingStep | null;
}

export const saveOrgProfile = async (
  tenantId: string,
  userId: string,
  profile: OrgProfileData,
  config: AppConfig = loadConfig(),
): Promise<OrgProfileResult> => {
  const db = getDatabaseClient(config);

  if (!profile.name || !profile.domain) {
    throw new OnboardingError('Organization name and domain are required', 'VALIDATION_ERROR', 400);
  }

  if (!profile.industry) {
    throw new OnboardingError('Industry is required', 'VALIDATION_ERROR', 400);
  }

  if (!profile.companySize) {
    throw new OnboardingError('Company size is required', 'VALIDATION_ERROR', 400);
  }

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

  if (
    currentState.currentStep !== 'org_profile' &&
    !currentState.completedSteps.includes('org_profile')
  ) {
    throw new OnboardingError('Cannot save org profile at this step', 'INVALID_STEP', 400);
  }

  const completedSteps = currentState.completedSteps.includes('org_profile')
    ? currentState.completedSteps
    : [...currentState.completedSteps, 'org_profile'];

  const nextStep = getNextStep('org_profile');

  const newState: OnboardingState = {
    ...currentState,
    currentStep: nextStep ?? 'org_profile',
    completedSteps: completedSteps as OnboardingStep[],
    orgProfile: profile,
  };

  await db
    .update(tenants)
    .set({
      name: profile.name,
      domain: profile.domain,
      onboardingState: newState,
      updatedAt: sql`now()`,
    })
    .where(eq(tenants.tenantId, tenantId));

  await createAuditLog(
    {
      tenantId,
      userId,
      action: 'onboarding_org_profile_saved',
      resourceType: 'tenant',
      resourceId: tenantId,
      metadata: { domain: profile.domain, industry: profile.industry },
    },
    config,
  );

  return {
    tenantId,
    state: newState,
    completed: completedSteps.includes('org_profile'),
    nextStep,
  };
};
