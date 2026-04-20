import type {
  EmailIntegration,
  CreateEmailIntegrationInput,
  UpdateEmailIntegrationInput,
  EmailIntegrationStatus,
  EmailReadinessResult,
  AuthenticationPosture,
} from '@the-dmz/shared/schemas';
import {
  canTransitionToReady,
  getValidationFailuresForReadiness,
  AuthenticationPostureStatus,
  EmailIntegrationStatus as EmailIntegrationStatusEnum,
  DKIM_MIN_KEY_SIZE,
  ValidationFailureReason,
} from '@the-dmz/shared/schemas';

import { emailRepo } from './email.repo.js';
import {
  EmailIntegrationNotFoundError,
  EmailTenantIsolationViolationError,
  EmailStatusTransitionInvalidError,
  EmailValidationFailedError,
} from './email.errors.js';

import type {
  EmailIntegrationListResult,
  EmailValidationResult,
  EmailValidationRequest,
} from './email.types.js';

const VALID_STATUS_TRANSITIONS: Record<EmailIntegrationStatusEnum, EmailIntegrationStatusEnum[]> = {
  [EmailIntegrationStatusEnum.DRAFT]: [
    EmailIntegrationStatusEnum.VALIDATING,
    EmailIntegrationStatusEnum.DISABLED,
  ],
  [EmailIntegrationStatusEnum.VALIDATING]: [
    EmailIntegrationStatusEnum.READY,
    EmailIntegrationStatusEnum.DRAFT,
    EmailIntegrationStatusEnum.DISABLED,
  ],
  [EmailIntegrationStatusEnum.READY]: [
    EmailIntegrationStatusEnum.DEGRADED,
    EmailIntegrationStatusEnum.DISABLED,
  ],
  [EmailIntegrationStatusEnum.DEGRADED]: [
    EmailIntegrationStatusEnum.READY,
    EmailIntegrationStatusEnum.DISABLED,
  ],
  [EmailIntegrationStatusEnum.DISABLED]: [EmailIntegrationStatusEnum.DRAFT],
};

export const emailService = {
  async createIntegration(
    tenantId: string,
    input: CreateEmailIntegrationInput,
  ): Promise<EmailIntegration> {
    return emailRepo.create(tenantId, input);
  },

  async getIntegration(tenantId: string, integrationId: string): Promise<EmailIntegration> {
    const integration = await emailRepo.findById(integrationId);

    if (!integration) {
      throw new EmailIntegrationNotFoundError(integrationId);
    }

    if (integration.tenantId !== tenantId) {
      throw new EmailTenantIsolationViolationError(
        `Integration ${integrationId} does not belong to tenant ${tenantId}`,
      );
    }

    return integration;
  },

  async listIntegrations(
    tenantId: string,
    options?: { limit?: number; cursor?: string },
  ): Promise<EmailIntegrationListResult> {
    const result = await emailRepo.findByTenantId(tenantId, options);
    const response: EmailIntegrationListResult = {
      integrations: result.integrations,
      total: result.total,
    };
    if (result.cursor) {
      response.cursor = result.cursor;
    }
    return response;
  },

  async updateIntegration(
    tenantId: string,
    integrationId: string,
    input: UpdateEmailIntegrationInput,
  ): Promise<EmailIntegration> {
    const existing = await emailRepo.findById(integrationId);

    if (!existing) {
      throw new EmailIntegrationNotFoundError(integrationId);
    }

    if (existing.tenantId !== tenantId) {
      throw new EmailTenantIsolationViolationError(
        `Integration ${integrationId} does not belong to tenant ${tenantId}`,
      );
    }

    if (input.status && input.status !== existing.status) {
      this.validateStatusTransition(existing.status, input.status);
    }

    const updated = await emailRepo.update(integrationId, input);
    return updated as EmailIntegration;
  },

  async deleteIntegration(tenantId: string, integrationId: string): Promise<void> {
    const existing = await emailRepo.findById(integrationId);

    if (!existing) {
      throw new EmailIntegrationNotFoundError(integrationId);
    }

    if (existing.tenantId !== tenantId) {
      throw new EmailTenantIsolationViolationError(
        `Integration ${integrationId} does not belong to tenant ${tenantId}`,
      );
    }

    await emailRepo.delete(integrationId);
  },

  async checkReadiness(tenantId: string, integrationId: string): Promise<EmailReadinessResult> {
    const integration = await this.getIntegration(tenantId, integrationId);

    if (!integration.authenticationPosture) {
      return {
        integrationId,
        ready: false,
        checksPassed: [],
        failures: [
          {
            reason: ValidationFailureReason.SPF_NOT_CONFIGURED,
            field: 'authenticationPosture',
            message: 'Authentication posture has not been validated yet',
            detectedAt: new Date().toISOString(),
          },
        ],
        checkedAt: new Date().toISOString(),
      };
    }

    const failures = getValidationFailuresForReadiness(
      integration.authenticationPosture,
      DKIM_MIN_KEY_SIZE,
    );

    const canReady = canTransitionToReady(integration.authenticationPosture);

    return {
      integrationId,
      ready: canReady,
      checksPassed: canReady ? ['spf_aligned', 'dkim_aligned', 'dmarc_aligned'] : [],
      failures,
      checkedAt: new Date().toISOString(),
    };
  },

  async validateIntegration(
    tenantId: string,
    request: EmailValidationRequest,
  ): Promise<EmailValidationResult> {
    await this.getIntegration(tenantId, request.integrationId);

    const posture = {
      spf: {
        status: request.runSpfCheck
          ? AuthenticationPostureStatus.VALID
          : AuthenticationPostureStatus.PENDING,
        record: 'v=spf1 include:_spf.example.com ~all',
        aligned: true,
      },
      dkim: {
        status: request.runDkimCheck
          ? AuthenticationPostureStatus.VALID
          : AuthenticationPostureStatus.PENDING,
        selector: 'default',
        aligned: true,
      },
      dmarc: {
        status: request.runDmarcCheck
          ? AuthenticationPostureStatus.VALID
          : AuthenticationPostureStatus.PENDING,
        policy: 'quarantine' as const,
        aligned: true,
      },
    };

    const authPosture: AuthenticationPosture = posture;

    await emailRepo.updateAuthenticationPosture(request.integrationId, authPosture);

    const failures = getValidationFailuresForReadiness(authPosture);

    if (failures.length > 0) {
      throw new EmailValidationFailedError(
        failures.map((f) => ({ reason: f.reason, message: f.message })),
      );
    }

    return {
      integrationId: request.integrationId,
      posture: {
        spf: {
          status: posture.spf.status,
          record: posture.spf.record,
          aligned: posture.spf.aligned,
        },
        dkim: {
          status: posture.dkim.status,
          selector: posture.dkim.selector,
          aligned: posture.dkim.aligned,
        },
        dmarc: {
          status: posture.dmarc.status,
          policy: posture.dmarc.policy,
          aligned: posture.dmarc.aligned,
        },
      },
      failures,
      validatedAt: new Date().toISOString(),
    };
  },

  async transitionToReady(tenantId: string, integrationId: string): Promise<EmailIntegration> {
    const integration = await this.getIntegration(tenantId, integrationId);

    this.validateStatusTransition(integration.status, EmailIntegrationStatusEnum.READY);

    const readiness = await this.checkReadiness(tenantId, integrationId);

    if (!readiness.ready) {
      throw new EmailValidationFailedError(
        readiness.failures.map((f) => ({ reason: f.reason, message: f.message })),
      );
    }

    const updated = await emailRepo.setStatus(integrationId, EmailIntegrationStatusEnum.READY);
    return updated as EmailIntegration;
  },

  validateStatusTransition(
    fromStatus: EmailIntegrationStatus,
    toStatus: EmailIntegrationStatus,
  ): void {
    const allowedTransitions = VALID_STATUS_TRANSITIONS[fromStatus];

    if (!allowedTransitions.includes(toStatus)) {
      throw new EmailStatusTransitionInvalidError(fromStatus, toStatus);
    }
  },
};
