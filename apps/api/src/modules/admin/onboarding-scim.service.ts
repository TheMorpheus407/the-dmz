import { eq, sql } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../config.js';
import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  tenants,
  type OnboardingState,
  type OnboardingStep,
} from '../../shared/database/schema/index.js';
import * as scimService from '../scim/scim.service.js'; // eslint-disable-line import-x/no-restricted-paths
import { createAuditLog } from '../audit/audit.service.js'; // eslint-disable-line import-x/no-restricted-paths

import {
  DEFAULT_ONBOARDING_STATE,
  getNextStep,
  OnboardingError,
} from './onboarding-coordinator.service.js';

export interface ScimTokenResult {
  tenantId: string;
  state: OnboardingState;
  tokenId: string;
  token?: string;
  completed: boolean;
  nextStep: OnboardingStep | null;
}

export const generateScimToken = async (
  tenantId: string,
  userId: string,
  tokenName: string,
  config: AppConfig = loadConfig(),
): Promise<ScimTokenResult> => {
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

  if (!currentState.completedSteps.includes('idp_config')) {
    throw new OnboardingError(
      'Must complete IdP configuration before generating SCIM token',
      'INVALID_STEP',
      400,
    );
  }

  const result = await scimService.generateScimToken(config, tenantId, tokenName, [
    'scim.read',
    'scim.write',
  ]);

  const completedSteps = currentState.completedSteps.includes('scim_token')
    ? currentState.completedSteps
    : [...currentState.completedSteps, 'scim_token'];

  const nextStep = getNextStep('scim_token');

  const newState: OnboardingState = {
    ...currentState,
    currentStep: nextStep ?? 'scim_token',
    completedSteps: completedSteps as OnboardingStep[],
    scimTokenId: result.tokenId,
  };

  await db
    .update(tenants)
    .set({
      onboardingState: newState,
      updatedAt: sql`now()`,
    })
    .where(eq(tenants.tenantId, tenantId));

  await createAuditLog(
    {
      tenantId,
      userId,
      action: 'onboarding_scim_token_generated',
      resourceType: 'tenant',
      resourceId: tenantId,
      metadata: { tokenName },
    },
    config,
  );

  return {
    tenantId,
    state: newState,
    tokenId: result.tokenId,
    token: result.token,
    completed: completedSteps.includes('scim_token'),
    nextStep,
  };
};
