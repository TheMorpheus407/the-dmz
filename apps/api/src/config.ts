import { z } from "zod";

const nodeEnvs = ["development", "test", "production"] as const;
const logLevels = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;

const booleanSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }

  return value;
}, z.boolean());

const envSchema = z
  .object({
    NODE_ENV: z.enum(nodeEnvs).default("development"),
    PORT: z.coerce.number().int().positive().default(3001),
    DATABASE_URL: z.string().min(1).default("postgres://localhost:5432/the_dmz"),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().optional(),
    DATABASE_POOL_IDLE_TIMEOUT: z.coerce.number().int().positive().optional(),
    DATABASE_POOL_CONNECT_TIMEOUT: z.coerce.number().int().positive().optional(),
    DATABASE_SSL: booleanSchema.optional(),
    REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
    LOG_LEVEL: z.enum(logLevels).default("info"),
  })
  .transform((config) => {
    const isProd = config.NODE_ENV === "production";

    return {
      ...config,
      DATABASE_POOL_MAX: config.DATABASE_POOL_MAX ?? (isProd ? 25 : 10),
      DATABASE_POOL_IDLE_TIMEOUT: config.DATABASE_POOL_IDLE_TIMEOUT ?? 10,
      DATABASE_POOL_CONNECT_TIMEOUT: config.DATABASE_POOL_CONNECT_TIMEOUT ?? 30,
      DATABASE_SSL: config.DATABASE_SSL ?? isProd,
    };
  });

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = envSchema.safeParse(env);

  if (!result.success) {
    const formatted = result.error.flatten();
    throw new Error(`Invalid environment configuration: ${JSON.stringify(formatted.fieldErrors)}`);
  }

  return result.data;
}
