import { emailRoutes } from './email.routes.js';
import { emailService } from './email.service.js';
import { emailRepo } from './email.repo.js';

import type { FastifyInstance } from 'fastify';

export async function emailPlugin(
  instance: FastifyInstance,
  _opts: { prefix?: string },
): Promise<void> {
  instance.decorate('email', {
    service: emailService,
    repo: emailRepo,
  });

  await instance.register(emailRoutes);

  instance.log.info('Email integration module registered');
}

export { emailService, emailRepo };
