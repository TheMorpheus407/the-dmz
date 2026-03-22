import { initializeConnectivityListeners } from '$lib/stores/connectivity';
import { initializePWA } from '$lib/pwa';
import { logger } from '$lib/logger';

import type { HandleClientError } from '@sveltejs/kit';

export const handleError: HandleClientError = ({ error }) => {
  logger.error('Client error', { error });
};

export async function start(): Promise<void> {
  await initializeConnectivityListeners();
  await initializePWA();
}
