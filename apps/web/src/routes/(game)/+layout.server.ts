import { redirect } from '@sveltejs/kit';

import { getServerUser } from '$lib/server/auth';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
  const user = await getServerUser(event);

  if (!user) {
    throw redirect(303, '/login');
  }

  return {
    user,
  };
};
