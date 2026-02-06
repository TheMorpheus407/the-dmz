import { expect, test as base } from '@playwright/test';

import { resolveApiBaseUrl } from '../helpers/api';

type BaseFixtures = {
  apiBaseUrl: string;
};

export const test = base.extend<BaseFixtures>({
  apiBaseUrl: async ({ request: _request }, use) => {
    await use(resolveApiBaseUrl());
  },
});

export { expect };
