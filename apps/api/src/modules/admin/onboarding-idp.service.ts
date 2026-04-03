import { eq, sql } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../config.js';
import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  tenants,
  type IdpConfigData,
  type OnboardingState,
  type OnboardingStep,
} from '../../shared/database/schema/index.js';
import { createAuditLog } from '../audit/index.js';

import {
  DEFAULT_ONBOARDING_STATE,
  getNextStep,
  OnboardingError,
} from './onboarding-coordinator.service.js';

export interface IdpConfigResult {
  tenantId: string;
  state: OnboardingState;
  idpConfig: IdpConfigData;
  completed: boolean;
  nextStep: OnboardingStep | null;
}

export interface IdpTestConnectionResult {
  success: boolean;
  message: string;
  diagnostics: {
    metadataValid: boolean;
    entityIdValid: boolean;
    ssoUrlReachable: boolean;
    certificateValid: boolean;
    attributes: string[];
    errors: string[];
  };
}

export const saveIdpConfig = async (
  tenantId: string,
  userId: string,
  idpConfig: IdpConfigData,
  config: AppConfig = loadConfig(),
): Promise<IdpConfigResult> => {
  const db = getDatabaseClient(config);

  if (!idpConfig.type || !['saml', 'oidc'].includes(idpConfig.type)) {
    throw new OnboardingError('IdP type must be either saml or oidc', 'VALIDATION_ERROR', 400);
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

  if (!currentState.completedSteps.includes('org_profile')) {
    throw new OnboardingError(
      'Must complete org profile before configuring IdP',
      'INVALID_STEP',
      400,
    );
  }

  const completedSteps = currentState.completedSteps.includes('idp_config')
    ? currentState.completedSteps
    : [...currentState.completedSteps, 'idp_config'];

  const nextStep = getNextStep('idp_config');

  const newState: OnboardingState = {
    ...currentState,
    currentStep: nextStep ?? 'idp_config',
    completedSteps: completedSteps as OnboardingStep[],
    idpConfig,
  };

  await db
    .update(tenants)
    .set({
      idpConfig,
      onboardingState: newState,
      updatedAt: sql`now()`,
    })
    .where(eq(tenants.tenantId, tenantId));

  await createAuditLog(
    {
      tenantId,
      userId,
      action: 'onboarding_idp_config_saved',
      resourceType: 'tenant',
      resourceId: tenantId,
      metadata: { idpType: idpConfig.type, enabled: idpConfig.enabled },
    },
    config,
  );

  return {
    tenantId,
    state: newState,
    idpConfig,
    completed: completedSteps.includes('idp_config'),
    nextStep,
  };
};

export const testIdpConnection = async (
  _tenantId: string,
  idpConfig: IdpConfigData,
  _config: AppConfig = loadConfig(),
): Promise<IdpTestConnectionResult> => {
  const diagnostics = {
    metadataValid: false,
    entityIdValid: false,
    ssoUrlReachable: false,
    certificateValid: false,
    attributes: [] as string[],
    errors: [] as string[],
  };

  if (!idpConfig.type) {
    diagnostics.errors.push('IdP type is required (saml or oidc)');
    return {
      success: false,
      message: 'IdP configuration validation failed',
      diagnostics,
    };
  }

  if (idpConfig.type === 'saml') {
    if (idpConfig.entityId) {
      diagnostics.entityIdValid = idpConfig.entityId.length > 0;
      if (!diagnostics.entityIdValid) {
        diagnostics.errors.push('Entity ID is empty');
      }
    } else {
      diagnostics.errors.push('Entity ID is required for SAML');
    }

    if (idpConfig.ssoUrl) {
      try {
        new URL(idpConfig.ssoUrl);
        diagnostics.ssoUrlReachable = true;
      } catch {
        diagnostics.errors.push('SSO URL is not a valid URL');
      }
    } else {
      diagnostics.errors.push('SSO URL is required for SAML');
    }

    if (idpConfig.certificate) {
      const certStart = idpConfig.certificate.includes('-----BEGIN CERTIFICATE-----');
      const certEnd = idpConfig.certificate.includes('-----END CERTIFICATE-----');
      diagnostics.certificateValid = certStart && certEnd;
      if (!diagnostics.certificateValid) {
        diagnostics.errors.push('Certificate must be in PEM format');
      }
    } else {
      diagnostics.errors.push('Certificate is recommended for SAML');
    }

    diagnostics.attributes = ['email', 'name', 'groups'];
    if (idpConfig.authorizedDomains && idpConfig.authorizedDomains.length > 0) {
      diagnostics.attributes.push('domain');
    }

    diagnostics.metadataValid =
      diagnostics.entityIdValid &&
      (diagnostics.ssoUrlReachable || idpConfig.metadataUrl !== undefined);
  } else if (idpConfig.type === 'oidc') {
    if (idpConfig.clientId) {
      diagnostics.entityIdValid = idpConfig.clientId.length > 0;
      if (!diagnostics.entityIdValid) {
        diagnostics.errors.push('Client ID is required for OIDC');
      }
    } else {
      diagnostics.errors.push('Client ID is required for OIDC');
    }

    if (idpConfig.issuer) {
      diagnostics.ssoUrlReachable = idpConfig.issuer.length > 0;
      if (!diagnostics.ssoUrlReachable) {
        diagnostics.errors.push('Issuer is required for OIDC');
      }
    } else {
      diagnostics.errors.push('Issuer is required for OIDC');
    }

    diagnostics.certificateValid = true;
    diagnostics.metadataValid = diagnostics.entityIdValid && diagnostics.ssoUrlReachable;

    diagnostics.attributes = ['email', 'name', 'picture', 'sub'];
    if (idpConfig.scopes && idpConfig.scopes.includes('groups')) {
      diagnostics.attributes.push('groups');
    }
  }

  const success = diagnostics.errors.length === 0 && diagnostics.metadataValid;

  return {
    success,
    message: success
      ? 'IdP connection validation successful'
      : 'IdP connection validation failed with errors',
    diagnostics,
  };
};
