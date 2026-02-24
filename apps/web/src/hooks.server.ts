import { loadFrontendConfig } from '$lib/config/env.js';
import { buildSecurityHeadersPolicy, buildCspHeaderValue } from '@the-dmz/shared';

import type { Handle } from '@sveltejs/kit';

loadFrontendConfig();

const CSP_FRAME_ANCESTORS = process.env['CSP_FRAME_ANCESTORS'] ?? 'none';
const CSP_CONNECT_SRC = process.env['CSP_CONNECT_SRC'] ?? '';
const CSP_IMG_SRC = process.env['CSP_IMG_SRC'] ?? '';
const COEP_POLICY = process.env['COEP_POLICY'] ?? 'require-corp';

const buildSecurityHeaders = () => {
  const config = loadFrontendConfig();

  const frameAncestorsOrigins =
    CSP_FRAME_ANCESTORS === 'none' || CSP_FRAME_ANCESTORS === ''
      ? []
      : CSP_FRAME_ANCESTORS.split(',').map((o) => o.trim());

  const policy = buildSecurityHeadersPolicy({
    environment: config.PUBLIC_ENVIRONMENT,
    corsOrigins: [],
    additionalConnectSrc: CSP_CONNECT_SRC,
    additionalImgSrc: CSP_IMG_SRC,
    frameAncestorsOrigins,
    coepPolicy: COEP_POLICY as 'require-corp' | 'credentialless',
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
  const envKey = `${config.PUBLIC_ENVIRONMENT}-${CSP_FRAME_ANCESTORS}-${COEP_POLICY}`;

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
