import { loadFrontendConfig } from '$lib/config/env.js';
import { buildSecurityHeadersPolicy, buildCspHeaderValue } from '@the-dmz/shared';
import { initSentry } from '$lib/sentry.js';

import type { Handle } from '@sveltejs/kit';

const SENTRY_DSN = process.env['PUBLIC_SENTRY_DSN'];

if (SENTRY_DSN) {
  initSentry();
}

loadFrontendConfig();

const buildSecurityHeaders = () => {
  const config = loadFrontendConfig();

  const frameAncestorsOrigins =
    config.CSP_FRAME_ANCESTORS === 'none' || config.CSP_FRAME_ANCESTORS === ''
      ? []
      : config.CSP_FRAME_ANCESTORS.split(',').map((o) => o.trim());

  const policy = buildSecurityHeadersPolicy({
    environment: config.PUBLIC_ENVIRONMENT,
    corsOrigins: [],
    additionalConnectSrc: config.CSP_CONNECT_SRC,
    additionalImgSrc: config.CSP_IMG_SRC,
    frameAncestorsOrigins,
    coepPolicy: config.COEP_POLICY,
  });

  const headers = new Headers();

  const cspValue = buildCspHeaderValue(policy.csp.directives);
  headers.set('Content-Security-Policy', cspValue);

  if (policy.csp.includeTrustedTypes) {
    headers.set('X-Content-Security-Policy', "require-trusted-types-for 'script'");
  }

  headers.set('X-Frame-Options', policy.xFrameOptions);

  if (policy.xContentTypeOptions) {
    headers.set('X-Content-Type-Options', 'nosniff');
  }

  headers.set('Referrer-Policy', policy.referrerPolicy);
  headers.set('Permissions-Policy', policy.permissionsPolicy);
  headers.set('Cross-Origin-Opener-Policy', policy.crossOriginOpenerPolicy);
  headers.set('Cross-Origin-Embedder-Policy', policy.crossOriginEmbedderPolicy);
  headers.set('Cross-Origin-Resource-Policy', policy.crossOriginResourcePolicy);

  if (policy.strictTransportSecurity) {
    const hsts = policy.strictTransportSecurity;
    headers.set(
      'Strict-Transport-Security',
      `max-age=${hsts.maxAge}${hsts.includeSubDomains ? '; includeSubDomains' : ''}${hsts.preload ? '; preload' : ''}`,
    );
  }

  return headers;
};

const securityHeadersCache = new Map<string, ReturnType<typeof buildSecurityHeaders>>();

const getSecurityHeaders = (): Headers => {
  const config = loadFrontendConfig();
  const envKey = `${config.PUBLIC_ENVIRONMENT}-${config.CSP_FRAME_ANCESTORS}-${config.COEP_POLICY}`;

  if (!securityHeadersCache.has(envKey)) {
    securityHeadersCache.set(envKey, buildSecurityHeaders());
  }

  return securityHeadersCache.get(envKey)!;
};

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  const securityHeaders = getSecurityHeaders();

  securityHeaders.forEach((value, key) => {
    if (!response.headers.has(key)) {
      response.headers.set(key, value);
    }
  });

  return response;
};
