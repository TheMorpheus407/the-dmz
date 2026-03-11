<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';

  interface BlacklistNoticeData {
    noticeId: string;
    entityName: string;
    entityType: 'domain' | 'ip' | 'organization' | 'individual';
    reasonCode: string;
    reasonDescription: string;
    evidence: string[];
    effectiveDate: string;
    expiresOn?: string;
    appealedBy?: string;
    appealDeadline?: string;
    issuer: string;
  }

  interface Props {
    data: BlacklistNoticeData;
    highlightedFieldId?: string | null;
    onFieldClick?: (documentId: string, field: string) => void;
    onLinkClick?: (url: string) => void;
    onConfirm?: () => void;
    onAppeal?: () => void;
  }

  const {
    data,
    highlightedFieldId = null,
    onFieldClick,
    onLinkClick,
    onConfirm,
    onAppeal,
  }: Props = $props();

  function isFieldHighlighted(fieldId: string): boolean {
    return highlightedFieldId === fieldId;
  }

  function handleFieldClick(fieldId: string) {
    onFieldClick?.(data.noticeId, fieldId);
  }

  function handleLinkClick(url: string, event: MouseEvent) {
    event.preventDefault();
    onLinkClick?.(url);
  }
</script>

<div class="blacklist-notice" role="region" aria-labelledby="notice-title">
  <header class="notice__header">
    <h1 id="notice-title" class="notice__title">BLACKLIST NOTICE</h1>
    <div class="notice__meta">
      <button
        type="button"
        class="notice__meta-item notice__meta-link"
        class:notice__meta-link--highlighted={isFieldHighlighted('noticeId')}
        onclick={() => handleFieldClick('noticeId')}
      >
        <span class="notice__label">Notice ID:</span>
        #{data.noticeId}
      </button>
      <span class="notice__meta-divider">|</span>
      <span class="notice__meta-item">
        <span class="notice__label">Effective:</span>
        {data.effectiveDate}
      </span>
      {#if data.expiresOn}
        <span class="notice__meta-divider">|</span>
        <span class="notice__meta-item">
          <span class="notice__label">Expires:</span>
          {data.expiresOn}
        </span>
      {/if}
    </div>
    <div class="notice__links">
      <a
        href="internal://blacklist/policy"
        class="notice__link"
        onclick={(e) => handleLinkClick('internal://blacklist/policy', e)}
      >
        [Blacklist Policy]
      </a>
      <a
        href="internal://blacklist/appeals"
        class="notice__link"
        onclick={(e) => handleLinkClick('internal://blacklist/appeals', e)}
      >
        [Appeal Guidelines]
      </a>
    </div>
  </header>

  <div class="notice__entity">
    <div class="notice__entity-header">
      <span class="notice__entity-type">BLOCKED {data.entityType.toUpperCase()}</span>
      <span class="notice__entity-name">{data.entityName}</span>
    </div>
  </div>

  <div class="notice__reason">
    <h2 class="notice__section-title">REASON FOR BLACKLIST</h2>
    <div class="notice__reason-code">
      <span class="notice__code-label">Reason Code:</span>
      <span class="notice__code-value">{data.reasonCode}</span>
    </div>
    <p class="notice__reason-description">{data.reasonDescription}</p>
  </div>

  <div class="notice__evidence">
    <h2 class="notice__section-title">EVIDENCE</h2>
    <ul class="notice__evidence-list">
      {#each data.evidence as item (item)}
        <li class="notice__evidence-item">{item}</li>
      {/each}
    </ul>
  </div>

  <div class="notice__issuer">
    <h2 class="notice__section-title">ISSUED BY</h2>
    <p class="notice__issuer-text">{data.issuer}</p>
  </div>

  {#if data.appealDeadline && !data.appealedBy}
    <div class="notice__appeal">
      <div class="notice__appeal-info">
        <span class="notice__appeal-label">Appeal Deadline:</span>
        <span class="notice__appeal-value">{data.appealDeadline}</span>
      </div>
      <p class="notice__appeal-text">
        You may submit an appeal if you believe this blacklist was issued in error. Include
        documentation supporting your position.
      </p>
    </div>
  {/if}

  {#if data.appealedBy}
    <div class="notice__appeal-status">
      <span class="notice__appeal-status-label">Appeal Filed By:</span>
      <span class="notice__appeal-status-value">{data.appealedBy}</span>
    </div>
  {/if}

  <div class="notice__actions">
    <Button variant="primary" onclick={() => onConfirm?.()}>Confirm Receipt</Button>
    {#if data.appealDeadline && !data.appealedBy}
      <Button variant="secondary" onclick={() => onAppeal?.()}>File Appeal</Button>
    {/if}
  </div>
</div>

<style>
  .blacklist-notice {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text);
  }

  .notice__header {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-bottom: var(--space-3);
    border-bottom: var(--border-default);
  }

  .notice__title {
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--color-danger);
    margin: 0;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .notice__meta {
    display: flex;
    gap: var(--space-2);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    flex-wrap: wrap;
  }

  .notice__meta-item {
    display: flex;
    gap: var(--space-1);
  }

  .notice__label {
    color: var(--color-phosphor-green-dim);
  }

  .notice__meta-divider {
    color: var(--color-phosphor-green-dark);
  }

  .notice__meta-link {
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

  .notice__meta-link:hover {
    color: var(--color-amber);
  }

  .notice__meta-link:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .notice__meta-link--highlighted {
    background-color: var(--color-warning);
    color: var(--color-bg-primary);
    padding: 2px 4px;
    border-radius: var(--radius-sm);
  }

  .notice__links {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-2);
  }

  .notice__link {
    font-size: var(--text-xs);
    color: var(--color-info);
    text-decoration: none;
    cursor: pointer;
    transition: color 150ms ease;
  }

  .notice__link:hover {
    color: var(--color-amber);
    text-decoration: underline;
  }

  .notice__link:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .notice__entity {
    padding: var(--space-4);
    background: var(--color-danger);
    border-radius: var(--radius-sm);
    text-align: center;
  }

  .notice__entity-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .notice__entity-type {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--color-bg-primary);
    letter-spacing: 0.1em;
  }

  .notice__entity-name {
    font-size: var(--text-xl);
    font-weight: 700;
    color: var(--color-bg-primary);
    font-family: var(--font-document);
  }

  .notice__reason,
  .notice__evidence,
  .notice__issuer,
  .notice__appeal {
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .notice__section-title {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-amber);
    margin: 0 0 var(--space-2) 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .notice__reason-code {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .notice__code-label {
    color: var(--color-phosphor-green-dim);
  }

  .notice__code-value {
    font-weight: 600;
    color: var(--color-danger);
  }

  .notice__reason-description {
    margin: 0;
    font-family: var(--font-document);
    font-size: var(--text-base);
    color: var(--color-document-white);
    line-height: 1.6;
  }

  .notice__evidence-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .notice__evidence-item {
    padding: var(--space-2);
    background: var(--color-bg-primary);
    border-radius: var(--radius-sm);
    font-family: var(--font-document);
    font-size: var(--text-sm);
    color: var(--color-text-document);
    border-left: 2px solid var(--color-danger);
  }

  .notice__issuer-text {
    margin: 0;
    font-family: var(--font-document);
    font-size: var(--text-base);
    color: var(--color-document-white);
    line-height: 1.6;
  }

  .notice__appeal {
    border-left: 3px solid var(--color-warning);
  }

  .notice__appeal-info {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .notice__appeal-label {
    color: var(--color-phosphor-green-dim);
  }

  .notice__appeal-value {
    font-weight: 600;
    color: var(--color-warning);
  }

  .notice__appeal-text {
    margin: 0;
    font-family: var(--font-document);
    font-size: var(--text-sm);
    color: var(--color-document-white);
    line-height: 1.6;
  }

  .notice__appeal-status {
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    display: flex;
    gap: var(--space-2);
  }

  .notice__appeal-status-label {
    color: var(--color-phosphor-green-dim);
  }

  .notice__appeal-status-value {
    font-weight: 600;
    color: var(--color-warning);
  }

  .notice__actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    padding-top: var(--space-3);
    border-top: var(--border-default);
  }
</style>
