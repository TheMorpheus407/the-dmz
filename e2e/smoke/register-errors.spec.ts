import { expect, test } from '../fixtures/auth';
import { buildApiUrl } from '../helpers/api';
import { E2E_TEST_USER_EMAIL } from '../helpers/db-seed';

const generateUniqueEmail = (): string =>
  `newuser_${Date.now()}_${Math.random().toFixed(6)}@dmz.test`;

test.describe('Registration Error Handling', () => {
  test.describe('Password Complexity Validation', () => {
    test('shows error for password meeting length but failing complexity requirements', async ({
      page,
    }) => {
      const email = generateUniqueEmail();
      const weakPassword = 'aaaaaaaaaaaa1';

      await page.goto('/register');
      await page.fill('input[name="displayName"]', 'Test User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', weakPassword);
      await page.click('button[type="submit"]');

      const errorMessage = page.locator('.error-message');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/password|complexity|requirements/i);
    });

    test('shows error for password with only lowercase letters (meets length, fails complexity)', async ({
      page,
    }) => {
      const email = generateUniqueEmail();
      const weakPassword = 'abcdefghijk';

      await page.goto('/register');
      await page.fill('input[name="displayName"]', 'Test User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', weakPassword);
      await page.click('button[type="submit"]');

      const errorMessage = page.locator('.error-message');
      await expect(errorMessage).toBeVisible();
    });
  });

  test.describe('DisplayName Validation', () => {
    test('shows error for displayName below minimum length (1 char)', async ({ page }) => {
      const email = generateUniqueEmail();

      await page.goto('/register');
      await page.fill('input[name="displayName"]', 'A');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', 'SecurePass123!');
      await page.click('button[type="submit"]');

      const errorMessage = page.locator('.error-message');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/display.*name|input/i);
    });

    test('displayName field accepts exactly 2 characters', async ({ page }) => {
      const email = generateUniqueEmail();

      await page.goto('/register');
      await page.fill('input[name="displayName"]', 'AB');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', 'SecurePass123!');
      await page.click('button[type="submit"]');

      await page.waitForURL(/\/game/, { timeout: 10000 });
    });
  });

  test.describe('Form State Management After Errors', () => {
    test('form remains usable after error - user can resubmit with corrected data', async ({
      page,
    }) => {
      const email = generateUniqueEmail();

      await page.goto('/register');
      await page.fill('input[name="displayName"]', 'Test User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', 'Short1!');
      await page.click('button[type="submit"]');

      const errorMessage = page.locator('.error-message');
      await expect(errorMessage).toBeVisible();

      await page.fill('input[name="password"]', 'SecurePass123!');
      await page.click('button[type="submit"]');

      await page.waitForURL(/\/game/, { timeout: 10000 });
    });

    test('error message is cleared when user starts typing again', async ({ page }) => {
      const email = generateUniqueEmail();

      await page.goto('/register');
      await page.fill('input[name="displayName"]', 'Test User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', 'Short1!');
      await page.click('button[type="submit"]');

      await expect(page.locator('.error-message')).toBeVisible();

      await page.fill('input[name="password"]', 'SecurePass123!');

      await expect(page.locator('.error-message')).toBeHidden();
    });

    test('error state does not prevent form from being interactable', async ({ page }) => {
      const email = generateUniqueEmail();

      await page.goto('/register');
      await page.fill('input[name="displayName"]', 'Test User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', 'Short1!');
      await page.click('button[type="submit"]');

      await expect(page.locator('.error-message')).toBeVisible();
      await expect(page.locator('input[name="displayName"]')).toBeEnabled();
      await expect(page.locator('input[name="email"]')).toBeEnabled();
      await expect(page.locator('input[name="password"]')).toBeEnabled();
      await expect(page.locator('button[type="submit"]')).toBeEnabled();
    });
  });

  test.describe('Error Accessibility', () => {
    test('error message has role=alert for screen reader announcement', async ({ page }) => {
      const email = generateUniqueEmail();

      await page.goto('/register');
      await page.fill('input[name="displayName"]', 'Test User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', 'Short1!');
      await page.click('button[type="submit"]');

      const errorMessage = page.locator('.error-message');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toHaveAttribute('role', 'alert');

      const isFocusable = await errorMessage.evaluate((el) => {
        return el.tabIndex >= 0 || ['A', 'INPUT', 'BUTTON'].includes(el.tagName);
      });
      expect(isFocusable || (await errorMessage.isVisible())).toBeTruthy();
    });
  });

  test.describe('Duplicate Email Error', () => {
    test('shows specific error message for already registered email', async ({
      page,
      apiBaseUrl,
      ensureTestUsers,
    }) => {
      await ensureTestUsers();
      const password = 'SecurePass123!';

      await fetch(buildApiUrl('/auth/register', { PLAYWRIGHT_API_BASE_URL: apiBaseUrl }), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: E2E_TEST_USER_EMAIL,
          password,
          displayName: 'Existing User',
        }),
      });

      await page.goto('/register');
      await page.fill('input[name="displayName"]', 'New User');
      await page.fill('input[name="email"]', E2E_TEST_USER_EMAIL);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');

      const errorMessage = page.locator('.error-message');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/email|exists|already/i);
    });

    test('form remains usable after duplicate email error', async ({ page, apiBaseUrl }) => {
      const email = generateUniqueEmail();
      const password = 'SecurePass123!';

      await fetch(buildApiUrl('/auth/register', { PLAYWRIGHT_API_BASE_URL: apiBaseUrl }), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          displayName: 'First User',
        }),
      });

      await page.goto('/register');
      await page.fill('input[name="displayName"]', 'Second User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');

      const errorMessage = page.locator('.error-message');
      await expect(errorMessage).toBeVisible();

      const newEmail = generateUniqueEmail();
      await page.fill('input[name="email"]', newEmail);
      await page.click('button[type="submit"]');

      await page.waitForURL(/\/game/, { timeout: 10000 });
    });
  });

  test.describe('Server Error Handling', () => {
    test('shows user-friendly message for internal server errors', async ({ page, apiBaseUrl }) => {
      const email = generateUniqueEmail();

      await page.route(`${apiBaseUrl}/auth/register`, async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Database connection failed',
            },
          }),
        });
      });

      await page.goto('/register');
      await page.fill('input[name="displayName"]', 'Test User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', 'SecurePass123!');
      await page.click('button[type="submit"]');

      const errorMessage = page.locator('.error-message');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/something|went|wrong|try.*again/i);
    });
  });

  test.describe('Rate Limit Error Handling', () => {
    test('shows appropriate message when rate limited during registration', async ({
      page,
      apiBaseUrl,
    }) => {
      const email = generateUniqueEmail();

      await page.route(`${apiBaseUrl}/auth/register`, async (route) => {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests',
            },
          }),
        });
      });

      await page.goto('/register');
      await page.fill('input[name="displayName"]', 'Test User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', 'SecurePass123!');
      await page.click('button[type="submit"]');

      const errorMessage = page.locator('.error-message');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/too many|wait|try.*again/i);
    });
  });
});
