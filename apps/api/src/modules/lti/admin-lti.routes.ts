export { registerAdminLtiPlatforms } from './admin-lti-platforms.routes.js';
export { registerAdminLtiLineItems } from './admin-lti-line-items.routes.js';
export { registerAdminLtiDeepLinks } from './admin-lti-deep-links.routes.js';
export { registerAdminLtiScores } from './admin-lti-scores.routes.js';
export { registerAdminLtiSessions } from './admin-lti-sessions.routes.js';

export * from './admin-lti-schemas.js';

import { registerAdminLtiPlatforms } from './admin-lti-platforms.routes.js';
import { registerAdminLtiLineItems } from './admin-lti-line-items.routes.js';
import { registerAdminLtiDeepLinks } from './admin-lti-deep-links.routes.js';
import { registerAdminLtiScores } from './admin-lti-scores.routes.js';
import { registerAdminLtiSessions } from './admin-lti-sessions.routes.js';

import type { FastifyInstance } from 'fastify';

export async function registerAdminLtiRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(registerAdminLtiPlatforms);
  await fastify.register(registerAdminLtiLineItems);
  await fastify.register(registerAdminLtiDeepLinks);
  await fastify.register(registerAdminLtiScores);
  await fastify.register(registerAdminLtiSessions);
}
