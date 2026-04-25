<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';
  import IntensitySlider from '$lib/ui/components/IntensitySlider.svelte';
  import { soundStore } from '$lib/stores/sound';
  import { SoundCategory } from '$lib/audio';

  interface Props {
    onClose?: () => void;
  }

  let { onClose: _onClose }: Props = $props();

  let masterVolume = $state(80);
  let categories = $state({
    [SoundCategory.Ambient]: { enabled: false, volume: 80 },
    [SoundCategory.UiFeedback]: { enabled: true, volume: 60 },
    [SoundCategory.Alerts]: { enabled: true, volume: 80 },
    [SoundCategory.Stamps]: { enabled: true, volume: 100 },
    [SoundCategory.Narrative]: { enabled: true, volume: 70 },
    [SoundCategory.Effects]: { enabled: true, volume: 80 },
  });

  const categoryLabels: Record<SoundCategory, string> = {
    [SoundCategory.Ambient]: 'Ambient',
    [SoundCategory.UiFeedback]: 'UI Feedback',
    [SoundCategory.Alerts]: 'Alerts',
    [SoundCategory.Stamps]: 'Stamps',
    [SoundCategory.Narrative]: 'Narrative',
    [SoundCategory.Effects]: 'Effects',
  };

  const categoryDescriptions: Record<SoundCategory, string> = {
    [SoundCategory.Ambient]: 'Background hum, varies with threat level',
    [SoundCategory.UiFeedback]: 'Keyboard clicks, panel switches, buttons',
    [SoundCategory.Alerts]: 'Email chime, threat escalation, breach alarm',
    [SoundCategory.Stamps]: 'Approve/deny stamp sounds',
    [SoundCategory.Narrative]: 'Story stings, Morpheus messages',
    [SoundCategory.Effects]: 'CRT power-on, static bursts',
  };

  $effect(() => {
    const unsubscribe = soundStore.subscribe((state) => {
      masterVolume = state.masterVolume;
      categories = { ...state.categories };
    });
    return unsubscribe;
  });

  function handleMasterVolumeChange(value: number) {
    soundStore.setMasterVolume(value);
  }

  function handleCategoryToggle(category: SoundCategory) {
    soundStore.setCategoryEnabled(category, !categories[category].enabled);
  }

  function handleCategoryVolumeChange(category: SoundCategory, value: number) {
    soundStore.setCategoryVolume(category, value);
  }

  function handleDisableAll() {
    soundStore.disableAll();
  }

  function handleEnableAll() {
    soundStore.enableAll();
  }

  function handleReset() {
    soundStore.resetToDefaults();
  }
</script>

<div class="sound-controls">
  <div class="sound-controls__master">
    <div class="sound-controls__master-slider">
      <IntensitySlider
        label="Master Volume"
        value={masterVolume}
        onchange={(value: number) => handleMasterVolumeChange(value)}
      />
    </div>
  </div>

  <div class="sound-controls__categories">
    {#each Object.values(SoundCategory) as category (category)}
      <div class="sound-controls__category-row">
        <div class="sound-controls__category-toggle">
          <label class="sound-controls__toggle-label">
            <span class="sound-controls__category-name">{categoryLabels[category]}</span>
            <input
              type="checkbox"
              checked={categories[category].enabled}
              onchange={() => handleCategoryToggle(category)}
              class="sound-controls__checkbox"
            />
          </label>
        </div>
        <div class="sound-controls__category-slider">
          <IntensitySlider
            label={categoryLabels[category]}
            value={categories[category].volume}
            disabled={!categories[category].enabled}
            onchange={(value: number) => handleCategoryVolumeChange(category, value)}
          />
        </div>
      </div>
      <p class="sound-controls__category-desc">{categoryDescriptions[category]}</p>
    {/each}
  </div>

  <div class="sound-controls__actions">
    <Button variant="secondary" size="sm" onclick={handleDisableAll}>Disable All</Button>
    <Button variant="secondary" size="sm" onclick={handleEnableAll}>Enable All</Button>
    <Button variant="secondary" size="sm" onclick={handleReset}>Reset to Defaults</Button>
  </div>

  <p class="sound-controls__note">
    Sounds respect your system preferences. Enable "Reduce Motion" to disable all sounds
    automatically.
  </p>
</div>

<style>
  .sound-controls {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    font-family: var(--font-terminal);
  }

  .sound-controls__master {
    padding-bottom: var(--space-3);
    border-bottom: 1px solid var(--color-border);
  }

  .sound-controls__master-slider {
    max-width: 400px;
  }

  .sound-controls__categories {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .sound-controls__category-row {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  @media (min-width: 600px) {
    .sound-controls__category-row {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }

    .sound-controls__category-toggle {
      flex: 1;
      max-width: 200px;
    }

    .sound-controls__category-slider {
      flex: 2;
      max-width: 300px;
    }
  }

  .sound-controls__category-name {
    font-size: var(--text-sm);
    color: var(--color-text);
  }

  .sound-controls__category-desc {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    margin: 0;
    padding-left: var(--space-6);
    margin-top: calc(var(--space-2) * -1);
  }

  .sound-controls__toggle-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    font-size: var(--text-sm);
    color: var(--color-text);
    cursor: pointer;
  }

  .sound-controls__checkbox {
    width: 16px;
    height: 16px;
    accent-color: var(--color-accent);
    cursor: pointer;
  }

  .sound-controls__checkbox:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .sound-controls__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border);
  }

  .sound-controls__note {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    text-align: center;
    margin: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .sound-controls__checkbox {
      transition: none;
    }
  }
</style>
