<script lang="ts">
  import Panel from '$lib/ui/components/Panel.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import type { ThemeConfig, ThemeColors, ColorBlindMode } from '@the-dmz/shared/types';
  import {
    BUILT_IN_THEMES,
    DEFAULT_THEME_COLORS,
    exportThemeAsJson,
    importThemeFromJson,
  } from '$lib/themes/index';
  import {
    getCustomThemes,
    saveCustomTheme,
    deleteCustomTheme,
    canAddMoreThemes,
  } from '$lib/themes/storage';
  import { validateThemeColors, applyColorBlindSimulation } from '$lib/themes/validation';
  import { themeStore } from '$lib/stores/theme';

  import { browser } from '$app/environment';

  let customThemes = $state<ThemeConfig[]>([]);
  let editingTheme = $state<ThemeConfig | null>(null);
  let hasUnsavedChanges = $state(false);
  let canAddTheme = $state(true);
  let validationResult = $state(validateThemeColors(DEFAULT_THEME_COLORS));
  let showColorBlindSim = $state<ColorBlindMode>('none');
  let importError = $state('');
  let saveError = $state('');
  let saveSuccess = $state(false);

  if (browser) {
    void loadThemes();
  }

  async function loadThemes() {
    customThemes = await getCustomThemes();
    canAddTheme = await canAddMoreThemes();
  }

  function createNewTheme() {
    const now = new Date().toISOString();
    editingTheme = {
      id: `custom-${Date.now()}`,
      name: 'My Custom Theme',
      isBuiltIn: false,
      colors: { ...DEFAULT_THEME_COLORS },
      createdAt: now,
      updatedAt: now,
    };
    hasUnsavedChanges = true;
    validateCurrentTheme();
  }

  function selectTheme(themeId: string) {
    const builtIn = BUILT_IN_THEMES.find((t) => t.id === themeId);
    if (builtIn) {
      editingTheme = {
        id: builtIn.id,
        name: builtIn.name,
        isBuiltIn: true,
        colors: { ...builtIn.colors },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else {
      const custom = customThemes.find((t) => t.id === themeId);
      if (custom) {
        editingTheme = { ...custom };
      }
    }
    hasUnsavedChanges = false;
    validateCurrentTheme();
  }

  function validateCurrentTheme() {
    if (!editingTheme) return;
    const colors =
      showColorBlindSim !== 'none'
        ? applyColorBlindSimulation(editingTheme.colors, showColorBlindSim)
        : editingTheme.colors;
    validationResult = validateThemeColors(colors);
  }

  function updateColor(category: keyof ThemeColors, key: string | null, value: string) {
    if (!editingTheme) return;

    if (category === 'border' || category === 'highlight') {
      (editingTheme.colors as unknown as Record<string, string>)[category] = value;
    } else if (category === 'semantic') {
      if (key && key !== null) {
        editingTheme.colors.semantic[key as keyof typeof editingTheme.colors.semantic] = value;
      }
    } else if (key && key !== null) {
      (editingTheme.colors[category] as unknown as Record<string, string>)[key] = value;
    }
    hasUnsavedChanges = true;
    validateCurrentTheme();
  }

  function updateThemeName(name: string) {
    if (!editingTheme) return;
    editingTheme.name = name;
    hasUnsavedChanges = true;
  }

  async function handleSave() {
    if (!editingTheme) return;

    const result = await saveCustomTheme(editingTheme, false);
    if (result.success) {
      saveError = '';
      saveSuccess = true;
      hasUnsavedChanges = false;
      await loadThemes();
      themeStore.applyCustomTheme(editingTheme.colors);
      setTimeout(() => (saveSuccess = false), 2000);
    } else {
      saveError = result.error || 'Failed to save theme';
    }
  }

  async function handleSaveWithOverride() {
    if (!editingTheme) return;

    const result = await saveCustomTheme(editingTheme, true);
    if (result.success) {
      saveError = '';
      saveSuccess = true;
      hasUnsavedChanges = false;
      await loadThemes();
      themeStore.applyCustomTheme(editingTheme.colors);
      setTimeout(() => (saveSuccess = false), 2000);
    } else {
      saveError = result.error || 'Failed to save theme';
    }
  }

  async function handleDelete(themeId: string) {
    const success = await deleteCustomTheme(themeId);
    if (success) {
      await loadThemes();
      if (editingTheme?.id === themeId) {
        editingTheme = null;
      }
    }
  }

  function handleExport() {
    if (!editingTheme) return;
    const json = exportThemeAsJson(editingTheme, 'Player');
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${editingTheme.name.toLowerCase().replace(/\s+/g, '-')}-theme.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      const theme = importThemeFromJson(content);
      if (theme) {
        editingTheme = theme;
        hasUnsavedChanges = true;
        validateCurrentTheme();
        importError = '';
      } else {
        importError = 'Invalid theme file format';
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  function getContrastLabel(ratio: number): string {
    if (ratio >= 7) return 'AAA';
    if (ratio >= 4.5) return 'AA';
    if (ratio >= 3) return 'AA Large';
    return 'Fail';
  }

  function getContrastClass(ratio: number): string {
    if (ratio >= 4.5) return 'contrast-pass';
    if (ratio >= 3) return 'contrast-warning';
    return 'contrast-fail';
  }
</script>

<Panel variant="elevated" ariaLabel="Custom Theme Editor">
  <div class="theme-editor">
    <div class="theme-editor__header">
      <a href="/settings" class="back-link">← Back to Settings</a>
      <h1 class="theme-editor__title">Custom Theme Editor</h1>
    </div>

    <div class="theme-editor__content">
      <div class="theme-editor__sidebar">
        <section class="theme-section">
          <h2 class="theme-section__title">Built-in Themes</h2>
          <div class="theme-list">
            {#each BUILT_IN_THEMES as theme (theme.id)}
              <button
                type="button"
                class="theme-item"
                class:theme-item--active={editingTheme?.id === theme.id}
                onclick={() => selectTheme(theme.id)}
              >
                <span
                  class="theme-item__preview"
                  style:background-color={theme.colors.background.primary}
                >
                  <span class="theme-item__sample" style:color={theme.colors.text.primary}>Aa</span>
                </span>
                <span class="theme-item__name">{theme.name}</span>
              </button>
            {/each}
          </div>
        </section>

        <section class="theme-section">
          <h2 class="theme-section__title">
            My Themes
            <span class="theme-count">({customThemes.length}/5)</span>
          </h2>
          {#if customThemes.length > 0}
            <div class="theme-list">
              {#each customThemes as theme (theme.id)}
                <div class="theme-item-wrapper">
                  <button
                    type="button"
                    class="theme-item"
                    class:theme-item--active={editingTheme?.id === theme.id}
                    onclick={() => selectTheme(theme.id)}
                  >
                    <span
                      class="theme-item__preview"
                      style:background-color={theme.colors.background.primary}
                    >
                      <span class="theme-item__sample" style:color={theme.colors.text.primary}
                        >Aa</span
                      >
                    </span>
                    <span class="theme-item__name">{theme.name}</span>
                  </button>
                  <button
                    type="button"
                    class="delete-btn"
                    onclick={() => handleDelete(theme.id)}
                    aria-label="Delete theme"
                  >
                    ×
                  </button>
                </div>
              {/each}
            </div>
          {/if}
          {#if canAddTheme}
            <Button variant="secondary" size="sm" onclick={createNewTheme}>
              + Create New Theme
            </Button>
          {:else}
            <p class="theme-limit-message">Maximum of 5 custom themes reached</p>
          {/if}
        </section>

        <section class="theme-section">
          <h2 class="theme-section__title">Import / Export</h2>
          <div class="import-export">
            <label class="import-label">
              <input type="file" accept=".json" onchange={handleImport} />
              Import Theme
            </label>
            <Button variant="secondary" size="sm" disabled={!editingTheme} onclick={handleExport}>
              Export Theme
            </Button>
          </div>
          {#if importError}
            <p class="error-message">{importError}</p>
          {/if}
        </section>
      </div>

      <div class="theme-editor__main">
        {#if editingTheme}
          <section class="theme-section">
            <h2 class="theme-section__title">Theme Details</h2>
            <div class="theme-details">
              <label class="form-field">
                <span>Theme Name</span>
                <input
                  type="text"
                  value={editingTheme.name}
                  oninput={(e) => updateThemeName(e.currentTarget.value)}
                  disabled={editingTheme.isBuiltIn}
                />
              </label>
            </div>
          </section>

          <section class="theme-section">
            <h2 class="theme-section__title">Color Picker</h2>
            <div class="color-picker-grid">
              <div class="color-group">
                <h3>Background</h3>
                <label class="color-field">
                  <span>Primary</span>
                  <div class="color-input-wrapper">
                    <input
                      type="color"
                      value={editingTheme.colors.background.primary}
                      oninput={(e) => updateColor('background', 'primary', e.currentTarget.value)}
                    />
                    <input
                      type="text"
                      value={editingTheme.colors.background.primary}
                      oninput={(e) => updateColor('background', 'primary', e.currentTarget.value)}
                      class="color-text"
                    />
                  </div>
                </label>
                <label class="color-field">
                  <span>Secondary</span>
                  <div class="color-input-wrapper">
                    <input
                      type="color"
                      value={editingTheme.colors.background.secondary}
                      oninput={(e) => updateColor('background', 'secondary', e.currentTarget.value)}
                    />
                    <input
                      type="text"
                      value={editingTheme.colors.background.secondary}
                      oninput={(e) => updateColor('background', 'secondary', e.currentTarget.value)}
                      class="color-text"
                    />
                  </div>
                </label>
              </div>

              <div class="color-group">
                <h3>Text</h3>
                <label class="color-field">
                  <span>Primary</span>
                  <div class="color-input-wrapper">
                    <input
                      type="color"
                      value={editingTheme.colors.text.primary}
                      oninput={(e) => updateColor('text', 'primary', e.currentTarget.value)}
                    />
                    <input
                      type="text"
                      value={editingTheme.colors.text.primary}
                      oninput={(e) => updateColor('text', 'primary', e.currentTarget.value)}
                      class="color-text"
                    />
                  </div>
                </label>
                <label class="color-field">
                  <span>Secondary</span>
                  <div class="color-input-wrapper">
                    <input
                      type="color"
                      value={editingTheme.colors.text.secondary}
                      oninput={(e) => updateColor('text', 'secondary', e.currentTarget.value)}
                    />
                    <input
                      type="text"
                      value={editingTheme.colors.text.secondary}
                      oninput={(e) => updateColor('text', 'secondary', e.currentTarget.value)}
                      class="color-text"
                    />
                  </div>
                </label>
                <label class="color-field">
                  <span>Accent</span>
                  <div class="color-input-wrapper">
                    <input
                      type="color"
                      value={editingTheme.colors.text.accent}
                      oninput={(e) => updateColor('text', 'accent', e.currentTarget.value)}
                    />
                    <input
                      type="text"
                      value={editingTheme.colors.text.accent}
                      oninput={(e) => updateColor('text', 'accent', e.currentTarget.value)}
                      class="color-text"
                    />
                  </div>
                </label>
              </div>

              <div class="color-group">
                <h3>UI Elements</h3>
                <label class="color-field">
                  <span>Border</span>
                  <div class="color-input-wrapper">
                    <input
                      type="color"
                      value={editingTheme.colors.border}
                      oninput={(e) => updateColor('border', null, e.currentTarget.value)}
                    />
                    <input
                      type="text"
                      value={editingTheme.colors.border}
                      oninput={(e) => updateColor('border', null, e.currentTarget.value)}
                      class="color-text"
                    />
                  </div>
                </label>
                <label class="color-field">
                  <span>Highlight</span>
                  <div class="color-input-wrapper">
                    <input
                      type="color"
                      value={editingTheme.colors.highlight}
                      oninput={(e) => updateColor('highlight', null, e.currentTarget.value)}
                    />
                    <input
                      type="text"
                      value={editingTheme.colors.highlight}
                      oninput={(e) => updateColor('highlight', null, e.currentTarget.value)}
                      class="color-text"
                    />
                  </div>
                </label>
              </div>

              <div class="color-group">
                <h3>Semantic Colors</h3>
                <label class="color-field">
                  <span>Error</span>
                  <div class="color-input-wrapper">
                    <input
                      type="color"
                      value={editingTheme.colors.semantic.error}
                      oninput={(e) => {
                        editingTheme!.colors.semantic.error = e.currentTarget.value;
                        hasUnsavedChanges = true;
                        validateCurrentTheme();
                      }}
                    />
                    <input
                      type="text"
                      value={editingTheme.colors.semantic.error}
                      oninput={(e) => {
                        editingTheme!.colors.semantic.error = e.currentTarget.value;
                        hasUnsavedChanges = true;
                        validateCurrentTheme();
                      }}
                      class="color-text"
                    />
                  </div>
                </label>
                <label class="color-field">
                  <span>Warning</span>
                  <div class="color-input-wrapper">
                    <input
                      type="color"
                      value={editingTheme.colors.semantic.warning}
                      oninput={(e) => {
                        editingTheme!.colors.semantic.warning = e.currentTarget.value;
                        hasUnsavedChanges = true;
                        validateCurrentTheme();
                      }}
                    />
                    <input
                      type="text"
                      value={editingTheme.colors.semantic.warning}
                      oninput={(e) => {
                        editingTheme!.colors.semantic.warning = e.currentTarget.value;
                        hasUnsavedChanges = true;
                        validateCurrentTheme();
                      }}
                      class="color-text"
                    />
                  </div>
                </label>
                <label class="color-field">
                  <span>Success</span>
                  <div class="color-input-wrapper">
                    <input
                      type="color"
                      value={editingTheme.colors.semantic.success}
                      oninput={(e) => {
                        editingTheme!.colors.semantic.success = e.currentTarget.value;
                        hasUnsavedChanges = true;
                        validateCurrentTheme();
                      }}
                    />
                    <input
                      type="text"
                      value={editingTheme.colors.semantic.success}
                      oninput={(e) => {
                        editingTheme!.colors.semantic.success = e.currentTarget.value;
                        hasUnsavedChanges = true;
                        validateCurrentTheme();
                      }}
                      class="color-text"
                    />
                  </div>
                </label>
                <label class="color-field">
                  <span>Info</span>
                  <div class="color-input-wrapper">
                    <input
                      type="color"
                      value={editingTheme.colors.semantic.info}
                      oninput={(e) => {
                        editingTheme!.colors.semantic.info = e.currentTarget.value;
                        hasUnsavedChanges = true;
                        validateCurrentTheme();
                      }}
                    />
                    <input
                      type="text"
                      value={editingTheme.colors.semantic.info}
                      oninput={(e) => {
                        editingTheme!.colors.semantic.info = e.currentTarget.value;
                        hasUnsavedChanges = true;
                        validateCurrentTheme();
                      }}
                      class="color-text"
                    />
                  </div>
                </label>
              </div>
            </div>
          </section>

          <section class="theme-section">
            <h2 class="theme-section__title">Color-Blind Simulation</h2>
            <div class="color-blind-selector">
              <label class="color-blind-option">
                <input
                  type="radio"
                  name="colorBlind"
                  value="none"
                  checked={showColorBlindSim === 'none'}
                  onchange={() => {
                    showColorBlindSim = 'none';
                    validateCurrentTheme();
                  }}
                />
                <span>None</span>
              </label>
              <label class="color-blind-option">
                <input
                  type="radio"
                  name="colorBlind"
                  value="protanopia"
                  checked={showColorBlindSim === 'protanopia'}
                  onchange={() => {
                    showColorBlindSim = 'protanopia';
                    validateCurrentTheme();
                  }}
                />
                <span>Protanopia</span>
              </label>
              <label class="color-blind-option">
                <input
                  type="radio"
                  name="colorBlind"
                  value="deuteranopia"
                  checked={showColorBlindSim === 'deuteranopia'}
                  onchange={() => {
                    showColorBlindSim = 'deuteranopia';
                    validateCurrentTheme();
                  }}
                />
                <span>Deuteranopia</span>
              </label>
              <label class="color-blind-option">
                <input
                  type="radio"
                  name="colorBlind"
                  value="tritanopia"
                  checked={showColorBlindSim === 'tritanopia'}
                  onchange={() => {
                    showColorBlindSim = 'tritanopia';
                    validateCurrentTheme();
                  }}
                />
                <span>Tritanopia</span>
              </label>
            </div>
          </section>

          <section class="theme-section">
            <h2 class="theme-section__title">Contrast Validation (WCAG 2.1 AA)</h2>
            <div class="contrast-results">
              <div class="contrast-item">
                <span class="contrast-label">Primary Text</span>
                <span
                  class="contrast-ratio {getContrastClass(
                    validationResult.contrastResults.primaryText.ratio,
                  )}"
                >
                  {validationResult.contrastResults.primaryText.ratio}:1
                </span>
                <span
                  class="contrast-badge {getContrastClass(
                    validationResult.contrastResults.primaryText.ratio,
                  )}"
                >
                  {getContrastLabel(validationResult.contrastResults.primaryText.ratio)}
                </span>
              </div>
              <div class="contrast-item">
                <span class="contrast-label">Secondary Text</span>
                <span
                  class="contrast-ratio {getContrastClass(
                    validationResult.contrastResults.secondaryText.ratio,
                  )}"
                >
                  {validationResult.contrastResults.secondaryText.ratio}:1
                </span>
                <span
                  class="contrast-badge {getContrastClass(
                    validationResult.contrastResults.secondaryText.ratio,
                  )}"
                >
                  {getContrastLabel(validationResult.contrastResults.secondaryText.ratio)}
                </span>
              </div>
              <div class="contrast-item">
                <span class="contrast-label">Accent Text</span>
                <span
                  class="contrast-ratio {getContrastClass(
                    validationResult.contrastResults.accentText.ratio,
                  )}"
                >
                  {validationResult.contrastResults.accentText.ratio}:1
                </span>
                <span
                  class="contrast-badge {getContrastClass(
                    validationResult.contrastResults.accentText.ratio,
                  )}"
                >
                  {getContrastLabel(validationResult.contrastResults.accentText.ratio)}
                </span>
              </div>
            </div>
            {#if validationResult.warnings.length > 0}
              <div class="validation-warnings">
                {#each validationResult.warnings as warning, i (i)}
                  <p class="warning-text">{warning}</p>
                {/each}
              </div>
            {/if}
            {#if validationResult.errors.length > 0}
              <div class="validation-errors">
                {#each validationResult.errors as error, i (i)}
                  <p class="error-text">{error}</p>
                {/each}
              </div>
            {/if}
          </section>

          <section class="theme-section">
            <h2 class="theme-section__title">Live Preview</h2>
            <div
              class="theme-preview"
              style:background-color={editingTheme.colors.background.primary}
              style:border-color={editingTheme.colors.border}
            >
              <div class="preview-header" style:border-color={editingTheme.colors.border}>
                <span style:color={editingTheme.colors.text.accent}> MATRICES GmbH TERMINAL </span>
              </div>
              <div class="preview-content">
                <p style:color={editingTheme.colors.text.primary}>Primary text sample (18px)</p>
                <p style:color={editingTheme.colors.text.secondary}>
                  Secondary text sample - The quick brown fox jumps over the lazy dog.
                </p>
                <p style:color={editingTheme.colors.text.accent}>
                  Accent text: Important information
                </p>
                <div class="preview-colors">
                  <span
                    class="preview-badge"
                    style:background-color={editingTheme.colors.semantic.error}
                    style:color={editingTheme.colors.background.primary}>Error</span
                  >
                  <span
                    class="preview-badge"
                    style:background-color={editingTheme.colors.semantic.warning}
                    style:color={editingTheme.colors.background.primary}>Warning</span
                  >
                  <span
                    class="preview-badge"
                    style:background-color={editingTheme.colors.semantic.success}
                    style:color={editingTheme.colors.background.primary}>Success</span
                  >
                  <span
                    class="preview-badge"
                    style:background-color={editingTheme.colors.semantic.info}
                    style:color={editingTheme.colors.background.primary}>Info</span
                  >
                </div>
                <div
                  class="preview-panel"
                  style:background-color={editingTheme.colors.background.secondary}
                  style:border-color={editingTheme.colors.border}
                >
                  <span style:color={editingTheme.colors.text.primary}>
                    Panel background (secondary)
                  </span>
                </div>
                <div
                  class="preview-highlight"
                  style:background-color={editingTheme.colors.highlight}
                >
                  <span style:color={editingTheme.colors.text.primary}>
                    Highlighted selection
                  </span>
                </div>
              </div>
            </div>
          </section>

          {#if !editingTheme.isBuiltIn}
            <div class="theme-actions">
              {#if saveError}
                <p class="error-message">{saveError}</p>
              {/if}
              {#if saveSuccess}
                <p class="success-message">Theme saved successfully!</p>
              {/if}
              {#if hasUnsavedChanges}
                {#if !validationResult.isValid}
                  <Button variant="secondary" onclick={handleSaveWithOverride}>
                    Save (Override Validation)
                  </Button>
                {/if}
                <Button variant="primary" onclick={handleSave}>Save Theme</Button>
              {/if}
            </div>
          {/if}
        {:else}
          <div class="no-theme-selected">
            <p>Select a theme from the sidebar or create a new one to get started.</p>
          </div>
        {/if}
      </div>
    </div>
  </div>
</Panel>

<style>
  .theme-editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-4);
    max-width: 1200px;
    margin: 0 auto;
  }

  .theme-editor__header {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .back-link {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    text-decoration: none;
  }

  .back-link:hover {
    color: var(--color-text);
  }

  .theme-editor__title {
    font-family: var(--font-terminal);
    color: var(--color-amber);
    font-size: var(--text-xl);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin: 0;
  }

  .theme-editor__content {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: var(--space-4);
  }

  @media (max-width: 900px) {
    .theme-editor__content {
      grid-template-columns: 1fr;
    }
  }

  .theme-editor__sidebar {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .theme-editor__main {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .theme-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .theme-section__title {
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .theme-count {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    font-weight: normal;
  }

  .theme-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .theme-item-wrapper {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .theme-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    flex: 1;
    transition: border-color 150ms ease;
  }

  .theme-item:hover {
    border-color: var(--color-accent);
  }

  .theme-item--active {
    border-color: var(--color-accent);
    background: var(--color-bg-tertiary);
  }

  .theme-item__preview {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--color-border);
  }

  .theme-item__sample {
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    font-weight: bold;
  }

  .theme-item__name {
    font-size: var(--text-sm);
    color: var(--color-text);
  }

  .delete-btn {
    background: transparent;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    font-size: var(--text-lg);
    padding: var(--space-1);
    line-height: 1;
  }

  .delete-btn:hover {
    color: var(--color-danger);
  }

  .theme-limit-message {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    margin: 0;
  }

  .import-export {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .import-label {
    font-size: var(--text-sm);
    color: var(--color-text);
    cursor: pointer;
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
  }

  .import-label:hover {
    border-color: var(--color-accent);
  }

  .import-label input {
    display: none;
  }

  .theme-details {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .form-field span {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .form-field input {
    padding: var(--space-2);
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text);
    background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
  }

  .form-field input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .form-field input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .color-picker-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-4);
  }

  .color-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .color-group h3 {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    margin: 0;
  }

  .color-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .color-field span {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .color-input-wrapper {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }

  .color-input-wrapper input[type='color'] {
    width: 40px;
    height: 32px;
    padding: 0;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    background: transparent;
  }

  .color-input-wrapper input[type='color']::-webkit-color-swatch-wrapper {
    padding: 2px;
  }

  .color-input-wrapper input[type='color']::-webkit-color-swatch {
    border: none;
    border-radius: 2px;
  }

  .color-text {
    flex: 1;
    padding: var(--space-1) var(--space-2);
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text);
    background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    text-transform: uppercase;
  }

  .color-blind-selector {
    display: flex;
    gap: var(--space-3);
    flex-wrap: wrap;
  }

  .color-blind-option {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    cursor: pointer;
    font-size: var(--text-sm);
    color: var(--color-text);
  }

  .color-blind-option input {
    accent-color: var(--color-accent);
  }

  .contrast-results {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .contrast-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-sm);
  }

  .contrast-label {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    min-width: 100px;
  }

  .contrast-ratio {
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    min-width: 60px;
  }

  .contrast-badge {
    font-size: var(--text-xs);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-weight: bold;
  }

  .contrast-pass {
    color: var(--color-success);
  }

  .contrast-warning {
    color: var(--color-warning);
  }

  .contrast-fail {
    color: var(--color-danger);
  }

  .contrast-pass.contrast-badge {
    background: var(--color-success);
    color: var(--color-bg-primary);
  }

  .contrast-warning.contrast-badge {
    background: var(--color-warning);
    color: var(--color-bg-primary);
  }

  .contrast-fail.contrast-badge {
    background: var(--color-danger);
    color: white;
  }

  .validation-warnings {
    padding: var(--space-2);
    background: rgba(255, 204, 0, 0.1);
    border: 1px solid var(--color-warning);
    border-radius: var(--radius-sm);
  }

  .warning-text {
    font-size: var(--text-sm);
    color: var(--color-warning);
    margin: 0;
  }

  .validation-errors {
    padding: var(--space-2);
    background: rgba(255, 85, 85, 0.1);
    border: 1px solid var(--color-danger);
    border-radius: var(--radius-sm);
  }

  .error-text {
    font-size: var(--text-sm);
    color: var(--color-danger);
    margin: 0;
  }

  .theme-preview {
    padding: var(--space-4);
    border: 2px solid;
    border-radius: var(--radius-md);
    min-height: 200px;
  }

  .preview-header {
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    padding-bottom: var(--space-2);
    margin-bottom: var(--space-2);
    border-bottom: 1px solid;
  }

  .preview-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    font-family: var(--font-terminal);
    font-size: var(--text-base);
  }

  .preview-colors {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .preview-badge {
    font-size: var(--text-xs);
    padding: 2px 8px;
    border-radius: var(--radius-sm);
  }

  .preview-panel {
    padding: var(--space-2);
    border: 1px solid;
    border-radius: var(--radius-sm);
  }

  .preview-highlight {
    padding: var(--space-2);
    border-radius: var(--radius-sm);
  }

  .theme-actions {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    flex-wrap: wrap;
  }

  .error-message {
    font-size: var(--text-sm);
    color: var(--color-danger);
    margin: 0;
  }

  .success-message {
    font-size: var(--text-sm);
    color: var(--color-success);
    margin: 0;
  }

  .no-theme-selected {
    text-align: center;
    padding: var(--space-8);
    color: var(--color-text-muted);
  }
</style>
