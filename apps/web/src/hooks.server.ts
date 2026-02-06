import { loadFrontendConfig } from '$lib/config/env.js';

import type { Handle } from '@sveltejs/kit';

// Validate environment variables on first load.
// Throws with actionable error messages if required variables are missing.
loadFrontendConfig();

export const handle: Handle = async ({ event, resolve }) => resolve(event);
