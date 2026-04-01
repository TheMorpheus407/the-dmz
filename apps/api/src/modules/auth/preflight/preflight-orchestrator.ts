import { eq, and } from 'drizzle-orm';

import type {
  SSOValidationCheckResult,
  SSOValidationResult,
  SSOActivationGate,
  SSOValidationSummary,
  SSOActivationResponse,
  SSOValidationPreflightResponse,
  SSOValidationCheckType,
  ValidationStatus,
  SSOValidationType,
} from '@the-dmz/shared/auth';
import {
  DEFAULT_VALIDATION_FRESHNESS_SECONDS,
  VALIDATION_WARNING_THRESHOLD_SECONDS,
} from '@the-dmz/shared/auth';

import { ssoConnections, ssoValidations } from '../../../db/schema/auth/sso-connections.js';
import { getDatabaseClient } from '../../../shared/database/connection.js';

import { oidcValidator } from './oidc-validator.js';
import { samlValidator } from './saml-validator.js';
import { scimValidator } from './scim-validator.js';
import {
  SSOValidationError,
  createProviderNotFoundError,
  createConfigurationError,
  createInternalError,
  createActivationBlockedError,
} from './preflight-errors.js';

const db = getDatabaseClient();

const getSupportedChecks = (validationType: SSOValidationType): SSOValidationCheckType[] => {
  if (validationType === 'saml') {
    return [
      'metadata_fetch',
      'metadata_parse',
      'certificate_validity',
      'audience_alignment',
      'acs_alignment',
    ];
  }

  if (validationType === 'oidc') {
    return [
      'discovery_fetch',
      'issuer_validation',
      'jwks_reachability',
      'claim_mapping',
      'token_exchange',
    ];
  }

  return [];
};

export const getValidationPreflight = async (
  providerId: string,
  tenantId: string,
): Promise<SSOValidationPreflightResponse> => {
  const result = await db
    .select()
    .from(ssoConnections)
    .where(and(eq(ssoConnections.id, providerId), eq(ssoConnections.tenantId, tenantId)))
    .limit(1);

  if (result.length === 0 || !result[0]) {
    throw createProviderNotFoundError();
  }

  const connection = result[0];
  const providerType = connection.provider as 'saml' | 'oidc';
  const validationType: SSOValidationType = providerType === 'saml' ? 'saml' : 'oidc';

  const supportedChecks = getSupportedChecks(validationType);

  return {
    providerId: connection.id,
    validationType,
    supportedChecks,
    requiresCredentials: providerType === 'oidc' ? !!connection.clientSecretEncrypted : false,
    timeoutSeconds: 30,
  };
};

export const runOIDCValidation = async (
  providerId: string,
  tenantId: string,
  testClaims?: { email?: string; groups?: string[] },
  executedBy?: string,
): Promise<SSOValidationResult> => {
  void testClaims;
  const correlationId = crypto.randomUUID();
  const result = await db
    .select()
    .from(ssoConnections)
    .where(and(eq(ssoConnections.id, providerId), eq(ssoConnections.tenantId, tenantId)))
    .limit(1);

  if (result.length === 0 || !result[0]) {
    throw createProviderNotFoundError(correlationId);
  }

  const connection = result[0];

  if (!connection.metadataUrl && !connection.clientId) {
    throw createConfigurationError('OIDC provider not configured', correlationId);
  }

  const checks: SSOValidationCheckResult[] = [];
  let overallStatus: ValidationStatus = 'ok';

  const discoveryCheck = await oidcValidator.validateDiscovery(
    connection.metadataUrl,
    correlationId,
  );
  checks.push(discoveryCheck);
  if (discoveryCheck.status === 'failed') {
    overallStatus = 'failed';
  } else if (discoveryCheck.status === 'warning') {
    overallStatus = 'warning';
  }

  if (overallStatus !== 'failed' && connection.clientId) {
    const issuerCheck = oidcValidator.validateIssuerMatch(
      connection.metadataUrl,
      connection.clientId,
    );
    checks.push(issuerCheck);
    if (issuerCheck.status === 'failed') {
      overallStatus = 'failed';
    } else if (issuerCheck.status === 'warning') {
      overallStatus = 'warning';
    }
  }

  const jwksCheck = await oidcValidator.validateJWKS(connection.metadataUrl, correlationId);
  checks.push(jwksCheck);
  if (jwksCheck.status === 'failed' && overallStatus !== 'failed') {
    overallStatus = 'failed';
  } else if (jwksCheck.status === 'warning' && overallStatus === 'ok') {
    overallStatus = 'warning';
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + DEFAULT_VALIDATION_FRESHNESS_SECONDS * 1000);

  const [validationRecord] = await db
    .insert(ssoValidations)
    .values({
      tenantId,
      ssoConnectionId: providerId,
      validationType: 'oidc',
      overallStatus,
      checks: checks as unknown as Record<string, unknown>[],
      correlationId,
      executedAt: now,
      expiresAt,
      executedBy: executedBy ?? null,
      warnings: null,
      errorDetails: null,
    })
    .returning();

  if (!validationRecord) {
    throw createInternalError('Failed to create validation record', correlationId);
  }

  await db
    .update(ssoConnections)
    .set({
      lastValidationId: validationRecord.id,
      lastValidationAt: now,
      lastValidationStatus: overallStatus,
      updatedAt: now,
    })
    .where(eq(ssoConnections.id, providerId));

  return {
    validationId: validationRecord.id,
    providerId,
    validationType: 'oidc',
    overallStatus,
    checks,
    correlationId,
    executedAt: now,
    expiresAt,
    isFresh: true,
  };
};

export const runSAMLValidation = async (
  providerId: string,
  tenantId: string,
  executedBy?: string,
): Promise<SSOValidationResult> => {
  const correlationId = crypto.randomUUID();
  const result = await db
    .select()
    .from(ssoConnections)
    .where(and(eq(ssoConnections.id, providerId), eq(ssoConnections.tenantId, tenantId)))
    .limit(1);

  if (result.length === 0 || !result[0]) {
    throw createProviderNotFoundError(correlationId);
  }

  const connection = result[0];

  if (!connection.metadataUrl) {
    throw createConfigurationError('SAML provider metadata URL not configured', correlationId);
  }

  const checks: SSOValidationCheckResult[] = [];
  let overallStatus: ValidationStatus = 'ok';

  const metadataFetchCheck = await samlValidator.validateMetadataFetch(
    connection.metadataUrl,
    correlationId,
  );
  checks.push(metadataFetchCheck);
  if (metadataFetchCheck.status === 'failed') {
    overallStatus = 'failed';
  } else if (metadataFetchCheck.status === 'warning') {
    overallStatus = 'warning';
  }

  if (metadataFetchCheck.status !== 'failed') {
    const certCheck = samlValidator.validateCertificate(connection.metadataUrl, correlationId);
    checks.push(certCheck);
    if (certCheck.status === 'failed' && overallStatus !== 'failed') {
      overallStatus = 'failed';
    } else if (certCheck.status === 'warning' && overallStatus === 'ok') {
      overallStatus = 'warning';
    }
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + DEFAULT_VALIDATION_FRESHNESS_SECONDS * 1000);

  const [validationRecord] = await db
    .insert(ssoValidations)
    .values({
      tenantId,
      ssoConnectionId: providerId,
      validationType: 'saml',
      overallStatus,
      checks: checks as unknown as Record<string, unknown>[],
      correlationId,
      executedAt: now,
      expiresAt,
      executedBy: executedBy ?? null,
      warnings: null,
      errorDetails: null,
    })
    .returning();

  if (!validationRecord) {
    throw createInternalError('Failed to create validation record', correlationId);
  }

  await db
    .update(ssoConnections)
    .set({
      lastValidationId: validationRecord.id,
      lastValidationAt: now,
      lastValidationStatus: overallStatus,
      updatedAt: now,
    })
    .where(eq(ssoConnections.id, providerId));

  return {
    validationId: validationRecord.id,
    providerId,
    validationType: 'saml',
    overallStatus,
    checks,
    correlationId,
    executedAt: now,
    expiresAt,
    isFresh: true,
  };
};

export const runSCIMValidation = async (
  baseUrl: string,
  bearerToken: string,
  tenantId: string,
  _dryRunEmail?: string,
  executedBy?: string,
): Promise<SSOValidationResult> => {
  const correlationId = crypto.randomUUID();

  const checks: SSOValidationCheckResult[] = [];
  let overallStatus: ValidationStatus = 'ok';
  let hasFailed = false;

  const urlCheck = await scimValidator.validateBaseUrlReachability(baseUrl, correlationId);
  checks.push(urlCheck);
  if (urlCheck.status === 'failed') {
    hasFailed = true;
  }

  if (!hasFailed) {
    const authCheck = await scimValidator.validateAuthentication(
      baseUrl,
      bearerToken,
      correlationId,
    );
    checks.push(authCheck);
    if (authCheck.status === 'failed') {
      hasFailed = true;
    }
  }

  if (!hasFailed) {
    const endpointCheck = await scimValidator.validateEndpointAvailability(
      baseUrl,
      bearerToken,
      correlationId,
    );
    checks.push(endpointCheck);
    if (endpointCheck.status === 'failed') {
      hasFailed = true;
    }
  }

  if (hasFailed) {
    overallStatus = 'failed';
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + DEFAULT_VALIDATION_FRESHNESS_SECONDS * 1000);

  const [validationRecord] = await db
    .insert(ssoValidations)
    .values({
      tenantId,
      ssoConnectionId: null,
      validationType: 'scim',
      overallStatus,
      checks: checks as unknown as Record<string, unknown>[],
      correlationId,
      executedAt: now,
      expiresAt,
      executedBy: executedBy ?? null,
      warnings: null,
      errorDetails: null,
    })
    .returning();

  if (!validationRecord) {
    throw createInternalError('Failed to create validation record', correlationId);
  }

  return {
    validationId: validationRecord.id,
    providerId: correlationId,
    validationType: 'scim',
    overallStatus,
    checks,
    correlationId,
    executedAt: now,
    expiresAt,
    isFresh: true,
  };
};

export const getActivationGate = async (
  providerId: string,
  tenantId: string,
): Promise<SSOActivationGate> => {
  const result = await db
    .select()
    .from(ssoConnections)
    .where(and(eq(ssoConnections.id, providerId), eq(ssoConnections.tenantId, tenantId)))
    .limit(1);

  if (result.length === 0 || !result[0]) {
    throw createProviderNotFoundError();
  }

  const connection = result[0];
  const now = new Date();

  const lastValidationAt = connection.lastValidationAt;
  const lastValidationStatus = connection.lastValidationStatus as ValidationStatus | null;

  const isStale = lastValidationAt
    ? now.getTime() - lastValidationAt.getTime() > DEFAULT_VALIDATION_FRESHNESS_SECONDS * 1000
    : true;

  const isStaleWarning = lastValidationAt
    ? now.getTime() - lastValidationAt.getTime() > VALIDATION_WARNING_THRESHOLD_SECONDS * 1000
    : false;

  let canActivate = false;
  let activationStatus: SSOActivationGate['activationStatus'] = 'not_activated';

  if (connection.enforceSSOOnly) {
    activationStatus = 'activated';
    canActivate = true;
  } else if (!lastValidationAt || lastValidationStatus === null) {
    activationStatus = 'validation_required';
    canActivate = false;
  } else if (isStale) {
    activationStatus = 'validation_stale';
    canActivate = false;
  } else if (lastValidationStatus === 'ok' || lastValidationStatus === 'warning') {
    activationStatus = 'ready_to_activate';
    canActivate = true;
  } else {
    activationStatus = 'validation_required';
    canActivate = false;
  }

  return {
    providerId: connection.id,
    tenantId: connection.tenantId,
    activationStatus,
    lastValidationId: connection.lastValidationId,
    lastValidationAt: lastValidationAt ?? null,
    lastValidationStatus,
    activatedAt: connection.activatedAt,
    activatedBy: connection.activatedBy,
    canActivate,
    validationFreshnessSeconds: DEFAULT_VALIDATION_FRESHNESS_SECONDS,
    isStale: isStale && isStaleWarning,
  };
};

export const activateSSO = async (
  providerId: string,
  tenantId: string,
  enforceSSOOnly: boolean,
  activatedBy: string,
): Promise<SSOActivationResponse> => {
  const correlationId = crypto.randomUUID();

  const gate = await getActivationGate(providerId, tenantId);
  const previousStatus = gate.activationStatus;

  if (enforceSSOOnly && !gate.canActivate) {
    let message = 'SSO activation blocked: ';
    if (previousStatus === 'validation_required') {
      message += 'validation required. Please run preflight validation first.';
    } else if (previousStatus === 'validation_stale') {
      message += 'validation is stale. Please re-run preflight validation.';
    } else if (previousStatus === 'not_activated' && gate.lastValidationStatus !== 'ok') {
      message += 'last validation did not pass. Please run preflight validation.';
    } else {
      message += 'activation requirements not met.';
    }

    throw createActivationBlockedError(message, correlationId);
  }

  const now = new Date();

  await db
    .update(ssoConnections)
    .set({
      enforceSSOOnly,
      activatedAt: enforceSSOOnly ? now : null,
      activatedBy: enforceSSOOnly ? activatedBy : null,
      updatedAt: now,
    })
    .where(and(eq(ssoConnections.id, providerId), eq(ssoConnections.tenantId, tenantId)));

  const newStatus: SSOActivationGate['activationStatus'] = enforceSSOOnly
    ? 'activated'
    : 'ready_to_activate';

  return {
    providerId,
    previousStatus,
    newStatus,
    enforceSSOOnly,
    correlationId,
    message: enforceSSOOnly
      ? 'SSO enforcement activated successfully'
      : 'SSO enforcement deactivated successfully',
    requiresValidation: false,
  };
};

export const getValidationSummary = async (
  providerId: string,
  tenantId: string,
): Promise<SSOValidationSummary> => {
  const result = await db
    .select()
    .from(ssoConnections)
    .where(and(eq(ssoConnections.id, providerId), eq(ssoConnections.tenantId, tenantId)))
    .limit(1);

  if (result.length === 0 || !result[0]) {
    throw createProviderNotFoundError();
  }

  const connection = result[0];
  const gate = await getActivationGate(providerId, tenantId);

  let staleWarning: string | undefined;
  if (gate.isStale) {
    staleWarning = 'Validation is stale. Re-run preflight validation before activation.';
  }

  return {
    providerId: connection.id,
    tenantId: connection.tenantId,
    providerType: connection.provider as SSOValidationType,
    lastValidationAt: gate.lastValidationAt,
    lastValidationStatus: gate.lastValidationStatus,
    activationStatus: gate.activationStatus,
    isStale: gate.isStale,
    staleWarning,
    canActivate: gate.canActivate,
  };
};

export { SSOValidationError };
