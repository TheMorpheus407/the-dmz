import type { FastifyInstance } from 'fastify';

export interface CorsConfig {
  allowedOrigins: Set<string>;
  credentials?: boolean;
}

export function buildCorsOriginSet(corsOriginsList: string[], nodeEnv: string): Set<string> {
  const origins = new Set<string>();
  for (const origin of corsOriginsList) {
    origins.add(origin);
  }
  if (nodeEnv !== 'production') {
    for (const origin of corsOriginsList) {
      if (origin.includes('localhost')) {
        origins.add(origin.replace('localhost', '127.0.0.1'));
      }
    }
  }
  return origins;
}

export function createCorsConfig(corsOriginsList: string[], nodeEnv: string): CorsConfig {
  return {
    allowedOrigins: buildCorsOriginSet(corsOriginsList, nodeEnv),
    credentials: true,
  };
}

type OriginCallback = (err: Error | null, allow: boolean) => void;

export async function configureCors(app: FastifyInstance, corsConfig: CorsConfig): Promise<void> {
  const cors = (await import('@fastify/cors')).default;

  await app.register(cors, {
    origin: (origin: string | undefined, callback: OriginCallback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (corsConfig.allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: corsConfig.credentials ?? true,
  });
}
