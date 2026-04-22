import { test as base, expect } from '@playwright/test';

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

const generateUniqueEmail = (): string =>
  `newuser_${Date.now()}_${Math.random().toFixed(6)}@dmz.test`;

test.describe('User Registration Flow', () => {
  test.describe('Valid Registration', () => {
    test('should redirect to /game after successful registration', async ({ page }) => {
      const email = generateUniqueEmail();
      const password = 'SecurePass123!';
      const displayName = 'Test User';

      await page.goto('/register');
      await page.fill('input[name="displayName"]', displayName);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');

      await page.waitForURL(/\/game/, { timeout: 10000 });
      expect(page.url()).toMatch(/\/game/);
    });

    test('should have game interface accessible after registration', async ({ page }) => {
      const email = generateUniqueEmail();
      const password = 'SecurePass123!';
      const displayName = 'Test User';

      await page.goto('/register');
      await page.fill('input[name="displayName"]', displayName);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');

      await page.waitForURL(/\/game/, { timeout: 10000 });
      await expect(page.getByRole('heading', { name: 'Operations Console' })).toBeVisible();
    });
  });

  test.describe('Registration with Invalid Password', () => {
    test('should show error for password below minimum length', async ({ page }) => {
      const email = generateUniqueEmail();
      const shortPassword = 'Short123!';

      await page.goto('/register');
      await page.fill('input[name="displayName"]', 'Test User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', shortPassword);
      await page.click('button[type="submit"]');

      const errorMessage = page.locator('.error-message');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/password|minimum|length/i);
    });

    test('should retain form field values on password error', async ({ page }) => {
      const email = generateUniqueEmail();

      await page.goto('/register');
      await page.fill('input[name="displayName"]', 'Test User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', 'Short123!');
      await page.click('button[type="submit"]');

      await expect(page.locator('input[name="displayName"]')).toHaveValue('Test User');
      await expect(page.locator('input[name="email"]')).toHaveValue(email);
    });
  });

  test.describe('Registration with Invalid Email', () => {
    test('should show error for invalid email format', async ({ page }) => {
      const invalidEmail = 'not-an-email';

      await page.goto('/register');
      await page.fill('input[name="displayName"]', 'Test User');
      await page.fill('input[name="email"]', invalidEmail);
      await page.fill('input[name="password"]', 'SecurePass123!');
      await page.click('button[type="submit"]');

      const errorMessage = page.locator('.error-message');
      await expect(errorMessage).toBeVisible();
    });
  });

  test.describe('Registration with Missing Fields', () => {
    test('should trigger browser-native validation for empty required fields', async ({ page }) => {
      await page.goto('/register');
      await page.click('button[type="submit"]');

      const displayNameInput = page.locator('input[name="displayName"]');
      await expect(displayNameInput).checkValidity({ timeout: 5000 });
    });

    test('should not navigate away when required fields are empty', async ({ page }) => {
      await page.goto('/register');
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(/\/register/);
    });
  });

  test.describe('Registration with Duplicate Email', () => {
    test('should show error when email already exists', async ({ page, apiBaseUrl }) => {
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
    });

    test('should allow registration with same displayName but different email', async ({
      page,
    }) => {
      const email1 = generateUniqueEmail();
      const email2 = generateUniqueEmail();
      const password = 'SecurePass123!';
      const displayName = 'Same Display Name';

      await page.goto('/register');
      await page.fill('input[name="displayName"]', displayName);
      await page.fill('input[name="email"]', email1);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/game/, { timeout: 10000 });

      await page.request.delete(
        buildApiUrl('/auth/logout', { PLAYWRIGHT_API_BASE_URL: 'http://127.0.0.1:3001' }),
      );

      await page.goto('/register');
      await page.fill('input[name="displayName"]', displayName);
      await page.fill('input[name="email"]', email2);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/game/, { timeout: 10000 });
    });
  });

  test.describe('Registration with Password Boundary Conditions', () => {
    test('should accept valid password with special characters', async ({ page }) => {
      const email = generateUniqueEmail();
      const password = 'P@ssw0rd!23!';

      await page.goto('/register');
      await page.fill('input[name="displayName"]', 'Test User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');

      await page.waitForURL(/\/game/, { timeout: 10000 });
    });

    test('should accept password at minimum length boundary (12 chars)', async ({ page }) => {
      const email = generateUniqueEmail();
      const password = 'Abcd12345678!';

      await page.goto('/register');
      await page.fill('input[name="displayName"]', 'Test User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');

      await page.waitForURL(/\/game/, { timeout: 10000 });
    });

    test('should show error for password exceeding maximum length', async ({ page }) => {
      const email = generateUniqueEmail();
      const password = 'A'.repeat(129);

      await page.goto('/register');
      await page.fill('input[name="displayName"]', 'Test User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');

      const errorMessage = page.locator('.error-message');
      await expect(errorMessage).toBeVisible();
    });
  });

  test.describe('Registration with DisplayName Boundary Conditions', () => {
    test('should accept displayName at minimum length boundary (2 chars)', async ({ page }) => {
      const email = generateUniqueEmail();
      const password = 'SecurePass123!';

      await page.goto('/register');
      await page.fill('input[name="displayName"]', 'AB');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');

      await page.waitForURL(/\/game/, { timeout: 10000 });
    });

    test('should accept displayName at maximum length boundary (64 chars)', async ({ page }) => {
      const email = generateUniqueEmail();
      const password = 'SecurePass123!';
      const displayName = 'A'.repeat(64);

      await page.goto('/register');
      await page.fill('input[name="displayName"]', displayName);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');

      await page.waitForURL(/\/game/, { timeout: 10000 });
    });

    test('should show error for displayName exceeding maximum length', async ({ page }) => {
      const email = generateUniqueEmail();
      const password = 'SecurePass123!';
      const displayName = 'A'.repeat(65);

      await page.goto('/register');
      await page.fill('input[name="displayName"]', displayName);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');

      const errorMessage = page.locator('.error-message');
      await expect(errorMessage).toBeVisible();
    });
  });

  test.describe('Full Registration Lifecycle', () => {
    test('should allow registering, logging out, and logging back in with same credentials', async ({
      page,
      apiBaseUrl,
    }) => {
      const email = generateUniqueEmail();
      const password = 'SecurePass123!';
      const displayName = 'Lifecycle User';

      await page.goto('/register');
      await page.fill('input[name="displayName"]', displayName);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/game/, { timeout: 10000 });

      await page.request.delete(
        buildApiUrl('/auth/logout', { PLAYWRIGHT_API_BASE_URL: apiBaseUrl }),
      );

      await page.goto('/login');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/game/, { timeout: 10000 });
    });
  });

  test.describe('Registration Page Accessibility', () => {
    test('registration form is accessible', async ({ page }) => {
      await page.goto('/register');

      await expect(page.locator('input[name="displayName"]')).toBeVisible();
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('error messages have proper ARIA attributes', async ({ page }) => {
      const email = generateUniqueEmail();

      await page.goto('/register');
      await page.fill('input[name="displayName"]', 'Test User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', 'Short123!');
      await page.click('button[type="submit"]');

      const errorMessage = page.locator('.error-message');
      await expect(errorMessage).toHaveAttribute('role', 'alert');
    });
  });

  test.describe('Registration Form Behavior', () => {
    test('form inputs are disabled during submission', async ({ page }) => {
      const email = generateUniqueEmail();

      await page.goto('/register');
      await page.fill('input[name="displayName"]', 'Test User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', 'SecurePass123!');

      const submitPromise = page.click('button[type="submit"]');
      await page.waitForTimeout(100);

      await expect(page.locator('input[name="displayName"]')).toBeDisabled();
      await expect(page.locator('input[name="email"]')).toBeDisabled();
      await expect(page.locator('input[name="password"]')).toBeDisabled();

      await submitPromise;
    });

    test('back to login button navigates to login page', async ({ page }) => {
      await page.goto('/register');
      await page.click('button:has-text("Back to Login")');

      await expect(page).toHaveURL(/\/login/);
    });
  });
});
