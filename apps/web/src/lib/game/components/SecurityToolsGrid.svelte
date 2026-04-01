<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';

  import type { SecurityTool, SecurityToolStatus } from './threat-monitor';

  interface Props {
    tools: SecurityTool[];
    focusedToolIndex?: number;
    onPurchaseTool?: (toolId: string) => void;
  }

  const { tools, focusedToolIndex = -1, onPurchaseTool }: Props = $props();

  function getToolStatusColor(status: SecurityToolStatus): string {
    const colors: Record<SecurityToolStatus, string> = {
      ACTIVE: 'var(--color-safe)',
      NOT_INSTALLED: 'var(--color-muted)',
      OFFLINE: 'var(--color-warning)',
    };
    return colors[status];
  }
</script>

<div class="security-tools-grid">
  <h3 id="security-tools-heading" class="security-tools-grid__section-title">
    SECURITY TOOL STATUS
  </h3>
  <ul class="security-tools-grid__tools-list" role="list">
    {#each tools as tool, index (tool.id)}
      {@const isFocused = focusedToolIndex === index}
      <li
        class="security-tools-grid__tool-item"
        class:security-tools-grid__tool-item--focused={isFocused}
      >
        <div class="security-tools-grid__tool-header">
          <span class="security-tools-grid__tool-icon">{tool.icon}</span>
          <span class="security-tools-grid__tool-name">{tool.name}</span>
        </div>
        <div
          class="security-tools-grid__tool-status"
          style="color: {getToolStatusColor(tool.status)}"
        >
          [{tool.status}]
        </div>
        {#if tool.status === 'ACTIVE' && tool.dailyMetrics.blockingCount !== undefined}
          <div class="security-tools-grid__tool-metrics">
            Blocking: {tool.dailyMetrics.blockingCount} today
          </div>
        {:else if tool.status === 'ACTIVE' && tool.dailyMetrics.alerts !== undefined}
          <div class="security-tools-grid__tool-metrics">
            Alerts: {tool.dailyMetrics.alerts} today
          </div>
        {:else if tool.status === 'ACTIVE' && tool.dailyMetrics.flagged !== undefined}
          <div class="security-tools-grid__tool-metrics">
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
</div>

<style>
  .security-tools-grid {
    margin-bottom: var(--space-4);
  }

  .security-tools-grid__section-title {
    font-size: var(--text-sm);
    font-weight: 600;
    letter-spacing: 0.05em;
    margin: 0 0 var(--space-2) 0;
    color: var(--color-text-secondary);
  }

  .security-tools-grid__tools-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--space-2);
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .security-tools-grid__tool-item {
    padding: var(--space-2);
    background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
  }

  .security-tools-grid__tool-item--focused {
    outline: 2px solid var(--color-focus);
    outline-offset: -2px;
  }

  .security-tools-grid__tool-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-1);
  }

  .security-tools-grid__tool-icon {
    font-size: var(--text-md);
  }

  .security-tools-grid__tool-name {
    font-size: var(--text-sm);
    font-weight: 600;
  }

  .security-tools-grid__tool-status {
    font-size: var(--text-xs);
    font-weight: 600;
    margin-bottom: var(--space-1);
  }

  .security-tools-grid__tool-metrics {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
  }

  @media (max-width: 768px) {
    .security-tools-grid__tools-list {
      grid-template-columns: 1fr;
    }
  }
</style>
