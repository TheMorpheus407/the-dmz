import { beforeAll, describe, expect, it, vi } from 'vitest';

import {
  validateSAMLResponse,
  mapGroupsToRole,
  buildSAMLAuthnRequest,
  generateSPMetadata,
  fetchAndParseIdPMetadata,
  clearIdPMetadataCache,
} from '../auth.sso.service.js';

import type { SSOProvider } from '../auth.sso.service.js';

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(() => ({
    select: vi.fn(() => Promise.resolve([])),
    insert: vi.fn(() => Promise.resolve([{ userId: 'test-user-id' }])),
    update: vi.fn(() => Promise.resolve({})),
  })),
}));

describe('SAML Service', () => {
  const mockProvider: SSOProvider = {
    id: 'provider-id',
    tenantId: 'tenant-id',
    provider: 'saml',
    name: 'Test SAML Provider',
    metadataUrl: 'https://idp.example.com/metadata',
    clientId: 'sp-entity-id',
    clientSecretEncrypted: null,
    idpCertificate: null,
    spPrivateKey: null,
    spCertificate: null,
    isActive: true,
    roleMappingRules: null,
    defaultRole: 'learner',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('mapGroupsToRole', () => {
    it('should return default role when no groups match', () => {
      const result = mapGroupsToRole(
        ['group1', 'group2'],
        [{ idpGroup: 'admin', rbRole: 'tenant_admin' }],
        'learner',
        ['super_admin', 'tenant_admin', 'manager', 'trainer', 'learner'],
      );
      expect(result).toBe('learner');
    });

    it('should map IdP group to RBAC role', () => {
      const result = mapGroupsToRole(
        ['admins', 'users'],
        [
          { idpGroup: 'admins', rbRole: 'tenant_admin' },
          { idpGroup: 'users', rbRole: 'learner' },
        ],
        'learner',
        ['super_admin', 'tenant_admin', 'manager', 'trainer', 'learner'],
      );
      expect(result).toBe('tenant_admin');
    });

    it('should return learner for unmapped role', () => {
      const result = mapGroupsToRole(
        ['admins'],
        [
          { idpGroup: 'admins', rbRole: 'super_admin' },
          { idpGroup: 'users', rbRole: 'learner' },
        ],
        'learner',
        ['super_admin', 'tenant_admin', 'manager', 'trainer', 'learner'],
      );
      expect(result).toBe('super_admin');
    });

    it('should handle empty groups array', () => {
      const result = mapGroupsToRole(
        [],
        [{ idpGroup: 'admin', rbRole: 'tenant_admin' }],
        'learner',
        ['super_admin', 'tenant_admin', 'manager', 'trainer', 'learner'],
      );
      expect(result).toBe('learner');
    });
  });

  describe('buildSAMLAuthnRequest', () => {
    it('should build a SAML AuthnRequest URL', () => {
      const result = buildSAMLAuthnRequest(
        mockProvider,
        'https://dmz.thearchive.game/api/v1/auth/sso/saml/acs/provider-id',
        'tenant-id',
        'https://app.example.com/callback',
      );

      expect(result).toContain('SAMLRequest=');
      expect(result).toContain('RelayState=');
    });

    it('should work without relay state', () => {
      const result = buildSAMLAuthnRequest(
        mockProvider,
        'https://dmz.thearchive.game/api/v1/auth/sso/saml/acs/provider-id',
        'tenant-id',
      );

      expect(result).toContain('SAMLRequest=');
    });
  });

  describe('generateSPMetadata', () => {
    it('should generate valid SP metadata XML', () => {
      const result = generateSPMetadata(
        'tenant-id',
        'https://dmz.thearchive.game/api/v1/auth/sso/saml/acs/tenant-id',
        'https://dmz.thearchive.game/api/v1/auth/sso/saml/slo/tenant-id',
      );

      expect(result).toContain('EntityDescriptor');
      expect(result).toContain('SPSSODescriptor');
      expect(result).toContain('tenant-id');
      expect(result).toContain('AssertionConsumerService');
    });

    it('should include SP certificate when provided', () => {
      const result = generateSPMetadata(
        'tenant-id',
        'https://dmz.thearchive.game/api/v1/auth/sso/saml/acs/tenant-id',
        'https://dmz.thearchive.game/api/v1/auth/sso/saml/slo/tenant-id',
        'MIIC...certificate...',
      );

      expect(result).toContain('KeyDescriptor');
      expect(result).toContain('X509Certificate');
    });
  });

  describe('validateSAMLResponse', () => {
    beforeAll(() => {
      clearIdPMetadataCache();
    });

    it('should return invalid when SAML response is malformed', async () => {
      const invalidResponse = Buffer.from('invalid xml').toString('base64');

      const result = await validateSAMLResponse(
        invalidResponse,
        mockProvider,
        'https://dmz.thearchive.game/api/v1/auth/sso/saml/acs/provider-id',
      );

      expect(result.valid).toBe(false);
      expect(result.failureReason).toBeDefined();
    });

    it('should return invalid when response has no assertion', async () => {
      const response = `<?xml version="1.0" encoding="UTF-8"?>
        <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                       xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                       ID="_response123">
          <saml:Issuer>https://idp.example.com</saml:Issuer>
          <samlp:Status>
            <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
          </samlp:Status>
        </samlp:Response>`;

      const encoded = Buffer.from(response).toString('base64');

      const result = await validateSAMLResponse(
        encoded,
        mockProvider,
        'https://dmz.thearchive.game/api/v1/auth/sso/saml/acs/provider-id',
      );

      expect(result.valid).toBe(false);
      expect(result.failureReason).toBe('invalid_assertion');
    });

    it('should return invalid when issuer does not match', async () => {
      const response = `<?xml version="1.0" encoding="UTF-8"?>
        <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                       xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                       ID="_response123"
                       IssueInstant="${new Date().toISOString()}"
                       Destination="https://dmz.thearchive.game/api/v1/auth/sso/saml/acs/provider-id">
          <saml:Issuer>https://wrong-idp.example.com</saml:Issuer>
          <samlp:Status>
            <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
          </samlp:Status>
          <saml:Assertion ID="_assertion123">
            <saml:Issuer>https://wrong-idp.example.com</saml:Issuer>
            <saml:Subject>
              <saml:NameID>user@example.com</saml:NameID>
            </saml:Subject>
            <saml:AttributeStatement>
              <saml:Attribute Name="email">
                <saml:AttributeValue>user@example.com</saml:AttributeValue>
              </saml:Attribute>
            </saml:AttributeStatement>
          </saml:Assertion>
        </samlp:Response>`;

      const encoded = Buffer.from(response).toString('base64');

      const result = await validateSAMLResponse(
        encoded,
        mockProvider,
        'https://dmz.thearchive.game/api/v1/auth/sso/saml/acs/provider-id',
      );

      expect(result.valid).toBe(false);
    });

    it('should return invalid when no subject is present', async () => {
      const response = `<?xml version="1.0" encoding="UTF-8"?>
        <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                       xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                       ID="_response123"
                       IssueInstant="${new Date().toISOString()}"
                       Destination="https://dmz.thearchive.game/api/v1/auth/sso/saml/acs/provider-id">
          <saml:Issuer>https://idp.example.com</saml:Issuer>
          <samlp:Status>
            <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
          </samlp:Status>
          <saml:Assertion ID="_assertion123">
            <saml:Issuer>https://idp.example.com</saml:Issuer>
            <saml:Subject>
            </saml:Subject>
            <saml:AttributeStatement>
              <saml:Attribute Name="email">
                <saml:AttributeValue>user@example.com</saml:AttributeValue>
              </saml:Attribute>
            </saml:AttributeStatement>
          </saml:Assertion>
        </samlp:Response>`;

      const encoded = Buffer.from(response).toString('base64');

      const result = await validateSAMLResponse(
        encoded,
        mockProvider,
        'https://dmz.thearchive.game/api/v1/auth/sso/saml/acs/provider-id',
      );

      expect(result.valid).toBe(false);
    });
  });

  describe('fetchAndParseIdPMetadata', () => {
    beforeAll(() => {
      clearIdPMetadataCache();
    });

    it('should throw error for invalid metadata URL', async () => {
      await expect(
        fetchAndParseIdPMetadata('https://invalid-url-that-does-not-exist.example.com/metadata'),
      ).rejects.toThrow();
    });
  });
});
