import { buildApiUrl } from '../helpers/api';
import { expect, test } from '../fixtures/auth';

test.describe('M1 Foundation Gate - Route Groups', () => {
  test.describe('Anonymous Access', () => {
    test('(public) route is accessible to anonymous users', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Archive Gate' })).toBeVisible();
    });

    test('(auth) login page is accessible to anonymous users', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByRole('heading', { name: 'Access Portal' })).toBeVisible();
    });

    test('(game) route is accessible to anonymous users (current behavior)', async ({ page }) => {
      await page.goto('/game');
      await expect(page.getByRole('heading', { name: 'Operations Console' })).toBeVisible();
    });

    test('(admin) route is accessible to anonymous users (current behavior)', async ({ page }) => {
      await page.goto('/admin');
      await expect(page.getByRole('heading', { name: 'Admin Hub' })).toBeVisible();
    });
  });

  test.describe('Authenticated Access', () => {
    test('authenticated user can access (game) routes', async ({ page, loginAsTestUser }) => {
      await loginAsTestUser();

      await page.goto('/game');
      await expect(page.getByRole('heading', { name: 'Operations Console' })).toBeVisible();
    });

    test('admin user can access (admin) routes', async ({ page, loginAsAdmin }) => {
      await loginAsAdmin();

      await page.goto('/admin');
      await expect(page.getByRole('heading', { name: 'Admin Hub' })).toBeVisible();
    });

    test('non-admin user can access (admin) routes (current behavior)', async ({
      page,
      loginAsTestUser,
    }) => {
      await loginAsTestUser();

      await page.goto('/admin');
      await expect(page.getByRole('heading', { name: 'Admin Hub' })).toBeVisible();
    });
  });
});

test.describe('M1 Foundation Gate - Theme Verification', () => {
  test('(public) route resolves enterprise theme by default', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).toHaveAttribute('data-theme', 'enterprise');
  });

  test('(auth) route resolves enterprise theme by default', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).toHaveAttribute('data-theme', 'enterprise');
  });

  test('(game) route resolves green theme by default', async ({ page }) => {
    await page.goto('/game');
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).toHaveAttribute('data-theme', 'green');
  });

  test('(admin) route resolves enterprise theme by default', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).toHaveAttribute('data-theme', 'enterprise');
  });

  test('route groups have data-surface attributes', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-surface="public"]')).toBeVisible();

    await page.goto('/login');
    await expect(page.locator('[data-surface="auth"]')).toBeVisible();

    await page.goto('/game');
    await expect(page.locator('[data-surface="game"]')).toBeVisible();

    await page.goto('/admin');
    await expect(page.locator('[data-surface="admin"]')).toBeVisible();
  });
});

test.describe('M1 Foundation Gate - Backend Health Endpoints', () => {
  test('GET /health returns 200 and is a non-auth infra probe', async ({ request, apiBaseUrl }) => {
    const response = await request.get(
      buildApiUrl('/health', { PLAYWRIGHT_API_BASE_URL: apiBaseUrl }),
    );

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('status', 'ok');
  });

  test('GET /ready returns 200 and is a non-auth infra probe', async ({ request, apiBaseUrl }) => {
    const response = await request.get(
      buildApiUrl('/ready', { PLAYWRIGHT_API_BASE_URL: apiBaseUrl }),
    );

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('status');
  });

  test('GET /health/authenticated returns 401 without auth token', async ({
    request,
    apiBaseUrl,
  }) => {
    const response = await request.get(
      buildApiUrl('/health/authenticated', { PLAYWRIGHT_API_BASE_URL: apiBaseUrl }),
    );

    expect(response.status()).toBe(401);
  });

  test('GET /health/authenticated returns 200 with valid auth token', async ({
    request,
    apiBaseUrl,
    getAccessToken,
  }) => {
    const token = await getAccessToken();

    const response = await request.get(
      buildApiUrl('/health/authenticated', { PLAYWRIGHT_API_BASE_URL: apiBaseUrl }),
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('user');
  });
});

test.describe('M1 Foundation Gate - OpenAPI Documentation', () => {
  test('GET /docs/json returns OpenAPI spec with auth components', async ({
    request,
    apiBaseUrl,
  }) => {
    const response = await request.get(
      buildApiUrl('/docs/json', { PLAYWRIGHT_API_BASE_URL: apiBaseUrl }),
    );

    expect(response.ok()).toBeTruthy();
    const spec = await response.json();

    expect(spec).toHaveProperty('openapi');
    expect(spec.components).toHaveProperty('securitySchemes');
    expect(spec.components.securitySchemes).toHaveProperty('bearerAuth');
  });

  test('OpenAPI spec includes auth and error schemas', async ({ request, apiBaseUrl }) => {
    const response = await request.get(
      buildApiUrl('/docs/json', { PLAYWRIGHT_API_BASE_URL: apiBaseUrl }),
    );

    expect(response.ok()).toBeTruthy();
    const spec = await response.json();

    const paths = spec.paths as Record<string, unknown>;
    expect(Object.keys(paths)).toContain('/auth/login');
    expect(Object.keys(paths)).toContain('/auth/register');
    expect(Object.keys(paths)).toContain('/health/authenticated');
  });
});
