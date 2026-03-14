import { initializeConnectivityListeners } from '$lib/stores/connectivity';
import { initializePWA } from '$lib/pwa';

import type { HandleClientError } from '@sveltejs/kit';

export const handleError: HandleClientError = ({ error }) => {
  console.error('Client error', error);
};

export async function start(): Promise<void> {
  await initializeConnectivityListeners();
  await initializePWA();
}
