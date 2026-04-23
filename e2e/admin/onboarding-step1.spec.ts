import { test as base, expect } from '../fixtures/auth';

import { generateUniqueDomain } from './onboarding-helpers';

const test = base;

test.describe('Enterprise Onboarding Wizard - Step 1: Organization Profile', () => {
  test.beforeEach(async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/admin/onboarding');
  });

  test('should load step 1 (Organization Profile) when navigating to /admin/onboarding', async ({
    page,
    loginAsAdmin,
  }) => {
    await loginAsAdmin();
    await page.goto('/admin/onboarding');

    await expect(page.getByRole('heading', { name: 'Enterprise Onboarding Wizard' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Organization Profile' })).toBeVisible();
    await expect(page.locator('#org-name')).toBeVisible();
    await expect(page.locator('#org-domain')).toBeVisible();
    await expect(page.locator('#org-industry')).toBeVisible();
    await expect(page.locator('#org-size')).toBeVisible();
  });

  test('should show validation error when required fields are empty', async ({
    page,
    loginAsAdmin,
  }) => {
    await loginAsAdmin();
    await page.goto('/admin/onboarding');

    await page.click('button[type="submit"]');

    const orgNameInput = page.locator('#org-name');
    await expect(orgNameInput).toBeInvalid();
  });

  test('should show validation error when org-domain is empty', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/admin/onboarding');

    await page.fill('#org-name', 'Test Organization');
    await page.click('button[type="submit"]');

    const orgDomainInput = page.locator('#org-domain');
    await expect(orgDomainInput).toBeInvalid();
  });

  test('should show validation error when org-industry is not selected', async ({
    page,
    loginAsAdmin,
  }) => {
    await loginAsAdmin();
    await page.goto('/admin/onboarding');

    await page.fill('#org-name', 'Test Organization');
    await page.fill('#org-domain', 'example.com');
    await page.click('button[type="submit"]');

    const orgIndustrySelect = page.locator('#org-industry');
    await expect(orgIndustrySelect).toBeInvalid();
  });

  test('should show validation error when org-size is not selected', async ({
    page,
    loginAsAdmin,
  }) => {
    await loginAsAdmin();
    await page.goto('/admin/onboarding');

    await page.fill('#org-name', 'Test Organization');
    await page.fill('#org-domain', 'example.com');
    await page.selectOption('#org-industry', 'Technology');
    await page.click('button[type="submit"]');

    const orgSizeSelect = page.locator('#org-size');
    await expect(orgSizeSelect).toBeInvalid();
  });

  test('should navigate to step 2 after filling org profile and clicking Save & Continue', async ({
    page,
    loginAsAdmin,
  }) => {
    await loginAsAdmin();
    await page.goto('/admin/onboarding');

    await page.fill('#org-name', 'Test Organization');
    await page.fill('#org-domain', generateUniqueDomain());
    await page.selectOption('#org-industry', 'Technology');
    await page.selectOption('#org-size', '201-500');
    await page.click('button[type="submit"]');

    await expect(
      page.getByRole('heading', { name: 'Identity Provider Configuration' }),
    ).toBeVisible({
      timeout: 10000,
    });
  });
});
