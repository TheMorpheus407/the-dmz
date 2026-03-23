import { describe, expect, it } from 'vitest';

import {
  AuthenticationPostureStatus,
  EmailIntegrationStatus,
  EmailProviderType,
  ValidationFailureReason,
  canTransitionToReady,
  createEmailIntegrationSchema,
  emailIntegrationSchema,
  emailProviderConfigSchema,
  emailReadinessCheckSchema,
  getValidationFailuresForReadiness,
  isValidDkimKeySize,
  smtpConfigSchema,
  updateEmailIntegrationSchema,
  validationFailureSchema,
} from './email.schema.js';

describe('email schemas', () => {
  describe('smtpConfigSchema', () => {
    it('accepts valid SMTP configuration', () => {
      const result = smtpConfigSchema.parse({
        host: 'smtp.example.com',
        port: 587,
        encryption: 'starttls',
        username: 'user',
        passwordRef: 'secret',
        fromAddress: 'sender@example.com',
        fromName: 'Sender Name',
        maxConnections: 10,
      });

      expect(result.host).toBe('smtp.example.com');
      expect(result.port).toBe(587);
    });

    it('rejects invalid SMTP port', () => {
      expect(() =>
        smtpConfigSchema.parse({
          host: 'smtp.example.com',
          port: 70000,
          fromAddress: 'sender@example.com',
        }),
      ).toThrow();
    });

    it('rejects invalid email address', () => {
      expect(() =>
        smtpConfigSchema.parse({
          host: 'smtp.example.com',
          port: 587,
          fromAddress: 'invalid-email',
        }),
      ).toThrow();
    });

    it('applies defaults correctly', () => {
      const result = smtpConfigSchema.parse({
        host: 'smtp.example.com',
        port: 587,
        fromAddress: 'sender@example.com',
      });

      expect(result.encryption).toBe('tls');
      expect(result.maxConnections).toBe(5);
      expect(result.timeoutMs).toBe(30000);
    });
  });

  describe('emailProviderConfigSchema', () => {
    it('accepts SMTP provider config', () => {
      const result = emailProviderConfigSchema.parse({
        providerType: EmailProviderType.SMTP,
        host: 'smtp.example.com',
        port: 587,
        fromAddress: 'sender@example.com',
      });

      expect(result.providerType).toBe(EmailProviderType.SMTP);
    });

    it('accepts Exchange Online config', () => {
      const result = emailProviderConfigSchema.parse({
        providerType: EmailProviderType.EXCHANGE_ONLINE,
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        clientId: 'client-id',
        fromAddress: 'sender@example.com',
        scopes: ['https://graph.microsoft.com/.default'],
      });

      expect(result.providerType).toBe(EmailProviderType.EXCHANGE_ONLINE);
    });

    it('accepts Google Workspace config', () => {
      const result = emailProviderConfigSchema.parse({
        providerType: EmailProviderType.GOOGLE_WORKSPACE,
        clientId: 'client-id',
        fromAddress: 'sender@example.com',
        scopes: ['https://www.googleapis.com/auth/gmail.send'],
      });

      expect(result.providerType).toBe(EmailProviderType.GOOGLE_WORKSPACE);
    });
  });

  describe('emailIntegrationSchema', () => {
    it('accepts valid email integration', () => {
      const now = new Date();
      const result = emailIntegrationSchema.parse({
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '223e4567-e89b-12d3-a456-426614174000',
        name: 'Test Integration',
        providerType: EmailProviderType.SMTP,
        config: {
          providerType: EmailProviderType.SMTP,
          host: 'smtp.example.com',
          port: 587,
          fromAddress: 'sender@example.com',
        },
        status: EmailIntegrationStatus.DRAFT,
        validationFailures: [],
        capabilities: {
          maxDailyVolume: 10000,
          supportsTracking: true,
        },
        createdAt: now,
        updatedAt: now,
      });

      expect(result.name).toBe('Test Integration');
      expect(result.status).toBe(EmailIntegrationStatus.DRAFT);
    });

    it('rejects invalid provider type', () => {
      const now = new Date();
      expect(() =>
        emailIntegrationSchema.parse({
          id: '123e4567-e89b-12d3-a456-426614174000',
          tenantId: '223e4567-e89b-12d3-a456-426614174000',
          name: 'Test',
          providerType: 'invalid' as EmailProviderType,
          config: {} as never,
          status: EmailIntegrationStatus.DRAFT,
          createdAt: now,
          updatedAt: now,
        }),
      ).toThrow();
    });
  });

  describe('createEmailIntegrationSchema', () => {
    it('accepts valid create input', () => {
      const result = createEmailIntegrationSchema.parse({
        name: 'New Integration',
        providerType: EmailProviderType.SMTP,
        config: {
          providerType: EmailProviderType.SMTP,
          host: 'smtp.example.com',
          port: 587,
          fromAddress: 'sender@example.com',
        },
      });

      expect(result.name).toBe('New Integration');
    });

    it('rejects missing required fields', () => {
      expect(() =>
        createEmailIntegrationSchema.parse({
          name: 'New Integration',
        }),
      ).toThrow();
    });
  });

  describe('updateEmailIntegrationSchema', () => {
    it('accepts partial update', () => {
      const result = updateEmailIntegrationSchema.parse({
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });

    it('accepts empty update', () => {
      const result = updateEmailIntegrationSchema.parse({});
      expect(result).toEqual({});
    });
  });

  describe('emailReadinessCheckSchema', () => {
    it('accepts valid readiness check input', () => {
      const result = emailReadinessCheckSchema.parse({
        integrationId: '123e4567-e89b-12d3-a456-426614174000',
        requireSpf: true,
        requireDkim: true,
        requireDmarc: true,
        minDkimKeySize: 2048,
      });

      expect(result.minDkimKeySize).toBe(2048);
    });

    it('applies defaults correctly', () => {
      const result = emailReadinessCheckSchema.parse({
        integrationId: '123e4567-e89b-12d3-a456-426614174000',
      });

      expect(result.requireSpf).toBe(true);
      expect(result.requireDkim).toBe(true);
      expect(result.requireDmarc).toBe(true);
      expect(result.minDkimKeySize).toBe(2048);
      expect(result.enforceTenantIsolation).toBe(true);
    });
  });
});

describe('validation helpers', () => {
  describe('isValidDkimKeySize', () => {
    it('returns true for 2048-bit key', () => {
      expect(isValidDkimKeySize(2048)).toBe(true);
    });

    it('returns true for 4096-bit key', () => {
      expect(isValidDkimKeySize(4096)).toBe(true);
    });

    it('returns true for key larger than minimum', () => {
      expect(isValidDkimKeySize(3072)).toBe(true);
    });

    it('returns false for 1024-bit key', () => {
      expect(isValidDkimKeySize(1024)).toBe(false);
    });

    it('returns false for key smaller than minimum', () => {
      expect(isValidDkimKeySize(512)).toBe(false);
    });
  });

  describe('canTransitionToReady', () => {
    const validPosture = {
      spf: {
        status: AuthenticationPostureStatus.VALID,
        aligned: true,
      },
      dkim: {
        status: AuthenticationPostureStatus.VALID,
        aligned: true,
      },
      dmarc: {
        status: AuthenticationPostureStatus.VALID,
        aligned: true,
      },
    };

    it('returns true when all auth methods are aligned', () => {
      expect(canTransitionToReady(validPosture)).toBe(true);
    });

    it('returns false when SPF is not aligned', () => {
      expect(
        canTransitionToReady({
          ...validPosture,
          spf: { status: AuthenticationPostureStatus.VALID, aligned: false },
        }),
      ).toBe(false);
    });

    it('returns false when DKIM is not aligned', () => {
      expect(
        canTransitionToReady({
          ...validPosture,
          dkim: { status: AuthenticationPostureStatus.VALID, aligned: false },
        }),
      ).toBe(false);
    });

    it('returns false when DMARC is not aligned', () => {
      expect(
        canTransitionToReady({
          ...validPosture,
          dmarc: { status: AuthenticationPostureStatus.VALID, aligned: false },
        }),
      ).toBe(false);
    });

    it('returns false when status is not VALID', () => {
      expect(
        canTransitionToReady({
          ...validPosture,
          spf: { status: AuthenticationPostureStatus.PENDING, aligned: true },
        }),
      ).toBe(false);
    });
  });

  describe('getValidationFailuresForReadiness', () => {
    it('returns empty array when all checks pass', () => {
      const posture = {
        spf: {
          status: AuthenticationPostureStatus.VALID,
          aligned: true,
        },
        dkim: {
          status: AuthenticationPostureStatus.VALID,
          aligned: true,
          publicKeySize: 2048,
        },
        dmarc: {
          status: AuthenticationPostureStatus.VALID,
          aligned: true,
        },
      };

      const failures = getValidationFailuresForReadiness(posture);
      expect(failures).toHaveLength(0);
    });

    it('returns failure for SPF not configured', () => {
      const posture = {
        spf: {
          status: AuthenticationPostureStatus.PENDING,
        },
        dkim: {
          status: AuthenticationPostureStatus.VALID,
          aligned: true,
          publicKeySize: 2048,
        },
        dmarc: {
          status: AuthenticationPostureStatus.VALID,
          aligned: true,
        },
      };

      const failures = getValidationFailuresForReadiness(posture);
      expect(failures).toHaveLength(1);
      expect(failures[0]?.reason).toBe(ValidationFailureReason.SPF_NOT_CONFIGURED);
    });

    it('returns failure for DKIM key too short', () => {
      const posture = {
        spf: {
          status: AuthenticationPostureStatus.VALID,
          aligned: true,
        },
        dkim: {
          status: AuthenticationPostureStatus.VALID,
          aligned: true,
          publicKeySize: 1024,
        },
        dmarc: {
          status: AuthenticationPostureStatus.VALID,
          aligned: true,
        },
      };

      const failures = getValidationFailuresForReadiness(posture);
      const dkimFailures = failures.filter(
        (f) => f.reason === ValidationFailureReason.DKIM_KEY_TOO_SHORT,
      );
      expect(dkimFailures).toHaveLength(1);
    });

    it('returns failure for DMARC not configured', () => {
      const posture = {
        spf: {
          status: AuthenticationPostureStatus.VALID,
          aligned: true,
        },
        dkim: {
          status: AuthenticationPostureStatus.VALID,
          aligned: true,
          publicKeySize: 2048,
        },
        dmarc: {
          status: AuthenticationPostureStatus.PENDING,
        },
      };

      const failures = getValidationFailuresForReadiness(posture);
      expect(failures).toHaveLength(1);
      expect(failures[0]?.reason).toBe(ValidationFailureReason.DMARC_NOT_CONFIGURED);
    });
  });
});

describe('validationFailureSchema', () => {
  it('accepts valid validation failure', () => {
    const result = validationFailureSchema.parse({
      reason: ValidationFailureReason.DKIM_KEY_TOO_SHORT,
      field: 'authenticationPosture.dkim.keySize',
      message: 'DKIM key size must be at least 2048 bits',
      detectedAt: '2024-01-01T00:00:00Z',
    });

    expect(result.reason).toBe(ValidationFailureReason.DKIM_KEY_TOO_SHORT);
  });

  it('accepts validation failure without field', () => {
    const result = validationFailureSchema.parse({
      reason: ValidationFailureReason.DKIM_KEY_TOO_SHORT,
      message: 'DKIM key size must be at least 2048 bits',
      detectedAt: '2024-01-01T00:00:00Z',
    });

    expect(result.field).toBeUndefined();
  });
});
