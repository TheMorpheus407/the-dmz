import { webhookRoutes } from './webhook.routes.js';
import { webhookService, WebhookService } from './webhook.service.js';
import { webhookRepo } from './webhook.repo.js';
import { createWebhookDeliveryWorker } from './workers/index.js';

import type { FastifyPluginAsync } from 'fastify';
import type { AppConfig } from '../../config.js';

export type WebhookPluginOptions = {
  config?: AppConfig;
};

const webhookPluginCallback: FastifyPluginAsync<WebhookPluginOptions> = async (
  instance,
  options,
): Promise<void> => {
  const config = options.config;

  if (config?.REDIS_URL) {
    WebhookService.configureRedis(config.REDIS_URL);

    const worker = createWebhookDeliveryWorker(
      { redisUrl: config.REDIS_URL },
      {
        processDelivery: async (opts) =>
          webhookService.processDelivery(
            opts.deliveryId,
            opts.subscriptionId,
            opts.tenantId,
            opts.targetUrl,
            opts.payload,
            opts.eventId,
            opts.eventType,
            opts.attemptNumber,
            opts.maxAttempts,
          ),
      },
    );

    await worker.start();
    instance.log.info('Webhook delivery worker started');

    instance.addHook('onClose', async () => {
      instance.log.info('Stopping webhook delivery worker');
      await worker.close();
      instance.log.info('Webhook delivery worker stopped');
    });
  } else {
    instance.log.warn('No REDIS_URL configured - webhook delivery worker disabled');
  }

  instance.decorate('webhooks', {
    service: webhookService,
    repo: webhookRepo,
  });

  await instance.register(webhookRoutes);

  instance.log.info('Webhook module registered');
};

export { webhookPluginCallback as webhookPlugin };
export { webhookService, webhookRepo };
