<script lang="ts">
  import { SoundCategory } from '$lib/audio';
  import { soundStore } from '$lib/stores/sound';

  interface Props {
    category: SoundCategory;
    showLabel?: boolean;
  }

  const { category, showLabel = false }: Props = $props();

  const categoryLabels: Record<SoundCategory, string> = {
    [SoundCategory.Ambient]: 'Ambient',
    [SoundCategory.UiFeedback]: 'UI',
    [SoundCategory.Alerts]: 'Alerts',
    [SoundCategory.Stamps]: 'Stamps',
    [SoundCategory.Narrative]: 'Narrative',
    [SoundCategory.Effects]: 'Effects',
  };

  let currentSettings = $state({
    masterVolume: 80,
    categories: {
      [SoundCategory.Ambient]: { enabled: false, volume: 80 },
      [SoundCategory.UiFeedback]: { enabled: true, volume: 60 },
      [SoundCategory.Alerts]: { enabled: true, volume: 80 },
      [SoundCategory.Stamps]: { enabled: true, volume: 100 },
      [SoundCategory.Narrative]: { enabled: true, volume: 70 },
      [SoundCategory.Effects]: { enabled: true, volume: 80 },
    },
  });

  const isVisible = $state(false);

  $effect(() => {
    const unsubscribe = soundStore.subscribe((state) => {
      currentSettings = state;
    });
    return unsubscribe;
  });

  const categoryEnabled = $derived(currentSettings.categories[category]?.enabled ?? true);
</script>

<div
  class="sound-indicator"
  class:sound-indicator--visible={isVisible && categoryEnabled}
  class:sound-indicator--muted={!categoryEnabled}
  role="status"
  aria-label="{categoryLabels[category]} sound {categoryEnabled ? 'playing' : 'disabled'}"
>
  {#if showLabel}
    <span class="sound-indicator__label">{categoryLabels[category]}</span>
  {/if}
  <span class="sound-indicator__icon" aria-hidden="true">
    {#if !categoryEnabled}
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M11 5L6 9H2v6h4l5 4V5z" />
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
      </svg>
    {:else if isVisible}
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M11 5L6 9H2v6h4l5 4V5z" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
    {:else}
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M11 5L6 9H2v6h4l5 4V5z" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
    {/if}
  </span>
</div>

<style>
  .sound-indicator {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1);
    border-radius: var(--radius-sm);
    transition:
      opacity 150ms ease,
      background-color 150ms ease;
  }

  .sound-indicator--visible {
    background-color: var(--color-accent-dim, rgba(0, 255, 136, 0.2));
  }

  .sound-indicator--muted {
    opacity: 0.5;
  }

  .sound-indicator__label {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
  }

  .sound-indicator__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-muted);
  }

  .sound-indicator--visible .sound-indicator__icon {
    color: var(--color-accent);
  }

  @media (prefers-reduced-motion: reduce) {
    .sound-indicator,
    .sound-indicator--visible {
      transition: none;
    }
  }
</style>
