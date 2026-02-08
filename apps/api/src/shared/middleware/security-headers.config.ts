import type { AppConfig } from '../../config.js';

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

type SecurityHeadersConfig = {
  helmetOptions: {
    contentSecurityPolicy: {
      directives: Record<string, Iterable<string>>;
    };
    hsts:
      | {
          maxAge: number;
          includeSubDomains: true;
          preload: true;
        }
      | false;
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' };
    xContentTypeOptions: true;
    xFrameOptions: { action: 'deny' };
    xXssProtection: true;
    crossOriginOpenerPolicy: { policy: 'same-origin' };
    crossOriginEmbedderPolicy: { policy: 'require-corp' | 'credentialless' };
    crossOriginResourcePolicy: { policy: 'same-origin' };
  };
  permissionsPolicy: string;
};

const splitCommaSeparatedValues = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

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

const buildFrameAncestors = (config: AppConfig): string[] => {
  const frameAncestors = dedupeSources(splitCommaSeparatedValues(config.CSP_FRAME_ANCESTORS));

  if (frameAncestors.length === 0) {
    return ["'none'"];
  }

  if (frameAncestors.length > 1 && frameAncestors.includes("'none'")) {
    return frameAncestors.filter((source) => source !== "'none'");
  }

  return frameAncestors;
};

const buildWebSocketOrigins = (origins: Iterable<string>): string[] => {
  const wsOrigins: string[] = [];
  for (const origin of origins) {
    const wsOrigin = toWebSocketOrigin(origin);
    if (wsOrigin) {
      wsOrigins.push(wsOrigin);
    }
  }
  return wsOrigins;
};

const buildStrictConnectSources = (config: AppConfig): string[] =>
  dedupeSources([
    "'self'",
    ...config.CORS_ORIGINS_LIST,
    ...buildWebSocketOrigins(config.CORS_ORIGINS_LIST),
    ...splitCommaSeparatedValues(config.CSP_CONNECT_SRC),
  ]);

const buildDevelopmentConnectSources = (config: AppConfig): string[] =>
  dedupeSources([
    ...DEVELOPMENT_CONNECT_SOURCES,
    ...config.CORS_ORIGINS_LIST,
    ...buildWebSocketOrigins(config.CORS_ORIGINS_LIST),
    ...splitCommaSeparatedValues(config.CSP_CONNECT_SRC),
  ]);

const buildImageSources = (config: AppConfig, isDevelopment: boolean): string[] =>
  dedupeSources([
    "'self'",
    'data:',
    ...(isDevelopment ? ['blob:', 'https:'] : []),
    ...splitCommaSeparatedValues(config.CSP_IMG_SRC),
  ]);

const buildStrictCspDirectives = (config: AppConfig): Record<string, Iterable<string>> => ({
  defaultSrc: ["'self'"],
  baseUri: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  connectSrc: buildStrictConnectSources(config),
  imgSrc: buildImageSources(config, false),
  fontSrc: ["'self'"],
  objectSrc: ["'none'"],
  formAction: ["'self'"],
  frameAncestors: buildFrameAncestors(config),
  requireTrustedTypesFor: ["'script'"],
  upgradeInsecureRequests: [],
});

const buildDevelopmentCspDirectives = (config: AppConfig): Record<string, Iterable<string>> => ({
  defaultSrc: ["'self'"],
  baseUri: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
  connectSrc: buildDevelopmentConnectSources(config),
  imgSrc: buildImageSources(config, true),
  fontSrc: ["'self'"],
  objectSrc: ["'none'"],
  formAction: ["'self'"],
  frameAncestors: buildFrameAncestors(config),
});

const buildCspDirectives = (config: AppConfig): Record<string, Iterable<string>> =>
  config.NODE_ENV === 'development'
    ? buildDevelopmentCspDirectives(config)
    : buildStrictCspDirectives(config);

export const buildSecurityHeadersConfig = (config: AppConfig): SecurityHeadersConfig => ({
  helmetOptions: {
    contentSecurityPolicy: {
      directives: buildCspDirectives(config),
    },
    hsts:
      config.NODE_ENV === 'production'
        ? {
            maxAge: HSTS_MAX_AGE_SECONDS,
            includeSubDomains: true,
            preload: true,
          }
        : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xContentTypeOptions: true,
    xFrameOptions: { action: 'deny' },
    xXssProtection: true,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginEmbedderPolicy: { policy: config.COEP_POLICY },
    crossOriginResourcePolicy: { policy: 'same-origin' },
  },
  permissionsPolicy: PERMISSIONS_POLICY_VALUE,
});
