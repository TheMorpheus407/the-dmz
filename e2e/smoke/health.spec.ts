import { buildApiUrl } from '../helpers/api';
import { expect, test } from '../fixtures/base';

test('API health check returns 200', async ({ request, apiBaseUrl }) => {
  const response = await request.get(
    buildApiUrl('/health', { PLAYWRIGHT_API_BASE_URL: apiBaseUrl }),
  );

  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toEqual({ status: 'ok' });
});

test('Web health check returns 200', async ({ request }) => {
  const response = await request.get('/health');

  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toEqual({ status: 'ok' });
});

test('Frontend loads without errors', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/DMZ/);
  await expect(page.getByRole('heading', { name: 'Archive Gate' })).toBeVisible();
});
