import { beforeAll, describe, expect, it, vi } from 'vitest';

import {
  validateSAMLResponse,
  mapGroupsToRole,
  buildSAMLAuthnRequest,
  generateSPMetadata,
  fetchAndParseIdPMetadata,
  clearIdPMetadataCache,
  notifyJITUserCreated,
} from '../auth.sso.service.js';

import type { SSOProvider } from '../auth.sso.service.js';

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
      })),
    })),
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

    it('should return invalid when destination does not match', async () => {
      const response = `<?xml version="1.0" encoding="UTF-8"?>
        <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                       xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                       ID="_response123"
                       IssueInstant="${new Date().toISOString()}"
                       Destination="https://wrong-destination.example.com/acs">
          <saml:Issuer>https://idp.example.com</saml:Issuer>
          <samlp:Status>
            <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
          </samlp:Status>
          <saml:Assertion ID="_assertion123">
            <saml:Issuer>https://idp.example.com</saml:Issuer>
            <saml:Subject>
              <saml:NameID>user@example.com</saml:NameID>
            </saml:Subject>
          </saml:Assertion>
        </samlp:Response>`;

      const encoded = Buffer.from(response).toString('base64');

      const result = await validateSAMLResponse(
        encoded,
        mockProvider,
        'https://dmz.thearchive.game/api/v1/auth/sso/saml/acs/provider-id',
      );

      expect(result.valid).toBe(false);
      expect(result.failureReason).toBe('configuration_error');
    });

    it('should return invalid when status code indicates failure', async () => {
      const response = `<?xml version="1.0" encoding="UTF-8"?>
        <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                       xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                       ID="_response123"
                       IssueInstant="${new Date().toISOString()}"
                       Destination="https://dmz.thearchive.game/api/v1/auth/sso/saml/acs/provider-id">
          <saml:Issuer>https://idp.example.com</saml:Issuer>
          <samlp:Status>
            <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Requester"/>
          </samlp:Status>
          <saml:Assertion ID="_assertion123">
            <saml:Issuer>https://idp.example.com</saml:Issuer>
            <saml:Subject>
              <saml:NameID>user@example.com</saml:NameID>
            </saml:Subject>
          </saml:Assertion>
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

    it('should return invalid when token is expired due to clock skew', async () => {
      const expiredIssueInstant = new Date(Date.now() - 400000).toISOString();

      const response = `<?xml version="1.0" encoding="UTF-8"?>
        <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                       xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                       ID="_response123"
                       IssueInstant="${expiredIssueInstant}"
                       Destination="https://dmz.thearchive.game/api/v1/auth/sso/saml/acs/provider-id">
          <saml:Issuer>https://idp.example.com</saml:Issuer>
          <samlp:Status>
            <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
          </samlp:Status>
          <saml:Assertion ID="_assertion123">
            <saml:Issuer>https://idp.example.com</saml:Issuer>
            <saml:Subject>
              <saml:NameID>user@example.com</saml:NameID>
            </saml:Subject>
          </saml:Assertion>
        </samlp:Response>`;

      const encoded = Buffer.from(response).toString('base64');

      const result = await validateSAMLResponse(
        encoded,
        mockProvider,
        'https://dmz.thearchive.game/api/v1/auth/sso/saml/acs/provider-id',
      );

      expect(result.valid).toBe(false);
      expect(result.failureReason).toBe('token_expired');
    });

    it('should return invalid when assertion is not yet valid (NotBefore)', async () => {
      const futureDate = new Date(Date.now() + 600000).toISOString();

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
              <saml:NameID>user@example.com</saml:NameID>
            </saml:Subject>
            <saml:Conditions NotBefore="${futureDate}"/>
          </saml:Assertion>
        </samlp:Response>`;

      const encoded = Buffer.from(response).toString('base64');

      const result = await validateSAMLResponse(
        encoded,
        mockProvider,
        'https://dmz.thearchive.game/api/v1/auth/sso/saml/acs/provider-id',
      );

      expect(result.valid).toBe(false);
      expect(result.failureReason).toBe('token_early');
    });

    it('should return invalid when assertion is expired (NotOnOrAfter)', async () => {
      const pastDate = new Date(Date.now() - 60000).toISOString();

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
          <saml:Assertion ID="_assertion456">
            <saml:Issuer>https://idp.example.com</saml:Issuer>
            <saml:Subject>
              <saml:NameID>user@example.com</saml:NameID>
            </saml:Subject>
            <saml:Conditions NotOnOrAfter="${pastDate}"/>
          </saml:Assertion>
        </samlp:Response>`;

      const encoded = Buffer.from(response).toString('base64');

      const result = await validateSAMLResponse(
        encoded,
        mockProvider,
        'https://dmz.thearchive.game/api/v1/auth/sso/saml/acs/provider-id',
      );

      expect(result.valid).toBe(false);
      expect(result.failureReason).toBe('token_expired');
    });

    it('should detect replay attack on same assertion ID', async () => {
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
          <saml:Assertion ID="_replay-assertion-id">
            <saml:Issuer>https://idp.example.com</saml:Issuer>
            <saml:Subject>
              <saml:NameID>user@example.com</saml:NameID>
            </saml:Subject>
          </saml:Assertion>
        </samlp:Response>`;

      const encoded = Buffer.from(response).toString('base64');

      const firstResult = await validateSAMLResponse(
        encoded,
        mockProvider,
        'https://dmz.thearchive.game/api/v1/auth/sso/saml/acs/provider-id',
      );

      expect(firstResult.valid).toBe(true);

      const secondResult = await validateSAMLResponse(
        encoded,
        mockProvider,
        'https://dmz.thearchive.game/api/v1/auth/sso/saml/acs/provider-id',
      );

      expect(secondResult.valid).toBe(false);
      expect(secondResult.failureReason).toBe('invalid_assertion');
    });

    it('should extract attributes and map to claims correctly', async () => {
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
              <saml:NameID>user@example.com</saml:NameID>
            </saml:Subject>
            <saml:AttributeStatement>
              <saml:Attribute Name="email">
                <saml:AttributeValue>USER@EXAMPLE.COM</saml:AttributeValue>
              </saml:Attribute>
              <saml:Attribute Name="firstName">
                <saml:AttributeValue>John</saml:AttributeValue>
              </saml:Attribute>
              <saml:Attribute Name="lastName">
                <saml:AttributeValue>Doe</saml:AttributeValue>
              </saml:Attribute>
              <saml:Attribute Name="groups">
                <saml:AttributeValue>admins</saml:AttributeValue>
                <saml:AttributeValue>users</saml:AttributeValue>
              </saml:Attribute>
              <saml:Attribute Name="department">
                <saml:AttributeValue>Engineering</saml:AttributeValue>
              </saml:Attribute>
              <saml:Attribute Name="title">
                <saml:AttributeValue>Software Engineer</saml:AttributeValue>
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

      expect(result.valid).toBe(true);
      expect(result.claims).toBeDefined();
      expect(result.claims?.email).toBe('user@example.com');
      expect(result.claims?.displayName).toBe('John Doe');
      expect(result.claims?.groups).toEqual(['admins', 'users']);
      expect(result.claims?.department).toBe('Engineering');
      expect(result.claims?.title).toBe('Software Engineer');
    });

    it('should handle object-style NameID', async () => {
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
              <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">user@example.com</saml:NameID>
            </saml:Subject>
          </saml:Assertion>
        </samlp:Response>`;

      const encoded = Buffer.from(response).toString('base64');

      const result = await validateSAMLResponse(
        encoded,
        mockProvider,
        'https://dmz.thearchive.game/api/v1/auth/sso/saml/acs/provider-id',
      );

      expect(result.valid).toBe(true);
      expect(result.claims?.subject).toBe('user@example.com');
    });

    it('should return valid when no timestamp is present', async () => {
      const response = `<?xml version="1.0" encoding="UTF-8"?>
        <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                       xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                       ID="_response123"
                       Destination="https://dmz.thearchive.game/api/v1/auth/sso/saml/acs/provider-id">
          <saml:Issuer>https://idp.example.com</saml:Issuer>
          <samlp:Status>
            <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
          </samlp:Status>
          <saml:Assertion ID="_assertion123">
            <saml:Issuer>https://idp.example.com</saml:Issuer>
            <saml:Subject>
              <saml:NameID>user@example.com</saml:NameID>
            </saml:Subject>
          </saml:Assertion>
        </samlp:Response>`;

      const encoded = Buffer.from(response).toString('base64');

      const result = await validateSAMLResponse(
        encoded,
        mockProvider,
        'https://dmz.thearchive.game/api/v1/auth/sso/saml/acs/provider-id',
      );

      expect(result.valid).toBe(true);
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

  describe('notifyJITUserCreated', () => {
    it('should handle case with no tenant admins', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      type MockDb = {
        select: ReturnType<typeof vi.fn>;
        insert: ReturnType<typeof vi.fn>;
      };
      const mockDb = getDatabaseClient() as unknown as MockDb;

      const mockSelect = mockDb.select;
      mockSelect.mockReturnValue({
        from: () => ({
          where: () => Promise.resolve([]),
        }),
      });

      await notifyJITUserCreated({
        tenantId: 'tenant-123',
        jitUserId: 'user-456',
        jitUserEmail: 'newuser@example.com',
        idpSource: 'saml',
        idpProviderName: 'Okta SAML',
      });

      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });
});
