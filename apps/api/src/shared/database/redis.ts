import net from 'node:net';
import tls from 'node:tls';
import { URL } from 'node:url';

import { loadConfig, type AppConfig } from '../../config.js';

import type { DependencyHealth } from './connection.js';

const REDIS_CONNECT_TIMEOUT_MS = 500;

const REDIS_INCREMENT_LUA = `
  local key = KEYS[1]
  local timeWindow = tonumber(ARGV[1])
  local max = tonumber(ARGV[2])
  local continueExceeding = ARGV[3] == 'true'
  local exponentialBackoff = ARGV[4] == 'true'
  local MAX_SAFE_INTEGER = (2^53) - 1

  local current = redis.call('INCR', key)

  if current == 1 or (continueExceeding and current > max) then
    redis.call('PEXPIRE', key, timeWindow)
  elseif exponentialBackoff and current > max then
    local backoffExponent = current - max - 1
    timeWindow = math.min(timeWindow * (2 ^ backoffExponent), MAX_SAFE_INTEGER)
    redis.call('PEXPIRE', key, timeWindow)
  else
    timeWindow = redis.call('PTTL', key)
  end

  return {current, timeWindow}
`;

type RedisStatus = 'wait' | 'connecting' | 'ready' | 'closed' | 'end';

type RespValue = string | number | null | RespValue[];

type ParsedResp = {
  value: RespValue | Error;
  offset: number;
};

type PendingCommand = {
  resolve: (value: RespValue) => void;
  reject: (error: Error) => void;
};

type RedisConnectionInfo = {
  host: string;
  port: number;
  useTls: boolean;
  username?: string;
  password?: string;
  db?: number;
};

export type RedisRateLimitIncrementParams = {
  key: string;
  timeWindowMs: number;
  max: number;
  continueExceeding: boolean;
  exponentialBackoff: boolean;
};

export type RedisRateLimitIncrementResult = {
  current: number;
  ttl: number;
};

export interface RedisRateLimitClient {
  status: RedisStatus;
  connect(): Promise<void>;
  ping(): Promise<string>;
  incrementRateLimitKey(
    params: RedisRateLimitIncrementParams,
  ): Promise<RedisRateLimitIncrementResult>;
  quit(): Promise<void>;
  disconnect(): void;
}

const toError = (value: unknown, fallbackMessage: string): Error =>
  value instanceof Error ? value : new Error(fallbackMessage);

const parsePositiveInteger = (value: unknown, fallback: number): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }

  return Math.trunc(numeric);
};

const parseNonNegativeInteger = (value: unknown, fallback: number): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return fallback;
  }

  return Math.trunc(numeric);
};

const parseRedisUrl = (redisUrl: string): RedisConnectionInfo => {
  const parsed = new URL(redisUrl);

  if (parsed.protocol !== 'redis:' && parsed.protocol !== 'rediss:') {
    throw new Error('Redis URL must use redis:// or rediss:// protocol');
  }

  const host = parsed.hostname;
  if (!host) {
    throw new Error('Redis URL is missing a hostname');
  }

  const defaultPort = parsed.protocol === 'rediss:' ? 6380 : 6379;
  const port = parsed.port ? Number(parsed.port) : defaultPort;

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('Redis URL contains an invalid port');
  }

  const dbPath = parsed.pathname.replace(/^\/+/, '');
  let db: number | undefined;

  if (dbPath.length > 0) {
    const dbValue = Number(dbPath);
    if (!Number.isInteger(dbValue) || dbValue < 0) {
      throw new Error('Redis URL contains an invalid database index');
    }
    db = dbValue;
  }

  const username = parsed.username ? decodeURIComponent(parsed.username) : null;
  const rawPassword = parsed.password;
  const pass = rawPassword ? decodeURIComponent(rawPassword) : null;

  return {
    host,
    port,
    useTls: parsed.protocol === 'rediss:',
    ...(username ? { username } : {}),
    ...(pass ? { password: pass } : {}),
    ...(db !== undefined ? { db } : {}),
  };
};

const encodeRespCommand = (parts: readonly string[]): Buffer => {
  const payload = [
    `*${parts.length}`,
    ...parts.flatMap((part) => {
      const asString = String(part);
      return [`$${Buffer.byteLength(asString)}`, asString];
    }),
  ].join('\r\n');

  return Buffer.from(`${payload}\r\n`, 'utf8');
};

const parseResp = (input: Buffer, offset = 0): ParsedResp | null => {
  if (offset >= input.length) {
    return null;
  }

  const lineEnd = input.indexOf('\r\n', offset);
  if (lineEnd === -1) {
    return null;
  }

  const marker = input[offset];
  if (marker === undefined) {
    return null;
  }

  const type = String.fromCharCode(marker);
  const head = input.toString('utf8', offset + 1, lineEnd);

  if (type === '+') {
    return {
      value: head,
      offset: lineEnd + 2,
    };
  }

  if (type === '-') {
    return {
      value: new Error(head),
      offset: lineEnd + 2,
    };
  }

  if (type === ':') {
    return {
      value: Number(head),
      offset: lineEnd + 2,
    };
  }

  if (type === '$') {
    const length = Number(head);

    if (!Number.isInteger(length)) {
      return {
        value: new Error('Invalid Redis bulk string length'),
        offset: lineEnd + 2,
      };
    }

    if (length === -1) {
      return {
        value: null,
        offset: lineEnd + 2,
      };
    }

    const start = lineEnd + 2;
    const end = start + length;

    if (input.length < end + 2) {
      return null;
    }

    return {
      value: input.toString('utf8', start, end),
      offset: end + 2,
    };
  }

  if (type === '*') {
    const length = Number(head);

    if (!Number.isInteger(length)) {
      return {
        value: new Error('Invalid Redis array length'),
        offset: lineEnd + 2,
      };
    }

    if (length === -1) {
      return {
        value: null,
        offset: lineEnd + 2,
      };
    }

    const values: RespValue[] = [];
    let cursor = lineEnd + 2;

    for (let index = 0; index < length; index += 1) {
      const parsed = parseResp(input, cursor);
      if (!parsed) {
        return null;
      }

      cursor = parsed.offset;

      if (parsed.value instanceof Error) {
        return {
          value: parsed.value,
          offset: cursor,
        };
      }

      values.push(parsed.value);
    }

    return {
      value: values,
      offset: cursor,
    };
  }

  return {
    value: new Error(`Unsupported Redis response type: ${type}`),
    offset: lineEnd + 2,
  };
};

class RedisTcpClient implements RedisRateLimitClient {
  public status: RedisStatus = 'wait';

  private readonly connectionInfo: RedisConnectionInfo;
  private readonly connectTimeoutMs: number;

  private socket: net.Socket | tls.TLSSocket | null = null;
  private connectPromise: Promise<void> | null = null;
  private buffer = Buffer.alloc(0);
  private readonly pending: PendingCommand[] = [];

  public constructor(redisUrl: string, connectTimeoutMs = REDIS_CONNECT_TIMEOUT_MS) {
    this.connectionInfo = parseRedisUrl(redisUrl);
    this.connectTimeoutMs = connectTimeoutMs;
  }

  public async connect(): Promise<void> {
    if (this.status === 'ready') {
      return;
    }

    if (this.connectPromise) {
      await this.connectPromise;
      return;
    }

    this.connectPromise = this.openConnection();

    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  public async ping(): Promise<string> {
    const result = await this.sendCommand(['PING']);

    if (typeof result === 'string') {
      return result;
    }

    throw new Error('Unexpected Redis PING response');
  }

  public async incrementRateLimitKey(
    params: RedisRateLimitIncrementParams,
  ): Promise<RedisRateLimitIncrementResult> {
    const result = await this.sendCommand([
      'EVAL',
      REDIS_INCREMENT_LUA,
      '1',
      params.key,
      String(params.timeWindowMs),
      String(params.max),
      String(params.continueExceeding),
      String(params.exponentialBackoff),
    ]);

    if (!Array.isArray(result) || result.length < 2) {
      throw new Error('Unexpected Redis rate limit response');
    }

    return {
      current: parsePositiveInteger(result[0], 1),
      ttl: parseNonNegativeInteger(result[1], params.timeWindowMs),
    };
  }

  public async quit(): Promise<void> {
    if (!this.socket) {
      this.status = 'closed';
      return;
    }

    if (this.status === 'ready') {
      try {
        await this.sendCommand(['QUIT']);
      } catch {
        // no-op: socket will be closed below
      }
    }

    this.disconnect();
  }

  public disconnect(): void {
    this.status = 'closed';

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
      this.socket = null;
    }

    this.buffer = Buffer.alloc(0);
    this.rejectPendingCommands(new Error('Redis connection closed'));
  }

  private async openConnection(): Promise<void> {
    const socket = this.createSocket();

    this.socket = socket;
    this.status = 'connecting';

    socket.setNoDelay(true);

    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error): void => {
        cleanup();
        this.status = 'end';
        this.teardownSocket();
        reject(toError(error, 'Redis connection failed'));
      };

      const timeout = setTimeout(() => {
        socket.destroy(new Error('Redis connection timed out'));
      }, this.connectTimeoutMs);

      const onConnect = (): void => {
        cleanup();

        socket.on('data', (chunk: Buffer | string) => {
          this.consumeData(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        socket.on('error', (error: Error) => {
          this.handleSocketError(error);
        });

        socket.on('close', () => {
          this.handleSocketClose();
        });

        resolve();
      };

      const cleanup = (): void => {
        clearTimeout(timeout);
        socket.removeListener('error', onError);
        socket.removeListener('connect', onConnect);
      };

      socket.once('error', onError);
      socket.once('connect', onConnect);
    });

    try {
      await this.authenticateIfNeeded();
      await this.selectDatabaseIfNeeded();
      this.status = 'ready';
    } catch (error) {
      this.status = 'end';
      this.teardownSocket();
      throw toError(error, 'Redis authentication failed');
    }
  }

  private createSocket(): net.Socket | tls.TLSSocket {
    const { host, port, useTls } = this.connectionInfo;

    if (useTls) {
      return tls.connect({
        host,
        port,
        servername: host,
      });
    }

    return net.createConnection({ host, port });
  }

  private async authenticateIfNeeded(): Promise<void> {
    const { username, password } = this.connectionInfo;

    if (username) {
      await this.sendCommand(['AUTH', username, password ?? '']);
      return;
    }

    if (password) {
      await this.sendCommand(['AUTH', password]);
    }
  }

  private async selectDatabaseIfNeeded(): Promise<void> {
    const { db } = this.connectionInfo;

    if (db !== undefined && db > 0) {
      await this.sendCommand(['SELECT', String(db)]);
    }
  }

  private async sendCommand(parts: readonly string[]): Promise<RespValue> {
    if (this.status !== 'ready') {
      const canWriteDuringConnect = this.status === 'connecting' && this.socket !== null;

      if (!canWriteDuringConnect) {
        await this.connect();
      }
    }

    const socket = this.socket;

    if (!socket || (this.status !== 'ready' && this.status !== 'connecting')) {
      throw new Error('Redis client is not connected');
    }

    const payload = encodeRespCommand(parts);

    return new Promise<RespValue>((resolve, reject) => {
      const pending: PendingCommand = { resolve, reject };
      this.pending.push(pending);

      socket.write(payload, (error) => {
        if (!error) {
          return;
        }

        const index = this.pending.indexOf(pending);
        if (index >= 0) {
          this.pending.splice(index, 1);
        }

        reject(toError(error, 'Failed to write Redis command'));
      });
    });
  }

  private consumeData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (this.buffer.length > 0) {
      const parsed = parseResp(this.buffer);
      if (!parsed) {
        return;
      }

      this.buffer = this.buffer.subarray(parsed.offset);

      const pending = this.pending.shift();
      if (!pending) {
        continue;
      }

      if (parsed.value instanceof Error) {
        pending.reject(parsed.value);
        continue;
      }

      pending.resolve(parsed.value);
    }
  }

  private handleSocketError(error: Error): void {
    if (this.status === 'closed') {
      return;
    }

    this.status = 'end';
    this.rejectPendingCommands(error);
  }

  private handleSocketClose(): void {
    if (this.status === 'closed') {
      return;
    }

    this.status = 'end';
    this.socket = null;
    this.buffer = Buffer.alloc(0);
    this.rejectPendingCommands(new Error('Redis connection closed'));
  }

  private rejectPendingCommands(error: Error): void {
    let pending = this.pending.shift();

    while (pending) {
      pending.reject(error);
      pending = this.pending.shift();
    }
  }

  private teardownSocket(): void {
    if (!this.socket) {
      return;
    }

    this.socket.removeAllListeners();
    this.socket.destroy();
    this.socket = null;
    this.buffer = Buffer.alloc(0);
    this.rejectPendingCommands(new Error('Redis connection closed'));
  }
}

let redisClient: RedisRateLimitClient | null = null;
let invalidRedisUrl: string | null = null;

const buildRedisClient = (config: AppConfig): RedisRateLimitClient =>
  new RedisTcpClient(config.REDIS_URL);

export const getRedisClient = (config: AppConfig = loadConfig()): RedisRateLimitClient | null => {
  if (config.NODE_ENV === 'test') {
    return null;
  }

  if (invalidRedisUrl === config.REDIS_URL) {
    return null;
  }

  if (!redisClient) {
    try {
      redisClient = buildRedisClient(config);
    } catch {
      invalidRedisUrl = config.REDIS_URL;
      return null;
    }
  }

  return redisClient;
};

export const closeRedisClient = async (): Promise<void> => {
  invalidRedisUrl = null;

  if (!redisClient) {
    return;
  }

  const client = redisClient;
  redisClient = null;

  await client.quit();
};

export async function checkRedisHealth(
  config: AppConfig = loadConfig(),
): Promise<DependencyHealth> {
  if (config.NODE_ENV === 'test') {
    return {
      ok: false,
      message: 'Redis connection not configured',
    };
  }

  const client = getRedisClient(config);
  if (!client) {
    return {
      ok: false,
      message: 'Redis connection not configured',
    };
  }

  try {
    await client.connect();
    const pong = await client.ping();

    if (pong !== 'PONG') {
      return {
        ok: false,
        message: 'Redis ping failed',
      };
    }

    return {
      ok: true,
      message: 'Redis connection ok',
    };
  } catch {
    return {
      ok: false,
      message: 'Redis connection failed',
    };
  }
}
