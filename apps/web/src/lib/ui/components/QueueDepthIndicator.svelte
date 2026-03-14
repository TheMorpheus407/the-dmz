<script lang="ts">
  import { getQueueDepth } from '$lib/game/services/sync-service';
  import { connectivityStore } from '$lib/stores/connectivity';

  let queueDepth = $state(0);
  const maxQueue = 100;

  $effect(() => {
    void (async () => {
      queueDepth = await getQueueDepth();
    })();
  });

  connectivityStore.subscribe(() => {
    void (async () => {
      queueDepth = await getQueueDepth();
    })();
  });

  const usagePercent = $derived(Math.round((queueDepth / maxQueue) * 100));
</script>

<div class="queue-depth">
  <div class="queue-depth__header">
    <span class="queue-depth__label">Offline Event Queue</span>
    <span class="queue-depth__value">{queueDepth} / {maxQueue}</span>
  </div>

  <div class="queue-depth__bar">
    <div
      class="queue-depth__fill"
      class:queue-depth__fill--high={usagePercent > 80}
      class:queue-depth__fill--warning={usagePercent > 50 && usagePercent <= 80}
      style="width: {usagePercent}%"
    ></div>
  </div>

  {#if queueDepth >= maxQueue}
    <span class="queue-depth__warning">Queue full - oldest events will be dropped</span>
  {/if}
</div>

<style>
  .queue-depth {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .queue-depth__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .queue-depth__label {
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: var(--color-text);
  }

  .queue-depth__value {
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .queue-depth__bar {
    height: 8px;
    background-color: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .queue-depth__fill {
    height: 100%;
    background-color: var(--color-safe);
    transition:
      width 0.3s ease,
      background-color 0.3s ease;
  }

  .queue-depth__fill--warning {
    background-color: var(--color-warning);
  }

  .queue-depth__fill--high {
    background-color: var(--color-danger);
  }

  .queue-depth__warning {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-warning);
  }
</style>
