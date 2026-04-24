import { test as base, expect } from '../fixtures/auth';

const test = base;

test.describe('Logout Flow UI', () => {
  test.describe('Player Logout', () => {
    test('should redirect to login page after clicking logout button on game page', async ({
      page,
      loginAsTestUser,
    }) => {
      await loginAsTestUser();

      await expect(page).toHaveURL(/\/game/);

      const logoutButton = page.getByRole('button', { name: /logout/i });
      await expect(logoutButton).toBeVisible();

      await logoutButton.click();

      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });

    test('should clear session and not allow access to game after logout', async ({
      page,
      loginAsTestUser,
    }) => {
      await loginAsTestUser();

      await expect(page).toHaveURL(/\/game/);

      const logoutButton = page.getByRole('button', { name: /logout/i });
      await logoutButton.click();

      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

      await page.goto('/game');

      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });

    test('should clear session and not allow access to admin after logout', async ({
      page,
      loginAsTestUser,
    }) => {
      await loginAsTestUser();

      await expect(page).toHaveURL(/\/game/);

      const logoutButton = page.getByRole('button', { name: /logout/i });
      await logoutButton.click();

      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

      await page.goto('/admin');

      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });

    test('should show login page with login form after logout', async ({
      page,
      loginAsTestUser,
    }) => {
      await loginAsTestUser();

      const logoutButton = page.getByRole('button', { name: /logout/i });
      await logoutButton.click();

      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
      await expect(page.getByRole('heading', { name: /access portal/i })).toBeVisible();
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });
  });

  test.describe('Admin Logout', () => {
    test('should redirect admin to login page after clicking logout button', async ({
      page,
      loginAsAdmin,
    }) => {
      await loginAsAdmin();

      await expect(page).toHaveURL(/\/admin/);

      const logoutButton = page.getByRole('button', { name: /logout/i });
      await expect(logoutButton).toBeVisible();

      await logoutButton.click();

      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });

    test('should clear admin session and not allow access to admin after logout', async ({
      page,
      loginAsAdmin,
    }) => {
      await loginAsAdmin();

      await expect(page).toHaveURL(/\/admin/);

      const logoutButton = page.getByRole('button', { name: /logout/i });
      await logoutButton.click();

      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

      await page.goto('/admin');

      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });

    test('should allow admin to re-login after logout', async ({ page, loginAsAdmin }) => {
      await loginAsAdmin();

      const logoutButton = page.getByRole('button', { name: /logout/i });
      await logoutButton.click();

      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@e2e.test');
      await page.fill('input[name="password"]', 'Admin123!');
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });
    });
  });

  test.describe('Logout Button Accessibility', () => {
    test('logout button should be keyboard accessible', async ({ page, loginAsTestUser }) => {
      await loginAsTestUser();

      await expect(page).toHaveURL(/\/game/);

      const logoutButton = page.getByRole('button', { name: /logout/i });
      await expect(logoutButton).toBeVisible();

      await page.keyboard.press('Tab');
      await expect(logoutButton).toBeFocused();

      await page.keyboard.press('Enter');

      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });

    test('logout button should have proper accessible name', async ({ page, loginAsAdmin }) => {
      await loginAsAdmin();

      const logoutButton = page.getByRole('button', { name: /logout/i });
      await expect(logoutButton).toBeVisible();
      await expect(logoutButton).toHaveName(/logout/i);
    });
  });
});
