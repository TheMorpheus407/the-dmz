<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';

  import { formatTimestamp } from './document-viewer';

  type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
  type IncidentStatus = 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';

  interface IncidentEvent {
    id: string;
    timestamp: string;
    event: string;
    actor: string;
    system?: string;
  }

  interface AffectedSystem {
    id: string;
    name: string;
    type: string;
    status: 'online' | 'degraded' | 'offline';
    lastHealthCheck: string;
  }

  interface IncidentLogData {
    incidentId: string;
    title: string;
    severity: IncidentSeverity;
    status: IncidentStatus;
    detectedAt: string;
    lastUpdated: string;
    description: string;
    affectedSystems: AffectedSystem[];
    events: IncidentEvent[];
    assignedTo?: string;
    resolutionNotes?: string;
  }

  interface Props {
    data: IncidentLogData;
    highlightedFieldId?: string | null;
    onFieldClick?: (documentId: string, field: string) => void;
    onLinkClick?: (url: string) => void;
    onEventClick?: (eventId: string) => void;
  }

  const {
    data,
    highlightedFieldId = null,
    onFieldClick,
    onLinkClick,
    onEventClick,
  }: Props = $props();

  function getSeverityColor(severity: IncidentSeverity): string {
    const colors: Record<IncidentSeverity, string> = {
      low: 'var(--color-safe)',
      medium: 'var(--color-warning)',
      high: 'var(--color-danger)',
      critical: 'var(--color-critical)',
    };
    return colors[severity];
  }

  function getStatusColor(status: IncidentStatus): string {
    const colors: Record<IncidentStatus, string> = {
      open: 'var(--color-danger)',
      investigating: 'var(--color-warning)',
      contained: 'var(--color-info)',
      resolved: 'var(--color-safe)',
      closed: 'var(--color-archived)',
    };
    return colors[status];
  }

  function getSystemStatusColor(status: AffectedSystem['status']): string {
    const colors: Record<AffectedSystem['status'], string> = {
      online: 'var(--color-safe)',
      degraded: 'var(--color-warning)',
      offline: 'var(--color-danger)',
    };
    return colors[status];
  }

  let showAllEvents = $state(false);
  const visibleEvents = $derived(showAllEvents ? data.events : data.events.slice(0, 5));

  function handleEventClick(eventId: string) {
    onEventClick?.(eventId);
  }

  function isFieldHighlighted(fieldId: string): boolean {
    return highlightedFieldId === fieldId;
  }

  function handleFieldClick(fieldId: string) {
    onFieldClick?.(data.incidentId, fieldId);
  }

  function handleLinkClick(url: string, event: MouseEvent) {
    event.preventDefault();
    onLinkClick?.(url);
  }

  function toggleShowAll() {
    showAllEvents = !showAllEvents;
  }
</script>

<div class="incident-log" role="region" aria-labelledby="incident-log-title">
  <header class="incident-log__header">
    <div class="incident-log__title-row">
      <h1 id="incident-log-title" class="incident-log__title">{data.title}</h1>
      <div class="incident-log__badges">
        <span
          class="incident-log__badge incident-log__badge--severity"
          style="background-color: {getSeverityColor(data.severity)}"
        >
          {data.severity.toUpperCase()}
        </span>
        <span
          class="incident-log__badge incident-log__badge--status"
          style="color: {getStatusColor(data.status)}"
        >
          {data.status.toUpperCase()}
        </span>
      </div>
    </div>
    <div class="incident-log__meta">
      <span class="incident-log__meta-item">
        <span class="incident-log__label">ID:</span>
        #{data.incidentId}
      </span>
      <span class="incident-log__meta-divider">|</span>
      <span class="incident-log__meta-item">
        <span class="incident-log__label">Detected:</span>
        {formatTimestamp(data.detectedAt)}
      </span>
      <span class="incident-log__meta-divider">|</span>
      <span class="incident-log__meta-item">
        <span class="incident-log__label">Updated:</span>
        {formatTimestamp(data.lastUpdated)}
      </span>
      {#if data.assignedTo}
        <span class="incident-log__meta-divider">|</span>
        <span class="incident-log__meta-item">
          <span class="incident-log__label">Assigned:</span>
          {data.assignedTo}
        </span>
      {/if}
    </div>
  </header>

  <div class="incident-log__description">
    <h2 class="incident-log__section-title">INCIDENT DESCRIPTION</h2>
    <p class="incident-log__description-text">{data.description}</p>
  </div>

  {#if data.affectedSystems.length > 0}
    <section class="incident-log__systems">
      <h2 class="incident-log__section-title">AFFECTED SYSTEMS</h2>
      <ul class="incident-log__systems-list">
        {#each data.affectedSystems as system (system.id)}
          <li class="incident-log__system">
            <button
              type="button"
              class="incident-log__system-button"
              class:incident-log__system-button--highlighted={isFieldHighlighted(
                `system-${system.id}`,
              )}
              onclick={() => handleFieldClick(`system-${system.id}`)}
            >
              <span class="incident-log__system-name">{system.name}</span>
              <span class="incident-log__system-type">{system.type}</span>
              <span
                class="incident-log__system-status"
                style="color: {getSystemStatusColor(system.status)}"
              >
                [{system.status.toUpperCase()}]
              </span>
            </button>
            <span class="incident-log__system-check">
              Last check: {formatTimestamp(system.lastHealthCheck)}
            </span>
            <div class="incident-log__system-links">
              <a
                href="internal://system/{system.id}"
                class="incident-log__system-link"
                onclick={(e) => handleLinkClick(`internal://system/${system.id}`, e)}
              >
                [View System]
              </a>
              <a
                href="internal://logs/{system.id}"
                class="incident-log__system-link"
                onclick={(e) => handleLinkClick(`internal://logs/${system.id}`, e)}
              >
                [System Logs]
              </a>
            </div>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <section class="incident-log__timeline">
    <h2 class="incident-log__section-title">TIMELINE</h2>
    <ul class="incident-log__events">
      {#each visibleEvents as event (event.id)}
        <li class="incident-log__event">
          <button
            type="button"
            class="incident-log__event-button"
            onclick={() => handleEventClick(event.id)}
          >
            <span class="incident-log__event-timestamp">{formatTimestamp(event.timestamp)}</span>
            <span class="incident-log__event-text">{event.event}</span>
            <span class="incident-log__event-actor">- {event.actor}</span>
            {#if event.system}
              <span class="incident-log__event-system">[{event.system}]</span>
            {/if}
          </button>
        </li>
      {/each}
    </ul>
    {#if data.events.length > 5}
      <Button variant="ghost" size="sm" onclick={toggleShowAll}>
        {showAllEvents ? 'Show Less' : `Show All (${data.events.length})`}
      </Button>
    {/if}
  </section>

  {#if data.resolutionNotes}
    <section class="incident-log__resolution">
      <h2 class="incident-log__section-title">RESOLUTION NOTES</h2>
      <p class="incident-log__resolution-text">{data.resolutionNotes}</p>
    </section>
  {/if}
</div>

<style>
  .incident-log {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text);
  }

  .incident-log__header {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-bottom: var(--space-3);
    border-bottom: var(--border-default);
  }

  .incident-log__title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .incident-log__title {
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--color-amber);
    margin: 0;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .incident-log__badges {
    display: flex;
    gap: var(--space-2);
  }

  .incident-log__badge {
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
  }

  .incident-log__badge--severity {
    color: var(--color-bg-primary);
  }

  .incident-log__badge--status {
    background: var(--color-bg-tertiary);
    border: 1px solid currentColor;
  }

  .incident-log__meta {
    display: flex;
    gap: var(--space-2);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    flex-wrap: wrap;
  }

  .incident-log__meta-item {
    display: flex;
    gap: var(--space-1);
  }

  .incident-log__label {
    color: var(--color-phosphor-green-dim);
  }

  .incident-log__meta-divider {
    color: var(--color-phosphor-green-dark);
  }

  .incident-log__description {
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .incident-log__section-title {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-amber);
    margin: 0 0 var(--space-2) 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .incident-log__description-text {
    margin: 0;
    font-family: var(--font-document);
    font-size: var(--text-base);
    color: var(--color-document-white);
    line-height: 1.6;
  }

  .incident-log__systems {
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .incident-log__systems-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .incident-log__system {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .incident-log__system-button {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    background: var(--color-bg-primary);
    border: 1px solid var(--color-phosphor-green-dark);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text-document);
    text-align: left;
    transition: border-color 150ms ease;
  }

  .incident-log__system-button:hover {
    border-color: var(--color-phosphor-green);
  }

  .incident-log__system-button:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .incident-log__system-button--highlighted {
    background-color: var(--color-warning);
    border-color: var(--color-warning);
  }

  .incident-log__system-button--highlighted .incident-log__system-name,
  .incident-log__system-button--highlighted .incident-log__system-type {
    color: var(--color-bg-primary);
  }

  .incident-log__system-name {
    font-weight: 600;
    flex: 1;
  }

  .incident-log__system-type {
    color: var(--color-text-muted);
    font-size: var(--text-xs);
  }

  .incident-log__system-status {
    font-weight: 600;
    font-size: var(--text-xs);
  }

  .incident-log__system-check {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    padding-left: var(--space-2);
  }

  .incident-log__system-links {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-2);
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-phosphor-green-dark);
  }

  .incident-log__system-link {
    font-size: var(--text-xs);
    color: var(--color-info);
    text-decoration: none;
    cursor: pointer;
    transition: color 150ms ease;
  }

  .incident-log__system-link:hover {
    color: var(--color-amber);
    text-decoration: underline;
  }

  .incident-log__system-link:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .incident-log__timeline {
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .incident-log__events {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .incident-log__event-button {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-2);
    background: transparent;
    border: none;
    border-left: 2px solid var(--color-phosphor-green-dark);
    cursor: pointer;
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-text-document);
    text-align: left;
    transition: background-color 150ms ease;
  }

  .incident-log__event-button:hover {
    background: var(--color-bg-hover);
  }

  .incident-log__event-button:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .incident-log__event-timestamp {
    color: var(--color-phosphor-green-dim);
    min-width: 140px;
    flex-shrink: 0;
  }

  .incident-log__event-text {
    flex: 1;
  }

  .incident-log__event-actor {
    color: var(--color-text-muted);
  }

  .incident-log__event-system {
    color: var(--color-warning);
    font-size: var(--text-xs);
  }

  .incident-log__resolution {
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    border-left: 3px solid var(--color-safe);
  }

  .incident-log__resolution-text {
    margin: 0;
    font-family: var(--font-document);
    font-size: var(--text-base);
    color: var(--color-document-white);
    line-height: 1.6;
  }
</style>
