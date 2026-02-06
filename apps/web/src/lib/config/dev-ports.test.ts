import { describe, expect, it } from 'vitest';

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
});
