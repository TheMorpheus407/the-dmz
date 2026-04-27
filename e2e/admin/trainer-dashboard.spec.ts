import { test as base, expect } from '../fixtures/auth';

const test = base;

test.describe('Trainer Dashboard', () => {
  test.beforeEach(async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/admin/trainer');
  });

  test.describe('Dashboard Page', () => {
    test('should load trainer dashboard when navigating to /admin/trainer', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Trainer Dashboard' })).toBeVisible();
    });

    test('should display 4 summary cards', async ({ page }) => {
      const summaryCards = page.locator('.summary-card');
      await expect(summaryCards).toHaveCount(4);
    });

    test('should display summary card with Total Learners label', async ({ page }) => {
      await expect(
        page.locator('.summary-card .summary-label:has-text("Total Learners")'),
      ).toBeVisible();
      await expect(page.locator('.summary-card .summary-value').first()).toBeVisible();
    });

    test('should display summary card with Average Score label', async ({ page }) => {
      await expect(
        page.locator('.summary-card .summary-label:has-text("Average Score")'),
      ).toBeVisible();
    });

    test('should display summary card with Competency Domains label', async ({ page }) => {
      await expect(
        page.locator('.summary-card .summary-label:has-text("Competency Domains")'),
      ).toBeVisible();
    });

    test('should display summary card with Error Patterns label', async ({ page }) => {
      await expect(
        page.locator('.summary-card .summary-label:has-text("Error Patterns")'),
      ).toBeVisible();
    });

    test('should display competency distribution section heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Competency Distribution' })).toBeVisible();
    });

    test('should display competency grid', async ({ page }) => {
      await expect(page.locator('.competency-grid')).toBeVisible();
    });

    test('should display competency cards when data exists', async ({ page }) => {
      const competencyCards = page.locator('.competency-card');
      await expect(competencyCards.first()).toBeVisible({ timeout: 15000 });
    });

    test('should display competency card with domain label', async ({ page }) => {
      await expect(page.locator('.competency-card .competency-domain').first()).toBeVisible();
    });

    test('should display competency card with score value', async ({ page }) => {
      await expect(page.locator('.competency-card .competency-score').first()).toBeVisible();
    });

    test('should display competency card with learner count', async ({ page }) => {
      await expect(page.locator('.competency-card .competency-meta').first()).toBeVisible();
    });

    test('should display competency card with distribution bar', async ({ page }) => {
      await expect(page.locator('.competency-card .distribution-bar').first()).toBeVisible();
    });

    test('should display distribution segments in distribution bar', async ({ page }) => {
      const distributionBar = page.locator('.competency-card .distribution-bar').first();
      await expect(distributionBar.locator('.distribution-segment')).toHaveCount(4);
    });
  });

  test.describe('Competency Card Interaction', () => {
    test('should expand learner drill-down when competency card is clicked', async ({ page }) => {
      const competencyCard = page.locator('.competency-card').first();
      await competencyCard.click();

      await expect(page.locator('.learner-drilldown')).toBeVisible({ timeout: 15000 });
    });

    test('should mark selected competency card as selected', async ({ page }) => {
      const competencyCard = page.locator('.competency-card').first();
      await competencyCard.click();

      await expect(competencyCard).toHaveClass(/selected/);
    });

    test('should close learner drill-down when same card is clicked again', async ({ page }) => {
      const competencyCard = page.locator('.competency-card').first();
      await competencyCard.click();

      await expect(page.locator('.learner-drilldown')).toBeVisible({ timeout: 15000 });

      await competencyCard.click();

      await expect(page.locator('.learner-drilldown')).not.toBeVisible();
    });
  });

  test.describe('Learner Drill-down', () => {
    test.beforeEach(async ({ page }) => {
      const competencyCard = page.locator('.competency-card').first();
      await competencyCard.click();
      await expect(page.locator('.learner-drilldown')).toBeVisible({ timeout: 15000 });
    });

    test('should display learner list in drill-down', async ({ page }) => {
      await expect(page.locator('.learner-drilldown .learner-list')).toBeVisible();
    });

    test('should display learner items with name', async ({ page }) => {
      const learnerItems = page.locator('.learner-item');
      if ((await learnerItems.count()) > 0) {
        await expect(learnerItems.first().locator('.learner-name')).toBeVisible();
      }
    });

    test('should display learner items with email', async ({ page }) => {
      const learnerItems = page.locator('.learner-item');
      if ((await learnerItems.count()) > 0) {
        await expect(learnerItems.first().locator('.learner-email')).toBeVisible();
      }
    });

    test('should display learner items with score', async ({ page }) => {
      const learnerItems = page.locator('.learner-item');
      if ((await learnerItems.count()) > 0) {
        await expect(learnerItems.first().locator('.learner-score')).toBeVisible();
      }
    });

    test('should display export CSV button when learners exist', async ({ page }) => {
      const learnerItems = page.locator('.learner-item');
      if ((await learnerItems.count()) > 0) {
        await expect(page.locator('.export-button:has-text("Export CSV")')).toBeVisible();
      }
    });

    test('should display close button in learner drill-down', async ({ page }) => {
      await expect(page.locator('.close-button:has-text("Close")')).toBeVisible();
    });

    test('should close drill-down when close button is clicked', async ({ page }) => {
      await page.locator('.close-button:has-text("Close")').click();

      await expect(page.locator('.learner-drilldown')).not.toBeVisible();
    });
  });

  test.describe('CSV Export', () => {
    test('should initiate CSV download when export button is clicked', async ({ page }) => {
      const competencyCard = page.locator('.competency-card').first();
      await competencyCard.click();

      const learnerDrilldown = page.locator('.learner-drilldown');
      await expect(learnerDrilldown).toBeVisible({ timeout: 15000 });

      const learnerItems = page.locator('.learner-item');
      if ((await learnerItems.count()) > 0) {
        const downloadPromise = page.waitForEvent('download');
        await page.locator('.export-button:has-text("Export CSV")').click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/learners.*\.csv/);
      }
    });
  });

  test.describe('Error Patterns', () => {
    test('should display error patterns section heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Common Error Patterns' })).toBeVisible();
    });

    test('should display error list or empty state', async ({ page }) => {
      const errorList = page.locator('.error-list');
      const emptyState = page.locator('.error-patterns .empty-state');
      const isErrorListVisible = await errorList.isVisible().catch(() => false);
      const isEmptyStateVisible = await emptyState.isVisible().catch(() => false);
      expect(isErrorListVisible || isEmptyStateVisible).toBeTruthy();
    });

    test('should display error items with pattern text when errors exist', async ({ page }) => {
      const errorItems = page.locator('.error-item');
      const count = await errorItems.count();
      if (count > 0) {
        await expect(errorItems.first().locator('.error-pattern')).toBeVisible();
      }
    });

    test('should display error items with domain label when errors exist', async ({ page }) => {
      const errorItems = page.locator('.error-item');
      const count = await errorItems.count();
      if (count > 0) {
        await expect(errorItems.first().locator('.error-domain')).toBeVisible();
      }
    });

    test('should display error items with count when errors exist', async ({ page }) => {
      const errorItems = page.locator('.error-item');
      const count = await errorItems.count();
      if (count > 0) {
        await expect(errorItems.first().locator('.error-count .count-value')).toBeVisible();
      }
    });
  });

  test.describe('Campaigns', () => {
    test('should display campaign completion section heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Campaign Completion' })).toBeVisible();
    });

    test('should display campaign list or empty state', async ({ page }) => {
      const campaignList = page.locator('.campaign-list');
      const emptyState = page.locator('.campaigns .empty-state');
      const isCampaignListVisible = await campaignList.isVisible().catch(() => false);
      const isEmptyStateVisible = await emptyState.isVisible().catch(() => false);
      expect(isCampaignListVisible || isEmptyStateVisible).toBeTruthy();
    });

    test('should display campaign items with name when campaigns exist', async ({ page }) => {
      const campaignItems = page.locator('.campaign-item');
      const count = await campaignItems.count();
      if (count > 0) {
        await expect(campaignItems.first().locator('.campaign-name')).toBeVisible();
      }
    });

    test('should display campaign items with progress when campaigns exist', async ({ page }) => {
      const campaignItems = page.locator('.campaign-item');
      const count = await campaignItems.count();
      if (count > 0) {
        await expect(campaignItems.first().locator('.campaign-progress')).toBeVisible();
      }
    });

    test('should display campaign items with completion rate when campaigns exist', async ({
      page,
    }) => {
      const campaignItems = page.locator('.campaign-item');
      const count = await campaignItems.count();
      if (count > 0) {
        await expect(campaignItems.first().locator('.rate-value')).toBeVisible();
      }
    });

    test('should display campaign items with rate bar when campaigns exist', async ({ page }) => {
      const campaignItems = page.locator('.campaign-item');
      const count = await campaignItems.count();
      if (count > 0) {
        await expect(campaignItems.first().locator('.rate-bar')).toBeVisible();
      }
    });

    test('should display rate fill element in rate bar when campaigns exist', async ({ page }) => {
      const campaignItems = page.locator('.campaign-item');
      const count = await campaignItems.count();
      if (count > 0) {
        await expect(campaignItems.first().locator('.rate-fill')).toBeVisible();
      }
    });
  });

  test.describe('Empty States', () => {
    test('should display empty state for error patterns when no errors exist', async ({ page }) => {
      const errorList = page.locator('.error-list');
      const emptyState = page.locator('.error-patterns .empty-state');
      const isErrorListVisible = await errorList.isVisible().catch(() => false);
      if (!isErrorListVisible) {
        await expect(emptyState).toBeVisible();
      }
    });

    test('should display empty state for campaigns when no campaigns exist', async ({ page }) => {
      const campaignList = page.locator('.campaign-list');
      const emptyState = page.locator('.campaigns .empty-state');
      const isCampaignListVisible = await campaignList.isVisible().catch(() => false);
      if (!isCampaignListVisible) {
        await expect(emptyState).toBeVisible();
      }
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to trainer dashboard from admin nav', async ({ page }) => {
      await page.goto('/admin');

      const trainerNavItem = page.locator('a[href="/admin/trainer"]');
      await trainerNavItem.click();

      await expect(page).toHaveURL('/admin/trainer');
      await expect(page.getByRole('heading', { name: 'Trainer Dashboard' })).toBeVisible();
    });
  });
});
