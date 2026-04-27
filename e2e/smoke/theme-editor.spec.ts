import { promises as fs } from 'fs';

import { test as base, expect, type Page } from '@playwright/test';

const createThemeEditorTests = () => {
  const test = base;
  const cleanupCustomThemes = async (page: Page) => {
    await page.evaluate(async () => {
      const { indexedDB } = window;
      if (!indexedDB) return;
      const dbs = await indexedDB.databases();
      for (const dbInfo of dbs) {
        if (dbInfo.name && dbInfo.name.includes('theme')) {
          indexedDB.deleteDatabase(dbInfo.name);
        }
      }
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
  };

  test.describe('Theme Editor E2E Tests', () => {
    test.beforeEach(async ({ page, loginAsTestUser }) => {
      await loginAsTestUser();
      await page.goto('/settings/display');
      await page.waitForLoadState('networkidle');
    });

    test.afterEach(async ({ page }) => {
      await cleanupCustomThemes(page);
    });

    test.describe('Built-in Theme Selection', () => {
      test('displays all 4 built-in themes', async ({ page }) => {
        const builtInSection = page.locator('.theme-section').first();
        const themeItems = builtInSection.locator('.theme-item');
        await expect(themeItems).toHaveCount(4);
      });

      test('shows correct theme names for built-in themes', async ({ page }) => {
        const builtInSection = page.locator('.theme-section').first();
        await expect(builtInSection.locator('.theme-item__name').nth(0)).toContainText('Green');
        await expect(builtInSection.locator('.theme-item__name').nth(1)).toContainText('Amber');
        await expect(builtInSection.locator('.theme-item__name').nth(2)).toContainText(
          'High Contrast',
        );
        await expect(builtInSection.locator('.theme-item__name').nth(3)).toContainText(
          'Color-Blind Safe',
        );
      });

      test('clicking built-in theme shows it as active', async ({ page }) => {
        const builtInSection = page.locator('.theme-section').first();
        const amberTheme = builtInSection.locator('.theme-item').nth(1);
        await amberTheme.click();
        await expect(amberTheme).toHaveClass(/theme-item--active/);
      });

      test('selecting built-in theme shows theme details in main panel', async ({ page }) => {
        const builtInSection = page.locator('.theme-section').first();
        await builtInSection.locator('.theme-item').nth(0).click();
        await expect(page.locator('input[type="text"]').first()).toHaveValue('Green (Classic)');
      });

      test('built-in themes are not editable', async ({ page }) => {
        const builtInSection = page.locator('.theme-section').first();
        await builtInSection.locator('.theme-item').nth(0).click();
        await expect(page.locator('input[type="text"]').first()).toBeDisabled();
      });

      test('switching between built-in themes updates preview', async ({ page }) => {
        const builtInSection = page.locator('.theme-section').first();
        const highContrastTheme = builtInSection.locator('.theme-item').nth(2);
        await highContrastTheme.click();
        await expect(highContrastTheme).toHaveClass(/theme-item--active/);
        await expect(page.locator('input[type="text"]').first()).toHaveValue('High Contrast');
      });
    });

    test.describe('Custom Theme Creation', () => {
      test('shows Create New Theme button when no custom themes exist', async ({ page }) => {
        await expect(page.getByRole('button', { name: /create new theme/i })).toBeVisible();
      });

      test('clicking Create New Theme creates new custom theme', async ({ page }) => {
        await page.getByRole('button', { name: /create new theme/i }).click();
        await expect(page.locator('input[type="text"]').first()).toHaveValue('My Custom Theme');
      });

      test('custom theme name is editable', async ({ page }) => {
        await page.getByRole('button', { name: /create new theme/i }).click();
        const nameInput = page.locator('input[type="text"]').first();
        await nameInput.clear();
        await nameInput.fill('My Awesome Theme');
        await expect(nameInput).toHaveValue('My Awesome Theme');
      });

      test('newly created theme shows unsaved changes indicator', async ({ page }) => {
        await page.getByRole('button', { name: /create new theme/i }).click();
        await expect(page.locator('.theme-actions')).toBeVisible();
      });

      test('color pickers are visible and editable for custom themes', async ({ page }) => {
        await page.getByRole('button', { name: /create new theme/i }).click();
        const colorPickerInputs = page.locator('.color-input-wrapper input[type="color"]');
        await expect(colorPickerInputs.first()).toBeVisible();
        const textInput = page.locator('.color-input-wrapper .color-text').first();
        await expect(textInput).toBeVisible();
      });

      test('changing a color updates the text input', async ({ page }) => {
        await page.getByRole('button', { name: /create new theme/i }).click();
        const textInput = page.locator('.color-input-wrapper .color-text').first();
        await textInput.clear();
        await textInput.fill('#ffffff');
        await expect(textInput).toHaveValue('#ffffff');
      });
    });

    test.describe('WCAG Contrast Validation Display', () => {
      test('shows contrast validation section', async ({ page }) => {
        await page.locator('.theme-section').first().locator('.theme-item').first().click();
        await expect(page.getByText('Contrast Validation (WCAG 2.1 AA)')).toBeVisible();
      });

      test('displays contrast badges for primary, secondary, and accent text', async ({ page }) => {
        await page.locator('.theme-section').first().locator('.theme-item').first().click();
        const contrastBadges = page.locator('.contrast-badge');
        await expect(contrastBadges).toHaveCount(3);
      });

      test('shows contrast ratio for each text type', async ({ page }) => {
        await page.locator('.theme-section').first().locator('.theme-item').first().click();
        const contrastRatios = page.locator('.contrast-ratio');
        await expect(contrastRatios).toHaveCount(3);
        await expect(contrastRatios.first()).toContainText(':1');
      });

      test('high contrast theme shows AAA badges', async ({ page }) => {
        const builtInSection = page.locator('.theme-section').first();
        await builtInSection.locator('.theme-item').nth(2).click();
        const badges = page.locator('.contrast-badge');
        const firstBadge = badges.first();
        await expect(firstBadge).toContainText('AAA');
      });

      test('validation errors appear for invalid contrast', async ({ page }) => {
        await page.getByRole('button', { name: /create new theme/i }).click();
        const bgTextInput = page.locator('.color-input-wrapper .color-text').first();
        await bgTextInput.clear();
        await bgTextInput.fill('#ffffff');
        const textTextInput = page.locator('.color-input-wrapper .color-text').nth(2);
        await textTextInput.clear();
        await textTextInput.fill('#ffffff');
        const validationErrors = page.locator('.validation-errors');
        await expect(validationErrors).toBeVisible();
      });

      test('validation warnings appear for near-threshold contrast', async ({ page }) => {
        await page.getByRole('button', { name: /create new theme/i }).click();
        const bgTextInput = page.locator('.color-input-wrapper .color-text').first();
        await bgTextInput.clear();
        await bgTextInput.fill('#1a1a1a');
        const textTextInput = page.locator('.color-input-wrapper .color-text').nth(2);
        await textTextInput.clear();
        await textTextInput.fill('#767676');
        const validationWarnings = page.locator('.validation-warnings');
        await expect(validationWarnings).toBeVisible();
      });
    });

    test.describe('Color-Blind Simulation Modes', () => {
      test('shows color-blind simulation selector', async ({ page }) => {
        await page.locator('.theme-section').first().locator('.theme-item').first().click();
        await expect(page.getByText('Color-Blind Simulation')).toBeVisible();
      });

      test('has all 4 color-blind mode options', async ({ page }) => {
        await page.locator('.theme-section').first().locator('.theme-item').first().click();
        const options = page.locator('.color-blind-option');
        await expect(options).toHaveCount(4);
        await expect(
          page.locator('input[type="radio"][name="colorBlind"][value="none"]'),
        ).toBeChecked();
        await expect(
          page.locator('input[type="radio"][name="colorBlind"][value="protanopia"]'),
        ).toBeVisible();
        await expect(
          page.locator('input[type="radio"][name="colorBlind"][value="deuteranopia"]'),
        ).toBeVisible();
        await expect(
          page.locator('input[type="radio"][name="colorBlind"][value="tritanopia"]'),
        ).toBeVisible();
      });

      test('switching to protanopia mode updates contrast validation', async ({ page }) => {
        await page.locator('.theme-section').first().locator('.theme-item').first().click();
        const contrastRatiosBefore = await page.locator('.contrast-ratio').allTextContents();
        await page.locator('input[type="radio"][name="colorBlind"][value="protanopia"]').check();
        await expect(
          page.locator('input[type="radio"][name="colorBlind"][value="protanopia"]'),
        ).toBeChecked();
        await page.waitForFunction(
          () => {
            const ratios = document.querySelectorAll('.contrast-ratio');
            return ratios.length > 0;
          },
          { timeout: 2000 },
        );
        const contrastRatiosAfter = await page.locator('.contrast-ratio').allTextContents();
        expect(contrastRatiosAfter).not.toEqual(contrastRatiosBefore);
      });

      test('switching to deuteranopia mode updates contrast validation', async ({ page }) => {
        await page.locator('.theme-section').first().locator('.theme-item').first().click();
        const contrastRatiosBefore = await page.locator('.contrast-ratio').allTextContents();
        await page.locator('input[type="radio"][name="colorBlind"][value="deuteranopia"]').check();
        await expect(
          page.locator('input[type="radio"][name="colorBlind"][value="deuteranopia"]'),
        ).toBeChecked();
        await page.waitForFunction(
          () => {
            const ratios = document.querySelectorAll('.contrast-ratio');
            return ratios.length > 0;
          },
          { timeout: 2000 },
        );
        const contrastRatiosAfter = await page.locator('.contrast-ratio').allTextContents();
        expect(contrastRatiosAfter).not.toEqual(contrastRatiosBefore);
      });

      test('switching to tritanopia mode updates contrast validation', async ({ page }) => {
        await page.locator('.theme-section').first().locator('.theme-item').first().click();
        const contrastRatiosBefore = await page.locator('.contrast-ratio').allTextContents();
        await page.locator('input[type="radio"][name="colorBlind"][value="tritanopia"]').check();
        await expect(
          page.locator('input[type="radio"][name="colorBlind"][value="tritanopia"]'),
        ).toBeChecked();
        await page.waitForFunction(
          () => {
            const ratios = document.querySelectorAll('.contrast-ratio');
            return ratios.length > 0;
          },
          { timeout: 2000 },
        );
        const contrastRatiosAfter = await page.locator('.contrast-ratio').allTextContents();
        expect(contrastRatiosAfter).not.toEqual(contrastRatiosBefore);
      });

      test('none mode shows original colors', async ({ page }) => {
        await page.locator('.theme-section').first().locator('.theme-item').first().click();
        const contrastRatiosOriginal = await page.locator('.contrast-ratio').allTextContents();
        await page.locator('input[type="radio"][name="colorBlind"][value="protanopia"]').check();
        await page.waitForFunction(
          () => {
            const ratios = document.querySelectorAll('.contrast-ratio');
            return ratios.length > 0;
          },
          { timeout: 2000 },
        );
        await page.locator('input[type="radio"][name="colorBlind"][value="none"]').check();
        await expect(
          page.locator('input[type="radio"][name="colorBlind"][value="none"]'),
        ).toBeChecked();
        const contrastRatiosRestored = await page.locator('.contrast-ratio').allTextContents();
        expect(contrastRatiosRestored).toEqual(contrastRatiosOriginal);
      });
    });

    test.describe('Save and Delete Custom Themes', () => {
      test('shows save button for custom themes with valid colors', async ({ page }) => {
        await page.getByRole('button', { name: /create new theme/i }).click();
        await expect(page.getByRole('button', { name: /save theme/i })).toBeVisible();
      });

      test('shows override validation button for themes with errors', async ({ page }) => {
        await page.getByRole('button', { name: /create new theme/i }).click();
        const bgTextInput = page.locator('.color-input-wrapper .color-text').first();
        await bgTextInput.clear();
        await bgTextInput.fill('#ffffff');
        const textTextInput = page.locator('.color-input-wrapper .color-text').nth(2);
        await textTextInput.clear();
        await textTextInput.fill('#ffffff');
        await expect(
          page.getByRole('button', { name: /save \(override validation\)/i }),
        ).toBeVisible();
      });

      test('saving valid theme shows success message', async ({ page }) => {
        await page.getByRole('button', { name: /create new theme/i }).click();
        const nameInput = page.locator('input[type="text"]').first();
        await nameInput.clear();
        await nameInput.fill('Test Theme Valid');
        await page.getByRole('button', { name: /save theme/i }).click();
        await expect(page.locator('.success-message')).toContainText(/saved|success/i);
      });

      test('saved theme appears in My Themes section', async ({ page }) => {
        await page.getByRole('button', { name: /create new theme/i }).click();
        const nameInput = page.locator('input[type="text"]').first();
        await nameInput.clear();
        await nameInput.fill('My Saved Theme');
        await page.getByRole('button', { name: /save theme/i }).click();
        await page.waitForTimeout(500);
        const myThemesSection = page.locator('.theme-section').nth(1);
        await expect(myThemesSection.locator('.theme-item__name')).toContainText('My Saved Theme');
      });

      test('delete button removes custom theme', async ({ page }) => {
        await page.getByRole('button', { name: /create new theme/i }).click();
        const nameInput = page.locator('input[type="text"]').first();
        await nameInput.clear();
        await nameInput.fill('Theme To Delete');
        await page.getByRole('button', { name: /save theme/i }).click();
        await page.waitForTimeout(500);
        const myThemesSection = page.locator('.theme-section').nth(1);
        const deleteBtn = myThemesSection.locator('.delete-btn').first();
        await deleteBtn.click();
        await expect(myThemesSection.locator('.theme-item__name')).not.toContainText(
          'Theme To Delete',
        );
      });
    });

    test.describe('Theme Limit Enforcement', () => {
      test('shows theme count as 0/5 when no custom themes exist', async ({ page }) => {
        const myThemesSection = page.locator('.theme-section').nth(1);
        await expect(myThemesSection.locator('.theme-count')).toContainText('0/5');
      });

      test('creating 5 themes shows correct count', async ({ page }) => {
        for (let i = 1; i <= 5; i++) {
          await page.getByRole('button', { name: /create new theme/i }).click();
          const nameInput = page.locator('input[type="text"]').first();
          await nameInput.clear();
          await nameInput.fill(`Theme ${i}`);
          await page.getByRole('button', { name: /save theme/i }).click();
          await page.waitForTimeout(300);
        }
        const myThemesSection = page.locator('.theme-section').nth(1);
        await expect(myThemesSection.locator('.theme-count')).toContainText('5/5');
      });

      test('hides Create New Theme button when limit reached', async ({ page }) => {
        for (let i = 1; i <= 5; i++) {
          await page.getByRole('button', { name: /create new theme/i }).click();
          const nameInput = page.locator('input[type="text"]').first();
          await nameInput.clear();
          await nameInput.fill(`Theme ${i}`);
          await page.getByRole('button', { name: /save theme/i }).click();
          await page.waitForTimeout(300);
        }
        await expect(page.getByRole('button', { name: /create new theme/i })).not.toBeVisible();
        const myThemesSection = page.locator('.theme-section').nth(1);
        await expect(myThemesSection.locator('.theme-limit-message')).toContainText(
          'Maximum of 5 custom themes reached',
        );
      });

      test('after deleting a theme, Create New Theme button reappears', async ({ page }) => {
        for (let i = 1; i <= 5; i++) {
          await page.getByRole('button', { name: /create new theme/i }).click();
          const nameInput = page.locator('input[type="text"]').first();
          await nameInput.clear();
          await nameInput.fill(`Theme ${i}`);
          await page.getByRole('button', { name: /save theme/i }).click();
          await page.waitForTimeout(300);
        }
        const myThemesSection = page.locator('.theme-section').nth(1);
        await myThemesSection.locator('.delete-btn').first().click();
        await page.waitForTimeout(300);
        await expect(page.getByRole('button', { name: /create new theme/i })).toBeVisible();
      });
    });

    test.describe('Import/Export Functionality', () => {
      test('shows export button when theme is selected', async ({ page }) => {
        await page.locator('.theme-section').first().locator('.theme-item').first().click();
        await expect(page.getByRole('button', { name: /export theme/i })).toBeVisible();
      });

      test('export button is disabled when no theme is selected', async ({ page }) => {
        await expect(page.getByRole('button', { name: /export theme/i })).toBeDisabled();
      });

      test('shows import file input', async ({ page }) => {
        await expect(page.locator('input[type="file"]')).toBeVisible();
      });

      test('importing invalid JSON shows error', async ({ page }) => {
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
          name: 'invalid-theme.json',
          mimeType: 'application/json',
          buffer: Buffer.from('not valid json'),
        });
        await expect(page.locator('.error-message')).toBeVisible();
      });

      test('importing valid JSON theme appears in My Themes', async ({ page }) => {
        const validThemeJson = {
          metadata: {
            name: 'Imported Test Theme',
            author: 'test',
            createdAt: new Date().toISOString(),
            version: '1.0.0',
          },
          config: {
            id: `imported-theme-${Date.now()}`,
            name: 'Imported Test Theme',
            isBuiltIn: false,
            colors: {
              background: { primary: '#1a1a1a', secondary: '#2d2d2d' },
              text: { primary: '#00ff00', secondary: '#00cc00', accent: '#00dd00' },
              border: '#3d3d3d',
              highlight: '#4d4d4d',
              semantic: {
                error: '#ff0000',
                warning: '#ffff00',
                success: '#00ff00',
                info: '#0000ff',
              },
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        };
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
          name: 'valid-theme.json',
          mimeType: 'application/json',
          buffer: Buffer.from(JSON.stringify(validThemeJson)),
        });
        await page.waitForTimeout(500);
        const myThemesSection = page.locator('.theme-section').nth(1);
        await expect(myThemesSection.locator('.theme-item__name')).toContainText(
          'Imported Test Theme',
        );
      });

      test('exporting theme creates downloadable file with valid theme structure', async ({
        page,
      }) => {
        await page.locator('.theme-section').first().locator('.theme-item').first().click();
        const [download] = await Promise.all([
          page.waitForEvent('download'),
          page.getByRole('button', { name: /export theme/i }).click(),
        ]);
        expect(download.suggestedFilename()).toMatch(/\.json$/);
        const path = await download.path();
        const exportedContent = await fs.readFile(path, 'utf-8');
        const exportedTheme = JSON.parse(exportedContent);
        expect(exportedTheme).toHaveProperty('metadata');
        expect(exportedTheme).toHaveProperty('config');
        expect(exportedTheme.config).toHaveProperty('id');
        expect(exportedTheme.config).toHaveProperty('name');
        expect(exportedTheme.config).toHaveProperty('colors');
        expect(exportedTheme.config.colors).toHaveProperty('background');
        expect(exportedTheme.config.colors).toHaveProperty('text');
        expect(exportedTheme.config.colors).toHaveProperty('border');
        expect(exportedTheme.config.colors).toHaveProperty('highlight');
        expect(exportedTheme.config.colors).toHaveProperty('semantic');
      });
    });

    test.describe('Unsaved Changes Indicator', () => {
      test('no save buttons shown when no unsaved changes', async ({ page }) => {
        await page.locator('.theme-section').first().locator('.theme-item').first().click();
        await expect(page.locator('.theme-actions')).not.toBeVisible();
      });

      test('save button appears after editing theme name', async ({ page }) => {
        await page.getByRole('button', { name: /create new theme/i }).click();
        const nameInput = page.locator('input[type="text"]').first();
        await nameInput.clear();
        await nameInput.fill('Changed Name');
        await expect(page.getByRole('button', { name: /save theme/i })).toBeVisible();
      });

      test('save button appears after changing a color', async ({ page }) => {
        await page.getByRole('button', { name: /create new theme/i }).click();
        const textInput = page.locator('.color-input-wrapper .color-text').first();
        await textInput.clear();
        await textInput.fill('#abcdef');
        await expect(page.getByRole('button', { name: /save theme/i })).toBeVisible();
      });
    });

    test.describe('Live Preview', () => {
      test('shows live preview section', async ({ page }) => {
        await page.locator('.theme-section').first().locator('.theme-item').first().click();
        await expect(page.getByText('Live Preview')).toBeVisible();
      });

      test('preview updates when selecting different built-in theme', async ({ page }) => {
        const builtInSection = page.locator('.theme-section').first();
        await builtInSection.locator('.theme-item').first().click();
        const preview = page.locator('.theme-preview');
        await expect(preview).toBeVisible();
        const previewStylesBefore = await preview.getAttribute('style');
        await builtInSection.locator('.theme-item').nth(1).click();
        await page.waitForFunction(
          () => {
            const preview = document.querySelector('.theme-preview');
            return preview && preview.getAttribute('style') !== '';
          },
          { timeout: 2000 },
        );
        await expect(preview).toBeVisible();
        const previewStylesAfter = await preview.getAttribute('style');
        expect(previewStylesAfter).not.toEqual(previewStylesBefore);
      });
    });
  });
};

createThemeEditorTests();
