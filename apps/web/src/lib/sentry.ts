import * as Sentry from '@sentry/sveltekit';

export function initSentry(dsn?: string, env?: string): void {
  const sentryDsn = dsn ?? process.env['PUBLIC_SENTRY_DSN'];
  const sentryEnv = env ?? process.env['NODE_ENV'] ?? 'development';

  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: sentryEnv,
      sampleRate: sentryEnv === 'production' ? 0.1 : 1.0,
      tracesSampleRate: sentryEnv === 'production' ? 0.1 : 1.0,
      attachStacktrace: true,
      maxBreadcrumbs: 50,
    });
  }
}
