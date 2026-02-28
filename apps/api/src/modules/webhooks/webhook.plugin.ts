import { webhookRoutes } from './webhook.routes.js';
import { webhookService } from './webhook.service.js';
import { webhookRepo } from './webhook.repo.js';

import type { FastifyInstance } from 'fastify';

export async function webhookPlugin(
  instance: FastifyInstance,
  _opts: { prefix?: string },
): Promise<void> {
  instance.decorate('webhooks', {
    service: webhookService,
    repo: webhookRepo,
  });

  await instance.register(webhookRoutes);

  instance.log.info('Webhook module registered');
}

export { webhookService, webhookRepo };
