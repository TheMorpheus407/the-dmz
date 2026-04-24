import { test as base, expect } from '../fixtures/auth';

const test = base;

test.describe('Compliance Dashboard', () => {
  test.beforeEach(async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/admin/compliance');
  });

  test.describe('Dashboard Page', () => {
    test('should load compliance dashboard when navigating to /admin/compliance', async ({
      page,
    }) => {
      await expect(page.getByRole('heading', { name: 'Compliance Dashboard' })).toBeVisible();
      await expect(page.getByText('Track regulatory framework compliance status')).toBeVisible();
    });

    test('should display summary cards with counts', async ({ page }) => {
      await expect(page.locator('.summary-card.compliant')).toBeVisible();
      await expect(page.locator('.summary-card.in-progress')).toBeVisible();
      await expect(page.locator('.summary-card.non-compliant')).toBeVisible();
      await expect(page.locator('.summary-card.not-started')).toBeVisible();

      await expect(page.locator('.summary-card.compliant .summary-value')).toBeVisible();
      await expect(page.locator('.summary-card.in-progress .summary-value')).toBeVisible();
      await expect(page.locator('.summary-card.non-compliant .summary-value')).toBeVisible();
      await expect(page.locator('.summary-card.not-started .summary-value')).toBeVisible();

      await expect(page.locator('.summary-card.compliant .summary-label')).toHaveText('Compliant');
      await expect(page.locator('.summary-card.in-progress .summary-label')).toHaveText(
        'In Progress',
      );
      await expect(page.locator('.summary-card.non-compliant .summary-label')).toHaveText(
        'Non-Compliant',
      );
      await expect(page.locator('.summary-card.not-started .summary-label')).toHaveText(
        'Not Started',
      );
    });

    test('should display framework list section', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Regulatory Frameworks' })).toBeVisible();
      await expect(page.locator('.framework-list')).toBeVisible();
    });

    test('should display empty state before calculating compliance', async ({ page }) => {
      await expect(
        page.locator('.empty-state:has-text("No compliance data available")'),
      ).toBeVisible();
      await expect(page.locator('.empty-hint:has-text("Calculate Compliance")')).toBeVisible();
    });

    test('should display framework cards with completion bars when data exists', async ({
      page,
    }) => {
      const calculateButton = page.locator('button:has-text("Calculate Compliance")');
      await calculateButton.click();

      await expect(page.locator('.framework-card').first()).toBeVisible({ timeout: 15000 });
      await expect(page.locator('.framework-card .completion-bar').first()).toBeVisible();
      await expect(page.locator('.framework-card .completion-fill').first()).toBeVisible();
    });

    test('should show loading state while calculating compliance', async ({ page }) => {
      const calculateButton = page.locator('button:has-text("Calculate Compliance")');
      await calculateButton.click();

      await expect(page.locator('button:has-text("Calculating...")')).toBeVisible({ timeout: 100 });
      await expect(calculateButton).toBeDisabled();
    });

    test('should update results after Calculate Compliance completes', async ({ page }) => {
      const calculateButton = page.locator('button:has-text("Calculate Compliance")');
      await calculateButton.click();

      await expect(page.locator('button:has-text("Calculating...")')).not.toBeVisible({
        timeout: 15000,
      });
      await expect(calculateButton).toHaveText('Calculate Compliance');
      await expect(calculateButton).toBeEnabled();
    });

    test('should display framework cards when compliance data exists', async ({ page }) => {
      const frameworkCards = await page.locator('.framework-card').count();
      expect(frameworkCards).toBeGreaterThan(0);
      await expect(page.locator('.framework-card').first()).toBeVisible();
    });

    test('should display Historical Trends section with trend options', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Historical Trends' })).toBeVisible();
      await expect(page.locator('.trend-options')).toBeVisible();
      await expect(page.locator('.trend-button:has-text("Last 30 Days")')).toBeVisible();
      await expect(page.locator('.trend-button:has-text("Last 90 Days")')).toBeVisible();
      await expect(page.locator('.trend-button:has-text("Last 365 Days")')).toBeVisible();
      await expect(page.locator('.trend-button.active')).toHaveText('Last 365 Days');
    });

    test('should display Historical Trends empty state message', async ({ page }) => {
      await expect(
        page.getByText(
          'Historical trend data will be available after multiple compliance calculations',
        ),
      ).toBeVisible();
    });

    test('should display framework count when frameworks exist', async ({ page }) => {
      const calculateButton = page.locator('button:has-text("Calculate Compliance")');
      await calculateButton.click();

      await expect(page.locator('.framework-count')).toBeVisible({ timeout: 15000 });
      const countText = await page.locator('.framework-count').textContent();
      expect(countText).toMatch(/\d+ frameworks?/);
    });
  });

  test.describe('Framework Detail Page', () => {
    test('should navigate to framework detail when clicking a framework card', async ({ page }) => {
      const calculateButton = page.locator('button:has-text("Calculate Compliance")');
      await calculateButton.click();

      const firstFrameworkCard = page.locator('.framework-card').first();
      await expect(firstFrameworkCard).toBeVisible({ timeout: 15000 });
      await firstFrameworkCard.click();

      await expect(page.locator('.back-link')).toBeVisible();
      await expect(page.locator('.compliance-detail')).toBeVisible();
    });

    test('should display framework detail page with requirements list', async ({ page }) => {
      await page.goto('/admin/compliance/gdpr');

      await expect(page.locator('.back-link')).toBeVisible();
      await expect(page.locator('.back-link')).toHaveText('← Back to Compliance');
      await expect(page.getByRole('heading', { name: 'GDPR' })).toBeVisible();
      await expect(page.locator('.requirements-list')).toBeVisible();
    });

    test('should display status overview on framework detail page', async ({ page }) => {
      await page.goto('/admin/compliance/gdpr');

      await expect(page.locator('.status-circle')).toBeVisible();
      await expect(page.locator('.status-percentage')).toBeVisible();
      await expect(page.locator('.requirements-summary')).toBeVisible();
    });

    test('should show Recalculate button on framework detail page', async ({ page }) => {
      await page.goto('/admin/compliance/gdpr');

      const recalculateButton = page.locator('button:has-text("Recalculate")');
      await expect(recalculateButton).toBeVisible();
    });

    test('should show loading state while recalculating', async ({ page }) => {
      await page.goto('/admin/compliance/gdpr');

      const recalculateButton = page.locator('button:has-text("Recalculate")');
      await recalculateButton.click();

      await expect(page.locator('button:has-text("Calculating...")')).toBeVisible({ timeout: 100 });
      await expect(recalculateButton).toBeDisabled();
    });

    test('should update results after Recalculate completes', async ({ page }) => {
      await page.goto('/admin/compliance/gdpr');

      const recalculateButton = page.locator('button:has-text("Recalculate")');
      await recalculateButton.click();

      await expect(page.locator('button:has-text("Calculating...")')).not.toBeVisible({
        timeout: 15000,
      });
      await expect(recalculateButton).toHaveText('Recalculate');
      await expect(recalculateButton).toBeEnabled();
    });

    test('should navigate back to compliance dashboard when clicking back link', async ({
      page,
    }) => {
      await page.goto('/admin/compliance/gdpr');

      await page.locator('.back-link').click();

      await expect(page).toHaveURL('/admin/compliance');
      await expect(page.getByRole('heading', { name: 'Compliance Dashboard' })).toBeVisible();
    });

    test('should display requirement cards with completion bars when requirements exist', async ({
      page,
    }) => {
      await page.goto('/admin/compliance/gdpr');

      const recalculateButton = page.locator('button:has-text("Recalculate")');
      await recalculateButton.click();

      await expect(page.locator('.requirement-card').first()).toBeVisible({ timeout: 15000 });
      await expect(page.locator('.requirement-card .completion-bar').first()).toBeVisible();
    });

    test('should display Historical Trends section on framework detail page', async ({ page }) => {
      await page.goto('/admin/compliance/gdpr');

      await expect(page.getByRole('heading', { name: 'Historical Trends' })).toBeVisible();
      await expect(page.locator('.trend-options')).toBeVisible();
      await expect(page.locator('.trend-button:has-text("Last 30 Days")')).toBeVisible();
      await expect(page.locator('.trend-button:has-text("Last 90 Days")')).toBeVisible();
      await expect(page.locator('.trend-button:has-text("Last 365 Days")')).toBeVisible();
      await expect(page.locator('.trend-button.active')).toHaveText('Last 365 Days');
      await expect(
        page.getByText(
          'Historical trend data will be available after multiple compliance calculations',
        ),
      ).toBeVisible();
    });

    test('should display framework description on detail page', async ({ page }) => {
      await page.goto('/admin/compliance/gdpr');

      await expect(page.locator('.framework-description')).toBeVisible();
      const description = await page.locator('.framework-description').textContent();
      expect(description?.length).toBeGreaterThan(0);
    });

    test('should display status details with dates on framework detail page', async ({ page }) => {
      await page.goto('/admin/compliance/gdpr');

      await expect(page.locator('.detail-label:has-text("Last Assessed")')).toBeVisible();
      await expect(page.locator('.detail-label:has-text("Next Assessment Due")')).toBeVisible();
      await expect(page.locator('.detail-value').first()).toBeVisible();
    });

    test('should display requirement count on framework detail page', async ({ page }) => {
      await page.goto('/admin/compliance/gdpr');

      await expect(page.locator('.requirement-count')).toBeVisible();
      const countText = await page.locator('.requirement-count').textContent();
      expect(countText).toMatch(/\d+ total/);
    });

    test('should display requirement details when requirements exist', async ({ page }) => {
      await page.goto('/admin/compliance/gdpr');

      const recalculateButton = page.locator('button:has-text("Recalculate")');
      await recalculateButton.click();

      await expect(page.locator('.requirement-card').first()).toBeVisible({ timeout: 15000 });
      await expect(page.locator('.requirement-name').first()).toBeVisible();
      await expect(page.locator('.requirement-card .completion-percentage').first()).toBeVisible();
    });

    test('should display requirements count on framework cards', async ({ page }) => {
      const calculateButton = page.locator('button:has-text("Calculate Compliance")');
      await calculateButton.click();

      await expect(page.locator('.framework-card').first()).toBeVisible({ timeout: 15000 });
      await expect(page.locator('.requirements-count').first()).toBeVisible();
      const requirementsText = await page.locator('.requirements-count').first().textContent();
      expect(requirementsText).toMatch(/\d+\/\d+ requirements/);
    });

    test('should display framework ID on framework cards', async ({ page }) => {
      const calculateButton = page.locator('button:has-text("Calculate Compliance")');
      await calculateButton.click();

      await expect(page.locator('.framework-card').first()).toBeVisible({ timeout: 15000 });
      await expect(page.locator('.framework-id').first()).toBeVisible();
    });

    test('should display requirement meta information when present', async ({ page }) => {
      await page.goto('/admin/compliance/gdpr');

      const recalculateButton = page.locator('button:has-text("Recalculate")');
      await recalculateButton.click();

      await expect(page.locator('.requirement-card').first()).toBeVisible({ timeout: 15000 });
      await expect(page.locator('.requirement-meta').first()).toBeVisible();
      await expect(page.locator('.min-score').first()).toBeVisible();
    });

    test('should display requirement status badges on framework detail', async ({ page }) => {
      await page.goto('/admin/compliance/gdpr');

      const recalculateButton = page.locator('button:has-text("Recalculate")');
      await recalculateButton.click();

      await expect(page.locator('.requirement-card').first()).toBeVisible({ timeout: 15000 });
      await expect(page.locator('.requirement-card .badge').first()).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to compliance dashboard from admin nav', async ({ page }) => {
      await page.goto('/admin');

      const complianceNavItem = page.locator('a[href="/admin/compliance"]');
      await complianceNavItem.click();

      await expect(page).toHaveURL('/admin/compliance');
      await expect(page.getByRole('heading', { name: 'Compliance Dashboard' })).toBeVisible();
    });

    test('should preserve framework parameter in URL', async ({ page }) => {
      const calculateButton = page.locator('button:has-text("Calculate Compliance")');
      await calculateButton.click();

      const firstFrameworkCard = page.locator('.framework-card').first();
      await expect(firstFrameworkCard).toBeVisible({ timeout: 15000 });
      const href = await firstFrameworkCard.getAttribute('href');
      expect(href).toMatch(/^\/admin\/compliance\/.+/);
    });
  });
});
