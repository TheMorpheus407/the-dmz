import { describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

import { fetchAndParseIdPMetadata, clearIdPMetadataCache } from '../auth.sso.service.js';

describe('SAML Integration Tests', () => {
  describe('fetchAndParseIdPMetadata', () => {
    it('should fetch and parse SAML IdP metadata', async () => {
      const mockMetadata = `<?xml version="1.0" encoding="UTF-8"?>
        <EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="https://idp.example.com">
          <IDPSSODescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
                             WantAuthnRequestsSigned="false"
                             protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
            <KeyDescriptor use="signing">
              <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
                <ds:X509Data>
                  <ds:X509Certificate>MIIC...test-certificate...</ds:X509Certificate>
                </ds:X509Data>
              </ds:KeyInfo>
            </KeyDescriptor>
            <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                                Location="https://idp.example.com/sso/login"/>
            <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                                Location="https://idp.example.com/sso/redirect"/>
          </IDPSSODescriptor>
        </EntityDescriptor>`;

      const server = setupServer(
        http.get('https://idp.example.com/metadata', () => {
          return new HttpResponse(mockMetadata, {
            headers: { 'Content-Type': 'application/xml' },
          });
        }),
      );

      server.listen();

      try {
        clearIdPMetadataCache();
        const metadata = await fetchAndParseIdPMetadata('https://idp.example.com/metadata');
        expect(metadata.entityId).toBe('https://idp.example.com');
        expect(metadata.ssoUrl).toBeDefined();
        expect(Array.isArray(metadata.certificates)).toBe(true);
      } finally {
        server.close();
      }
    });

    it('should handle metadata with no signing key', async () => {
      const mockMetadata = `<?xml version="1.0" encoding="UTF-8"?>
        <EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="https://idp.example.com">
          <IDPSSODescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
                             protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
            <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                                Location="https://idp.example.com/sso/login"/>
          </IDPSSODescriptor>
        </EntityDescriptor>`;

      const server = setupServer(
        http.get('https://idp.example.com/metadata', () => {
          return new HttpResponse(mockMetadata, {
            headers: { 'Content-Type': 'application/xml' },
          });
        }),
      );

      server.listen();

      try {
        clearIdPMetadataCache();
        const metadata = await fetchAndParseIdPMetadata('https://idp.example.com/metadata');
        expect(metadata.entityId).toBe('https://idp.example.com');
      } finally {
        server.close();
      }
    });

    it('should handle metadata with multiple SSO endpoints', async () => {
      const mockMetadata = `<?xml version="1.0" encoding="UTF-8"?>
        <EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="https://idp.example.com">
          <IDPSSODescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
                             protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
            <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                                Location="https://idp.example.com/sso/post"/>
            <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                                Location="https://idp.example.com/sso/redirect"/>
            <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:SOAP"
                                Location="https://idp.example.com/sso/soap"/>
          </IDPSSODescriptor>
        </EntityDescriptor>`;

      const server = setupServer(
        http.get('https://idp.example.com/metadata', () => {
          return new HttpResponse(mockMetadata, {
            headers: { 'Content-Type': 'application/xml' },
          });
        }),
      );

      server.listen();

      try {
        clearIdPMetadataCache();
        const metadata = await fetchAndParseIdPMetadata('https://idp.example.com/metadata');
        expect(metadata.ssoUrl).toBeDefined();
      } finally {
        server.close();
      }
    });

    it('should throw error on 404', async () => {
      const server = setupServer(
        http.get('https://idp.example.com/metadata', () => {
          return HttpResponse.json({ error: 'Not Found' }, { status: 404 });
        }),
      );

      server.listen();

      try {
        clearIdPMetadataCache();
        await expect(
          fetchAndParseIdPMetadata('https://idp.example.com/metadata'),
        ).rejects.toThrow();
      } finally {
        server.close();
      }
    });

    it('should throw error on network error', async () => {
      const server = setupServer(
        http.get('https://idp.example.com/metadata', () => {
          throw new Error('Network error');
        }),
      );

      server.listen();

      try {
        clearIdPMetadataCache();
        await expect(
          fetchAndParseIdPMetadata('https://idp.example.com/metadata'),
        ).rejects.toThrow();
      } finally {
        server.close();
      }
    });

    it('should throw error on invalid XML', async () => {
      const server = setupServer(
        http.get('https://idp.example.com/metadata', () => {
          return new HttpResponse('<invalid>xml</invalid>', {
            headers: { 'Content-Type': 'application/xml' },
          });
        }),
      );

      server.listen();

      try {
        clearIdPMetadataCache();
        await expect(
          fetchAndParseIdPMetadata('https://idp.example.com/metadata'),
        ).rejects.toThrow();
      } finally {
        server.close();
      }
    });

    it('should throw error on missing IDPSSODescriptor', async () => {
      const server = setupServer(
        http.get('https://idp.example.com/metadata', () => {
          return new HttpResponse(
            `<?xml version="1.0" encoding="UTF-8"?>
            <EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="https://idp.example.com">
            </EntityDescriptor>`,
            { headers: { 'Content-Type': 'application/xml' } },
          );
        }),
      );

      server.listen();

      try {
        clearIdPMetadataCache();
        await expect(
          fetchAndParseIdPMetadata('https://idp.example.com/metadata'),
        ).rejects.toThrow();
      } finally {
        server.close();
      }
    });

    it('should cache metadata after first fetch', async () => {
      let fetchCount = 0;
      const mockMetadata = `<?xml version="1.0" encoding="UTF-8"?>
        <EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="https://idp.example.com">
          <IDPSSODescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
                             protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
            <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                                Location="https://idp.example.com/sso/login"/>
          </IDPSSODescriptor>
        </EntityDescriptor>`;

      const server = setupServer(
        http.get('https://idp.example.com/metadata', () => {
          fetchCount++;
          return new HttpResponse(mockMetadata, {
            headers: { 'Content-Type': 'application/xml' },
          });
        }),
      );

      server.listen();

      try {
        clearIdPMetadataCache();
        await fetchAndParseIdPMetadata('https://idp.example.com/metadata');
        await fetchAndParseIdPMetadata('https://idp.example.com/metadata');
        expect(fetchCount).toBe(1);
      } finally {
        server.close();
      }
    });
  });
});
