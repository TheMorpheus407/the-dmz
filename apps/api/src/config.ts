import { z } from "zod";

const nodeEnvs = ["development", "test", "production"] as const;
const logLevels = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;

const envSchema = z.object({
  NODE_ENV: z.enum(nodeEnvs).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1).default("postgres://localhost:5432/the_dmz"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  LOG_LEVEL: z.enum(logLevels).default("info"),
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
