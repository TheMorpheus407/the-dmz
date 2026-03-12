<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';

  import type {
    IncidentResponseData,
    ContainmentAction,
    RecoveryAction,
    EvidenceEventType,
  } from './incident-response';

  interface Props {
    data: IncidentResponseData;
    onExecuteContainment?: (actionId: string) => void;
    onExecuteRecovery?: (actionId: string, success: boolean) => void;
    onClose?: () => void;
  }

  const { data, onExecuteContainment, onExecuteRecovery, onClose }: Props = $props();

  let searchQuery = $state('');
  let selectedFilter = $state<EvidenceEventType | 'all'>('all');
  let expandedEvidenceIds = $state<Set<string>>(new Set());
  let actionFeedback = $state<{ type: 'success' | 'error'; message: string } | null>(null);

  const filteredEvidence = $derived(() => {
    let entries = data.evidenceLog;

    if (selectedFilter !== 'all') {
      entries = entries.filter((e) => e.eventType === selectedFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.description.toLowerCase().includes(query) ||
          e.affectedSystem.toLowerCase().includes(query) ||
          e.rawLogData.some((log) => log.toLowerCase().includes(query)),
      );
    }

    return entries;
  });

  function toggleEvidenceExpand(id: string) {
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const newSet = new Set(expandedEvidenceIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    expandedEvidenceIds = newSet;
  }

  function isEvidenceExpanded(id: string): boolean {
    return expandedEvidenceIds.has(id);
  }

  function canExecuteContainment(action: ContainmentAction): boolean {
    if (data.currentFunds < action.costCredits) return false;
    if (action.requiresBandwidth && data.currentBandwidth < (action.bandwidthCost ?? 0))
      return false;
    return true;
  }

  function canExecuteRecovery(action: RecoveryAction): boolean {
    if (data.currentFunds < action.costCredits) return false;
    if (action.requiresRackSpace && data.currentRackSpace < (action.rackSpaceCost ?? 0))
      return false;
    if (action.type === 'negotiate' && !data.hasActiveRansom) return false;
    return true;
  }

  function handleContainmentClick(action: ContainmentAction) {
    if (!canExecuteContainment(action)) {
      actionFeedback = { type: 'error', message: 'Insufficient resources to execute this action.' };
      setTimeout(() => (actionFeedback = null), 3000);
      return;
    }

    onExecuteContainment?.(action.id);
    actionFeedback = { type: 'success', message: `${action.name} executed successfully.` };
    setTimeout(() => (actionFeedback = null), 3000);
  }

  function handleRecoveryClick(action: RecoveryAction) {
    if (!canExecuteRecovery(action)) {
      actionFeedback = { type: 'error', message: 'Insufficient resources to execute this action.' };
      setTimeout(() => (actionFeedback = null), 3000);
      return;
    }

    const success = Math.random() < action.successProbability;
    onExecuteRecovery?.(action.id, success);
    if (success) {
      actionFeedback = {
        type: 'success',
        message: `${action.name} succeeded!`,
      };
    } else {
      actionFeedback = {
        type: 'error',
        message: `${action.name} failed.`,
      };
    }
    setTimeout(() => (actionFeedback = null), 3000);
  }

  function getSeverityColor(severity: string): string {
    const colors: Record<string, string> = {
      low: 'var(--color-safe)',
      medium: 'var(--color-warning)',
      high: 'var(--color-danger)',
      critical: 'var(--color-critical)',
    };
    return colors[severity] ?? 'var(--color-safe)';
  }

  function getEventTypeLabel(type: EvidenceEventType): string {
    const labels: Record<EvidenceEventType, string> = {
      breach: 'BREACH',
      escalation: 'ESCALATION',
      response: 'RESPONSE',
      detection: 'DETECTION',
      containment: 'CONTAINMENT',
    };
    return labels[type];
  }

  function getActionRiskColor(risk: string): string {
    const colors: Record<string, string> = {
      low: 'var(--color-safe)',
      medium: 'var(--color-warning)',
      high: 'var(--color-danger)',
    };
    return colors[risk] ?? 'var(--color-safe)';
  }

  let focusedIndex = $state(-1);
  const totalFocusable = $derived(data.containmentActions.length + data.recoveryActions.length + 1);

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'j') {
      event.preventDefault();
      focusedIndex = Math.min(focusedIndex + 1, totalFocusable - 1);
    } else if (event.key === 'ArrowUp' || event.key === 'k') {
      event.preventDefault();
      focusedIndex = Math.max(focusedIndex - 1, 0);
    } else if ((event.key === 'Enter' || event.key === ' ') && focusedIndex >= 0) {
      event.preventDefault();
      if (focusedIndex < data.containmentActions.length) {
        const action = data.containmentActions[focusedIndex];
        if (action) handleContainmentClick(action);
      } else {
        const recoveryIndex = focusedIndex - data.containmentActions.length;
        if (recoveryIndex < data.recoveryActions.length) {
          const recoveryAction = data.recoveryActions[recoveryIndex];
          if (recoveryAction) handleRecoveryClick(recoveryAction);
        }
      }
    } else if (event.key === 'Escape' && onClose) {
      event.preventDefault();
      onClose();
    }
  }

  function formatDayTime(timestamp: string, day: number): string {
    try {
      const date = new Date(timestamp);
      const time = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      return `Day ${day} ${time}`;
    } catch {
      return `Day ${day}`;
    }
  }
</script>

<div
  class="incident-response"
  role="dialog"
  aria-label="Incident Response View"
  tabindex="0"
  onkeydown={handleKeyDown}
>
  <header class="incident-response__header">
    <div class="incident-response__title-row">
      <h1 class="incident-response__title">INCIDENT RESPONSE</h1>
      <Button variant="ghost" size="sm" onclick={() => onClose?.()}>[ESC] CLOSE</Button>
    </div>
    <div class="incident-response__incident-info">
      <span class="incident-response__incident-id">INCIDENT #{data.incidentId}</span>
      <span class="incident-response__incident-divider">|</span>
      <span class="incident-response__incident-title">{data.title}</span>
      <span class="incident-response__incident-divider">|</span>
      <span class="incident-response__severity" style="color: {getSeverityColor(data.severity)}">
        [{data.severity.toUpperCase()}]
      </span>
      <span class="incident-response__status">
        [{data.status.toUpperCase()}]
      </span>
    </div>
    <div class="incident-response__resources">
      <span class="incident-response__resource">
        CR: {data.currentFunds.toLocaleString()}
      </span>
      <span class="incident-response__resource">
        BW: {data.currentBandwidth} Mbps
      </span>
      <span class="incident-response__resource">
        RACK: {data.currentRackSpace} U
      </span>
      <span class="incident-response__resource">
        TRUST: {data.currentTrust.toFixed(1)}%
      </span>
    </div>
  </header>

  {#if actionFeedback}
    <div
      class="incident-response__feedback"
      class:incident-response__feedback--success={actionFeedback.type === 'success'}
      class:incident-response__feedback--error={actionFeedback.type === 'error'}
    >
      {actionFeedback.message}
    </div>
  {/if}

  <div class="incident-response__content">
    <section class="incident-response__evidence" aria-labelledby="evidence-heading">
      <div class="incident-response__evidence-header">
        <h2 id="evidence-heading" class="incident-response__section-title">EVIDENCE LOG</h2>
        <div class="incident-response__evidence-controls">
          <input
            type="text"
            class="incident-response__search"
            placeholder="Search evidence..."
            bind:value={searchQuery}
            aria-label="Search evidence"
          />
          <select
            class="incident-response__filter"
            bind:value={selectedFilter}
            aria-label="Filter by event type"
          >
            <option value="all">All Events</option>
            <option value="breach">Breach</option>
            <option value="escalation">Escalation</option>
            <option value="response">Response</option>
            <option value="detection">Detection</option>
            <option value="containment">Containment</option>
          </select>
        </div>
      </div>

      <div class="incident-response__evidence-list">
        {#each filteredEvidence() as entry (entry.id)}
          {@const isExpanded = isEvidenceExpanded(entry.id)}
          <div class="incident-response__evidence-item">
            <button
              class="incident-response__evidence-header-row"
              type="button"
              onclick={() => toggleEvidenceExpand(entry.id)}
              aria-expanded={isExpanded}
            >
              <span class="incident-response__evidence-time">
                {formatDayTime(entry.timestamp, entry.day)}
              </span>
              <span
                class="incident-response__evidence-type"
                class:incident-response__evidence-type--breach={entry.eventType === 'breach'}
                class:incident-response__evidence-type--escalation={entry.eventType ===
                  'escalation'}
                class:incident-response__evidence-type--response={entry.eventType === 'response'}
                class:incident-response__evidence-type--detection={entry.eventType === 'detection'}
                class:incident-response__evidence-type--containment={entry.eventType ===
                  'containment'}
              >
                {getEventTypeLabel(entry.eventType)}
              </span>
              <span class="incident-response__evidence-system">
                {entry.affectedSystem}
              </span>
              <span
                class="incident-response__evidence-severity"
                style="color: {getSeverityColor(entry.severity)}"
              >
                [{entry.severity.toUpperCase()}]
              </span>
              <span class="incident-response__evidence-expand">
                {isExpanded ? '▼' : '▶'}
              </span>
            </button>
            {#if isExpanded}
              <div class="incident-response__evidence-details">
                <p class="incident-response__evidence-description">
                  {entry.description}
                </p>
                <div class="incident-response__evidence-logs">
                  <span class="incident-response__logs-label">RAW LOG DATA:</span>
                  <pre class="incident-response__logs-content">{entry.rawLogData.join('\n')}</pre>
                </div>
              </div>
            {/if}
          </div>
        {:else}
          <p class="incident-response__evidence-empty">No evidence entries found.</p>
        {/each}
      </div>
    </section>

    <div class="incident-response__actions-container">
      <section class="incident-response__containment" aria-labelledby="containment-heading">
        <h2 id="containment-heading" class="incident-response__section-title">
          CONTAINMENT ACTIONS
        </h2>
        <div class="incident-response__actions-grid">
          {#each data.containmentActions as action, index (action.id)}
            {@const isDisabled = !canExecuteContainment(action)}
            {@const isFocused = focusedIndex === index}
            <button
              class="incident-response__action-card"
              class:incident-response__action-card--disabled={isDisabled}
              class:incident-response__action-card--focused={isFocused}
              type="button"
              onclick={() => handleContainmentClick(action)}
              disabled={isDisabled}
            >
              <div class="incident-response__action-header">
                <span class="incident-response__action-name">{action.name}</span>
                <span
                  class="incident-response__action-risk"
                  style="color: {getActionRiskColor(action.riskLevel)}"
                >
                  [{action.riskLevel.toUpperCase()} RISK]
                </span>
              </div>
              <p class="incident-response__action-description">{action.description}</p>
              <div class="incident-response__action-costs">
                <span class="incident-response__action-cost">
                  Cost: {action.costCredits.toLocaleString()} CR
                </span>
                {#if action.requiresBandwidth}
                  <span class="incident-response__action-cost">
                    BW: {action.bandwidthCost} Mbps
                  </span>
                {/if}
                {#if action.affectsTrust}
                  <span class="incident-response__action-cost">
                    Trust: {action.trustImpact && action.trustImpact > 0
                      ? '+'
                      : ''}{action.trustImpact}%
                  </span>
                {/if}
              </div>
              <div class="incident-response__action-outcome">
                <span class="incident-response__outcome-label">Outcome:</span>
                <span class="incident-response__outcome-text">{action.expectedOutcome}</span>
              </div>
            </button>
          {/each}
        </div>
      </section>

      <section class="incident-response__recovery" aria-labelledby="recovery-heading">
        <h2 id="recovery-heading" class="incident-response__section-title">RECOVERY ACTIONS</h2>
        <div class="incident-response__actions-grid">
          {#each data.recoveryActions as action, index (action.id)}
            {@const isDisabled = !canExecuteRecovery(action)}
            {@const isFocused = focusedIndex === data.containmentActions.length + index}
            <button
              class="incident-response__action-card"
              class:incident-response__action-card--disabled={isDisabled}
              class:incident-response__action-card--focused={isFocused}
              type="button"
              onclick={() => handleRecoveryClick(action)}
              disabled={isDisabled}
            >
              <div class="incident-response__action-header">
                <span class="incident-response__action-name">{action.name}</span>
                <span class="incident-response__action-probability">
                  {Math.round(action.successProbability * 100)}% SUCCESS
                </span>
              </div>
              <p class="incident-response__action-description">{action.description}</p>
              <div class="incident-response__action-costs">
                <span class="incident-response__action-cost">
                  Cost: {action.costCredits.toLocaleString()} CR
                </span>
                <span class="incident-response__action-cost">
                  Time: {action.timeRequired} day(s)
                </span>
                {#if action.requiresRackSpace}
                  <span class="incident-response__action-cost">
                    Rack: {action.rackSpaceCost} U
                  </span>
                {/if}
              </div>
              {#if action.isRansomActive && data.hasActiveRansom}
                <div class="incident-response__ransom-notice">
                  RANSOM ACTIVE: {data.ransomAmount?.toLocaleString()} CR
                </div>
              {/if}
            </button>
          {/each}
        </div>
      </section>
    </div>
  </div>

  <footer class="incident-response__footer">
    <div class="incident-response__keyboard-hints">
      <span>[↑/↓ or j/k] Navigate</span>
      <span>[Enter] Execute Action</span>
      <span>[Esc] Close</span>
    </div>
  </footer>
</div>

<style>
  .incident-response {
    display: flex;
    flex-direction: column;
    height: 100%;
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text-primary);
    background-color: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .incident-response:focus {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .incident-response__header {
    padding: var(--space-4);
    border-bottom: 1px solid var(--color-border);
    background-color: var(--color-bg-secondary);
  }

  .incident-response__title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-2);
  }

  .incident-response__title {
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--color-amber);
    margin: 0;
    letter-spacing: 0.1em;
  }

  .incident-response__incident-info {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    margin-bottom: var(--space-2);
    flex-wrap: wrap;
  }

  .incident-response__incident-divider {
    color: var(--color-border);
  }

  .incident-response__incident-title {
    color: var(--color-text-primary);
    font-weight: 600;
  }

  .incident-response__severity {
    font-weight: 700;
  }

  .incident-response__status {
    color: var(--color-info);
    font-weight: 600;
  }

  .incident-response__resources {
    display: flex;
    gap: var(--space-4);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .incident-response__resource {
    padding: var(--space-1) var(--space-2);
    background-color: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .incident-response__feedback {
    padding: var(--space-3);
    text-align: center;
    font-weight: 600;
  }

  .incident-response__feedback--success {
    background-color: var(--color-safe);
    color: var(--color-bg-primary);
  }

  .incident-response__feedback--error {
    background-color: var(--color-danger);
    color: var(--color-bg-primary);
  }

  .incident-response__content {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-4);
  }

  .incident-response__section-title {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-amber);
    margin: 0 0 var(--space-2) 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .incident-response__evidence-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .incident-response__evidence-controls {
    display: flex;
    gap: var(--space-2);
  }

  .incident-response__search {
    padding: var(--space-1) var(--space-2);
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    background-color: var(--color-bg-tertiary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-primary);
    width: 180px;
  }

  .incident-response__search:focus {
    outline: none;
    border-color: var(--color-focus);
  }

  .incident-response__filter {
    padding: var(--space-1) var(--space-2);
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    background-color: var(--color-bg-tertiary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-primary);
    cursor: pointer;
  }

  .incident-response__filter:focus {
    outline: none;
    border-color: var(--color-focus);
  }

  .incident-response__evidence-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    max-height: 300px;
    overflow-y: auto;
    padding: var(--space-2);
    background-color: var(--color-bg-secondary);
    border-radius: var(--radius-sm);
  }

  .incident-response__evidence-item {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .incident-response__evidence-header-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-2) var(--space-3);
    background-color: var(--color-bg-tertiary);
    border: none;
    cursor: pointer;
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-text-primary);
    text-align: left;
  }

  .incident-response__evidence-header-row:hover {
    background-color: var(--color-bg-hover);
  }

  .incident-response__evidence-header-row:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: -2px;
  }

  .incident-response__evidence-time {
    color: var(--color-text-muted);
    min-width: 100px;
  }

  .incident-response__evidence-type {
    font-weight: 600;
    min-width: 90px;
    padding: 2px 6px;
    border-radius: 2px;
    text-align: center;
  }

  .incident-response__evidence-type--breach {
    background-color: var(--color-danger);
    color: var(--color-bg-primary);
  }

  .incident-response__evidence-type--escalation {
    background-color: var(--color-critical);
    color: var(--color-bg-primary);
  }

  .incident-response__evidence-type--response {
    background-color: var(--color-info);
    color: var(--color-bg-primary);
  }

  .incident-response__evidence-type--detection {
    background-color: var(--color-warning);
    color: var(--color-bg-primary);
  }

  .incident-response__evidence-type--containment {
    background-color: var(--color-safe);
    color: var(--color-bg-primary);
  }

  .incident-response__evidence-system {
    flex: 1;
    color: var(--color-text-secondary);
  }

  .incident-response__evidence-severity {
    font-weight: 600;
  }

  .incident-response__evidence-expand {
    color: var(--color-text-muted);
  }

  .incident-response__evidence-details {
    padding: var(--space-3);
    background-color: var(--color-bg-primary);
    border-top: 1px solid var(--color-border);
  }

  .incident-response__evidence-description {
    margin: 0 0 var(--space-2) 0;
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
  }

  .incident-response__evidence-logs {
    font-size: var(--text-xs);
  }

  .incident-response__logs-label {
    display: block;
    color: var(--color-text-muted);
    margin-bottom: var(--space-1);
  }

  .incident-response__logs-content {
    margin: 0;
    padding: var(--space-2);
    background-color: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-phosphor-green);
    white-space: pre-wrap;
    overflow-x: auto;
  }

  .incident-response__evidence-empty {
    color: var(--color-text-muted);
    font-style: italic;
    text-align: center;
    padding: var(--space-4);
  }

  .incident-response__actions-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .incident-response__actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--space-2);
  }

  .incident-response__action-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3);
    background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-family: var(--font-terminal);
    text-align: left;
    transition:
      border-color 150ms ease,
      background-color 150ms ease;
  }

  .incident-response__action-card:hover:not(:disabled) {
    border-color: var(--color-focus);
    background-color: var(--color-bg-hover);
  }

  .incident-response__action-card:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .incident-response__action-card--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .incident-response__action-card--focused {
    border-color: var(--color-focus);
    outline: 2px solid var(--color-focus);
    outline-offset: -2px;
  }

  .incident-response__action-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .incident-response__action-name {
    font-weight: 700;
    color: var(--color-amber);
  }

  .incident-response__action-risk,
  .incident-response__action-probability {
    font-size: var(--text-xs);
    font-weight: 600;
  }

  .incident-response__action-description {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
  }

  .incident-response__action-costs {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .incident-response__action-cost {
    padding: 2px 6px;
    background-color: var(--color-bg-tertiary);
    border-radius: 2px;
  }

  .incident-response__action-outcome {
    display: flex;
    gap: var(--space-1);
    font-size: var(--text-xs);
  }

  .incident-response__outcome-label {
    color: var(--color-text-muted);
  }

  .incident-response__outcome-text {
    color: var(--color-phosphor-green);
  }

  .incident-response__ransom-notice {
    padding: var(--space-2);
    background-color: var(--color-critical);
    color: var(--color-bg-primary);
    font-weight: 700;
    text-align: center;
    border-radius: var(--radius-sm);
  }

  .incident-response__footer {
    padding: var(--space-2) var(--space-4);
    border-top: 1px solid var(--color-border);
    background-color: var(--color-bg-secondary);
  }

  .incident-response__keyboard-hints {
    display: flex;
    justify-content: center;
    gap: var(--space-4);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  @media (max-width: 768px) {
    .incident-response__actions-grid {
      grid-template-columns: 1fr;
    }

    .incident-response__evidence-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .incident-response__evidence-controls {
      width: 100%;
    }

    .incident-response__search {
      width: 100%;
    }

    .incident-response__resources {
      flex-wrap: wrap;
    }
  }
</style>
