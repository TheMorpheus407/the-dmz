import { z } from 'zod';

export const ROUTE_GROUPS = ['/(game)', '/(admin)', '/(auth)', '/(public)'] as const;
export type SecurityRouteGroup = (typeof ROUTE_GROUPS)[number];

const cspKeywordSchema = z.enum([
  'self',
  'none',
  'unsafe-inline',
  'unsafe-eval',
  'strict-dynamic',
  'unsafe-hashes',
  'report-sample',
  'wasm-unsafe-eval',
  'script',
]);

const cspSourceSchema: z.ZodSchema<string> = z.union([
  cspKeywordSchema.transform((v) => `'${v}'`),
  z.string().startsWith("'"),
  z.string().startsWith('https:'),
  z.string().startsWith('http:'),
  z.string().startsWith('ws:'),
  z.string().startsWith('wss:'),
  z.string().url(),
  z.string().startsWith('data:'),
  z.string().startsWith('blob:'),
]);

const cspDirectiveSchema = z.record(z.array(cspSourceSchema));

export const cspDirectiveNames = [
  'default-src',
  'script-src',
  'style-src',
  'img-src',
  'font-src',
  'connect-src',
  'media-src',
  'object-src',
  'frame-src',
  'child-src',
  'worker-src',
  'manifest-src',
  'base-uri',
  'form-action',
  'frame-ancestors',
  'upgrade-insecure-requests',
  'block-all-mixed-content',
] as const;

export const securityHeaderNames = [
  'content-security-policy',
  'x-frame-options',
  'x-content-type-options',
  'x-xss-protection',
  'referrer-policy',
  'permissions-policy',
  'cross-origin-opener-policy',
  'cross-origin-embedder-policy',
  'cross-origin-resource-policy',
  'strict-transport-security',
] as const;

export const trustedTypesDirectiveNames = ['require-trusted-types-for', 'trusted-types'] as const;

export const frameAncestorsModeSchema = z.enum(['deny', 'sameorigin', 'allowlist']);

export type FrameAncestorsMode = z.infer<typeof frameAncestorsModeSchema>;

export type CspDirectives = z.infer<typeof cspDirectiveSchema>;

export const environmentModeSchema = z.enum(['development', 'test', 'production']);
export type EnvironmentMode = z.infer<typeof environmentModeSchema>;

export interface SecurityHeadersPolicy {
  routeGroups: readonly SecurityRouteGroup[];
  csp: {
    directives: CspDirectives;
    includeTrustedTypes: boolean;
    includeHsts: boolean;
    includeCoep: boolean;
  };
  xFrameOptions: 'deny' | 'sameorigin';
  xContentTypeOptions: boolean;
  referrerPolicy: 'strict-origin-when-cross-origin' | 'no-referrer' | 'same-origin';
  permissionsPolicy: string;
  crossOriginOpenerPolicy: 'same-origin' | 'same-origin-allow-popups';
  crossOriginEmbedderPolicy: 'require-corp' | 'credentialless';
  crossOriginResourcePolicy: 'same-origin' | 'same-site' | 'cross-origin';
  strictTransportSecurity: {
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  } | null;
  frameAncestors: {
    mode: FrameAncestorsMode;
    allowedOrigins: readonly string[];
  };
}

export const securityHeadersPolicySchema: z.ZodSchema<SecurityHeadersPolicy> = z.object({
  routeGroups: z.array(z.enum(ROUTE_GROUPS)),
  csp: z.object({
    directives: cspDirectiveSchema,
    includeTrustedTypes: z.boolean(),
    includeHsts: z.boolean(),
    includeCoep: z.boolean(),
  }),
  xFrameOptions: z.enum(['deny', 'sameorigin']),
  xContentTypeOptions: z.boolean(),
  referrerPolicy: z.enum(['strict-origin-when-cross-origin', 'no-referrer', 'same-origin']),
  permissionsPolicy: z.string(),
  crossOriginOpenerPolicy: z.enum(['same-origin', 'same-origin-allow-popups']),
  crossOriginEmbedderPolicy: z.enum(['require-corp', 'credentialless']),
  crossOriginResourcePolicy: z.enum(['same-origin', 'same-site', 'cross-origin']),
  strictTransportSecurity: z
    .object({
      maxAge: z.number().positive(),
      includeSubDomains: z.boolean(),
      preload: z.boolean(),
    })
    .nullable(),
  frameAncestors: z.object({
    mode: frameAncestorsModeSchema,
    allowedOrigins: z.array(z.string()),
  }),
});

const HSTS_MAX_AGE_SECONDS = 63_072_000;
const PERMISSIONS_POLICY_VALUE = 'camera=(), microphone=(), geolocation=(), payment=()';

const DEVELOPMENT_CONNECT_SOURCES = [
  "'self'",
  'http://localhost:*',
  'http://127.0.0.1:*',
  'ws://localhost:*',
  'ws://127.0.0.1:*',
];

const CSP_KEYWORDS = new Set([
  'self',
  'none',
  'unsafe-inline',
  'unsafe-eval',
  'strict-dynamic',
  'unsafe-hashes',
  'report-sample',
  'wasm-unsafe-eval',
  'script',
]);

const normalizeCspSource = (source: string): string => {
  const unquoted = source.replace(/^'(.*)'$/, '$1');
  return CSP_KEYWORDS.has(unquoted) ? `'${unquoted}'` : source;
};

const dedupeSources = (sources: Iterable<string>): string[] => {
  const unique = new Set<string>();

  for (const source of sources) {
    const normalized = normalizeCspSource(source);
    if (normalized.length > 0) {
      unique.add(normalized);
    }
  }

  return [...unique];
};

const toWebSocketOrigin = (origin: string): string | undefined => {
  try {
    const parsed = new URL(origin);

    if (parsed.protocol === 'http:') {
      parsed.protocol = 'ws:';
      return parsed.origin;
    }

    if (parsed.protocol === 'https:') {
      parsed.protocol = 'wss:';
      return parsed.origin;
    }
  } catch {
    return undefined;
  }

  return undefined;
};

const buildWebSocketOrigins = (origins: string[]): string[] => {
  const wsOrigins: string[] = [];
  for (const origin of origins) {
    const wsOrigin = toWebSocketOrigin(origin);
    if (wsOrigin) {
      wsOrigins.push(wsOrigin);
    }
  }
  return wsOrigins;
};

export interface BuildSecurityHeadersPolicyOptions {
  environment: EnvironmentMode;
  corsOrigins: string[];
  additionalConnectSrc?: string;
  additionalImgSrc?: string;
  frameAncestorsOrigins?: string[];
  coepPolicy?: 'require-corp' | 'credentialless';
}

export const buildSecurityHeadersPolicy = (
  options: BuildSecurityHeadersPolicyOptions,
): SecurityHeadersPolicy => {
  const {
    environment,
    corsOrigins,
    additionalConnectSrc = '',
    additionalImgSrc = '',
    frameAncestorsOrigins = [],
    coepPolicy = 'require-corp',
  } = options;

  const isDevelopment = environment === 'development';
  const isProduction = environment === 'production';
  const isTest = environment === 'test';

  const buildFrameAncestors = (): {
    mode: FrameAncestorsMode;
    allowedOrigins: readonly string[];
  } => {
    if (frameAncestorsOrigins.length === 0) {
      return { mode: 'deny', allowedOrigins: [] };
    }
    return { mode: 'allowlist', allowedOrigins: frameAncestorsOrigins };
  };

  const buildConnectSources = (): string[] => {
    const base = isDevelopment ? [...DEVELOPMENT_CONNECT_SOURCES] : ["'self'"];
    const wsOrigins = buildWebSocketOrigins(corsOrigins);
    const additional = additionalConnectSrc
      ? additionalConnectSrc.split(',').map((s) => s.trim())
      : [];

    return dedupeSources([...base, ...corsOrigins, ...wsOrigins, ...additional]);
  };

  const buildImageSources = (): string[] => {
    const base = ["'self'", 'data:'];
    const additional = isDevelopment ? ['blob:', 'https:'] : [];
    const custom = additionalImgSrc ? additionalImgSrc.split(',').map((s) => s.trim()) : [];

    return dedupeSources([...base, ...additional, ...custom]);
  };

  const strictDirectives: CspDirectives = {
    'default-src': ["'self'"],
    'base-uri': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'connect-src': buildConnectSources(),
    'img-src': buildImageSources(),
    'font-src': ["'self'"],
    'object-src': ["'none'"],
    'form-action': ["'self'"],
    'frame-ancestors': frameAncestorsOrigins.length > 0 ? frameAncestorsOrigins : ["'none'"],
    'upgrade-insecure-requests': [],
  };

  const developmentDirectives: CspDirectives = {
    ...strictDirectives,
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    'style-src': ["'self'", "'unsafe-inline'", 'https:'],
  };

  const cspDirectives = isDevelopment ? developmentDirectives : strictDirectives;

  return {
    routeGroups: [...ROUTE_GROUPS],
    csp: {
      directives: cspDirectives,
      includeTrustedTypes: isProduction || isTest,
      includeHsts: isProduction,
      includeCoep: true,
    },
    xFrameOptions: 'deny',
    xContentTypeOptions: true,
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: PERMISSIONS_POLICY_VALUE,
    crossOriginOpenerPolicy: 'same-origin',
    crossOriginEmbedderPolicy: coepPolicy,
    crossOriginResourcePolicy: 'same-origin',
    strictTransportSecurity: isProduction
      ? {
          maxAge: HSTS_MAX_AGE_SECONDS,
          includeSubDomains: true,
          preload: true,
        }
      : null,
    frameAncestors: buildFrameAncestors(),
  };
};

export const buildCspHeaderValue = (directives: CspDirectives): string => {
  return Object.entries(directives)
    .filter(([, values]) => values.length > 0)
    .map(([directive, values]) => `${directive} ${values.join(' ')}`)
    .join('; ');
};

export const M1_WEB_SECURITY_HEADERS_POLICY = buildSecurityHeadersPolicy({
  environment: 'production',
  corsOrigins: [],
});
