<script lang="ts">
  import { soundCaptionStore } from '$lib/stores/sound-caption';
  import { SoundCategory } from '$lib/audio';

  interface Props {
    maxVisible?: number;
  }

  const { maxVisible = 3 }: Props = $props();

  const captions = $derived($soundCaptionStore);
</script>

{#if captions.length > 0}
  <div class="sound-caption-container" role="status" aria-live="polite">
    {#each captions.slice(0, maxVisible) as caption (caption.id)}
      <div
        class="sound-caption"
        class:sound-caption--alert={caption.category === SoundCategory.ALERTS}
      >
        <span class="sound-caption__text">[{caption.text}]</span>
      </div>
    {/each}
  </div>
{/if}

<style>
  .sound-caption-container {
    position: fixed;
    bottom: var(--space-20, 5rem);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    z-index: 100;
    pointer-events: none;
  }

  .sound-caption {
    padding: var(--space-1) var(--space-3);
    background-color: rgba(0, 0, 0, 0.75);
    border: 1px solid var(--color-phosphor-green-dark);
    border-radius: var(--radius-sm);
    animation: caption-fade-in 200ms ease-out;
  }

  .sound-caption--alert {
    border-color: var(--color-warning);
  }

  .sound-caption__text {
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-phosphor-green);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .sound-caption--alert .sound-caption__text {
    color: var(--color-warning);
  }

  @keyframes caption-fade-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sound-caption {
      animation: none;
    }
  }
</style>
