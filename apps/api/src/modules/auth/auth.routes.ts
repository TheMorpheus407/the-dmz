import { authGuard } from '../../shared/middleware/authorization.js';

import { registerRegistrationRoutes } from './routes/registration.routes.js';
import { registerLoginRoutes } from './routes/login.routes.js';
import { registerTokenRoutes } from './routes/token.routes.js';
import { registerProfileRoutes } from './routes/profile.routes.js';
import { registerPasswordRoutes } from './routes/password.routes.js';
import { registerOauthRoutes } from './routes/oauth.routes.js';
import { registerAdminSessionsRoutes } from './routes/admin-sessions.routes.js';
import { registerRolesRoutes } from './routes/roles.routes.js';
import { registerAdminRoutes } from './routes/admin.routes.js';

import type { FastifyInstance } from 'fastify';

export { authGuard };

export const registerAuthRoutes = async (fastify: FastifyInstance): Promise<void> => {
  await registerRegistrationRoutes(fastify);
  await registerLoginRoutes(fastify);
  await registerTokenRoutes(fastify);
  await registerProfileRoutes(fastify);
  await registerPasswordRoutes(fastify);
  await registerOauthRoutes(fastify);
  await registerAdminSessionsRoutes(fastify);
  await registerRolesRoutes(fastify);
  await registerAdminRoutes(fastify);
};
