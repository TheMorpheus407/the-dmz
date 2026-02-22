import { gameSessionBootstrapSchema, type GameSessionBootstrap } from '@the-dmz/shared/schemas';

import { apiClient } from './client.js';

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
        error: {
          category: 'server',
          code: 'INVALID_RESPONSE',
          message: 'Invalid game session bootstrap response from server',
          status: 500,
          retryable: false,
        },
      };
    }
    return { data: result.data.data };
  }

  return {
    error: {
      category: 'server',
      code: 'INVALID_RESPONSE',
      message: 'No data received from server',
      status: 500,
      retryable: false,
    },
  };
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
      return {
        error: {
          category: 'server',
          code: 'INVALID_RESPONSE',
          message: 'Invalid game session response from server',
          status: 500,
          retryable: false,
        },
      };
    }
    return { data: result.data.data };
  }

  return {
    error: {
      category: 'server',
      code: 'INVALID_RESPONSE',
      message: 'No data received from server',
      status: 500,
      retryable: false,
    },
  };
}
