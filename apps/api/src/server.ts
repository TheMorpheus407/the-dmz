import { buildApp } from './app.js';

const app = buildApp();

let shuttingDown = false;

const shutdown = async (signal: 'SIGINT' | 'SIGTERM') => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  app.log.info({ signal }, 'shutting down server');

  try {
    await app.close();
    process.exit(0);
  } catch (error) {
    app.log.error({ err: error }, 'failed to shut down server cleanly');
    process.exit(1);
  }
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

try {
  await app.listen({ port: app.config.PORT, host: app.config.API_HOST });
} catch (error) {
  app.log.error({ err: error }, 'failed to start server');
  process.exit(1);
}
