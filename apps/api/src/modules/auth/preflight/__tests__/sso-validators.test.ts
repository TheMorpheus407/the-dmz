import { describe, it, expect, vi } from 'vitest';

import { OIDCPreflightValidator } from '../oidc-validator.js';
import { SAMLPreflightValidator } from '../saml-validator.js';

const oidcValidator = new OIDCPreflightValidator();
const samlValidator = new SAMLPreflightValidator();

const CORRELATION_ID = '123e4567-e89b-12d3-a456-426614174000';
const VALID_DISCOVERY_DOCUMENT = {
  issuer: 'https://example.com',
  jwks_uri: 'https://example.com/.well-known/jwks.json',
};
const VALID_JWKS_RESPONSE = {
  keys: [{ kty: 'RSA', kid: 'test-key', use: 'sig' }],
};
const VALID_SAML_METADATA = `<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor entityID="https://example.com" xmlns="urn:oasis:names:tc:SAML:2.0:metadata">
  <IDPSSODescriptor WantAuthnRequestsSigned="false" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <KeyDescriptor use="signing">
      <KeyInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
        <X509Data>
          <X509Certificate>MIIC...</X509Certificate>
        </X509Data>
      </KeyInfo>
    </KeyDescriptor>
  </IDPSSODescriptor>
</EntityDescriptor>`;

describe('OIDCPreflightValidator', () => {
  describe('validateDiscovery', () => {
    it('metadataUrl is null', async () => {
      const result = await oidcValidator.validateDiscovery(null, CORRELATION_ID);
      expect(result.status).toBe('failed');
      expect(result.message).toBe('OIDC metadata URL not configured');
      expect(result.checkType).toBe('discovery_fetch');
    });

    it('Network timeout (AbortError)', async () => {
      const abortError = new DOMException('Aborted', 'AbortError');
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

      const result = await oidcValidator.validateDiscovery(
        'https://example.com/.well-known/openid-configuration',
        CORRELATION_ID,
      );

      expect(result.status).toBe('failed');
      expect(result.message).toContain('Aborted');
      expect(result.correlationId).toBe(CORRELATION_ID);
    });

    it('HTTP 503 error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 503,
          json: vi.fn().mockResolvedValue({}),
        }),
      );

      const result = await oidcValidator.validateDiscovery(
        'https://example.com/.well-known/openid-configuration',
        CORRELATION_ID,
      );

      expect(result.status).toBe('failed');
      expect(result.message).toContain('503');
    });

    it('HTTP 404 error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          json: vi.fn().mockResolvedValue({}),
        }),
      );

      const result = await oidcValidator.validateDiscovery(
        'https://example.com/.well-known/openid-configuration',
        CORRELATION_ID,
      );

      expect(result.status).toBe('failed');
      expect(result.message).toContain('404');
    });

    it('HTTP 500 error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          json: vi.fn().mockResolvedValue({}),
        }),
      );

      const result = await oidcValidator.validateDiscovery(
        'https://example.com/.well-known/openid-configuration',
        CORRELATION_ID,
      );

      expect(result.status).toBe('failed');
      expect(result.message).toContain('500');
    });

    it('Invalid JSON (SyntaxError)', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
        }),
      );

      const result = await oidcValidator.validateDiscovery(
        'https://example.com/.well-known/openid-configuration',
        CORRELATION_ID,
      );

      expect(result.status).toBe('failed');
      expect(result.correlationId).toBe(CORRELATION_ID);
    });

    it('Missing issuer', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({ jwks_uri: 'https://example.com/jwks' }),
        }),
      );

      const result = await oidcValidator.validateDiscovery(
        'https://example.com/.well-known/openid-configuration',
        CORRELATION_ID,
      );

      expect(result.status).toBe('failed');
      expect(result.message).toContain('missing issuer or jwks_uri');
    });

    it('Missing jwks_uri', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({ issuer: 'https://example.com' }),
        }),
      );

      const result = await oidcValidator.validateDiscovery(
        'https://example.com/.well-known/openid-configuration',
        CORRELATION_ID,
      );

      expect(result.status).toBe('failed');
      expect(result.message).toContain('missing issuer or jwks_uri');
    });

    it('Valid discovery document', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue(VALID_DISCOVERY_DOCUMENT),
        }),
      );

      const result = await oidcValidator.validateDiscovery(
        'https://example.com/.well-known/openid-configuration',
        CORRELATION_ID,
      );

      expect(result.status).toBe('ok');
      expect(result.message).toContain('successfully');
      expect(result.details?.issuer).toBe(VALID_DISCOVERY_DOCUMENT.issuer);
    });
  });

  describe('validateIssuerMatch', () => {
    it('metadataUrl is null', () => {
      const result = oidcValidator.validateIssuerMatch(null, 'client123');
      expect(result.status).toBe('warning');
      expect(result.message).toContain('Cannot validate issuer');
    });

    it('clientId is null', () => {
      const result = oidcValidator.validateIssuerMatch('https://example.com', null);
      expect(result.status).toBe('warning');
      expect(result.message).toContain('Cannot validate issuer');
    });
  });

  describe('validateJWKS', () => {
    it('metadataUrl is null', async () => {
      const result = await oidcValidator.validateJWKS(null, CORRELATION_ID);
      expect(result.status).toBe('failed');
      expect(result.message).toBe('OIDC metadata URL not configured');
      expect(result.checkType).toBe('jwks_reachability');
    });

    it('Network timeout during discovery fetch', async () => {
      const abortError = new DOMException('Aborted', 'AbortError');
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

      const result = await oidcValidator.validateJWKS(
        'https://example.com/.well-known/openid-configuration',
        CORRELATION_ID,
      );

      expect(result.status).toBe('failed');
      expect(result.correlationId).toBe(CORRELATION_ID);
    });

    it('HTTP error during discovery fetch', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 503,
          json: vi.fn().mockResolvedValue({}),
        }),
      );

      const result = await oidcValidator.validateJWKS(
        'https://example.com/.well-known/openid-configuration',
        CORRELATION_ID,
      );

      expect(result.status).toBe('failed');
      expect(result.message).toContain('503');
    });

    it('Missing jwks_uri in discovery', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({ issuer: 'https://example.com' }),
        }),
      );

      const result = await oidcValidator.validateJWKS(
        'https://example.com/.well-known/openid-configuration',
        CORRELATION_ID,
      );

      expect(result.status).toBe('warning');
      expect(result.message).toContain('JWKS URI not found');
    });

    it('Network timeout during JWKS fetch', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: vi.fn().mockResolvedValue(VALID_DISCOVERY_DOCUMENT),
          })
          .mockRejectedValueOnce(new DOMException('Aborted', 'AbortError')),
      );

      const result = await oidcValidator.validateJWKS(
        'https://example.com/.well-known/openid-configuration',
        CORRELATION_ID,
      );

      expect(result.status).toBe('failed');
      expect(result.correlationId).toBe(CORRELATION_ID);
    });

    it('HTTP error during JWKS fetch', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: vi.fn().mockResolvedValue(VALID_DISCOVERY_DOCUMENT),
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 503,
            json: vi.fn().mockResolvedValue({}),
          }),
      );

      const result = await oidcValidator.validateJWKS(
        'https://example.com/.well-known/openid-configuration',
        CORRELATION_ID,
      );

      expect(result.status).toBe('failed');
      expect(result.message).toContain('503');
    });

    it('Successful JWKS validation', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: vi.fn().mockResolvedValue(VALID_DISCOVERY_DOCUMENT),
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: vi.fn().mockResolvedValue(VALID_JWKS_RESPONSE),
          }),
      );

      const result = await oidcValidator.validateJWKS(
        'https://example.com/.well-known/openid-configuration',
        CORRELATION_ID,
      );

      expect(result.status).toBe('ok');
      expect(result.message).toContain('reachable');
    });
  });
});

describe('SAMLPreflightValidator', () => {
  describe('validateMetadataFetch', () => {
    it('Network timeout (AbortError)', async () => {
      const abortError = new DOMException('Aborted', 'AbortError');
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

      const result = await samlValidator.validateMetadataFetch(
        'https://example.com/metadata.xml',
        CORRELATION_ID,
      );

      expect(result.status).toBe('failed');
      expect(result.correlationId).toBe(CORRELATION_ID);
    });

    it('HTTP 503 error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 503,
          text: vi.fn().mockResolvedValue(''),
        }),
      );

      const result = await samlValidator.validateMetadataFetch(
        'https://example.com/metadata.xml',
        CORRELATION_ID,
      );

      expect(result.status).toBe('failed');
      expect(result.message).toContain('503');
    });

    it('HTTP 404 error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          text: vi.fn().mockResolvedValue(''),
        }),
      );

      const result = await samlValidator.validateMetadataFetch(
        'https://example.com/metadata.xml',
        CORRELATION_ID,
      );

      expect(result.status).toBe('failed');
      expect(result.message).toContain('404');
    });

    it('HTTP 500 error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          text: vi.fn().mockResolvedValue(''),
        }),
      );

      const result = await samlValidator.validateMetadataFetch(
        'https://example.com/metadata.xml',
        CORRELATION_ID,
      );

      expect(result.status).toBe('failed');
      expect(result.message).toContain('500');
    });

    it('Non-XML response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          text: vi.fn().mockResolvedValue('Not XML content'),
        }),
      );

      const result = await samlValidator.validateMetadataFetch(
        'https://example.com/metadata.xml',
        CORRELATION_ID,
      );

      expect(result.status).toBe('failed');
      expect(result.checkType).toBe('metadata_parse');
    });

    it('Malformed XML (missing EntityDescriptor/IDPSSODescriptor)', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          text: vi.fn().mockResolvedValue('<SomeOtherTag>content</SomeOtherTag>'),
        }),
      );

      const result = await samlValidator.validateMetadataFetch(
        'https://example.com/metadata.xml',
        CORRELATION_ID,
      );

      expect(result.status).toBe('failed');
      expect(result.checkType).toBe('metadata_parse');
    });

    it('Valid SAML metadata', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          text: vi.fn().mockResolvedValue(VALID_SAML_METADATA),
        }),
      );

      const result = await samlValidator.validateMetadataFetch(
        'https://example.com/metadata.xml',
        CORRELATION_ID,
      );

      expect(result.status).toBe('ok');
      expect(result.message).toContain('successfully');
    });
  });

  describe('validateCertificate', () => {
    it('Returns ok status with correlationId', () => {
      const result = samlValidator.validateCertificate(
        'https://example.com/metadata.xml',
        CORRELATION_ID,
      );
      expect(result.status).toBe('ok');
      expect(result.correlationId).toBe(CORRELATION_ID);
    });
  });
});
