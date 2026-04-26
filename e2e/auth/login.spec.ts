import { test as base, expect } from '../fixtures/auth';
import { buildApiUrl } from '../helpers/api';

type BaseFixtures = {
  apiBaseUrl: string;
};

const test = base.extend<BaseFixtures>({
  apiBaseUrl: async ({ request: _request }, use) => {
    const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3001';
    await use(DEFAULT_API_BASE_URL);
  },
});

test.describe('Login Error Handling', () => {
  test.describe('Invalid Credentials', () => {
    test('should display error message for invalid email/password', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'nonexistent@dmz.test');
      await page.fill('input[name="password"]', 'WrongPassword123!');
      await page.click('button[type="submit"]');

      const errorPanel = page.locator('[role="alert"]');
      await expect(errorPanel).toBeVisible({ timeout: 10000 });
      await expect(errorPanel).toContainText(/invalid email or password/i);
    });

    test('should show error with title "Sign In Failed" for invalid credentials', async ({
      page,
    }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'nonexistent@dmz.test');
      await page.fill('input[name="password"]', 'WrongPassword123!');
      await page.click('button[type="submit"]');

      const errorPanel = page.locator('[role="alert"]');
      await expect(errorPanel).toBeVisible({ timeout: 10000 });
      await expect(errorPanel).toContainText(/sign in failed/i);
    });
  });

  test.describe('Loading State', () => {
    test('should disable form inputs during login submission', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'operator@dmz.test');
      await page.fill('input[name="password"]', 'dmz-e2e-password');

      const submitPromise = page.click('button[type="submit"]');
      await page.waitForTimeout(100);

      await expect(page.locator('input[name="email"]')).toBeDisabled();
      await expect(page.locator('input[name="password"]')).toBeDisabled();

      await submitPromise;
    });

    test('should disable submit button during login', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'operator@dmz.test');
      await page.fill('input[name="password"]', 'dmz-e2e-password');

      const submitPromise = page.click('button[type="submit"]');
      await page.waitForTimeout(100);

      await expect(page.locator('button[type="submit"]')).toBeDisabled();

      await submitPromise;
    });

    test('should show "Signing in..." text on button during login', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'operator@dmz.test');
      await page.fill('input[name="password"]', 'dmz-e2e-password');

      const submitPromise = page.click('button[type="submit"]');
      await page.waitForTimeout(100);

      await expect(page.locator('button[type="submit"]')).toContainText(/signing in/i);

      await submitPromise;
    });
  });

  test.describe('Form Reset After Failed Login', () => {
    test('should clear form fields after failed login attempt', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'nonexistent@dmz.test');
      await page.fill('input[name="password"]', 'WrongPassword123!');
      await page.click('button[type="submit"]');

      const errorPanel = page.locator('[role="alert"]');
      await expect(errorPanel).toBeVisible({ timeout: 10000 });

      await expect(page.locator('input[name="email"]')).toHaveValue('');
      await expect(page.locator('input[name="password"]')).toHaveValue('');
    });

    test('should allow user to re-enter credentials after failed login', async ({ page }) => {
      await page.goto('/login');

      await page.fill('input[name="email"]', 'operator@dmz.test');
      await page.fill('input[name="password"]', 'WrongPassword123!');
      await page.click('button[type="submit"]');

      const errorPanel = page.locator('[role="alert"]');
      await expect(errorPanel).toBeVisible({ timeout: 10000 });

      await expect(page.locator('input[name="email"]')).toHaveValue('');
      await expect(page.locator('input[name="password"]')).toHaveValue('');

      await page.fill('input[name="email"]', 'operator@dmz.test');
      await page.fill('input[name="password"]', 'dmz-e2e-password');
      await page.click('button[type="submit"]');

      await page.waitForURL(/\/game/, { timeout: 10000 });
    });
  });

  test.describe('Error Accessibility', () => {
    test('should have role="alert" on error panel for screen readers', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'nonexistent@dmz.test');
      await page.fill('input[name="password"]', 'WrongPassword123!');
      await page.click('button[type="submit"]');

      const errorPanel = page.locator('[role="alert"]');
      await expect(errorPanel).toBeVisible({ timeout: 10000 });
      await expect(errorPanel).toHaveAttribute('role', 'alert');
    });
  });

  test.describe('Retryable Errors', () => {
    test('should show retry button for network errors', async ({ page }) => {
      await page.route(
        buildApiUrl('/auth/login', { PLAYWRIGHT_API_BASE_URL: 'http://127.0.0.1:3001' }),
        async (route) => {
          await route.abort('failed');
        },
      );

      await page.goto('/login');
      await page.fill('input[name="email"]', 'operator@dmz.test');
      await page.fill('input[name="password"]', 'dmz-e2e-password');
      await page.click('button[type="submit"]');

      const errorPanel = page.locator('[role="alert"]');
      await expect(errorPanel).toBeVisible({ timeout: 10000 });
      await expect(errorPanel).toContainText(/connection issue/i);

      const retryButton = page.getByRole('button', { name: /try again/i });
      await expect(retryButton).toBeVisible();
    });

    test('should retry login when retry button is clicked', async ({ page }) => {
      let requestCount = 0;
      await page.route(
        buildApiUrl('/auth/login', { PLAYWRIGHT_API_BASE_URL: 'http://127.0.0.1:3001' }),
        async (route) => {
          requestCount++;
          if (requestCount === 1) {
            await route.abort('failed');
          } else {
            await route.continue();
          }
        },
      );

      await page.goto('/login');
      await page.fill('input[name="email"]', 'operator@dmz.test');
      await page.fill('input[name="password"]', 'dmz-e2e-password');
      await page.click('button[type="submit"]');

      const errorPanel = page.locator('[role="alert"]');
      await expect(errorPanel).toBeVisible({ timeout: 10000 });

      const retryButton = page.getByRole('button', { name: /try again/i });
      await retryButton.click();

      await page.waitForURL(/\/game/, { timeout: 10000 });
    });
  });

  test.describe('Non-Retryable Errors', () => {
    test('should not show retry button for invalid credentials error', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'nonexistent@dmz.test');
      await page.fill('input[name="password"]', 'WrongPassword123!');
      await page.click('button[type="submit"]');

      const errorPanel = page.locator('[role="alert"]');
      await expect(errorPanel).toBeVisible({ timeout: 10000 });

      const retryButton = page.getByRole('button', { name: /try again/i });
      await expect(retryButton).not.toBeVisible();
    });

    test('should show dismiss button for invalid credentials error', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'nonexistent@dmz.test');
      await page.fill('input[name="password"]', 'WrongPassword123!');
      await page.click('button[type="submit"]');

      const errorPanel = page.locator('[role="alert"]');
      await expect(errorPanel).toBeVisible({ timeout: 10000 });

      const dismissButton = page.getByRole('button', { name: /dismiss/i });
      await expect(dismissButton).toBeVisible();
    });

    test('should dismiss error when dismiss button is clicked', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'nonexistent@dmz.test');
      await page.fill('input[name="password"]', 'WrongPassword123!');
      await page.click('button[type="submit"]');

      const errorPanel = page.locator('[role="alert"]');
      await expect(errorPanel).toBeVisible({ timeout: 10000 });

      const dismissButton = page.getByRole('button', { name: /dismiss/i });
      await dismissButton.click();

      await expect(errorPanel).not.toBeVisible();
    });
  });
});
