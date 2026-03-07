<script lang="ts">
  import type { Snippet } from 'svelte';

  type ResourceType = 'rack' | 'power' | 'cooling' | 'bandwidth';

  interface Props {
    label: string;
    used: number;
    capacity: number;
    unit: string;
    type?: ResourceType;
    warningThreshold?: number;
    criticalThreshold?: number;
    children?: Snippet;
  }

  const {
    label,
    used,
    capacity,
    unit,
    type = 'rack',
    warningThreshold = 80,
    criticalThreshold = 95,
    children,
  }: Props = $props();

  const percentage = $derived(capacity > 0 ? Math.round((used / capacity) * 100) : 0);
  const status = $derived.by(() => {
    if (percentage >= criticalThreshold) return 'critical';
    if (percentage >= warningThreshold) return 'warning';
    return 'normal';
  });

  const icon = $derived.by(() => {
    switch (type) {
      case 'rack':
        return '⬚';
      case 'power':
        return '⚡';
      case 'cooling':
        return '❄';
      case 'bandwidth':
        return '◈';
      default:
        return '●';
    }
  });
</script>

<div
  class="resource-meter"
  class:resource-meter--warning={status === 'warning'}
  class:resource-meter--critical={status === 'critical'}
>
  <div class="resource-meter__header">
    <span class="resource-meter__icon">{icon}</span>
    <span class="resource-meter__label">{label}</span>
    <span class="resource-meter__value">{used} / {capacity} {unit}</span>
  </div>
  <div class="resource-meter__bar">
    <div
      class="resource-meter__fill"
      class:resource-meter__fill--warning={status === 'warning'}
      class:resource-meter__fill--critical={status === 'critical'}
      style="width: {Math.min(percentage, 100)}%"
    ></div>
  </div>
  <div class="resource-meter__footer">
    <span class="resource-meter__percentage">{percentage}%</span>
    {#if status === 'warning'}
      <span class="resource-meter__alert">WARNING</span>
    {:else if status === 'critical'}
      <span class="resource-meter__alert resource-meter__alert--critical">CRITICAL</span>
    {/if}
  </div>
  {#if children}
    <div class="resource-meter__content">
      {@render children()}
    </div>
  {/if}
</div>

<style>
  .resource-meter {
    padding: var(--space-3);
    background-color: var(--color-bg-secondary);
    border: var(--border-default);
    border-radius: var(--radius-md);
  }

  .resource-meter--warning {
    border-color: var(--color-warning);
  }

  .resource-meter--critical {
    border-color: var(--color-danger);
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.85;
    }
  }

  .resource-meter__header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .resource-meter__icon {
    font-family: var(--font-terminal);
    font-size: var(--text-md);
    color: var(--color-accent);
  }

  .resource-meter__label {
    font-family: var(--font-ui);
    font-weight: 500;
    color: var(--color-text);
    flex: 1;
  }

  .resource-meter__value {
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .resource-meter__bar {
    height: 8px;
    background-color: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .resource-meter__fill {
    height: 100%;
    background-color: var(--color-safe);
    transition: width 300ms ease-out;
  }

  .resource-meter__fill--warning {
    background-color: var(--color-warning);
  }

  .resource-meter__fill--critical {
    background-color: var(--color-danger);
  }

  .resource-meter__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: var(--space-2);
  }

  .resource-meter__percentage {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .resource-meter__alert {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    font-weight: bold;
    color: var(--color-warning);
    padding: var(--space-0) var(--space-1);
    border: 1px solid var(--color-warning);
    border-radius: var(--radius-sm);
  }

  .resource-meter__alert--critical {
    color: var(--color-danger);
    border-color: var(--color-danger);
    animation: blink 0.8s ease-in-out infinite;
  }

  @keyframes blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .resource-meter__content {
    margin-top: var(--space-2);
  }
</style>
