import { spawn } from 'node:child_process';
import net from 'node:net';

import postgres from 'postgres';

import { resolveDatabaseUrl, seedTestDatabase } from './helpers/db-seed';
import { clearSetupState, recordSetupState } from './helpers/setup-state';

const DEFAULT_REDIS_URL = 'redis://127.0.0.1:6379';

const runCommand = async (command: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed: ${command} ${args.join(' ')} (code: ${code ?? 'null'})`));
    });
  });

const assertPostgresReady = async (databaseUrl: string): Promise<void> => {
  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 5,
  });

  try {
    await sql`select 1`;
  } finally {
    await sql.end({ timeout: 5 });
  }
};

const assertRedisReady = async (redisUrl: string): Promise<void> => {
  const { hostname, port } = new URL(redisUrl);

  await new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({
      host: hostname,
      port: Number(port) || 6379,
    });

    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error(`Timed out waiting for Redis at ${hostname}:${port}`));
    }, 5_000);

    socket.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    socket.once('connect', () => {
      socket.write('PING\r\n');
    });

    socket.once('data', (buffer: Buffer) => {
      clearTimeout(timeout);
      socket.end();

      const response = buffer.toString('utf8');
      if (!response.startsWith('+PONG')) {
        reject(new Error(`Unexpected Redis response: ${response}`));
        return;
      }

      resolve();
    });
  });
};

const runMigrations = async (databaseUrl: string): Promise<void> => {
  await runCommand('pnpm', ['--filter', '@the-dmz/api', 'db:migrate'], {
    ...process.env,
    NODE_ENV: 'test',
    DATABASE_URL: databaseUrl,
  });
};

const globalSetup = async (): Promise<void> => {
  await clearSetupState();

  const databaseUrl = resolveDatabaseUrl();
  const redisUrl = process.env.REDIS_URL ?? DEFAULT_REDIS_URL;

  try {
    await assertPostgresReady(databaseUrl);
    await assertRedisReady(redisUrl);
    await runMigrations(databaseUrl);
    await seedTestDatabase(databaseUrl);
    await recordSetupState(databaseUrl);
  } catch (error) {
    await clearSetupState();
    throw error;
  }
};

export default globalSetup;
