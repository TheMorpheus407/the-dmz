import type { Config } from 'drizzle-kit';

const config = {
  schema: [
    './src/shared/database/schema/tenants.ts',
    './src/shared/database/schema/users.ts',
    './src/db/schema/auth/permissions.ts',
    './src/db/schema/auth/role-permissions.ts',
    './src/db/schema/auth/roles.ts',
    './src/db/schema/auth/sessions.ts',
    './src/db/schema/auth/sso-connections.ts',
    './src/db/schema/auth/user-roles.ts',
  ],
  out: './src/shared/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://localhost:5432/the_dmz',
  },
  strict: true,
  verbose: true,
} satisfies Config;

export default config;
