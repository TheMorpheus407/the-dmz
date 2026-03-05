import { describe, expect, it } from 'vitest';

import {
  DEFENDER_ERROR_CODES,
  defenderAuthRequirementsSchema,
  defenderAllowlistPayloadSchema,
  isValidDefenderPayload,
  validateDefenderAuthRequirements,
} from '../defender-contract.js';
import {
  MIMECAST_ERROR_CODES,
  mimecastAllowlistPayloadSchema,
  mimecastAuthRequirementsSchema,
  isValidMimecastPayload,
  validateMimecastAuthRequirements,
} from '../mimecast-contract.js';
import {
  PROOFPOINT_ERROR_CODES,
  proofpointAllowlistPayloadSchema,
  proofpointAuthRequirementsSchema,
  isValidProofpointPayload,
  validateProofpointAuthRequirements,
} from '../proofpoint-contract.js';

import type { DefenderAuthRequirements } from '../defender-contract.js';
import type { MimecastAuthRequirements } from '../mimecast-contract.js';
import type { ProofpointAuthRequirements } from '../proofpoint-contract.js';

describe('Proofpoint gateway contract', () => {
  describe('proofpointAllowlistPayloadSchema', () => {
    it('accepts valid Proofpoint payload', () => {
      const payload = {
        version: '1.0.0',
        payloadType: 'email_allowlist' as const,
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        configurationId: '223e4567-e89b-12d3-a456-426614174000',
        emailIntegrationId: '323e4567-e89b-12d3-a456-426614174000',
        ips: ['192.168.1.1'],
        domains: ['example.com'],
        fromAddresses: ['sender@example.com'],
        spfEnabled: true,
        dkimEnabled: true,
        dmarcEnabled: true,
        bounceHandling: { enabled: false },
        metadata: {
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          requestedBy: 'admin@example.com',
        },
      };

      const result = proofpointAllowlistPayloadSchema.parse(payload);
      expect(result.tenantId).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('rejects invalid IP format', () => {
      const payload = {
        version: '1.0.0',
        payloadType: 'email_allowlist' as const,
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        configurationId: '223e4567-e89b-12d3-a456-426614174000',
        emailIntegrationId: '323e4567-e89b-12d3-a456-426614174000',
        ips: ['not-an-ip'],
        domains: ['example.com'],
        fromAddresses: ['sender@example.com'],
        metadata: {
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          requestedBy: 'admin@example.com',
        },
      };

      expect(() => proofpointAllowlistPayloadSchema.parse(payload)).toThrow();
    });

    it('rejects invalid email format', () => {
      const payload = {
        version: '1.0.0',
        payloadType: 'email_allowlist' as const,
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        configurationId: '223e4567-e89b-12d3-a456-426614174000',
        emailIntegrationId: '323e4567-e89b-12d3-a456-426614174000',
        ips: ['192.168.1.1'],
        domains: ['example.com'],
        fromAddresses: ['invalid-email'],
        metadata: {
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          requestedBy: 'admin@example.com',
        },
      };

      expect(() => proofpointAllowlistPayloadSchema.parse(payload)).toThrow();
    });
  });

  describe('proofpointAuthRequirementsSchema', () => {
    it('accepts valid auth requirements', () => {
      const result = proofpointAuthRequirementsSchema.parse({
        requiredIpRange: ['192.168.1.0/24'],
        requiresSpfAlignment: true,
        requiresDkimAlignment: true,
        requiresDmarcPolicy: true,
        minDkimKeySize: 2048,
        requiresTenantIsolation: true,
      });

      expect(result.minDkimKeySize).toBe(2048);
    });

    it('applies defaults correctly', () => {
      const result = proofpointAuthRequirementsSchema.parse({
        requiredIpRange: ['192.168.1.0/24'],
      });

      expect(result.requiresSpfAlignment).toBe(true);
      expect(result.requiresDkimAlignment).toBe(true);
      expect(result.requiresDmarcPolicy).toBe(true);
      expect(result.minDkimKeySize).toBe(2048);
      expect(result.requiresTenantIsolation).toBe(true);
    });
  });

  describe('isValidProofpointPayload', () => {
    it('returns true for valid payload', () => {
      const payload = {
        version: '1.0.0',
        payloadType: 'email_allowlist' as const,
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        configurationId: '223e4567-e89b-12d3-a456-426614174000',
        emailIntegrationId: '323e4567-e89b-12d3-a456-426614174000',
        ips: ['192.168.1.1'],
        domains: ['example.com'],
        fromAddresses: ['sender@example.com'],
        metadata: {
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          requestedBy: 'admin@example.com',
        },
      };

      expect(isValidProofpointPayload(payload)).toBe(true);
    });

    it('returns false for invalid payload', () => {
      expect(isValidProofpointPayload({ invalid: true })).toBe(false);
    });
  });

  describe('validateProofpointAuthRequirements', () => {
    const requirements: ProofpointAuthRequirements = {
      requiredIpRange: ['192.168.1.0/24'],
      requiresSpfAlignment: true,
      requiresDkimAlignment: true,
      requiresDmarcPolicy: true,
      minDkimKeySize: 2048,
      requiresTenantIsolation: true,
    };

    it('returns valid when all checks pass', () => {
      const posture = {
        spfAligned: true,
        dkimAligned: true,
        dkimKeySize: 2048,
        dmarcAligned: true,
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        payloadTenantId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = validateProofpointAuthRequirements(requirements, posture);
      expect(result.valid).toBe(true);
      expect(result.failures).toHaveLength(0);
    });

    it('returns failure for SPF not aligned', () => {
      const posture = {
        spfAligned: false,
        dkimAligned: true,
        dkimKeySize: 2048,
        dmarcAligned: true,
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        payloadTenantId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = validateProofpointAuthRequirements(requirements, posture);
      expect(result.valid).toBe(false);
      expect(result.failures).toContain('SPF alignment is required but not present');
    });

    it('returns failure for DKIM key too short', () => {
      const posture = {
        spfAligned: true,
        dkimAligned: true,
        dkimKeySize: 1024,
        dmarcAligned: true,
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        payloadTenantId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = validateProofpointAuthRequirements(requirements, posture);
      expect(result.valid).toBe(false);
      expect(result.failures).toContain('DKIM key size 1024 is below minimum 2048');
    });

    it('returns failure for tenant isolation violation', () => {
      const posture = {
        spfAligned: true,
        dkimAligned: true,
        dkimKeySize: 2048,
        dmarcAligned: true,
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        payloadTenantId: 'different-tenant-id',
      };

      const result = validateProofpointAuthRequirements(requirements, posture);
      expect(result.valid).toBe(false);
      expect(result.failures).toContain('Tenant isolation violation detected');
    });
  });

  describe('PROOFPOINT_ERROR_CODES', () => {
    it('has all required error codes', () => {
      expect(PROOFPOINT_ERROR_CODES.INVALID_IP_FORMAT).toBeDefined();
      expect(PROOFPOINT_ERROR_CODES.INVALID_DOMAIN_FORMAT).toBeDefined();
      expect(PROOFPOINT_ERROR_CODES.TENANT_ISOLATION_VIOLATED).toBeDefined();
      expect(PROOFPOINT_ERROR_CODES.AUTH_REQUIREMENTS_NOT_MET).toBeDefined();
    });
  });
});

describe('Mimecast gateway contract', () => {
  describe('mimecastAllowlistPayloadSchema', () => {
    it('accepts valid Mimecast payload', () => {
      const payload = {
        version: '1.0.0',
        payloadType: 'email_allowlist' as const,
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        configurationId: '223e4567-e89b-12d3-a456-426614174000',
        emailIntegrationId: '323e4567-e89b-12d3-a456-426614174000',
        senderAuthentication: {
          senderDomains: ['example.com'],
          senderIps: ['192.168.1.1'],
        },
        authenticationRequirements: {
          requireSpf: true,
          requireDkim: true,
          requireDmarc: true,
          dmarcAction: 'none' as const,
        },
        bounceHandling: { enabled: false },
        metadata: {
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          requestedBy: 'admin@example.com',
        },
      };

      const result = mimecastAllowlistPayloadSchema.parse(payload);
      expect(result.tenantId).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('rejects missing sender domains', () => {
      const payload = {
        version: '1.0.0',
        payloadType: 'email_allowlist' as const,
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        configurationId: '223e4567-e89b-12d3-a456-426614174000',
        emailIntegrationId: '323e4567-e89b-12d3-a456-426614174000',
        senderAuthentication: {
          senderDomains: [],
        },
        metadata: {
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          requestedBy: 'admin@example.com',
        },
      };

      expect(() => mimecastAllowlistPayloadSchema.parse(payload)).toThrow();
    });
  });

  describe('mimecastAuthRequirementsSchema', () => {
    it('accepts valid auth requirements', () => {
      const result = mimecastAuthRequirementsSchema.parse({
        requiredSenderDomains: ['example.com'],
        requiresSpfAlignment: true,
        requiresDkimAlignment: true,
        requiresDmarcPolicy: true,
        minDkimKeySize: 2048,
        supportedDmarcActions: ['none', 'quarantine', 'reject'],
        requiresTenantIsolation: true,
      });

      expect(result.supportedDmarcActions).toContain('none');
    });
  });

  describe('isValidMimecastPayload', () => {
    it('returns true for valid payload', () => {
      const payload = {
        version: '1.0.0',
        payloadType: 'email_allowlist' as const,
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        configurationId: '223e4567-e89b-12d3-a456-426614174000',
        emailIntegrationId: '323e4567-e89b-12d3-a456-426614174000',
        senderAuthentication: {
          senderDomains: ['example.com'],
        },
        metadata: {
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          requestedBy: 'admin@example.com',
        },
      };

      expect(isValidMimecastPayload(payload)).toBe(true);
    });

    it('returns false for invalid payload', () => {
      expect(isValidMimecastPayload({ invalid: true })).toBe(false);
    });
  });

  describe('validateMimecastAuthRequirements', () => {
    const requirements: MimecastAuthRequirements = {
      requiredSenderDomains: ['example.com'],
      requiresSpfAlignment: true,
      requiresDkimAlignment: true,
      requiresDmarcPolicy: true,
      minDkimKeySize: 2048,
      supportedDmarcActions: ['none', 'quarantine', 'reject'],
      requiresTenantIsolation: true,
    };

    it('returns valid when all checks pass', () => {
      const posture = {
        spfAligned: true,
        dkimAligned: true,
        dkimKeySize: 2048,
        dmarcAligned: true,
        dmarcAction: 'none' as const,
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        payloadTenantId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = validateMimecastAuthRequirements(requirements, posture);
      expect(result.valid).toBe(true);
    });

    it('returns failure for unsupported DMARC action', () => {
      const posture = {
        spfAligned: true,
        dkimAligned: true,
        dkimKeySize: 2048,
        dmarcAligned: true,
        dmarcAction: 'reject' as const,
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        payloadTenantId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = validateMimecastAuthRequirements(
        {
          ...requirements,
          supportedDmarcActions: ['none', 'quarantine'],
        },
        posture,
      );
      expect(result.valid).toBe(false);
      expect(result.failures).toContain('DMARC action reject is not supported');
    });
  });

  describe('MIMECAST_ERROR_CODES', () => {
    it('has all required error codes', () => {
      expect(MIMECAST_ERROR_CODES.INVALID_SENDER_DOMAIN).toBeDefined();
      expect(MIMECAST_ERROR_CODES.INVALID_SENDER_IP).toBeDefined();
      expect(MIMECAST_ERROR_CODES.TENANT_ISOLATION_VIOLATED).toBeDefined();
    });
  });
});

describe('Microsoft Defender gateway contract', () => {
  describe('defenderAllowlistPayloadSchema', () => {
    it('accepts valid Defender payload', () => {
      const payload = {
        version: '1.0.0',
        payloadType: 'email_allowlist' as const,
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        configurationId: '223e4567-e89b-12d3-a456-426614174000',
        emailIntegrationId: '323e4567-e89b-12d3-a456-426614174000',
        connectorConfiguration: {
          connectorName: 'DMZ Connector',
          connectorType: 'inbound' as const,
          sourceServerRanges: ['192.168.1.0/24'],
          tlsSettings: {
            requireTls: true,
            minTlsVersion: '1.2' as const,
            certificateValidation: 'enabled' as const,
          },
        },
        senderDomains: ['example.com'],
        authentication: {
          spfAlignmentRequired: true,
          dkimAlignmentRequired: true,
          dmarcPolicyRequired: true,
          dmarcAction: 'noaction' as const,
        },
        bypassRules: {},
        reporting: {},
        metadata: {
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          requestedBy: 'admin@example.com',
        },
      };

      const result = defenderAllowlistPayloadSchema.parse(payload);
      expect(result.tenantId).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('rejects invalid TLS version', () => {
      const payload = {
        version: '1.0.0',
        payloadType: 'email_allowlist' as const,
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        configurationId: '223e4567-e89b-12d3-a456-426614174000',
        emailIntegrationId: '323e4567-e89b-12d3-a456-426614174000',
        connectorConfiguration: {
          connectorName: 'Test',
          connectorType: 'inbound' as const,
          tlsSettings: {
            requireTls: true,
            minTlsVersion: '1.99' as string,
          },
        },
        senderDomains: ['example.com'],
        metadata: {
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          requestedBy: 'admin@example.com',
        },
      };

      expect(() => defenderAllowlistPayloadSchema.parse(payload)).toThrow();
    });
  });

  describe('defenderAuthRequirementsSchema', () => {
    it('accepts valid auth requirements', () => {
      const result = defenderAuthRequirementsSchema.parse({
        requiredSenderDomains: ['example.com'],
        requiresSpfAlignment: true,
        requiresDkimAlignment: true,
        requiresDmarcPolicy: true,
        minDkimKeySize: 2048,
        requiresTenantIsolation: true,
        requiresTls: true,
        minTlsVersion: '1.2',
      });

      expect(result.minTlsVersion).toBe('1.2');
    });

    it('applies defaults correctly', () => {
      const result = defenderAuthRequirementsSchema.parse({
        requiredSenderDomains: ['example.com'],
      });

      expect(result.requiresSpfAlignment).toBe(true);
      expect(result.requiresDkimAlignment).toBe(true);
      expect(result.minDkimKeySize).toBe(2048);
      expect(result.requiresTenantIsolation).toBe(true);
      expect(result.requiresTls).toBe(true);
      expect(result.minTlsVersion).toBe('1.2');
    });
  });

  describe('isValidDefenderPayload', () => {
    it('returns true for valid payload', () => {
      const payload = {
        version: '1.0.0',
        payloadType: 'email_allowlist' as const,
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        configurationId: '223e4567-e89b-12d3-a456-426614174000',
        emailIntegrationId: '323e4567-e89b-12d3-a456-426614174000',
        connectorConfiguration: {
          connectorName: 'Test',
          connectorType: 'inbound' as const,
        },
        senderDomains: ['example.com'],
        metadata: {
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          requestedBy: 'admin@example.com',
        },
      };

      expect(isValidDefenderPayload(payload)).toBe(true);
    });

    it('returns false for invalid payload', () => {
      expect(isValidDefenderPayload({ invalid: true })).toBe(false);
    });
  });

  describe('validateDefenderAuthRequirements', () => {
    const requirements: DefenderAuthRequirements = {
      requiredSenderDomains: ['example.com'],
      requiresSpfAlignment: true,
      requiresDkimAlignment: true,
      requiresDmarcPolicy: true,
      minDkimKeySize: 2048,
      requiresTenantIsolation: true,
      requiresTls: true,
      minTlsVersion: '1.2',
    };

    it('returns valid when all checks pass', () => {
      const posture = {
        spfAligned: true,
        dkimAligned: true,
        dkimKeySize: 2048,
        dmarcAligned: true,
        dmarcAction: 'noaction' as const,
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        payloadTenantId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = validateDefenderAuthRequirements(requirements, posture);
      expect(result.valid).toBe(true);
    });

    it('returns failure for tenant isolation violation', () => {
      const posture = {
        spfAligned: true,
        dkimAligned: true,
        dkimKeySize: 2048,
        dmarcAligned: true,
        dmarcAction: 'noaction' as const,
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        payloadTenantId: 'different-tenant-id',
      };

      const result = validateDefenderAuthRequirements(requirements, posture);
      expect(result.valid).toBe(false);
      expect(result.failures).toContain('Tenant isolation violation detected');
    });
  });

  describe('DEFENDER_ERROR_CODES', () => {
    it('has all required error codes', () => {
      expect(DEFENDER_ERROR_CODES.INVALID_CONNECTOR_CONFIG).toBeDefined();
      expect(DEFENDER_ERROR_CODES.TENANT_ISOLATION_VIOLATED).toBeDefined();
      expect(DEFENDER_ERROR_CODES.AUTH_REQUIREMENTS_NOT_MET).toBeDefined();
    });
  });
});
