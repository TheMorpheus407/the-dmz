<script lang="ts">
  import { Button } from '$lib/ui';

  interface Props {
    onupgradeshop?: () => void;
    onintelbrief?: () => void;
    onincidentlog?: () => void;
  }

  const {
    onupgradeshop = () => {},
    onintelbrief = () => {},
    onincidentlog = () => {},
  }: Props = $props();
</script>

<div class="quick-actions">
  <h3 class="quick-actions__title">Quick Actions</h3>

  <div class="quick-actions__buttons">
    <Button variant="primary" onclick={onupgradeshop}>
      <span class="quick-actions__icon">⬆</span>
      Upgrade Shop
    </Button>

    <Button variant="secondary" onclick={onintelbrief}>
      <span class="quick-actions__icon">◉</span>
      Intel Brief
    </Button>

    <Button variant="secondary" onclick={onincidentlog}>
      <span class="quick-actions__icon">⚠</span>
      Incident Log
    </Button>
  </div>
</div>

<style>
  .quick-actions {
    padding: var(--space-3);
    background-color: var(--color-bg-secondary);
    border: var(--border-default);
    border-radius: var(--radius-md);
  }

  .quick-actions__title {
    font-family: var(--font-terminal);
    font-size: var(--text-base);
    color: var(--color-amber);
    margin: 0 0 var(--space-3) 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .quick-actions__buttons {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .quick-actions__icon {
    font-family: var(--font-terminal);
    margin-right: var(--space-1);
  }
</style>
