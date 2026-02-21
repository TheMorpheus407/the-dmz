import postgres from 'postgres';

import {
  E2E_TENANT_SLUG,
  E2E_TEST_USER_EMAIL,
  TEST_PW,
  E2E_ADMIN_USER_EMAIL,
  ADMIN_PW,
  E2E_ADMIN_USER_ROLE,
  resolveDatabaseUrl,
} from '../helpers/db-seed';
import { buildApiUrl } from '../helpers/api';

import { test as base, expect } from './base';

export type AuthSession = {
  tenantSlug: string;
  email: string;
  accessToken: string;
  refreshToken: string;
};

const setUserRole = async (email: string, role: string) => {
  const databaseUrl = resolveDatabaseUrl();
  const sql = postgres(databaseUrl, { max: 1, idle_timeout: 5, connect_timeout: 5 });

  try {
    await sql`
      UPDATE users
      SET role = ${role}, updated_at = now()
      WHERE email = ${email}
    `;
  } finally {
    await sql.end({ timeout: 5 });
  }
};

const registerTestUser = async (
  apiBaseUrl: string,
  email: string,
  password: string,
  role: string,
) => {
  const response = await fetch(
    buildApiUrl('/auth/register', { PLAYWRIGHT_API_BASE_URL: apiBaseUrl }),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        displayName: email.split('@')[0],
      }),
    },
  );

  if (response.ok) {
    await setUserRole(email, role);
  } else if (response.status !== 409) {
    throw new Error(`Failed to register test user: ${email}, status: ${response.status}`);
  } else {
    const loginResponse = await fetch(
      buildApiUrl('/auth/login', { PLAYWRIGHT_API_BASE_URL: apiBaseUrl }),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      },
    );

    if (loginResponse.ok) {
      await setUserRole(email, role);
    }
  }
};

type AuthFixtures = {
  loginAsTestUser: () => Promise<AuthSession>;
  loginAsAdmin: () => Promise<AuthSession>;
  getAccessToken: () => Promise<string>;
  ensureTestUsers: () => Promise<void>;
};

export const test = base.extend<AuthFixtures>({
  ensureTestUsers: async ({ apiBaseUrl }, use) => {
    await use(async () => {
      await registerTestUser(apiBaseUrl, E2E_TEST_USER_EMAIL, TEST_PW, 'player');
      await registerTestUser(apiBaseUrl, E2E_ADMIN_USER_EMAIL, ADMIN_PW, E2E_ADMIN_USER_ROLE);
    });
  },

  loginAsTestUser: async ({ page, apiBaseUrl, ensureTestUsers }, use) => {
    await use(async () => {
      await ensureTestUsers();

      const loginResponse = await page.request.post(
        buildApiUrl('/auth/login', { PLAYWRIGHT_API_BASE_URL: apiBaseUrl }),
        {
          data: {
            email: E2E_TEST_USER_EMAIL,
            password: TEST_PW,
          },
        },
      );

      const loginData = await loginResponse.json();
      const { accessToken, refreshToken } = loginData.data;

      await page.goto('/login');
      await page.fill('input[name="email"]', E2E_TEST_USER_EMAIL);
      await page.fill('input[name="password"]', TEST_PW);
      await page.click('button[type="submit"]');

      await page.waitForURL('**/game', { timeout: 10000 });

      return {
        tenantSlug: E2E_TENANT_SLUG,
        email: E2E_TEST_USER_EMAIL,
        accessToken,
        refreshToken,
      };
    });
  },

  loginAsAdmin: async ({ page, apiBaseUrl, ensureTestUsers }, use) => {
    await use(async () => {
      await ensureTestUsers();

      const loginResponse = await page.request.post(
        buildApiUrl('/auth/login', { PLAYWRIGHT_API_BASE_URL: apiBaseUrl }),
        {
          data: {
            email: E2E_ADMIN_USER_EMAIL,
            password: ADMIN_PW,
          },
        },
      );

      const loginData = await loginResponse.json();
      const { accessToken, refreshToken } = loginData.data;

      await page.goto('/login');
      await page.fill('input[name="email"]', E2E_ADMIN_USER_EMAIL);
      await page.fill('input[name="password"]', ADMIN_PW);
      await page.click('button[type="submit"]');

      await page.waitForURL('**/admin', { timeout: 10000 });

      return {
        tenantSlug: E2E_TENANT_SLUG,
        email: E2E_ADMIN_USER_EMAIL,
        accessToken,
        refreshToken,
      };
    });
  },

  getAccessToken: async ({ apiBaseUrl, ensureTestUsers }, use) => {
    await use(async () => {
      await ensureTestUsers();

      const loginResponse = await fetch(
        buildApiUrl('/auth/login', { PLAYWRIGHT_API_BASE_URL: apiBaseUrl }),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: E2E_TEST_USER_EMAIL,
            password: TEST_PW,
          }),
        },
      );

      const loginData = await loginResponse.json();
      return loginData.data.accessToken;
    });
  },
});

export { expect };
