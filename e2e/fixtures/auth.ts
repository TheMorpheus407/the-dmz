import { E2E_TENANT_SLUG, E2E_TEST_USER_EMAIL } from '../helpers/db-seed';

import { test as base, expect } from './base';

export type AuthSession = {
  tenantSlug: string;
  email: string;
};

type AuthFixtures = {
  loginAsTestUser: () => Promise<AuthSession>;
};

export const test = base.extend<AuthFixtures>({
  loginAsTestUser: async ({ page }, use) => {
    await use(async () => {
      await page.goto('/login');
      await expect(page.getByRole('heading', { name: 'Access Portal' })).toBeVisible();

      return {
        tenantSlug: E2E_TENANT_SLUG,
        email: E2E_TEST_USER_EMAIL,
      };
    });
  },
});

export { expect };
