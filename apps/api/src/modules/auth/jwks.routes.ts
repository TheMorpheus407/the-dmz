import { type FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { getJWKS, ensureActiveSigningKey, getActiveSigningKey } from './jwt-keys.service.js';
import { createJWTSigningKeyCreatedEvent } from './auth.events.js';

import type { AppConfig } from '../../config.js';

const CACHE_CONTROL_MAX_AGE = 3600;

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
  }
}

const jwksRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{
    Reply: {
      keys: Array<{
        kty: string;
        kid: string;
        use: string;
        alg: string;
        n?: string;
        e?: string;
        crv?: string;
        x?: string;
        y?: string;
      }>;
    };
  }>(
    '/.well-known/jwks.json',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              keys: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    kty: { type: 'string' },
                    kid: { type: 'string' },
                    use: { type: 'string' },
                    alg: { type: 'string' },
                    n: { type: 'string' },
                    e: { type: 'string' },
                    crv: { type: 'string' },
                    x: { type: 'string' },
                    y: { type: 'string' },
                  },
                  required: ['kty', 'kid', 'use', 'alg'],
                },
              },
            },
            required: ['keys'],
          },
        },
      },
    },
    async (_request, reply) => {
      const jwks = await getJWKS(fastify.config);

      reply.header('Cache-Control', `public, max-age=${CACHE_CONTROL_MAX_AGE}`);
      reply.header('X-Content-Type-Options', 'nosniff');

      return jwks;
    },
  );
};

export const registerJwksRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(jwksRoutes);
};

export const initializeSigningKey: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onReady', async () => {
    try {
      const existingKey = await getActiveSigningKey(fastify.config);

      const newKey = await ensureActiveSigningKey(fastify.config);

      if (!existingKey) {
        fastify.eventBus.publish(
          createJWTSigningKeyCreatedEvent({
            source: 'jwks-module',
            correlationId: crypto.randomUUID(),
            tenantId: 'system',
            version: 1,
            payload: {
              kid: newKey.id,
              keyType: newKey.keyType,
              algorithm: newKey.algorithm,
            },
          }),
        );
      }
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('relation') ||
          error.message.includes('table') ||
          error.message.includes('signing_keys') ||
          error.message.includes('database') ||
          error.message.includes('connection') ||
          error.message.includes('password') ||
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('authentication'))
      ) {
        fastify.log.warn(
          'Signing key initialization skipped: Database unavailable or migrations not run. Run migrations to enable JWT signing key management.',
        );
        return;
      }
      throw error;
    }
  });
};

export const jwksPlugin = fp(registerJwksRoutes, { name: 'jwks' });
export const signingKeyInitPlugin = fp(initializeSigningKey, { name: 'signingKeyInit' });
