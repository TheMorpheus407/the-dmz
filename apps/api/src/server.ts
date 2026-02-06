import { buildApp } from './app.js';

const app = buildApp();

try {
  await app.listen({ port: app.config.PORT, host: '0.0.0.0' });
} catch (error) {
  app.log.error({ err: error }, 'failed to start server');
  process.exit(1);
}
