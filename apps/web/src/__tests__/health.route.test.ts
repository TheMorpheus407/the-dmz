import { describe, expect, it } from 'vitest';

import { GET } from '../routes/health/+server';

describe('GET /health', () => {
  it('returns an ok status payload', async () => {
    const response = await GET({} as Parameters<typeof GET>[0]);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });
});
