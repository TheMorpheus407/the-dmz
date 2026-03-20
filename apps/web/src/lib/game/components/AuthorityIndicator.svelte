<script lang="ts">
  interface Props {
    isAuthority: boolean;
    playerName?: string;
    isCurrentPlayer?: boolean;
    compact?: boolean;
  }

  const {
    isAuthority,
    playerName = 'Unknown Player',
    isCurrentPlayer = false,
    compact = false,
  }: Props = $props();
</script>

{#if isAuthority}
  <div
    class="authority-indicator"
    class:authority-indicator--compact={compact}
    class:authority-indicator--current={isCurrentPlayer}
    role="status"
    aria-label="Authority holder: {playerName}{isCurrentPlayer ? ' (you)' : ''}"
  >
    <span class="authority-indicator__icon" aria-hidden="true">
      {#if compact}
        *
      {:else}
        [AUTH]
      {/if}
    </span>
    {#if !compact}
      <span class="authority-indicator__label">AUTHORITY</span>
      <span class="authority-indicator__player">{playerName}</span>
    {/if}
  </div>
{/if}

<style>
  .authority-indicator {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-3);
    background-color: color-mix(in srgb, var(--color-amber) 15%, transparent);
    border: 1px solid var(--color-amber);
    border-radius: var(--radius-sm);
    font-family: var(--font-terminal);
    color: var(--color-amber);
    animation: authority-pulse 2s ease-in-out infinite;
  }

  .authority-indicator--compact {
    padding: var(--space-0) var(--space-2);
    gap: var(--space-1);
  }

  .authority-indicator--current {
    box-shadow: 0 0 8px color-mix(in srgb, var(--color-amber) 40%, transparent);
  }

  .authority-indicator__icon {
    font-weight: 700;
    font-size: var(--text-sm);
  }

  .authority-indicator--compact .authority-indicator__icon {
    font-size: var(--text-xs);
  }

  .authority-indicator__label {
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .authority-indicator__player {
    font-size: var(--text-sm);
    opacity: 0.9;
  }

  @keyframes authority-pulse {
    0%,
    100% {
      box-shadow: 0 0 4px color-mix(in srgb, var(--color-amber) 20%, transparent);
    }
    50% {
      box-shadow: 0 0 12px color-mix(in srgb, var(--color-amber) 40%, transparent);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .authority-indicator {
      animation: none;
    }
  }
</style>
