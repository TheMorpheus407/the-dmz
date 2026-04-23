import { gameSessionBootstrapSchema, type GameSessionBootstrap } from '@the-dmz/shared/schemas';

import { apiClient } from './client.js';
import { createInvalidResponseError } from './errors.js';

import type { CategorizedApiError } from './types.js';

export type GameSessionBootstrapResponse = {
  data: GameSessionBootstrap;
};

export async function bootstrapGameSession(): Promise<{
  data?: GameSessionBootstrap;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.post<GameSessionBootstrapResponse>('/game/session', undefined);

  if (result.error) {
    return { error: result.error };
  }

  if (result.data) {
    const validation = gameSessionBootstrapSchema.safeParse(result.data.data);
    if (!validation.success) {
      return {
        error: createInvalidResponseError('Invalid game session bootstrap response from server'),
      };
    }
    return { data: result.data.data };
  }

  return { error: createInvalidResponseError('No data received from server') };
}

export async function getGameSession(): Promise<{
  data?: GameSessionBootstrap;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.get<GameSessionBootstrapResponse>('/game/session');

  if (result.error) {
    return { error: result.error };
  }

  if (result.data) {
    const validation = gameSessionBootstrapSchema.safeParse(result.data.data);
    if (!validation.success) {
      return { error: createInvalidResponseError('Invalid game session response from server') };
    }
    return { data: result.data.data };
  }

  return { error: createInvalidResponseError('No data received from server') };
}
