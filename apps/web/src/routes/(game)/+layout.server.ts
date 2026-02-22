import { redirect } from '@sveltejs/kit';

import { getServerUser } from '$lib/server/auth';
import { RouteGroup, evaluateRouteGroupPolicy } from '@the-dmz/shared/auth';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
  const user = await getServerUser(event);

  const result = evaluateRouteGroupPolicy(RouteGroup.GAME, user);

  if (!result.allowed && result.redirectUrl) {
    throw redirect(303, result.redirectUrl);
  }

  return {
    user,
  };
};
