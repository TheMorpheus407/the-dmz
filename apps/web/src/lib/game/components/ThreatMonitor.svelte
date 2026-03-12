<script lang="ts">
  import {
    THREAT_TIER_METADATA,
    THREAT_TIER_RANKS,
    type ThreatTier,
  } from '@the-dmz/shared/constants';
  import Button from '$lib/ui/components/Button.svelte';

  import type { ThreatMonitorData, ThreatStatus, SecurityToolStatus } from './threat-monitor';

  interface Props {
    data: ThreatMonitorData;
    onViewThreatDetails?: (threatId: string) => void;
    onPurchaseTool?: (toolId: string) => void;
  }

  const { data, onViewThreatDetails, onPurchaseTool }: Props = $props();

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  const threatLevel = $derived(data.currentThreatLevel as ThreatTier);

  const threatData = $derived(THREAT_TIER_METADATA[threatLevel] || THREAT_TIER_METADATA.LOW);

  const threatLevelNumeric = $derived(THREAT_TIER_RANKS[threatLevel] || 1);

  const shieldIcons: Record<ThreatTier, string> = {
    LOW: '🛡',
    GUARDED: '🛡',
    ELEVATED: '🛡',
    HIGH: '⚠',
    SEVERE: '✕',
  };

  const shieldStates: Record<ThreatTier, string> = {
    LOW: 'pristine',
    GUARDED: 'pristine',
    ELEVATED: 'damaged',
    HIGH: 'cracked',
    SEVERE: 'broken',
  };

  const shieldIcon = $derived(shieldIcons[threatLevel] || '🛡');
  const shieldState = $derived(shieldStates[threatLevel] || 'pristine');

  function getThreatColor(level: ThreatTier): string {
    const colors: Record<ThreatTier, string> = {
      LOW: 'var(--color-threat-1)',
      GUARDED: 'var(--color-threat-2)',
      ELEVATED: 'var(--color-threat-3)',
      HIGH: 'var(--color-threat-4)',
      SEVERE: 'var(--color-threat-5)',
    };
    return colors[level] || colors.LOW;
  }

  function getStatusColor(status: ThreatStatus): string {
    const colors: Record<ThreatStatus, string> = {
      ACTIVE: 'var(--color-danger)',
      MONITORING: 'var(--color-warning)',
      CONTAINED: 'var(--color-info)',
      RESOLVED: 'var(--color-safe)',
    };
    return colors[status];
  }

  function getToolStatusColor(status: SecurityToolStatus): string {
    const colors: Record<SecurityToolStatus, string> = {
      ACTIVE: 'var(--color-safe)',
      NOT_INSTALLED: 'var(--color-muted)',
      OFFLINE: 'var(--color-warning)',
    };
    return colors[status];
  }

  function getHistoryBarColor(level: ThreatTier | null): string {
    if (!level) return 'var(--color-bg-tertiary)';
    return getThreatColor(level);
  }

  let expandedThreats = $state<string[]>([]);

  function toggleThreatExpand(threatId: string) {
    if (expandedThreats.includes(threatId)) {
      expandedThreats = expandedThreats.filter((id) => id !== threatId);
    } else {
      expandedThreats = [...expandedThreats, threatId];
    }
  }

  function isThreatExpanded(threatId: string): boolean {
    return expandedThreats.includes(threatId);
  }

  let focusedIndex = $state(-1);
  const totalFocusableElements = $derived(
    data.activeThreats.length +
      data.securityTools.filter((t) => t.status === 'NOT_INSTALLED').length,
  );

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'j') {
      event.preventDefault();
      focusedIndex = Math.min(focusedIndex + 1, totalFocusableElements - 1);
    } else if (event.key === 'ArrowUp' || event.key === 'k') {
      event.preventDefault();
      focusedIndex = Math.max(focusedIndex - 1, 0);
    } else if (event.key === 'Enter' || event.key === ' ') {
      if (focusedIndex < data.activeThreats.length) {
        const threat = data.activeThreats[focusedIndex];
        if (threat) {
          toggleThreatExpand(threat.id);
        }
      } else {
        const toolIndex = focusedIndex - data.activeThreats.length;
        const notInstalledTools = data.securityTools.filter((t) => t.status === 'NOT_INSTALLED');
        const tool = notInstalledTools[toolIndex];
        if (tool && tool.cost && onPurchaseTool) {
          onPurchaseTool(tool.id);
        }
      }
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="threat-monitor"
  role="application"
  aria-label="Threat Monitor"
  tabindex="0"
  onkeydown={handleKeyDown}
>
  <header class="threat-monitor__header">
    <h2 class="threat-monitor__title">THREAT MONITOR</h2>
  </header>

  <section class="threat-monitor__current-threat" aria-labelledby="current-threat-heading">
    <h3 id="current-threat-heading" class="threat-monitor__section-title">CURRENT THREAT LEVEL</h3>
    <div class="threat-monitor__threat-level">
      <div class="threat-monitor__level-bar">
        {#each Array(5) as _, i (i)}
          <div
            class="threat-monitor__level-segment"
            class:threat-monitor__level-segment--filled={i < threatLevelNumeric}
            class:threat-monitor__level-segment--active={i < threatLevelNumeric}
            style="--segment-color: {i < threatLevelNumeric
              ? getThreatColor(threatLevel)
              : 'var(--color-bg-tertiary)'}"
          ></div>
        {/each}
      </div>
      <span
        class="threat-monitor__level-label"
        style="color: {getThreatColor(data.currentThreatLevel)}"
      >
        {threatData.label} ({threatLevelNumeric}/5)
      </span>
    </div>
    <div class="threat-monitor__shield-info">
      <span
        class="threat-monitor__shield-icon"
        class:threat-monitor__shield-icon--severe={threatLevel === 'SEVERE'}
      >
        {shieldIcon}
      </span>
      <span class="threat-monitor__shield-state">
        Shield: {shieldState.toUpperCase()}
      </span>
    </div>
    <div class="threat-monitor__since">
      Since: Day {data.threatLevelSinceDay}, {data.threatLevelSince}
    </div>
  </section>

  <section class="threat-monitor__active-threats" aria-labelledby="active-threats-heading">
    <h3 id="active-threats-heading" class="threat-monitor__section-title">ACTIVE THREATS</h3>
    {#if data.activeThreats.length === 0}
      <p class="threat-monitor__empty">No active threats detected.</p>
    {:else}
      <ul class="threat-monitor__threats-list" role="list">
        {#each data.activeThreats as threat, index (threat.id)}
          {@const isExpanded = isThreatExpanded(threat.id)}
          {@const isFocused = focusedIndex === index}
          <li
            class="threat-monitor__threat-item"
            class:threat-monitor__threat-item--expanded={isExpanded}
            class:threat-monitor__threat-item--focused={isFocused}
          >
            <button
              class="threat-monitor__threat-header"
              type="button"
              onclick={() => toggleThreatExpand(threat.id)}
              aria-expanded={isExpanded}
            >
              <span
                class="threat-monitor__threat-icon"
                class:threat-monitor__threat-icon--active={threat.status === 'ACTIVE'}
              >
                {threat.status === 'ACTIVE' ? '[!]' : '[ ]'}
              </span>
              <span class="threat-monitor__threat-name">{threat.name}</span>
              <span class="threat-monitor__threat-type">-- {threat.type}</span>
              {#if isExpanded}
                <span class="threat-monitor__expand-icon">▼</span>
              {:else}
                <span class="threat-monitor__expand-icon">▶</span>
              {/if}
            </button>
            {#if isExpanded}
              <div class="threat-monitor__threat-details">
                <p class="threat-monitor__threat-description">{threat.description}</p>
                <p class="threat-monitor__threat-timestamp">
                  Detected: Day {threat.detectedDay} | Status:
                  <span style="color: {getStatusColor(threat.status)}">{threat.status}</span>
                </p>
                <div class="threat-monitor__threat-metrics">
                  {#if threat.metrics.intercepted !== undefined}
                    <span>Emails intercepted: {threat.metrics.intercepted}</span>
                  {/if}
                  {#if threat.metrics.missed !== undefined}
                    <span>Emails missed: {threat.metrics.missed}</span>
                  {/if}
                  {#if threat.metrics.blocked !== undefined}
                    <span>Probes blocked: {threat.metrics.blocked}</span>
                  {/if}
                  {#if threat.metrics.alerts !== undefined}
                    <span>Alerts: {threat.metrics.alerts}</span>
                  {/if}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onclick={() => onViewThreatDetails?.(threat.id)}
                >
                  VIEW DETAILS
                </Button>
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="threat-monitor__security-tools" aria-labelledby="security-tools-heading">
    <h3 id="security-tools-heading" class="threat-monitor__section-title">SECURITY TOOL STATUS</h3>
    <ul class="threat-monitor__tools-grid" role="list">
      {#each data.securityTools as tool (tool.id)}
        <li class="threat-monitor__tool-item">
          <div class="threat-monitor__tool-header">
            <span class="threat-monitor__tool-icon">{tool.icon}</span>
            <span class="threat-monitor__tool-name">{tool.name}</span>
          </div>
          <div class="threat-monitor__tool-status" style="color: {getToolStatusColor(tool.status)}">
            [{tool.status}]
          </div>
          {#if tool.status === 'ACTIVE' && tool.dailyMetrics.blockingCount !== undefined}
            <div class="threat-monitor__tool-metrics">
              Blocking: {tool.dailyMetrics.blockingCount} today
            </div>
          {:else if tool.status === 'ACTIVE' && tool.dailyMetrics.alerts !== undefined}
            <div class="threat-monitor__tool-metrics">
              Alerts: {tool.dailyMetrics.alerts} today
            </div>
          {:else if tool.status === 'ACTIVE' && tool.dailyMetrics.flagged !== undefined}
            <div class="threat-monitor__tool-metrics">
              Flagged: {tool.dailyMetrics.flagged} today
            </div>
          {:else if tool.status === 'NOT_INSTALLED' && tool.cost}
            <Button variant="primary" size="sm" onclick={() => onPurchaseTool?.(tool.id)}>
              BUY: {tool.cost.toLocaleString()} CR
            </Button>
          {/if}
        </li>
      {/each}
    </ul>
  </section>

  <section class="threat-monitor__history" aria-labelledby="history-heading">
    <h3 id="history-heading" class="threat-monitor__section-title">THREAT HISTORY (last 7 days)</h3>
    <div class="threat-monitor__history-chart" role="img" aria-label="7-day threat history chart">
      <div class="threat-monitor__history-labels">
        {#each data.threatHistory as day (day.day)}
          <span class="threat-monitor__history-day-label">{day.label}</span>
        {/each}
      </div>
      <div class="threat-monitor__history-bars">
        {#each data.threatHistory as day (day.day)}
          <div class="threat-monitor__history-bar-container">
            <div
              class="threat-monitor__history-bar"
              class:threat-monitor__history-bar--breach={day.hasBreach}
              style="background-color: {getHistoryBarColor(day.threatLevel)}"
            ></div>
            {#if day.hasBreach}
              <span class="threat-monitor__breach-marker" title="Breach occurred">✕</span>
            {/if}
          </div>
        {/each}
      </div>
      <div class="threat-monitor__history-legend">
        <span class="threat-monitor__legend-item">L=Low, G=Guarded, E=Elev., H=High, S=Severe</span>
        <span class="threat-monitor__legend-item">✕ = breach</span>
      </div>
    </div>
  </section>
</div>

<style>
  .threat-monitor {
    font-family: var(--font-terminal);
    background-color: var(--color-bg-primary);
    color: var(--color-text-primary);
    padding: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    max-width: 100%;
    overflow-x: auto;
  }

  .threat-monitor:focus {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .threat-monitor__header {
    border-bottom: 1px solid var(--color-border);
    padding-bottom: var(--space-2);
    margin-bottom: var(--space-4);
  }

  .threat-monitor__title {
    font-size: var(--text-lg);
    font-weight: 700;
    letter-spacing: 0.1em;
    margin: 0;
    color: var(--color-text-primary);
  }

  .threat-monitor__section-title {
    font-size: var(--text-sm);
    font-weight: 600;
    letter-spacing: 0.05em;
    margin: 0 0 var(--space-2) 0;
    color: var(--color-text-secondary);
  }

  .threat-monitor__current-threat {
    margin-bottom: var(--space-4);
    padding: var(--space-3);
    background-color: var(--color-bg-secondary);
    border-radius: var(--radius-sm);
  }

  .threat-monitor__threat-level {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-2);
  }

  .threat-monitor__level-bar {
    display: flex;
    gap: 2px;
    flex: 1;
    max-width: 200px;
  }

  .threat-monitor__level-segment {
    height: 12px;
    flex: 1;
    background-color: var(--color-bg-tertiary);
    border-radius: 2px;
    transition: background-color 300ms ease-out;
  }

  .threat-monitor__level-segment--filled {
    background-color: var(--segment-color);
  }

  .threat-monitor__level-label {
    font-size: var(--text-sm);
    font-weight: 600;
  }

  .threat-monitor__shield-info {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .threat-monitor__shield-icon {
    font-size: var(--text-xl);
  }

  .threat-monitor__shield-icon--severe {
    animation: shield-pulse 0.8s ease-in-out infinite;
  }

  @keyframes shield-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .threat-monitor__shield-state {
    font-size: var(--text-sm);
  }

  .threat-monitor__since {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .threat-monitor__active-threats {
    margin-bottom: var(--space-4);
  }

  .threat-monitor__threats-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .threat-monitor__threat-item {
    border: 1px solid var(--color-border);
    margin-bottom: var(--space-2);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .threat-monitor__threat-item--focused {
    outline: 2px solid var(--color-focus);
    outline-offset: -2px;
  }

  .threat-monitor__threat-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-2) var(--space-3);
    background-color: var(--color-bg-secondary);
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: var(--text-sm);
    color: var(--color-text-primary);
    text-align: left;
  }

  .threat-monitor__threat-header:hover {
    background-color: var(--color-bg-tertiary);
  }

  .threat-monitor__threat-icon {
    font-weight: 600;
  }

  .threat-monitor__threat-icon--active {
    color: var(--color-danger);
  }

  .threat-monitor__threat-name {
    font-weight: 600;
  }

  .threat-monitor__threat-type {
    flex: 1;
    color: var(--color-text-secondary);
  }

  .threat-monitor__expand-icon {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
  }

  .threat-monitor__threat-details {
    padding: var(--space-3);
    background-color: var(--color-bg-primary);
    border-top: 1px solid var(--color-border);
  }

  .threat-monitor__threat-description {
    margin: 0 0 var(--space-2) 0;
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .threat-monitor__threat-timestamp {
    margin: 0 0 var(--space-2) 0;
    font-size: var(--text-sm);
  }

  .threat-monitor__threat-metrics {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    margin-bottom: var(--space-2);
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .threat-monitor__empty {
    color: var(--color-text-secondary);
    font-size: var(--text-sm);
    font-style: italic;
  }

  .threat-monitor__security-tools {
    margin-bottom: var(--space-4);
  }

  .threat-monitor__tools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--space-2);
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .threat-monitor__tool-item {
    padding: var(--space-2);
    background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
  }

  .threat-monitor__tool-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-1);
  }

  .threat-monitor__tool-icon {
    font-size: var(--text-md);
  }

  .threat-monitor__tool-name {
    font-size: var(--text-sm);
    font-weight: 600;
  }

  .threat-monitor__tool-status {
    font-size: var(--text-xs);
    font-weight: 600;
    margin-bottom: var(--space-1);
  }

  .threat-monitor__tool-metrics {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
  }

  .threat-monitor__history {
    margin-bottom: var(--space-4);
  }

  .threat-monitor__history-chart {
    padding: var(--space-3);
    background-color: var(--color-bg-secondary);
    border-radius: var(--radius-sm);
  }

  .threat-monitor__history-labels {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--space-2);
  }

  .threat-monitor__history-day-label {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    text-align: center;
    flex: 1;
  }

  .threat-monitor__history-bars {
    display: flex;
    gap: var(--space-1);
    height: 40px;
    align-items: flex-end;
    margin-bottom: var(--space-2);
  }

  .threat-monitor__history-bar-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    position: relative;
  }

  .threat-monitor__history-bar {
    width: 100%;
    border-radius: 2px 2px 0 0;
    min-height: 4px;
    transition: height 300ms ease-out;
  }

  .threat-monitor__history-bar--breach {
    position: relative;
  }

  .threat-monitor__breach-marker {
    position: absolute;
    top: 0;
    color: var(--color-danger);
    font-weight: 700;
    font-size: var(--text-sm);
  }

  .threat-monitor__history-legend {
    display: flex;
    justify-content: space-between;
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
  }

  .threat-monitor__legend-item {
    flex: 1;
  }

  @media (max-width: 768px) {
    .threat-monitor__tools-grid {
      grid-template-columns: 1fr;
    }

    .threat-monitor__level-bar {
      max-width: 150px;
    }

    .threat-monitor__history-bars {
      height: 30px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .threat-monitor__level-segment {
      transition: none;
    }

    .threat-monitor__history-bar {
      transition: none;
    }

    .threat-monitor__shield-icon--severe {
      animation: none;
    }
  }
</style>
