import { describe, expect, it, beforeEach } from 'vitest';

import {
  EmailProviderType,
  EmailIntegrationStatus,
  ValidationFailureReason,
} from '@the-dmz/shared/schemas';

import { emailService } from '../email.service.js';
import { emailRepo } from '../email.repo.js';
import {
  EmailIntegrationNotFoundError,
  EmailTenantIsolationViolationError,
  EmailValidationFailedError,
  EmailStatusTransitionInvalidError,
} from '../email.errors.js';

describe('emailService error throwing', () => {
  const TENANT_A = '11111111-1111-1111-1111-111111111111';
  const TENANT_B = '22222222-2222-2222-2222-222222222222';

  const createIntegrationForTenant = async (tenantId: string) => {
    return emailService.createIntegration(tenantId, {
      name: `Test Integration for ${tenantId}`,
      providerType: EmailProviderType.SMTP,
      config: {
        providerType: EmailProviderType.SMTP,
        host: 'smtp.example.com',
        port: 587,
        fromAddress: 'test@example.com',
      },
    });
  };

  beforeEach(async () => {
    const allIntegrations = await emailRepo.findByTenantId(TENANT_A, { limit: 100 });
    const allIntegrationsB = await emailRepo.findByTenantId(TENANT_B, { limit: 100 });
    for (const integration of [...allIntegrations.integrations, ...allIntegrationsB.integrations]) {
      await emailRepo.delete(integration.id);
    }
  });

  describe('getIntegration', () => {
    it('throws EmailIntegrationNotFoundError when integration does not exist', async () => {
      await expect(emailService.getIntegration(TENANT_A, 'non-existent-id')).rejects.toThrow(
        EmailIntegrationNotFoundError,
      );
    });

    it('throws EmailIntegrationNotFoundError with correct integration ID in message', async () => {
      const fakeId = '99999999-9999-9999-9999-999999999999';
      await expect(emailService.getIntegration(TENANT_A, fakeId)).rejects.toThrow(
        `Email integration with id "${fakeId}" not found`,
      );
    });

    it('throws EmailTenantIsolationViolationError when tenant does not own integration', async () => {
      const integration = await createIntegrationForTenant(TENANT_A);

      await expect(emailService.getIntegration(TENANT_B, integration.id)).rejects.toThrow(
        EmailTenantIsolationViolationError,
      );
    });

    it('throws EmailTenantIsolationViolationError with correct message', async () => {
      const integration = await createIntegrationForTenant(TENANT_A);

      await expect(emailService.getIntegration(TENANT_B, integration.id)).rejects.toThrow(
        `Integration ${integration.id} does not belong to tenant ${TENANT_B}`,
      );
    });

    it('returns integration when tenant owns it', async () => {
      const integration = await createIntegrationForTenant(TENANT_A);

      const result = await emailService.getIntegration(TENANT_A, integration.id);

      expect(result.id).toBe(integration.id);
      expect(result.tenantId).toBe(TENANT_A);
    });
  });

  describe('updateIntegration', () => {
    it('throws EmailIntegrationNotFoundError when integration does not exist', async () => {
      await expect(
        emailService.updateIntegration(TENANT_A, 'non-existent-id', { name: 'New Name' }),
      ).rejects.toThrow(EmailIntegrationNotFoundError);
    });

    it('throws EmailTenantIsolationViolationError when tenant does not own integration', async () => {
      const integration = await createIntegrationForTenant(TENANT_A);

      await expect(
        emailService.updateIntegration(TENANT_B, integration.id, { name: 'New Name' }),
      ).rejects.toThrow(EmailTenantIsolationViolationError);
    });

    it('throws EmailStatusTransitionInvalidError for invalid status transition', async () => {
      const integration = await createIntegrationForTenant(TENANT_A);

      await expect(
        emailService.updateIntegration(TENANT_A, integration.id, {
          status: EmailIntegrationStatus.READY,
        }),
      ).rejects.toThrow(EmailStatusTransitionInvalidError);
    });

    it('throws EmailStatusTransitionInvalidError when transitioning from disabled to ready', async () => {
      const integration = await createIntegrationForTenant(TENANT_A);
      await emailService.updateIntegration(TENANT_A, integration.id, {
        status: EmailIntegrationStatus.DISABLED,
      });

      await expect(
        emailService.updateIntegration(TENANT_A, integration.id, {
          status: EmailIntegrationStatus.READY,
        }),
      ).rejects.toThrow(EmailStatusTransitionInvalidError);
    });

    it('allows valid status transition from draft to validating', async () => {
      const integration = await createIntegrationForTenant(TENANT_A);

      const updated = await emailService.updateIntegration(TENANT_A, integration.id, {
        status: EmailIntegrationStatus.VALIDATING,
      });

      expect(updated.status).toBe(EmailIntegrationStatus.VALIDATING);
    });

    it('allows valid status transition from draft to disabled', async () => {
      const integration = await createIntegrationForTenant(TENANT_A);

      const updated = await emailService.updateIntegration(TENANT_A, integration.id, {
        status: EmailIntegrationStatus.DISABLED,
      });

      expect(updated.status).toBe(EmailIntegrationStatus.DISABLED);
    });
  });

  describe('deleteIntegration', () => {
    it('throws EmailIntegrationNotFoundError when integration does not exist', async () => {
      await expect(emailService.deleteIntegration(TENANT_A, 'non-existent-id')).rejects.toThrow(
        EmailIntegrationNotFoundError,
      );
    });

    it('throws EmailTenantIsolationViolationError when tenant does not own integration', async () => {
      const integration = await createIntegrationForTenant(TENANT_A);

      await expect(emailService.deleteIntegration(TENANT_B, integration.id)).rejects.toThrow(
        EmailTenantIsolationViolationError,
      );
    });

    it('deletes integration when tenant owns it', async () => {
      const integration = await createIntegrationForTenant(TENANT_A);

      await emailService.deleteIntegration(TENANT_A, integration.id);

      await expect(emailService.getIntegration(TENANT_A, integration.id)).rejects.toThrow(
        EmailIntegrationNotFoundError,
      );
    });
  });

  describe('validateIntegration', () => {
    it('throws EmailTenantIsolationViolationError when tenant does not own integration', async () => {
      const integration = await createIntegrationForTenant(TENANT_A);

      await expect(
        emailService.validateIntegration(TENANT_B, {
          integrationId: integration.id,
          runSpfCheck: true,
          runDkimCheck: true,
          runDmarcCheck: true,
        }),
      ).rejects.toThrow(EmailTenantIsolationViolationError);
    });

    it('throws EmailIntegrationNotFoundError when integration does not exist', async () => {
      await expect(
        emailService.validateIntegration(TENANT_A, {
          integrationId: 'non-existent-id',
          runSpfCheck: true,
          runDkimCheck: true,
          runDmarcCheck: true,
        }),
      ).rejects.toThrow(EmailIntegrationNotFoundError);
    });

    it('throws EmailValidationFailedError when SPF check fails', async () => {
      const integration = await createIntegrationForTenant(TENANT_A);

      await expect(
        emailService.validateIntegration(TENANT_A, {
          integrationId: integration.id,
          runSpfCheck: false,
          runDkimCheck: true,
          runDmarcCheck: true,
        }),
      ).rejects.toThrow(EmailValidationFailedError);
    });

    it('throws EmailValidationFailedError when DKIM check fails', async () => {
      const integration = await createIntegrationForTenant(TENANT_A);

      await expect(
        emailService.validateIntegration(TENANT_A, {
          integrationId: integration.id,
          runSpfCheck: true,
          runDkimCheck: false,
          runDmarcCheck: true,
        }),
      ).rejects.toThrow(EmailValidationFailedError);
    });

    it('throws EmailValidationFailedError when DMARC check fails', async () => {
      const integration = await createIntegrationForTenant(TENANT_A);

      await expect(
        emailService.validateIntegration(TENANT_A, {
          integrationId: integration.id,
          runSpfCheck: true,
          runDkimCheck: true,
          runDmarcCheck: false,
        }),
      ).rejects.toThrow(EmailValidationFailedError);
    });

    it('throws EmailValidationFailedError with SPF_NOT_CONFIGURED reason when SPF not run', async () => {
      const integration = await createIntegrationForTenant(TENANT_A);

      await expect(
        emailService.validateIntegration(TENANT_A, {
          integrationId: integration.id,
          runSpfCheck: false,
          runDkimCheck: true,
          runDmarcCheck: true,
        }),
      )
        .rejects.toBeInstanceOf(EmailValidationFailedError)
        .then((error) => {
          expect(error.details.failures).toContainEqual(
            expect.objectContaining({
              reason: ValidationFailureReason.SPF_NOT_CONFIGURED,
            }),
          );
        });
    });

    it('throws EmailValidationFailedError when all checks are false', async () => {
      const integration = await createIntegrationForTenant(TENANT_A);

      await expect(
        emailService.validateIntegration(TENANT_A, {
          integrationId: integration.id,
          runSpfCheck: false,
          runDkimCheck: false,
          runDmarcCheck: false,
        }),
      ).rejects.toThrow(EmailValidationFailedError);
    });
  });

  describe('transitionToReady', () => {
    it('throws EmailStatusTransitionInvalidError when transition is not allowed', async () => {
      const integration = await createIntegrationForTenant(TENANT_A);

      await expect(emailService.transitionToReady(TENANT_A, integration.id)).rejects.toThrow(
        EmailStatusTransitionInvalidError,
      );
    });

    it('throws EmailValidationFailedError when integration is not ready', async () => {
      const integration = await createIntegrationForTenant(TENANT_A);
      await emailService.updateIntegration(TENANT_A, integration.id, {
        status: EmailIntegrationStatus.VALIDATING,
      });

      await expect(emailService.transitionToReady(TENANT_A, integration.id)).rejects.toThrow(
        EmailValidationFailedError,
      );
    });
  });

  describe('validateStatusTransition', () => {
    it('throws EmailStatusTransitionInvalidError for invalid transition from DRAFT to READY', () => {
      expect(() => {
        emailService.validateStatusTransition(
          EmailIntegrationStatus.DRAFT,
          EmailIntegrationStatus.READY,
        );
      }).toThrow(EmailStatusTransitionInvalidError);
    });

    it('throws EmailStatusTransitionInvalidError for invalid transition from READY to DRAFT', () => {
      expect(() => {
        emailService.validateStatusTransition(
          EmailIntegrationStatus.READY,
          EmailIntegrationStatus.DRAFT,
        );
      }).toThrow(EmailStatusTransitionInvalidError);
    });

    it('throws EmailStatusTransitionInvalidError for invalid transition from DISABLED to READY', () => {
      expect(() => {
        emailService.validateStatusTransition(
          EmailIntegrationStatus.DISABLED,
          EmailIntegrationStatus.READY,
        );
      }).toThrow(EmailStatusTransitionInvalidError);
    });

    it('throws EmailStatusTransitionInvalidError for same status transition', () => {
      expect(() => {
        emailService.validateStatusTransition(
          EmailIntegrationStatus.READY,
          EmailIntegrationStatus.READY,
        );
      }).toThrow(EmailStatusTransitionInvalidError);
    });

    it('throws EmailStatusTransitionInvalidError with correct message', () => {
      expect(() => {
        emailService.validateStatusTransition(
          EmailIntegrationStatus.DRAFT,
          EmailIntegrationStatus.READY,
        );
      }).toThrow('Cannot transition from draft to ready');
    });

    it('allows valid transition from DRAFT to VALIDATING', () => {
      expect(() => {
        emailService.validateStatusTransition(
          EmailIntegrationStatus.DRAFT,
          EmailIntegrationStatus.VALIDATING,
        );
      }).not.toThrow();
    });

    it('allows valid transition from DRAFT to DISABLED', () => {
      expect(() => {
        emailService.validateStatusTransition(
          EmailIntegrationStatus.DRAFT,
          EmailIntegrationStatus.DISABLED,
        );
      }).not.toThrow();
    });

    it('allows valid transition from VALIDATING to READY', () => {
      expect(() => {
        emailService.validateStatusTransition(
          EmailIntegrationStatus.VALIDATING,
          EmailIntegrationStatus.READY,
        );
      }).not.toThrow();
    });

    it('allows valid transition from READY to DEGRADED', () => {
      expect(() => {
        emailService.validateStatusTransition(
          EmailIntegrationStatus.READY,
          EmailIntegrationStatus.DEGRADED,
        );
      }).not.toThrow();
    });

    it('allows valid transition from DEGRADED to READY', () => {
      expect(() => {
        emailService.validateStatusTransition(
          EmailIntegrationStatus.DEGRADED,
          EmailIntegrationStatus.READY,
        );
      }).not.toThrow();
    });

    it('allows valid transition from DISABLED to DRAFT', () => {
      expect(() => {
        emailService.validateStatusTransition(
          EmailIntegrationStatus.DISABLED,
          EmailIntegrationStatus.DRAFT,
        );
      }).not.toThrow();
    });
  });

  describe('checkReadiness', () => {
    it('throws EmailIntegrationNotFoundError when integration does not exist', async () => {
      await expect(emailService.checkReadiness(TENANT_A, 'non-existent-id')).rejects.toThrow(
        EmailIntegrationNotFoundError,
      );
    });

    it('throws EmailTenantIsolationViolationError when tenant does not own integration', async () => {
      const integration = await createIntegrationForTenant(TENANT_A);

      await expect(emailService.checkReadiness(TENANT_B, integration.id)).rejects.toThrow(
        EmailTenantIsolationViolationError,
      );
    });

    it('returns not ready result when authenticationPosture is not set', async () => {
      const integration = await createIntegrationForTenant(TENANT_A);

      const result = await emailService.checkReadiness(TENANT_A, integration.id);

      expect(result.ready).toBe(false);
      expect(result.failures).toContainEqual(
        expect.objectContaining({
          reason: ValidationFailureReason.SPF_NOT_CONFIGURED,
        }),
      );
    });
  });

  describe('listIntegrations', () => {
    it('only returns integrations for the specified tenant', async () => {
      await createIntegrationForTenant(TENANT_A);
      await createIntegrationForTenant(TENANT_A);
      await createIntegrationForTenant(TENANT_B);

      const resultA = await emailService.listIntegrations(TENANT_A);
      const resultB = await emailService.listIntegrations(TENANT_B);

      expect(resultA.total).toBe(2);
      expect(resultA.integrations.every((i) => i.tenantId === TENANT_A)).toBe(true);
      expect(resultB.total).toBe(1);
      expect(resultB.integrations.every((i) => i.tenantId === TENANT_B)).toBe(true);
    });
  });

  describe('createIntegration', () => {
    it('creates integration with correct tenantId', async () => {
      const integration = await createIntegrationForTenant(TENANT_A);

      expect(integration.tenantId).toBe(TENANT_A);
      expect(integration.status).toBe(EmailIntegrationStatus.DRAFT);
    });
  });
});
