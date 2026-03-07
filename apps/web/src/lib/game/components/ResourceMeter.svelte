<script lang="ts">
  import type { Snippet } from 'svelte';

  type ResourceType = 'rack' | 'power' | 'cooling' | 'bandwidth';
  type MeterVariant = 'standard' | 'compact' | 'vertical' | 'trend';
  type TrendDirection = 'up' | 'down' | 'stable';

  interface Props {
    label: string;
    used: number;
    total?: number;
    capacity?: number;
    unit: string;
    type?: ResourceType;
    variant?: MeterVariant;
    showValues?: boolean;
    animated?: boolean;
    warningThreshold?: number;
    criticalThreshold?: number;
    trend?: TrendDirection;
    children?: Snippet;
  }

  const {
    label,
    used,
    total,
    capacity,
    unit,
    type = 'rack',
    variant = 'standard',
    showValues = true,
    animated = true,
    warningThreshold = 61,
    criticalThreshold = 81,
    trend = 'stable',
    children,
  }: Props = $props();

  const effectiveTotal = $derived(total ?? capacity ?? 0);
  const rawPercentage = $derived(
    effectiveTotal > 0 ? Math.round((used / effectiveTotal) * 100) : 0,
  );
  const percentage = $derived(Math.min(rawPercentage, 100));
  const isFlashing = $derived(rawPercentage >= 96);
  const status = $derived.by(() => {
    if (percentage >= 96) return 'flashing';
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

  const trendIcon = $derived.by(() => {
    switch (trend) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      case 'stable':
      default:
        return '→';
    }
  });

  const trendClass = $derived(`resource-meter__trend--${trend}`);
</script>

<div
  class="resource-meter"
  class:resource-meter--warning={status === 'warning'}
  class:resource-meter--critical={status === 'critical'}
  class:resource-meter--flashing={isFlashing}
  class:resource-meter--compact={variant === 'compact'}
  class:resource-meter--vertical={variant === 'vertical'}
  class:resource-meter--trend={variant === 'trend'}
>
  <div class="resource-meter__header">
    <span class="resource-meter__icon">{icon}</span>
    <span class="resource-meter__label">{label}</span>
    {#if variant === 'trend'}
      <span class="resource-meter__trend {trendClass}">{trendIcon}</span>
    {/if}
    {#if showValues}
      <span class="resource-meter__value">{used} / {effectiveTotal} {unit}</span>
    {/if}
  </div>

  {#if variant === 'vertical'}
    <div class="resource-meter__bar-vertical">
      <div
        class="resource-meter__fill"
        class:resource-meter__fill--warning={status === 'warning'}
        class:resource-meter__fill--critical={status === 'critical'}
        class:resource-meter__fill--flashing={isFlashing}
        style="height: {Math.min(percentage, 100)}%"
      ></div>
    </div>
  {:else}
    <div class="resource-meter__bar">
      <div
        class="resource-meter__fill"
        class:resource-meter__fill--warning={status === 'warning'}
        class:resource-meter__fill--critical={status === 'critical'}
        class:resource-meter__fill--flashing={isFlashing}
        class:resource-meter__fill--no-animation={!animated}
        style="width: {Math.min(percentage, 100)}%"
      ></div>
    </div>
  {/if}

  <div class="resource-meter__footer">
    <span class="resource-meter__percentage">{percentage}%</span>
    {#if status === 'warning'}
      <span class="resource-meter__alert">WARNING</span>
    {:else if status === 'critical'}
      <span class="resource-meter__alert resource-meter__alert--critical">CRITICAL</span>
    {:else if status === 'flashing'}
      <span class="resource-meter__alert resource-meter__alert--flashing">CRITICAL</span>
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
  }

  .resource-meter--flashing {
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

  .resource-meter--compact .resource-meter__header {
    margin-bottom: var(--space-1);
  }

  .resource-meter--vertical .resource-meter__header {
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: var(--space-2);
  }

  .resource-meter__icon {
    font-family: var(--font-terminal);
    font-size: var(--text-md);
    color: var(--color-accent);
  }

  .resource-meter--compact .resource-meter__icon {
    font-size: var(--text-sm);
  }

  .resource-meter__label {
    font-family: var(--font-ui);
    font-weight: 500;
    color: var(--color-text);
    flex: 1;
  }

  .resource-meter--compact .resource-meter__label {
    font-size: var(--text-sm);
  }

  .resource-meter__trend {
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    margin-left: var(--space-1);
  }

  .resource-meter__trend--up {
    color: var(--color-danger);
  }

  .resource-meter__trend--down {
    color: var(--color-safe);
  }

  .resource-meter__trend--stable {
    color: var(--color-text-muted);
  }

  .resource-meter__value {
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .resource-meter--compact .resource-meter__value {
    font-size: var(--text-xs);
  }

  .resource-meter__bar {
    height: 8px;
    background-color: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .resource-meter--compact .resource-meter__bar {
    height: 4px;
  }

  .resource-meter__bar-vertical {
    width: 24px;
    height: 80px;
    background-color: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  .resource-meter__fill {
    height: 100%;
    background-color: var(--color-safe);
    transition: width 300ms ease-out;
  }

  .resource-meter__fill--no-animation {
    transition: none;
  }

  .resource-meter__fill--warning {
    background-color: var(--color-warning);
  }

  .resource-meter__fill--critical {
    background-color: var(--color-danger);
  }

  .resource-meter__fill--flashing {
    background-color: var(--color-danger);
    animation: fill-flash 0.8s ease-in-out infinite;
  }

  @keyframes fill-flash {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.6;
    }
  }

  .resource-meter__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: var(--space-2);
  }

  .resource-meter--compact .resource-meter__footer {
    margin-top: var(--space-1);
  }

  .resource-meter--vertical .resource-meter__footer {
    flex-direction: column;
    align-items: flex-start;
    margin-top: var(--space-2);
  }

  .resource-meter__percentage {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .resource-meter--compact .resource-meter__percentage {
    font-size: 0.65rem;
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
  }

  .resource-meter__alert--flashing {
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

  @media (prefers-reduced-motion: reduce) {
    .resource-meter--flashing,
    .resource-meter__fill--flashing,
    .resource-meter__alert--flashing {
      animation: none;
    }

    .resource-meter__fill {
      transition: none;
    }
  }
</style>
