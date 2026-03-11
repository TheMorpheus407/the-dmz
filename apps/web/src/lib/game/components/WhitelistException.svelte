<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';

  interface ApprovalEntry {
    approverName: string;
    approverRole: string;
    approvalDate: string;
    status: 'approved' | 'pending' | 'rejected';
  }

  interface WhitelistExceptionData {
    exceptionId: string;
    entityName: string;
    entityType: 'domain' | 'ip' | 'organization' | 'individual';
    exceptionType: string;
    justification: string;
    conditions: string[];
    effectiveDate: string;
    expirationDate: string;
    approvalChain: ApprovalEntry[];
    issuer: string;
  }

  interface Props {
    data: WhitelistExceptionData;
    highlightedFieldId?: string | null;
    onFieldClick?: (documentId: string, field: string) => void;
    onLinkClick?: (url: string) => void;
    onApprove?: () => void;
    onReject?: () => void;
  }

  const {
    data,
    highlightedFieldId = null,
    onFieldClick,
    onLinkClick,
    onApprove,
    onReject,
  }: Props = $props();

  function getApprovalStatusColor(status: ApprovalEntry['status']): string {
    const colors = {
      approved: 'var(--color-safe)',
      pending: 'var(--color-warning)',
      rejected: 'var(--color-danger)',
    };
    return colors[status];
  }

  function isFieldHighlighted(fieldId: string): boolean {
    return highlightedFieldId === fieldId;
  }

  function handleFieldClick(fieldId: string) {
    onFieldClick?.(data.exceptionId, fieldId);
  }

  function handleLinkClick(url: string, event: MouseEvent) {
    event.preventDefault();
    onLinkClick?.(url);
  }
</script>

<div class="whitelist-exception" role="region" aria-labelledby="exception-title">
  <header class="exception__header">
    <h1 id="exception-title" class="exception__title">WHITELIST EXCEPTION</h1>
    <div class="exception__meta">
      <button
        type="button"
        class="exception__meta-item exception__meta-link"
        class:exception__meta-link--highlighted={isFieldHighlighted('exceptionId')}
        onclick={() => handleFieldClick('exceptionId')}
      >
        <span class="exception__label">Exception ID:</span>
        #{data.exceptionId}
      </button>
      <span class="exception__meta-divider">|</span>
      <span class="exception__meta-item">
        <span class="exception__label">Effective:</span>
        {data.effectiveDate}
      </span>
      <span class="exception__meta-divider">|</span>
      <span class="exception__meta-item">
        <span class="exception__label">Expires:</span>
        {data.expirationDate}
      </span>
    </div>
    <div class="exception__links">
      <a
        href="internal://whitelist/policy"
        class="exception__link"
        onclick={(e) => handleLinkClick('internal://whitelist/policy', e)}
      >
        [Whitelist Policy]
      </a>
      <a
        href="internal://compliance/requirements"
        class="exception__link"
        onclick={(e) => handleLinkClick('internal://compliance/requirements', e)}
      >
        [Compliance Reqs]
      </a>
    </div>
  </header>

  <div class="exception__entity">
    <div class="exception__entity-header">
      <span class="exception__entity-type">EXCEPTION FOR {data.entityType.toUpperCase()}</span>
      <span class="exception__entity-name">{data.entityName}</span>
      <span class="exception__entity-exception-type">Type: {data.exceptionType}</span>
    </div>
  </div>

  <div class="exception__dates">
    <div class="exception__date">
      <span class="exception__date-label">Effective:</span>
      <span class="exception__date-value">{data.effectiveDate}</span>
    </div>
    <div class="exception__date">
      <span class="exception__date-label">Expires:</span>
      <span class="exception__date-value">{data.expirationDate}</span>
    </div>
  </div>

  <div class="exception__justification">
    <h2 class="exception__section-title">JUSTIFICATION</h2>
    <p class="exception__justification-text">{data.justification}</p>
  </div>

  <div class="exception__conditions">
    <h2 class="exception__section-title">CONDITIONS</h2>
    <ul class="exception__conditions-list">
      {#each data.conditions as condition (condition)}
        <li class="exception__condition">• {condition}</li>
      {/each}
    </ul>
  </div>

  <div class="exception__approvals">
    <h2 class="exception__section-title">APPROVAL CHAIN</h2>
    <ul class="exception__approvals-list">
      {#each data.approvalChain as entry (entry.approverName + entry.approvalDate)}
        <li class="exception__approval">
          <span class="exception__approval-name">{entry.approverName}</span>
          <span class="exception__approval-role">({entry.approverRole})</span>
          <span class="exception__approval-date">{entry.approvalDate}</span>
          <span
            class="exception__approval-status"
            style="color: {getApprovalStatusColor(entry.status)}"
          >
            [{entry.status.toUpperCase()}]
          </span>
        </li>
      {/each}
    </ul>
  </div>

  <div class="exception__issuer">
    <h2 class="exception__section-title">ISSUED BY</h2>
    <p class="exception__issuer-text">{data.issuer}</p>
  </div>

  <div class="exception__actions">
    <Button variant="primary" onclick={() => onApprove?.()}>Sign Exception</Button>
    <Button variant="ghost" onclick={() => onReject?.()}>Reject</Button>
  </div>
</div>

<style>
  .whitelist-exception {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text);
  }

  .exception__header {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-bottom: var(--space-3);
    border-bottom: var(--border-default);
  }

  .exception__title {
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--color-safe);
    margin: 0;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .exception__meta {
    display: flex;
    gap: var(--space-2);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .exception__meta-item {
    display: flex;
    gap: var(--space-1);
  }

  .exception__label {
    color: var(--color-phosphor-green-dim);
  }

  .exception__meta-divider {
    color: var(--color-phosphor-green-dark);
  }

  .exception__meta-link {
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

  .exception__meta-link:hover {
    color: var(--color-amber);
  }

  .exception__meta-link:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .exception__meta-link--highlighted {
    background-color: var(--color-warning);
    color: var(--color-bg-primary);
    padding: 2px 4px;
    border-radius: var(--radius-sm);
  }

  .exception__links {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-2);
  }

  .exception__link {
    font-size: var(--text-xs);
    color: var(--color-info);
    text-decoration: none;
    cursor: pointer;
    transition: color 150ms ease;
  }

  .exception__link:hover {
    color: var(--color-amber);
    text-decoration: underline;
  }

  .exception__link:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .exception__entity {
    padding: var(--space-4);
    background: var(--color-safe);
    border-radius: var(--radius-sm);
    text-align: center;
  }

  .exception__entity-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .exception__entity-type {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--color-bg-primary);
    letter-spacing: 0.1em;
  }

  .exception__entity-name {
    font-size: var(--text-xl);
    font-weight: 700;
    color: var(--color-bg-primary);
    font-family: var(--font-document);
  }

  .exception__dates {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
  }

  .exception__date {
    display: flex;
    flex-direction: column;
    gap: var(--space-0);
    padding: var(--space-2);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .exception__date-label {
    font-size: var(--text-xs);
    color: var(--color-phosphor-green-dim);
  }

  .exception__date-value {
    font-weight: 600;
    color: var(--color-text-document);
  }

  .exception__justification,
  .exception__conditions,
  .exception__approvals,
  .exception__issuer {
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .exception__section-title {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-amber);
    margin: 0 0 var(--space-2) 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .exception__justification-text {
    margin: 0;
    font-family: var(--font-document);
    font-size: var(--text-base);
    color: var(--color-document-white);
    line-height: 1.6;
  }

  .exception__conditions-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .exception__condition {
    padding: var(--space-2);
    background: var(--color-bg-primary);
    border-radius: var(--radius-sm);
    font-family: var(--font-document);
    font-size: var(--text-sm);
    color: var(--color-text-document);
    border-left: 2px solid var(--color-safe);
  }

  .exception__approvals-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .exception__approval {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    background: var(--color-bg-primary);
    border-radius: var(--radius-sm);
    flex-wrap: wrap;
  }

  .exception__approval-name {
    font-weight: 600;
    color: var(--color-text-document);
  }

  .exception__approval-role {
    color: var(--color-text-muted);
    font-size: var(--text-xs);
  }

  .exception__approval-date {
    flex: 1;
    color: var(--color-text-muted);
    font-size: var(--text-xs);
  }

  .exception__approval-status {
    font-weight: 600;
    font-size: var(--text-xs);
  }

  .exception__issuer-text {
    margin: 0;
    font-family: var(--font-document);
    font-size: var(--text-base);
    color: var(--color-document-white);
    line-height: 1.6;
  }

  .exception__actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    padding-top: var(--space-3);
    border-top: var(--border-default);
  }
</style>
