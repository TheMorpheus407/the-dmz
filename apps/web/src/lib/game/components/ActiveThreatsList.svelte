<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';

  import type { ActiveThreat, ThreatStatus } from './threat-monitor';

  interface Props {
    threats: ActiveThreat[];
    focusedIndex?: number;
    onViewThreatDetails?: (threatId: string) => void;
    onThreatExpandToggle?: (threatId: string) => void;
  }

  const { threats, focusedIndex = -1, onViewThreatDetails, onThreatExpandToggle }: Props = $props();

  let expandedThreats = $state<string[]>([]);

  function toggleThreatExpand(threatId: string) {
    if (expandedThreats.includes(threatId)) {
      expandedThreats = expandedThreats.filter((id) => id !== threatId);
    } else {
      expandedThreats = [...expandedThreats, threatId];
    }
    onThreatExpandToggle?.(threatId);
  }

  function isThreatExpanded(threatId: string): boolean {
    return expandedThreats.includes(threatId);
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
</script>

<div class="active-threats-list">
  <h3 id="active-threats-heading" class="active-threats-list__section-title">ACTIVE THREATS</h3>
  {#if threats.length === 0}
    <p class="active-threats-list__empty">No active threats detected.</p>
  {:else}
    <ul class="active-threats-list__threats-list" role="list">
      {#each threats as threat, index (threat.id)}
        {@const isExpanded = isThreatExpanded(threat.id)}
        {@const isFocused = focusedIndex === index}
        <li
          class="active-threats-list__threat-item"
          class:active-threats-list__threat-item--expanded={isExpanded}
          class:active-threats-list__threat-item--focused={isFocused}
        >
          <button
            class="active-threats-list__threat-header"
            type="button"
            onclick={() => toggleThreatExpand(threat.id)}
            aria-expanded={isExpanded}
          >
            <span
              class="active-threats-list__threat-icon"
              class:active-threats-list__threat-icon--active={threat.status === 'ACTIVE'}
            >
              {threat.status === 'ACTIVE' ? '[!]' : '[ ]'}
            </span>
            <span class="active-threats-list__threat-name">{threat.name}</span>
            <span class="active-threats-list__threat-type">-- {threat.type}</span>
            {#if isExpanded}
              <span class="active-threats-list__expand-icon">▼</span>
            {:else}
              <span class="active-threats-list__expand-icon">▶</span>
            {/if}
          </button>
          {#if isExpanded}
            <div class="active-threats-list__threat-details">
              <p class="active-threats-list__threat-description">{threat.description}</p>
              <p class="active-threats-list__threat-timestamp">
                Detected: Day {threat.detectedDay} | Status:
                <span style="color: {getStatusColor(threat.status)}">{threat.status}</span>
              </p>
              <div class="active-threats-list__threat-metrics">
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
</div>

<style>
  .active-threats-list__section-title {
    font-size: var(--text-sm);
    font-weight: 600;
    letter-spacing: 0.05em;
    margin: 0 0 var(--space-2) 0;
    color: var(--color-text-secondary);
  }

  .active-threats-list {
    margin-bottom: var(--space-4);
  }

  .active-threats-list__threats-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .active-threats-list__threat-item {
    border: 1px solid var(--color-border);
    margin-bottom: var(--space-2);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .active-threats-list__threat-item--focused {
    outline: 2px solid var(--color-focus);
    outline-offset: -2px;
  }

  .active-threats-list__threat-header {
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

  .active-threats-list__threat-header:hover {
    background-color: var(--color-bg-tertiary);
  }

  .active-threats-list__threat-icon {
    font-weight: 600;
  }

  .active-threats-list__threat-icon--active {
    color: var(--color-danger);
  }

  .active-threats-list__threat-name {
    font-weight: 600;
  }

  .active-threats-list__threat-type {
    flex: 1;
    color: var(--color-text-secondary);
  }

  .active-threats-list__expand-icon {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
  }

  .active-threats-list__threat-details {
    padding: var(--space-3);
    background-color: var(--color-bg-primary);
    border-top: 1px solid var(--color-border);
  }

  .active-threats-list__threat-description {
    margin: 0 0 var(--space-2) 0;
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .active-threats-list__threat-timestamp {
    margin: 0 0 var(--space-2) 0;
    font-size: var(--text-sm);
  }

  .active-threats-list__threat-metrics {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    margin-bottom: var(--space-2);
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  .active-threats-list__empty {
    color: var(--color-text-secondary);
    font-size: var(--text-sm);
    font-style: italic;
  }
</style>
