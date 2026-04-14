import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_API_PORT,
  DEFAULT_WEB_PORT,
  resolveApiProxyTarget,
  resolveWebDevPorts,
} from './dev-ports';

describe('resolveWebDevPorts', () => {
  it('uses defaults when env vars are missing', () => {
    const ports = resolveWebDevPorts({});

    expect(ports).toEqual({
      webPort: DEFAULT_WEB_PORT,
      apiPort: DEFAULT_API_PORT,
    });
  });

  it('honors WEB_PORT and API_PORT', () => {
    const ports = resolveWebDevPorts({
      WEB_PORT: '5174',
      API_PORT: '3011',
    });

    expect(ports).toEqual({
      webPort: 5174,
      apiPort: 3011,
    });
  });

  it('falls back to PORT when API_PORT is missing', () => {
    const ports = resolveWebDevPorts({
      WEB_PORT: '5175',
      PORT: '3200',
    });

    expect(ports).toEqual({
      webPort: 5175,
      apiPort: 3200,
    });
  });

  it('falls back to PORT when API_PORT is blank', () => {
    const ports = resolveWebDevPorts({
      WEB_PORT: '5175',
      API_PORT: '',
      PORT: '3200',
    });

    expect(ports).toEqual({
      webPort: 5175,
      apiPort: 3200,
    });
  });

  it('rejects malformed WEB_PORT values', () => {
    expect(() =>
      resolveWebDevPorts({
        WEB_PORT: '5173abc',
      }),
    ).toThrow(/Invalid WEB_PORT value/);
  });

  it('rejects malformed API_PORT values', () => {
    expect(() =>
      resolveWebDevPorts({
        API_PORT: '3000abc',
        PORT: '3200',
      }),
    ).toThrow(/Invalid API_PORT value/);
  });
});

describe('resolveApiProxyTarget', () => {
  it('uses VITE_API_URL when provided', () => {
    const target = resolveApiProxyTarget({
      VITE_API_URL: 'https://example.test',
      API_PORT: '3200',
    });

    expect(target).toBe('https://example.test');
  });

  it('falls back to resolved API port when VITE_API_URL is blank', () => {
    const target = resolveApiProxyTarget({
      VITE_API_URL: '   ',
      API_PORT: '',
      PORT: '3200',
    });

    expect(target).toBe('http://localhost:3200');
  });

  it('accepts http:// URLs', () => {
    const target = resolveApiProxyTarget({
      VITE_API_URL: 'http://example.test',
    });

    expect(target).toBe('http://example.test');
  });

  it('accepts https:// URLs', () => {
    const target = resolveApiProxyTarget({
      VITE_API_URL: 'https://example.test',
    });

    expect(target).toBe('https://example.test');
  });

  it('rejects VITE_API_URL with invalid protocol and logs warning', () => {
    const invalidProtocols = [
      'ftp://example.test',
      'file://example.test',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
    ];

    for (const url of invalidProtocols) {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const target = resolveApiProxyTarget({
        VITE_API_URL: url,
        API_PORT: '3001',
      });

      expect(target).toBe('http://localhost:3001');
      expect(warnSpy).toHaveBeenCalledWith(
        `[WARN] VITE_API_URL is set to "${url}" but is not a valid http/https URL. Falling back to localhost.`,
      );
      warnSpy.mockRestore();
    }
  });

  it('rejects VITE_API_URL that is not a valid URL and logs warning', () => {
    const invalidUrls = [
      'not-a-url',
      'localhost:3001',
      'example.test',
      'http:/example.test',
      'http://',
    ];

    for (const url of invalidUrls) {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const target = resolveApiProxyTarget({
        VITE_API_URL: url,
        API_PORT: '3001',
      });

      expect(target).toBe('http://localhost:3001');
      expect(warnSpy).toHaveBeenCalledWith(
        `[WARN] VITE_API_URL is set to "${url}" but is not a valid http/https URL. Falling back to localhost.`,
      );
      warnSpy.mockRestore();
    }
  });

  it('falls back to http://localhost:{apiPort} when VITE_API_URL is invalid and logs warning', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const target = resolveApiProxyTarget({
      VITE_API_URL: 'ftp://invalid.test',
      API_PORT: '4567',
    });

    expect(target).toBe('http://localhost:4567');
    expect(warnSpy).toHaveBeenCalledWith(
      '[WARN] VITE_API_URL is set to "ftp://invalid.test" but is not a valid http/https URL. Falling back to localhost.',
    );
    warnSpy.mockRestore();
  });

  it('falls back correctly when VITE_API_URL is empty string after trim', () => {
    const target = resolveApiProxyTarget({
      VITE_API_URL: '',
      API_PORT: '3001',
    });

    expect(target).toBe('http://localhost:3001');
  });

  it('falls back correctly when VITE_API_URL is whitespace-only', () => {
    const target = resolveApiProxyTarget({
      VITE_API_URL: '   \t\n',
      API_PORT: '3001',
    });

    expect(target).toBe('http://localhost:3001');
  });
});
