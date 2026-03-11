<script lang="ts">
  import { formatTimestamp } from './document-viewer';

  interface ResourceMetric {
    current: number;
    max: number;
    status: 'ok' | 'warning' | 'critical';
    name?: string;
    unit?: string;
  }

  interface SystemHealth {
    systemId: string;
    name: string;
    status: 'online' | 'degraded' | 'offline';
    uptime: string;
    lastAlert?: string;
  }

  interface FacilityStatusReportData {
    reportId: string;
    facilityName: string;
    generatedAt: string;
    resources: {
      rackSpace: ResourceMetric;
      power: ResourceMetric;
      cooling: ResourceMetric;
      bandwidth: ResourceMetric;
    };
    systems: SystemHealth[];
    activeIncidents: number;
    healthScore: number;
  }

  interface Props {
    data: FacilityStatusReportData;
    highlightedFieldId?: string | null;
    onFieldClick?: (documentId: string, field: string) => void;
    onLinkClick?: (url: string) => void;
  }

  const { data, highlightedFieldId = null, onFieldClick, onLinkClick }: Props = $props();

  function getResourcePercentage(current: number, max: number): number {
    return Math.round((current / max) * 100);
  }

  function getResourceColor(status: ResourceMetric['status']): string {
    const colors = {
      ok: 'var(--color-safe)',
      warning: 'var(--color-warning)',
      critical: 'var(--color-danger)',
    };
    return colors[status];
  }

  function getSystemStatusColor(status: SystemHealth['status']): string {
    const colors = {
      online: 'var(--color-safe)',
      degraded: 'var(--color-warning)',
      offline: 'var(--color-danger)',
    };
    return colors[status];
  }

  function getHealthScoreColor(score: number): string {
    if (score >= 80) return 'var(--color-safe)';
    if (score >= 50) return 'var(--color-warning)';
    return 'var(--color-danger)';
  }

  function isFieldHighlighted(fieldId: string): boolean {
    return highlightedFieldId === fieldId;
  }

  function handleFieldClick(fieldId: string) {
    onFieldClick?.(data.reportId, fieldId);
  }

  function handleLinkClick(url: string, event: MouseEvent) {
    event.preventDefault();
    onLinkClick?.(url);
  }
</script>

<div class="facility-report" role="region" aria-labelledby="report-title">
  <header class="report__header">
    <h1 id="report-title" class="report__title">FACILITY STATUS REPORT</h1>
    <div class="report__meta">
      <span class="report__meta-item">
        <span class="report__label">Facility:</span>
        {data.facilityName}
      </span>
      <span class="report__meta-divider">|</span>
      <button
        type="button"
        class="report__meta-item report__meta-link"
        class:report__meta-link--highlighted={isFieldHighlighted('reportId')}
        onclick={() => handleFieldClick('reportId')}
      >
        <span class="report__label">Report ID:</span>
        #{data.reportId.slice(0, 8)}
      </button>
      <span class="report__meta-divider">|</span>
      <span class="report__meta-item">
        <span class="report__label">Generated:</span>
        {formatTimestamp(data.generatedAt)}
      </span>
    </div>
    <div class="report__links">
      <a
        href="internal://facility/metrics"
        class="report__link"
        onclick={(e) => handleLinkClick('internal://facility/metrics', e)}
      >
        [Detailed Metrics]
      </a>
      <a
        href="internal://facility/alerts"
        class="report__link"
        onclick={(e) => handleLinkClick('internal://facility/alerts', e)}
      >
        [Active Alerts]
      </a>
    </div>
  </header>

  <div class="report__health">
    <div class="report__health-score">
      <span class="report__health-label">HEALTH SCORE</span>
      <span class="report__health-value" style="color: {getHealthScoreColor(data.healthScore)}">
        {data.healthScore}%
      </span>
    </div>
    {#if data.activeIncidents > 0}
      <div class="report__incidents">
        <span class="report__incidents-label">ACTIVE INCIDENTS:</span>
        <span class="report__incidents-value">{data.activeIncidents}</span>
      </div>
    {/if}
  </div>

  <div class="report__resources">
    <h2 class="report__section-title">RESOURCE METRICS</h2>

    <div class="report__resource">
      <div class="report__resource-header">
        <span class="report__resource-name">{data.resources.rackSpace.name ?? 'Rack Space'}</span>
        <span class="report__resource-value">
          {data.resources.rackSpace.current}/{data.resources.rackSpace.max}
          {data.resources.rackSpace.unit ?? 'U'} ({getResourcePercentage(
            data.resources.rackSpace.current,
            data.resources.rackSpace.max,
          )}%)
        </span>
      </div>
      <div class="report__resource-bar">
        <div
          class="report__resource-fill"
          style="width: {getResourcePercentage(
            data.resources.rackSpace.current,
            data.resources.rackSpace.max,
          )}%; background-color: {getResourceColor(data.resources.rackSpace.status)};"
        ></div>
      </div>
    </div>

    <div class="report__resource">
      <div class="report__resource-header">
        <span class="report__resource-name">Power</span>
        <span class="report__resource-value">
          {data.resources.power.current}/{data.resources.power.max} kW ({getResourcePercentage(
            data.resources.power.current,
            data.resources.power.max,
          )}%)
        </span>
      </div>
      <div class="report__resource-bar">
        <div
          class="report__resource-fill"
          style="width: {getResourcePercentage(
            data.resources.power.current,
            data.resources.power.max,
          )}%; background-color: {getResourceColor(data.resources.power.status)};"
        ></div>
      </div>
    </div>

    <div class="report__resource">
      <div class="report__resource-header">
        <span class="report__resource-name">Cooling</span>
        <span class="report__resource-value">
          {data.resources.cooling.current}/{data.resources.cooling.max} ton ({getResourcePercentage(
            data.resources.cooling.current,
            data.resources.cooling.max,
          )}%)
        </span>
      </div>
      <div class="report__resource-bar">
        <div
          class="report__resource-fill"
          style="width: {getResourcePercentage(
            data.resources.cooling.current,
            data.resources.cooling.max,
          )}%; background-color: {getResourceColor(data.resources.cooling.status)};"
        ></div>
      </div>
    </div>

    <div class="report__resource">
      <div class="report__resource-header">
        <span class="report__resource-name">Bandwidth</span>
        <span class="report__resource-value">
          {data.resources.bandwidth.current}/{data.resources.bandwidth.max} Mbps ({getResourcePercentage(
            data.resources.bandwidth.current,
            data.resources.bandwidth.max,
          )}%)
        </span>
      </div>
      <div class="report__resource-bar">
        <div
          class="report__resource-fill"
          style="width: {getResourcePercentage(
            data.resources.bandwidth.current,
            data.resources.bandwidth.max,
          )}%; background-color: {getResourceColor(data.resources.bandwidth.status)};"
        ></div>
      </div>
    </div>
  </div>

  <div class="report__systems">
    <h2 class="report__section-title">SYSTEM STATUS</h2>
    <table class="report__systems-table">
      <thead>
        <tr>
          <th>System</th>
          <th>Status</th>
          <th>Uptime</th>
        </tr>
      </thead>
      <tbody>
        {#each data.systems as system (system.systemId)}
          <tr>
            <td class="report__system-name">{system.name}</td>
            <td>
              <span
                class="report__system-status"
                style="color: {getSystemStatusColor(system.status)}"
              >
                {system.status.toUpperCase()}
              </span>
            </td>
            <td class="report__system-uptime">{system.uptime}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .facility-report {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text);
  }

  .report__header {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-bottom: var(--space-3);
    border-bottom: var(--border-default);
  }

  .report__title {
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--color-amber);
    margin: 0;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .report__meta {
    display: flex;
    gap: var(--space-2);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .report__meta-item {
    display: flex;
    gap: var(--space-1);
  }

  .report__label {
    color: var(--color-phosphor-green-dim);
  }

  .report__meta-divider {
    color: var(--color-phosphor-green-dark);
  }

  .report__meta-link {
    background: none;
    border: none;
    padding: 0;
    font-family: inherit;
    font-size: inherit;
    color: inherit;
    cursor: pointer;
    text-decoration: none;
    display: flex;
    gap: var(--space-1);
  }

  .report__meta-link:hover {
    color: var(--color-amber);
  }

  .report__meta-link:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .report__meta-link--highlighted {
    background-color: var(--color-warning);
    color: var(--color-bg-primary);
    padding: 2px 4px;
    border-radius: var(--radius-sm);
  }

  .report__links {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-2);
  }

  .report__link {
    font-size: var(--text-xs);
    color: var(--color-info);
    text-decoration: none;
    cursor: pointer;
    transition: color 150ms ease;
  }

  .report__link:hover {
    color: var(--color-amber);
    text-decoration: underline;
  }

  .report__link:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .report__health {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .report__health-score {
    display: flex;
    flex-direction: column;
    gap: var(--space-0);
  }

  .report__health-label {
    font-size: var(--text-xs);
    color: var(--color-amber);
    font-weight: 600;
    letter-spacing: 0.05em;
  }

  .report__health-value {
    font-size: var(--text-2xl);
    font-weight: 700;
  }

  .report__incidents {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-0);
  }

  .report__incidents-label {
    font-size: var(--text-xs);
    color: var(--color-danger);
    font-weight: 600;
    letter-spacing: 0.05em;
  }

  .report__incidents-value {
    font-size: var(--text-xl);
    font-weight: 700;
    color: var(--color-danger);
  }

  .report__resources {
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .report__section-title {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-amber);
    margin: 0 0 var(--space-3) 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .report__resource {
    margin-bottom: var(--space-3);
  }

  .report__resource:last-child {
    margin-bottom: 0;
  }

  .report__resource-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--space-1);
  }

  .report__resource-name {
    font-weight: 600;
    color: var(--color-text-document);
  }

  .report__resource-value {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .report__resource-bar {
    height: 16px;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-phosphor-green-dark);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .report__resource-fill {
    height: 100%;
    transition:
      width 300ms ease,
      background-color 300ms ease;
  }

  .report__systems {
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .report__systems-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-xs);
  }

  .report__systems-table th,
  .report__systems-table td {
    padding: var(--space-2);
    text-align: left;
    border-bottom: 1px solid var(--color-phosphor-green-dark);
  }

  .report__systems-table th {
    font-weight: var(--font-weight-bold);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .report__systems-table td {
    color: var(--color-text-primary);
  }

  .report__systems-table tr:hover {
    background: var(--color-bg-secondary);
  }
</style>
