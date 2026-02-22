import { redirect } from '@sveltejs/kit';

import { getServerUser } from '$lib/server/auth';
import { RouteGroup, evaluateRouteGroupPolicy } from '@the-dmz/shared/auth';
import { getGameSession } from '$lib/api/game';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
  const user = await getServerUser(event);

  const result = evaluateRouteGroupPolicy(RouteGroup.GAME, user);

  if (!result.allowed && result.redirectUrl) {
    throw redirect(303, result.redirectUrl);
  }

  const sessionResult = await getGameSession();

  return {
    user,
    gameSession: sessionResult.data || null,
    gameSessionError: sessionResult.error || null,
  };
};
