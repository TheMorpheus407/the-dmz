<script lang="ts">
  import { type ThreatTier } from '@the-dmz/shared/constants';

  import type { ThreatHistoryDay } from './threat-monitor';

  interface Props {
    history: ThreatHistoryDay[];
  }

  const { history }: Props = $props();

  function getHistoryBarColor(level: ThreatTier | null): string {
    if (!level) return 'var(--color-bg-tertiary)';
    const colors: Record<ThreatTier, string> = {
      LOW: 'var(--color-threat-1)',
      GUARDED: 'var(--color-threat-2)',
      ELEVATED: 'var(--color-threat-3)',
      HIGH: 'var(--color-threat-4)',
      SEVERE: 'var(--color-threat-5)',
    };
    return colors[level] ?? colors['LOW'];
  }
</script>

<div class="threat-history-chart">
  <h3 id="history-heading" class="threat-history-chart__section-title">
    THREAT HISTORY (last 7 days)
  </h3>
  <div class="threat-history-chart__chart" role="img" aria-label="7-day threat history chart">
    <div class="threat-history-chart__labels">
      {#each history as day (day.day)}
        <span class="threat-history-chart__day-label">{day.label}</span>
      {/each}
    </div>
    <div class="threat-history-chart__bars">
      {#each history as day (day.day)}
        <div class="threat-history-chart__bar-container">
          <div
            class="threat-history-chart__bar"
            class:threat-history-chart__bar--breach={day.hasBreach}
            style="background-color: {getHistoryBarColor(day.threatLevel)}"
          ></div>
          {#if day.hasBreach}
            <span class="threat-history-chart__breach-marker" title="Breach occurred">✕</span>
          {/if}
        </div>
      {/each}
    </div>
    <div class="threat-history-chart__legend">
      <span class="threat-history-chart__legend-item"
        >L=Low, G=Guarded, E=Elev., H=High, S=Severe</span
      >
      <span class="threat-history-chart__legend-item">✕ = breach</span>
    </div>
  </div>
</div>

<style>
  .threat-history-chart {
    margin-bottom: var(--space-4);
  }

  .threat-history-chart__section-title {
    font-size: var(--text-sm);
    font-weight: 600;
    letter-spacing: 0.05em;
    margin: 0 0 var(--space-2) 0;
    color: var(--color-text-secondary);
  }

  .threat-history-chart__chart {
    padding: var(--space-3);
    background-color: var(--color-bg-secondary);
    border-radius: var(--radius-sm);
  }

  .threat-history-chart__labels {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--space-2);
  }

  .threat-history-chart__day-label {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    text-align: center;
    flex: 1;
  }

  .threat-history-chart__bars {
    display: flex;
    gap: var(--space-1);
    height: 40px;
    align-items: flex-end;
    margin-bottom: var(--space-2);
  }

  .threat-history-chart__bar-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    position: relative;
  }

  .threat-history-chart__bar {
    width: 100%;
    border-radius: 2px 2px 0 0;
    min-height: 4px;
    transition: height 300ms ease-out;
  }

  .threat-history-chart__bar--breach {
    position: relative;
  }

  .threat-history-chart__breach-marker {
    position: absolute;
    top: 0;
    color: var(--color-danger);
    font-weight: 700;
    font-size: var(--text-sm);
  }

  .threat-history-chart__legend {
    display: flex;
    justify-content: space-between;
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
  }

  .threat-history-chart__legend-item {
    flex: 1;
  }

  @media (max-width: 768px) {
    .threat-history-chart__bars {
      height: 30px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .threat-history-chart__bar {
      transition: none;
    }
  }
</style>
