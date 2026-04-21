import type { GameSessionBootstrap } from '@the-dmz/shared/schemas';
import type { CategorizedApiError } from '$lib/api/types';
import { bootstrapGameSession, getGameSession } from '$lib/api/game';

export interface GameSessionRepositoryInterface {
  bootstrap(): Promise<{ data?: GameSessionBootstrap; error?: CategorizedApiError }>;
  fetchState(): Promise<{ data?: GameSessionBootstrap; error?: CategorizedApiError }>;
}

export class GameSessionRepository implements GameSessionRepositoryInterface {
  async bootstrap(): Promise<{ data?: GameSessionBootstrap; error?: CategorizedApiError }> {
    return bootstrapGameSession();
  }

  async fetchState(): Promise<{ data?: GameSessionBootstrap; error?: CategorizedApiError }> {
    return getGameSession();
  }
}
