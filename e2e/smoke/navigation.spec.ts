import { expect, test } from '../fixtures/auth';

test('Login page renders', async ({ page, loginAsTestUser }) => {
  const session = await loginAsTestUser();

  await expect(page.locator('body')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Access Portal' })).toBeVisible();
  expect(session.email).toContain('@');
});

test('Game route renders', async ({ page }) => {
  await page.goto('/game');
  await expect(page.getByRole('heading', { name: 'Operations Console' })).toBeVisible();
});

test('Admin route renders', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Admin Hub' })).toBeVisible();
});
