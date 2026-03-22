import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';

const createTestConfig = (): AppConfig => {
  const base = loadConfig();
  return {
    ...base,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
  };
};

vi.mock('../lti.service.js', () => ({
  initiateOidcLogin: vi.fn(),
  validateAndConsumeNonce: vi.fn(),
  validateAndConsumeState: vi.fn(),
  getLtiPlatformByInternalId: vi.fn(),
  createLtiSession: vi.fn(),
  getLtiSessionByLaunchId: vi.fn(),
  getLtiLineItemByIdOnly: vi.fn(),
  createLtiLineItem: vi.fn(),
  createLtiScore: vi.fn(),
  listLtiLineItems: vi.fn(),
  getLtiLineItemByResourceLinkId: vi.fn(),
  createLtiDeepLinkContent: vi.fn().mockResolvedValue({ contentId: 'test-content-id' }),
  generateState: vi.fn(),
  verifyLtiJwt: vi.fn(),
  getLtiPlatformByUrl: vi.fn(),
  getLtiPlatformByClientId: vi.fn(),
  generateNonce: vi.fn(),
  createNonce: vi.fn(),
  createState: vi.fn(),
  getJWKSet: vi.fn(),
  refreshJWKSet: vi.fn(),
  cleanupExpiredNonces: vi.fn(),
  cleanupExpiredStates: vi.fn(),
}));

describe('LTI deep-link routes', () => {
  const app = buildApp(createTestConfig());

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /lti/deep-link', () => {
    const validPayload = {
      'https://purl.imsglobal.org/spec/lti-dl/claim/deep_link_settings': {
        deployment_id: 'test-deployment-id',
        data: 'valid-session-data',
        accept_types: ['link', 'ltiResourceLink'],
        accept_multiple: true,
      },
      content_items: [
        {
          type: 'ltiResourceLink',
          url: 'https://example.com/resource',
          title: 'Test Resource',
        },
      ],
    };

    it('returns 200 for valid deep-link request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/lti/deep-link',
        payload: validPayload,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body['@context']).toBe('http://purl.imsglobal.org/ctx/lti/v1/ContentItem');
      expect(body['@type']).toBe('ContentItem');
    });

    it('returns 400 for empty body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/lti/deep-link',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = response.json() as {
        success: boolean;
        error: { code: string; message: string; details: { issues: unknown[] } };
      };
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_FAILED');
    });

    it('returns 400 for missing deep_link_settings', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/lti/deep-link',
        payload: { content_items: [] },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json() as {
        success: boolean;
        error: { code: string; details: { issues: unknown[] } };
      };
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_FAILED');
    });

    it('returns 400 for missing data field in deep_link_settings', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/lti/deep-link',
        payload: {
          'https://purl.imsglobal.org/spec/lti-dl/claim/deep_link_settings': {
            deployment_id: 'test-deployment-id',
          },
          content_items: [],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 for javascript: URL scheme', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/lti/deep-link',
        payload: {
          'https://purl.imsglobal.org/spec/lti-dl/claim/deep_link_settings': {
            data: 'test-data',
          },
          content_items: [
            {
              type: 'link',
              url: 'javascript:alert(1)',
              title: 'Malicious Link',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json() as {
        success: boolean;
        error: { code: string; details: { issues: unknown[] } };
      };
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_FAILED');
    });

    it('returns 400 for data: URL scheme', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/lti/deep-link',
        payload: {
          'https://purl.imsglobal.org/spec/lti-dl/claim/deep_link_settings': {
            data: 'test-data',
          },
          content_items: [
            {
              type: 'link',
              url: 'data:text/html,<script>alert(1)</script>',
              title: 'Malicious Data Link',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json() as {
        success: boolean;
        error: { code: string; details: { issues: unknown[] } };
      };
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_FAILED');
    });

    it('returns 400 for localhost URL', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/lti/deep-link',
        payload: {
          'https://purl.imsglobal.org/spec/lti-dl/claim/deep_link_settings': {
            data: 'test-data',
          },
          content_items: [
            {
              type: 'link',
              url: 'http://localhost/admin',
              title: 'Localhost Link',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json() as {
        success: boolean;
        error: { code: string; details: { issues: unknown[] } };
      };
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_FAILED');
    });

    it('returns 400 for 127.0.0.1 URL', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/lti/deep-link',
        payload: {
          'https://purl.imsglobal.org/spec/lti-dl/claim/deep_link_settings': {
            data: 'test-data',
          },
          content_items: [
            {
              type: 'link',
              url: 'http://127.0.0.1/admin',
              title: 'Localhost IP Link',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json() as {
        success: boolean;
        error: { code: string; details: { issues: unknown[] } };
      };
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_FAILED');
    });

    it('returns 400 for AWS metadata URL', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/lti/deep-link',
        payload: {
          'https://purl.imsglobal.org/spec/lti-dl/claim/deep_link_settings': {
            data: 'test-data',
          },
          content_items: [
            {
              type: 'link',
              url: 'http://169.254.169.254/latest/meta-data/',
              title: 'AWS Metadata',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json() as {
        success: boolean;
        error: { code: string; details: { issues: unknown[] } };
      };
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_FAILED');
    });

    it('returns 400 for invalid content item type enum', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/lti/deep-link',
        payload: {
          'https://purl.imsglobal.org/spec/lti-dl/claim/deep_link_settings': {
            data: 'test-data',
          },
          content_items: [
            {
              type: 'invalidType',
              url: 'https://example.com/resource',
              title: 'Invalid Type',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json() as {
        success: boolean;
        error: { code: string; details: { issues: unknown[] } };
      };
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_FAILED');
    });

    it('returns 400 for invalid URL format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/lti/deep-link',
        payload: {
          'https://purl.imsglobal.org/spec/lti-dl/claim/deep_link_settings': {
            data: 'test-data',
          },
          content_items: [
            {
              type: 'link',
              url: 'not-a-valid-url',
              title: 'Invalid URL',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json() as {
        success: boolean;
        error: { code: string; details: { issues: unknown[] } };
      };
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_FAILED');
    });

    it('returns 200 for valid request with empty content_items', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/lti/deep-link',
        payload: {
          'https://purl.imsglobal.org/spec/lti-dl/claim/deep_link_settings': {
            deployment_id: 'test-deployment-id',
            data: 'valid-session-data',
          },
          content_items: [],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.content_items).toEqual([]);
    });

    it('returns 200 for valid request without content_items', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/lti/deep-link',
        payload: {
          'https://purl.imsglobal.org/spec/lti-dl/claim/deep_link_settings': {
            deployment_id: 'test-deployment-id',
            data: 'valid-session-data',
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.content_items).toEqual([]);
    });

    it('returns 200 for https:// URL with all valid fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/lti/deep-link',
        payload: {
          'https://purl.imsglobal.org/spec/lti-dl/claim/deep_link_settings': {
            deployment_id: 'test-deployment-id',
            data: 'valid-session-data',
            accept_types: ['link', 'file', 'html', 'ltiResourceLink'],
            accept_presentation_document_targets: ['iframe', 'window', 'embed'],
            accept_multiple: true,
            auto_create: false,
          },
          content_items: [
            {
              type: 'link',
              url: 'https://example.com/link',
              title: 'Test Link',
              text: 'Description text',
              icon: {
                url: 'https://example.com/icon.png',
                width: 64,
                height: 64,
              },
              thumbnail: {
                url: 'https://example.com/thumb.png',
                width: 128,
                height: 128,
              },
            },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('returns 400 for vbscript: URL scheme', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/lti/deep-link',
        payload: {
          'https://purl.imsglobal.org/spec/lti-dl/claim/deep_link_settings': {
            data: 'test-data',
          },
          content_items: [
            {
              type: 'link',
              url: 'vbscript:MsgBox("Hello")',
              title: 'VBScript Link',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 for file: URL scheme', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/lti/deep-link',
        payload: {
          'https://purl.imsglobal.org/spec/lti-dl/claim/deep_link_settings': {
            data: 'test-data',
          },
          content_items: [
            {
              type: 'link',
              url: 'file:///etc/passwd',
              title: 'File Link',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 for data field exceeding max length', async () => {
      const longData = 'x'.repeat(3000);
      const response = await app.inject({
        method: 'POST',
        url: '/lti/deep-link',
        payload: {
          'https://purl.imsglobal.org/spec/lti-dl/claim/deep_link_settings': {
            data: longData,
          },
          content_items: [],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 200 for data field at max length', async () => {
      const maxData = 'x'.repeat(2048);
      const response = await app.inject({
        method: 'POST',
        url: '/lti/deep-link',
        payload: {
          'https://purl.imsglobal.org/spec/lti-dl/claim/deep_link_settings': {
            data: maxData,
          },
          content_items: [],
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
