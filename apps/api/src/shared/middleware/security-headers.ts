import helmet from '@fastify/helmet';

import { buildSecurityHeadersConfig } from './security-headers.config.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance } from 'fastify';

export const registerSecurityHeaders = (app: FastifyInstance, config: AppConfig): void => {
  const securityHeadersConfig = buildSecurityHeadersConfig(config);

  app.register(helmet, securityHeadersConfig.helmetOptions);

  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('Permissions-Policy', securityHeadersConfig.permissionsPolicy);
    return payload;
  });
};
