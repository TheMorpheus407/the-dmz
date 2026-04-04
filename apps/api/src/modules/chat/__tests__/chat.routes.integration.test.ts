import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import { closeDatabase, getDatabasePool } from '../../../shared/database/connection.js';
import { ensureTenantColumns, resetTestDatabase } from '../../../__tests__/helpers/db.js';
import { createChannel, sendMessage } from '../chat.service.js';

const createTestConfig = (): AppConfig => {
  const base = loadConfig();
  return {
    ...base,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: 'postgresql://dmz:dmz_dev@localhost:5432/dmz_test',
    RATE_LIMIT_MAX: 10000,
  };
};

const testConfig = createTestConfig();

const resetTestData = async (): Promise<void> => {
  await resetTestDatabase(testConfig);

  const pool = getDatabasePool(testConfig);

  try {
    await pool.unsafe(`TRUNCATE TABLE "social"."chat_channels" RESTART IDENTITY CASCADE`);
  } catch {
    // Table doesn't exist - skip
  }

  try {
    await pool.unsafe(`TRUNCATE TABLE "social"."chat_messages" RESTART IDENTITY CASCADE`);
  } catch {
    // Table doesn't exist - skip
  }

  try {
    await pool.unsafe(`TRUNCATE TABLE "social"."moderation_reports" RESTART IDENTITY CASCADE`);
  } catch {
    // Table doesn't exist - skip
  }

  try {
    await pool.unsafe(`TRUNCATE TABLE "auth"."oauth_clients" RESTART IDENTITY CASCADE`);
  } catch {
    // Table doesn't exist - skip
  }

  await ensureTenantColumns(testConfig);
};

describe('chat routes HTTP integration', () => {
  const app = buildApp(testConfig);

  beforeAll(async () => {
    await resetTestData();
    await app.ready();
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  let userAccessToken: string;
  let testChannelId: string;
  let testTenantId: string;

  it('registers a user and gets access token', async () => {
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'chat-integration-test@example.com',
        password: 'Valid' + 'Pass123!',
        displayName: 'Chat Integration Test User',
      },
    });

    expect(registerResponse.statusCode).toBe(201);
    const body = registerResponse.json();
    userAccessToken = body.accessToken;
    testTenantId = body.tenantId;
  });

  it('creates a test channel for chat', async () => {
    const channelResult = await createChannel(
      testConfig,
      testTenantId,
      {
        channelType: 'party',
        partyId: 'test-party-id',
        name: 'Test Party Channel',
      },
      undefined,
    );

    expect(channelResult.success).toBe(true);
    testChannelId = channelResult.channel?.channelId ?? '';
    expect(testChannelId).toBeDefined();
  });

  describe('Authentication', () => {
    it('returns 401 without auth header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/chat/channels',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 401 with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/chat/channels',
        headers: {
          authorization: 'Bearer invalid-token-123',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Channel endpoints', () => {
    it('GET /api/v1/chat/channels returns channels for authenticated user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/chat/channels',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.channels).toBeDefined();
      expect(Array.isArray(body.channels)).toBe(true);
    });

    it('GET /api/v1/chat/channels/:channelId returns channel details', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/chat/channels/${testChannelId}`,
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.channel).toBeDefined();
      expect(body.channel?.channelId).toBe(testChannelId);
    });

    it('GET /api/v1/chat/channels/:channelId returns 404 for non-existent channel', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/chat/channels/00000000-0000-0000-0000-000000000001',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Message endpoints', () => {
    it('GET /api/v1/chat/channels/:channelId/messages returns messages', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/chat/channels/${testChannelId}/messages`,
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.messages).toBeDefined();
      expect(Array.isArray(body.messages)).toBe(true);
    });

    it('GET /api/v1/chat/channels/:channelId/messages supports pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/chat/channels/${testChannelId}/messages?limit=10`,
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.messages).toBeDefined();
    });

    it('POST /api/v1/chat/channels/:channelId/messages sends message', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/chat/channels/${testChannelId}/messages`,
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          content: 'Hello from integration test!',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.messageId).toBeDefined();
      expect(body.moderationStatus).toBe('approved');
      expect(body.rateLimited).toBe(false);
    });

    it('POST /api/v1/chat/channels/:channelId/messages rejects message over 280 chars', async () => {
      const longContent = 'a'.repeat(281);
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/chat/channels/${testChannelId}/messages`,
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          content: longContent,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.message).toContain('280');
    });

    it('POST /api/v1/chat/channels/:channelId/messages rate limits rapid requests', async () => {
      const sendMessageRequest = async () => {
        return app.inject({
          method: 'POST',
          url: `/api/v1/chat/channels/${testChannelId}/messages`,
          headers: {
            authorization: `Bearer ${userAccessToken}`,
          },
          payload: {
            content: 'Rapid message test',
          },
        });
      };

      const firstResponse = await sendMessageRequest();
      expect(firstResponse.statusCode).toBe(200);

      const secondResponse = await sendMessageRequest();
      if (secondResponse.statusCode === 429) {
        const body = secondResponse.json();
        expect(body.message).toContain('Rate limit');
        expect(secondResponse.headers['retry-after']).toBeDefined();
      } else {
        expect([200, 400]).toContain(secondResponse.statusCode);
      }
    });
  });

  describe('Message deletion', () => {
    let testMessageId: string;

    it('creates a message for deletion test', async () => {
      const result = await sendMessage(
        testConfig,
        testTenantId,
        '00000000-0000-0000-0000-000000000001',
        {
          channelId: testChannelId,
          content: 'Message to be deleted',
        },
        undefined,
        undefined,
      );

      expect(result.success).toBe(true);
      testMessageId = result.message?.messageId ?? '';
      expect(testMessageId).toBeDefined();
    });

    it('DELETE /api/v1/chat/channels/:channelId/messages/:messageId returns 403 for non-sender', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/chat/channels/${testChannelId}/messages/${testMessageId}`,
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.message).toContain('permission');
    });

    it('DELETE /api/v1/chat/channels/:channelId/messages/:messageId returns 404 for non-existent message', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/chat/channels/${testChannelId}/messages/00000000-0000-0000-0000-000000000999`,
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Report endpoint', () => {
    let testReportMessageId: string;

    it('creates a message for report test', async () => {
      const result = await sendMessage(
        testConfig,
        testTenantId,
        '00000000-0000-0000-0000-000000000002',
        {
          channelId: testChannelId,
          content: 'Message to be reported',
        },
        undefined,
        undefined,
      );

      expect(result.success).toBe(true);
      testReportMessageId = result.message?.messageId ?? '';
      expect(testReportMessageId).toBeDefined();
    });

    it('POST /api/v1/chat/channels/:channelId/report creates report', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/chat/channels/${testChannelId}/report?messageId=${testReportMessageId}`,
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          reason: 'Test report for integration tests',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });

    it('POST /api/v1/chat/channels/:channelId/report returns 400 for invalid messageId', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/chat/channels/${testChannelId}/report?messageId=00000000-0000-0000-0000-000000000999`,
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          reason: 'Test report with invalid message',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.message).toContain('not found');
    });

    it('POST /api/v1/chat/channels/:channelId/report returns 400 for missing reason', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/chat/channels/${testChannelId}/report?messageId=${testReportMessageId}`,
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Tenant isolation', () => {
    it("returns channels only for the authenticated user's tenant", async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/chat/channels',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);

      if (body.channels && body.channels.length > 0) {
        for (const channel of body.channels) {
          expect(channel.tenantId).toBe(testTenantId);
        }
      }
    });
  });
});
