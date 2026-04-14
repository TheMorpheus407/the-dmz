import { meResponseSchema, type MeResponse } from '@the-dmz/shared/schemas';
import { resolveApiProxyTarget } from '$lib/config/dev-ports.js';

interface FetchOptions {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

export async function getServerUser(
  event: FetchOptions,
  env: NodeJS.ProcessEnv = process.env,
): Promise<MeResponse['user'] | null> {
  const baseUrl = resolveApiProxyTarget(env);

  try {
    const response = await event.fetch(`${baseUrl}/api/v1/auth/me`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const json: unknown = await response.json();

    if (json && typeof json === 'object' && 'data' in json) {
      const data = (json as { data: unknown }).data;
      const validation = meResponseSchema.safeParse(data);
      if (validation.success) {
        return validation.data.user;
      }
    }

    return null;
  } catch {
    return null;
  }
}
