<script lang="ts">
  import { type ThreatTier } from '@the-dmz/shared/constants';

  import ThreatLevelDisplay from './ThreatLevelDisplay.svelte';
  import ActiveThreatsList from './ActiveThreatsList.svelte';
  import SecurityToolsGrid from './SecurityToolsGrid.svelte';
  import ThreatHistoryChart from './ThreatHistoryChart.svelte';

  import type { ThreatMonitorData } from './threat-monitor';

  interface Props {
    data: ThreatMonitorData;
    onViewThreatDetails?: (threatId: string) => void;
    onPurchaseTool?: (toolId: string) => void;
  }

  const { data, onViewThreatDetails, onPurchaseTool }: Props = $props();

  const threatLevel = $derived(data.currentThreatLevel);

  let focusedIndex = $state(-1);
  const totalFocusableElements = $derived(
    data.activeThreats.length +
      data.securityTools.filter((t) => t.status === 'NOT_INSTALLED').length,
  );

  const focusedThreatIndex = $derived(
    focusedIndex >= 0 && focusedIndex < data.activeThreats.length ? focusedIndex : -1,
  );

  const focusedToolIndex = $derived(() => {
    const notInstalledCount = data.securityTools.filter((t) => t.status === 'NOT_INSTALLED').length;
    const threatCount = data.activeThreats.length;
    if (focusedIndex >= threatCount && focusedIndex < threatCount + notInstalledCount) {
      return focusedIndex - threatCount;
    }
    return -1;
  });

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
        if (threat && onViewThreatDetails) {
          onViewThreatDetails(threat.id);
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

  <ThreatLevelDisplay
    {threatLevel}
    threatLevelSince={data.threatLevelSince}
    threatLevelSinceDay={data.threatLevelSinceDay}
  />

  <ActiveThreatsList
    threats={data.activeThreats}
    focusedIndex={focusedThreatIndex}
    {...onViewThreatDetails ? { onViewThreatDetails } : {}}
  />

  <SecurityToolsGrid
    tools={data.securityTools}
    focusedToolIndex={focusedToolIndex()}
    {...onPurchaseTool ? { onPurchaseTool } : {}}
  />

  <ThreatHistoryChart history={data.threatHistory} />
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
</style>
