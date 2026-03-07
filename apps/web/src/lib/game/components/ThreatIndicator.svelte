<script lang="ts">
  type ThreatLevel = 1 | 2 | 3 | 4 | 5;
  type Variant = 'full' | 'compact' | 'badge';

  interface Props {
    level: ThreatLevel;
    variant?: Variant;
    showLabel?: boolean;
    animated?: boolean;
  }

  const { level, variant = 'full', showLabel = true, animated = true }: Props = $props();

  const threatData: Record<ThreatLevel, { label: string; icon: string; colorClass: string }> = {
    1: { label: 'MINIMAL', icon: '🛡', colorClass: 'threat-indicator--1' },
    2: { label: 'LOW', icon: '🛡', colorClass: 'threat-indicator--2' },
    3: { label: 'ELEVATED', icon: '⚠', colorClass: 'threat-indicator--3' },
    4: { label: 'HIGH', icon: '⚠', colorClass: 'threat-indicator--4' },
    5: { label: 'SEVERE', icon: '✕', colorClass: 'threat-indicator--5' },
  };

  const data = $derived(threatData[level]);
  const isSevere = $derived(level === 5);
  const shouldAnimate = $derived(animated && isSevere);
</script>

<div
  class="threat-indicator"
  class:threat-indicator--full={variant === 'full'}
  class:threat-indicator--compact={variant === 'compact'}
  class:threat-indicator--badge={variant === 'badge'}
  class:threat-indicator--severe={isSevere}
  class:threat-indicator--animated={shouldAnimate}
  role="status"
  aria-label="Threat level {data.label}"
>
  {#if variant === 'full'}
    <span class="threat-indicator__icon">{data.icon}</span>
    {#if showLabel}
      <span class="threat-indicator__label">{data.label}</span>
    {/if}
    <span class="threat-indicator__bar">
      <span
        class="threat-indicator__fill {data.colorClass}"
        class:threat-indicator__fill--no-animation={!animated}
        style="width: {level * 20}%"
      ></span>
    </span>
  {:else if variant === 'compact'}
    <span class="threat-indicator__icon">{data.icon}</span>
    <span class="threat-indicator__dot {data.colorClass}"></span>
    {#if showLabel}
      <span class="threat-indicator__label">{data.label}</span>
    {/if}
  {:else if variant === 'badge'}
    <span class="threat-indicator__badge {data.colorClass}">
      {#if showLabel}
        <span class="threat-indicator__icon">{data.icon}</span>
        <span class="threat-indicator__label">{data.label}</span>
      {/if}
    </span>
  {/if}
</div>

<style>
  .threat-indicator {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-family: var(--font-terminal);
  }

  .threat-indicator__icon {
    font-size: var(--text-md);
    line-height: 1;
  }

  .threat-indicator__label {
    font-size: var(--text-sm);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .threat-indicator__bar {
    display: flex;
    align-items: center;
    height: 8px;
    background-color: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    overflow: hidden;
    flex: 1;
    min-width: 60px;
  }

  .threat-indicator__fill {
    height: 100%;
    transition: width 300ms ease-out;
  }

  .threat-indicator__fill--no-animation {
    transition: none;
  }

  .threat-indicator__fill.threat-indicator--1 {
    background-color: var(--color-threat-1);
  }

  .threat-indicator__fill.threat-indicator--2 {
    background-color: var(--color-threat-2);
  }

  .threat-indicator__fill.threat-indicator--3 {
    background-color: var(--color-threat-3);
  }

  .threat-indicator__fill.threat-indicator--4 {
    background-color: var(--color-threat-4);
  }

  .threat-indicator__fill.threat-indicator--5 {
    background-color: var(--color-threat-5);
  }

  .threat-indicator__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .threat-indicator__dot.threat-indicator--1 {
    background-color: var(--color-threat-1);
  }

  .threat-indicator__dot.threat-indicator--2 {
    background-color: var(--color-threat-2);
  }

  .threat-indicator__dot.threat-indicator--3 {
    background-color: var(--color-threat-3);
  }

  .threat-indicator__dot.threat-indicator--4 {
    background-color: var(--color-threat-4);
  }

  .threat-indicator__dot.threat-indicator--5 {
    background-color: var(--color-threat-5);
  }

  .threat-indicator__badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .threat-indicator__badge.threat-indicator--1 {
    background-color: rgba(51, 102, 255, 0.2);
    border: 1px solid var(--color-threat-1);
    color: var(--color-threat-1);
  }

  .threat-indicator__badge.threat-indicator--2 {
    background-color: rgba(51, 204, 102, 0.2);
    border: 1px solid var(--color-threat-2);
    color: var(--color-threat-2);
  }

  .threat-indicator__badge.threat-indicator--3 {
    background-color: rgba(255, 204, 0, 0.2);
    border: 1px solid var(--color-threat-3);
    color: var(--color-threat-3);
  }

  .threat-indicator__badge.threat-indicator--4 {
    background-color: rgba(255, 102, 0, 0.2);
    border: 1px solid var(--color-threat-4);
    color: var(--color-threat-4);
  }

  .threat-indicator__badge.threat-indicator--5 {
    background-color: rgba(204, 0, 0, 0.2);
    border: 1px solid var(--color-threat-5);
    color: var(--color-threat-5);
  }

  .threat-indicator--full {
    flex-direction: row;
    gap: var(--space-2);
  }

  .threat-indicator--compact {
    gap: var(--space-1);
  }

  .threat-indicator--badge {
    gap: var(--space-1);
  }

  .threat-indicator--severe.threat-indicator--animated {
    animation: threat-pulse 0.8s ease-in-out infinite;
  }

  @keyframes threat-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  .threat-indicator--full .threat-indicator__label {
    min-width: 70px;
  }

  @media (prefers-reduced-motion: reduce) {
    .threat-indicator--animated {
      animation: none;
    }

    .threat-indicator__fill {
      transition: none;
    }
  }
</style>
