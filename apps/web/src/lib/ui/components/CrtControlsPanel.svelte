<script lang="ts">
  /* eslint-disable prefer-const */
  import Button from '$lib/ui/components/Button.svelte';
  import IntensitySlider from '$lib/ui/components/IntensitySlider.svelte';
  import { themeStore, DEFAULT_INTENSITIES } from '$lib/stores/theme';
  import type { EffectState, EffectIntensities, CrtPreset } from '$lib/stores/theme';

  type EffectKey = keyof EffectState;
  type IntensityKey = keyof EffectIntensities;

  interface Props {
    onClose?: () => void;
  }

  let { onClose: _onClose }: Props = $props();

  let effects = $state<EffectState>({
    scanlines: true,
    curvature: true,
    glow: true,
    noise: false,
    vignette: true,
    flicker: true,
  });

  let intensities = $state<EffectIntensities>({ ...DEFAULT_INTENSITIES });

  let enableTerminalEffects = $state(true);
  let selectedPreset = $state<CrtPreset>('authentic');
  let importExportText = $state('');

  const effectLabels: Record<EffectKey, string> = {
    scanlines: 'Scanlines',
    curvature: 'Screen Curvature',
    glow: 'Phosphor Glow',
    noise: 'Noise Texture',
    vignette: 'Vignette',
    flicker: 'Screen Flicker',
  };

  const intensityLabels: Record<IntensityKey, string> = {
    scanlines: 'Scanlines',
    curvature: 'Curvature',
    glow: 'Glow',
    noise: 'Noise',
    vignette: 'Vignette',
    flicker: 'Flicker',
  };

  $effect(() => {
    const unsubscribe = themeStore.subscribe((state) => {
      effects = { ...state.effects };
      intensities = { ...state.intensities };
      enableTerminalEffects = state.enableTerminalEffects;
    });
    return unsubscribe;
  });

  function handleToggle(effect: EffectKey) {
    themeStore.setEffects({ [effect]: !effects[effect] });
  }

  function handleIntensityChange(effect: IntensityKey, value: number) {
    themeStore.setIntensity(effect, value);
  }

  function handlePresetChange(preset: CrtPreset) {
    selectedPreset = preset;
    themeStore.applyPreset(preset);
  }

  function handleReset() {
    selectedPreset = 'authentic';
    themeStore.resetToDefaults();
  }

  function handleDisableAll() {
    themeStore.disableAllEffects();
    selectedPreset = 'off';
  }

  function handleExport() {
    const settings = themeStore.exportSettings();
    importExportText = JSON.stringify(settings, null, 2);
  }

  function handleImport() {
    try {
      const parsed = JSON.parse(importExportText) as Parameters<
        typeof themeStore.importSettings
      >[0];
      const success = themeStore.importSettings(parsed);
      if (success) {
        importExportText = '';
      }
    } catch {
      // Invalid JSON
    }
  }

  function handleImportExportChange(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    importExportText = target.value;
  }

  const presets: { id: CrtPreset; label: string }[] = [
    { id: 'off', label: 'Off' },
    { id: 'light', label: 'Light' },
    { id: 'authentic', label: 'Authentic' },
    { id: 'heavy', label: 'Heavy' },
  ];

  let showImportExport = $state(false);
</script>

<div class="crt-controls">
  <div class="crt-controls__presets">
    <span class="crt-controls__section-label">Presets</span>
    <div class="crt-controls__preset-buttons">
      {#each presets as preset (preset.id)}
        <button
          type="button"
          class="crt-controls__preset-btn"
          class:crt-controls__preset-btn--active={selectedPreset === preset.id}
          onclick={() => handlePresetChange(preset.id)}
        >
          {preset.label}
        </button>
      {/each}
    </div>
  </div>

  <div class="crt-controls__master">
    <label class="crt-controls__toggle-label">
      <span>Enable All Effects</span>
      <input
        type="checkbox"
        checked={enableTerminalEffects}
        onchange={() => themeStore.setEnableTerminalEffects(!enableTerminalEffects)}
        class="crt-controls__checkbox"
      />
    </label>
  </div>

  <div class="crt-controls__effects">
    {#each Object.keys(effectLabels) as effect (effect)}
      <div class="crt-controls__effect-row">
        <div class="crt-controls__effect-toggle">
          <label class="crt-controls__toggle-label">
            <span>{effectLabels[effect as EffectKey]}</span>
            <input
              type="checkbox"
              checked={effects[effect as EffectKey]}
              onchange={() => handleToggle(effect as EffectKey)}
              class="crt-controls__checkbox"
              disabled={!enableTerminalEffects}
            />
          </label>
        </div>
        <div class="crt-controls__effect-slider">
          <IntensitySlider
            label={intensityLabels[effect as IntensityKey] ?? 'Effect'}
            value={intensities[effect as IntensityKey] ?? 50}
            disabled={!enableTerminalEffects || !effects[effect as EffectKey]}
            onchange={(value: number) => handleIntensityChange(effect as IntensityKey, value)}
          />
        </div>
      </div>
    {/each}
  </div>

  <div class="crt-controls__actions">
    <Button variant="secondary" size="sm" onclick={handleDisableAll}>Disable All</Button>
    <Button variant="secondary" size="sm" onclick={handleReset}>Reset to Defaults</Button>
    <Button variant="ghost" size="sm" onclick={() => (showImportExport = !showImportExport)}>
      {showImportExport ? 'Hide' : 'Import/Export'}
    </Button>
  </div>

  {#if showImportExport}
    <div class="crt-controls__import-export">
      <textarea
        class="crt-controls__textarea"
        placeholder="Paste JSON here to import, or click Export to generate JSON..."
        value={importExportText}
        oninput={handleImportExportChange}
        rows="6"
      ></textarea>
      <div class="crt-controls__import-export-actions">
        <Button variant="primary" size="sm" onclick={handleExport}>Export</Button>
        <Button variant="secondary" size="sm" onclick={handleImport} disabled={!importExportText}>
          Import
        </Button>
      </div>
    </div>
  {/if}

  <p class="crt-controls__note">
    Effects are purely cosmetic. Disabling them has no impact on gameplay or accessibility.
  </p>
</div>

<style>
  .crt-controls {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    font-family: var(--font-terminal);
  }

  .crt-controls__section-label {
    display: block;
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--space-2);
  }

  .crt-controls__presets {
    padding-bottom: var(--space-3);
    border-bottom: 1px solid var(--color-border);
  }

  .crt-controls__preset-buttons {
    display: flex;
    gap: var(--space-1);
    flex-wrap: wrap;
  }

  .crt-controls__preset-btn {
    padding: var(--space-1) var(--space-2);
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition:
      color 150ms ease,
      background-color 150ms ease,
      border-color 150ms ease;
  }

  .crt-controls__preset-btn:hover {
    color: var(--color-text);
    background-color: var(--color-bg-hover);
  }

  .crt-controls__preset-btn:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .crt-controls__preset-btn--active {
    color: var(--color-text);
    background-color: var(--color-bg-tertiary);
    border-color: var(--color-accent);
  }

  .crt-controls__master {
    padding-bottom: var(--space-3);
    border-bottom: 1px solid var(--color-border);
  }

  .crt-controls__effects {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .crt-controls__effect-row {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  @media (min-width: 600px) {
    .crt-controls__effect-row {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }

    .crt-controls__effect-toggle {
      flex: 1;
      max-width: 200px;
    }

    .crt-controls__effect-slider {
      flex: 2;
      max-width: 300px;
    }
  }

  .crt-controls__toggle-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    font-size: var(--text-sm);
    color: var(--color-text);
    cursor: pointer;
  }

  .crt-controls__checkbox {
    width: 16px;
    height: 16px;
    accent-color: var(--color-accent);
    cursor: pointer;
  }

  .crt-controls__checkbox:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .crt-controls__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border);
  }

  .crt-controls__import-export {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3);
    background-color: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
  }

  .crt-controls__textarea {
    width: 100%;
    padding: var(--space-2);
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-text);
    background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    resize: vertical;
  }

  .crt-controls__textarea:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .crt-controls__import-export-actions {
    display: flex;
    gap: var(--space-2);
    justify-content: flex-end;
  }

  .crt-controls__note {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    text-align: center;
    margin: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .crt-controls__preset-btn,
    .crt-controls__checkbox {
      transition: none;
    }
  }
</style>
