<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';

  import { formatShortDate } from './document-viewer';

  interface DataClause {
    id: string;
    number: number;
    title: string;
    content: string;
  }

  interface DataSalvageContractData {
    contractId: string;
    emailId: string;
    clientName: string;
    clientOrganization: string;
    dataDescription: string;
    dataSize: string;
    estimatedValue: string;
    recoveryDeadline: string;
    clauses: DataClause[];
    serviceLevelAgreement: {
      recoveryTimeTarget: string;
      successRateGuarantee: number;
      dataIntegrityGuarantee: string;
    };
    paymentTerms: {
      upfrontPercentage: number;
      completionPercentage: number;
      totalCost: string;
      currency: string;
    };
    liabilityClause: string;
    signatoryClient: string;
    signatoryProvider: string;
    signedDate: string;
  }

  interface Props {
    data: DataSalvageContractData;
    highlightedFieldId?: string | null;
    onFieldClick?: (documentId: string, field: string) => void;
    onLinkClick?: (url: string) => void;
    onClauseClick?: (clauseId: string) => void;
    onSign?: () => void;
  }

  const {
    data,
    highlightedFieldId = null,
    onFieldClick,
    onLinkClick,
    onClauseClick,
    onSign,
  }: Props = $props();

  let expandedClauses = $state<Set<string>>(new Set());

  function toggleClause(clauseId: string) {
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const newSet = new Set(expandedClauses);
    if (newSet.has(clauseId)) {
      newSet.delete(clauseId);
    } else {
      newSet.add(clauseId);
    }
    expandedClauses = newSet;
  }

  function handleClauseClick(clauseId: string) {
    onClauseClick?.(clauseId);
  }

  function isFieldHighlighted(fieldId: string): boolean {
    return highlightedFieldId === fieldId;
  }

  function handleFieldClick(fieldId: string) {
    onFieldClick?.(data.contractId, fieldId);
  }

  function handleLinkClick(url: string, event: MouseEvent) {
    event.preventDefault();
    onLinkClick?.(url);
  }

  function handleSign() {
    onSign?.();
  }
</script>

<div class="data-salvage-contract" role="region" aria-labelledby="contract-title">
  <header class="contract__header">
    <h1 id="contract-title" class="contract__title">DATA SALVAGE CONTRACT</h1>
    <div class="contract__meta">
      <button
        type="button"
        class="contract__meta-item contract__meta-link"
        class:contract__meta-link--highlighted={isFieldHighlighted('contractId')}
        onclick={() => handleFieldClick('contractId')}
      >
        <span class="contract__label">Contract ID:</span>
        #{data.contractId}
      </button>
      <span class="contract__meta-divider">|</span>
      <button
        type="button"
        class="contract__meta-item contract__meta-link"
        class:contract__meta-link--highlighted={isFieldHighlighted('emailId')}
        onclick={() => handleFieldClick('emailId')}
      >
        <span class="contract__label">Request:</span>
        #{data.emailId.slice(0, 8)}
      </button>
      <span class="contract__meta-divider">|</span>
      <span class="contract__meta-item">
        <span class="contract__label">Date:</span>
        {formatShortDate(data.signedDate)}
      </span>
    </div>
    <div class="contract__links">
      <a
        href="internal://contract/{data.contractId}"
        class="contract__link"
        onclick={(e) => handleLinkClick(`internal://contract/${data.contractId}`, e)}
      >
        [View Original]
      </a>
      <a
        href="internal://legal/clauses"
        class="contract__link"
        onclick={(e) => handleLinkClick('internal://legal/clauses', e)}
      >
        [Standard Clauses]
      </a>
    </div>
  </header>

  <div class="contract__parties">
    <div class="contract__party">
      <span class="contract__party-label">CLIENT:</span>
      <span class="contract__party-name">{data.clientName}</span>
      <span class="contract__party-org">{data.clientOrganization}</span>
    </div>
    <div class="contract__party">
      <span class="contract__party-label">PROVIDER:</span>
      <span class="contract__party-name">Matrices GmbH</span>
      <span class="contract__party-org">Secure Data Recovery Services</span>
    </div>
  </div>

  <div class="contract__data-summary">
    <h2 class="contract__section-title">DATA SUMMARY</h2>
    <div class="contract__data-grid">
      <div class="contract__data-field">
        <span class="contract__data-label">Description:</span>
        <span class="contract__data-value">{data.dataDescription}</span>
      </div>
      <div class="contract__data-field">
        <span class="contract__data-label">Estimated Size:</span>
        <span class="contract__data-value">{data.dataSize}</span>
      </div>
      <div class="contract__data-field">
        <span class="contract__data-label">Estimated Value:</span>
        <span class="contract__data-value">{data.estimatedValue}</span>
      </div>
      <div class="contract__data-field">
        <span class="contract__data-label">Recovery Deadline:</span>
        <span class="contract__data-value">{data.recoveryDeadline}</span>
      </div>
    </div>
  </div>

  <div class="contract__sla">
    <h2 class="contract__section-title">SERVICE LEVEL AGREEMENT</h2>
    <div class="contract__sla-grid">
      <div class="contract__sla-field">
        <span class="contract__sla-label">Recovery Time Target:</span>
        <span class="contract__sla-value">{data.serviceLevelAgreement.recoveryTimeTarget}</span>
      </div>
      <div class="contract__sla-field">
        <span class="contract__sla-label">Success Rate Guarantee:</span>
        <span class="contract__sla-value">{data.serviceLevelAgreement.successRateGuarantee}%</span>
      </div>
      <div class="contract__sla-field">
        <span class="contract__sla-label">Data Integrity Guarantee:</span>
        <span class="contract__sla-value">{data.serviceLevelAgreement.dataIntegrityGuarantee}</span>
      </div>
    </div>
  </div>

  <div class="contract__payment">
    <h2 class="contract__section-title">PAYMENT TERMS</h2>
    <div class="contract__payment-grid">
      <div class="contract__payment-field">
        <span class="contract__payment-label">Upfront:</span>
        <span class="contract__payment-value">{data.paymentTerms.upfrontPercentage}%</span>
      </div>
      <div class="contract__payment-field">
        <span class="contract__payment-label">Upon Completion:</span>
        <span class="contract__payment-value">{data.paymentTerms.completionPercentage}%</span>
      </div>
      <div class="contract__payment-field contract__payment-field--total">
        <span class="contract__payment-label">Total Cost:</span>
        <span class="contract__payment-value"
          >{data.paymentTerms.totalCost} {data.paymentTerms.currency}</span
        >
      </div>
    </div>
  </div>

  <div class="contract__clauses">
    <h2 class="contract__section-title">CONTRACT CLAUSES</h2>
    <ul class="contract__clauses-list">
      {#each data.clauses as clause (clause.id)}
        <li class="contract__clause">
          <button
            type="button"
            class="contract__clause-header"
            onclick={() => toggleClause(clause.id)}
            aria-expanded={expandedClauses.has(clause.id)}
          >
            <span class="contract__clause-number">§{clause.number}</span>
            <span class="contract__clause-title">{clause.title}</span>
            <span class="contract__clause-toggle">
              {expandedClauses.has(clause.id) ? '▼' : '▶'}
            </span>
          </button>
          {#if expandedClauses.has(clause.id)}
            <div class="contract__clause-content">
              <p>{clause.content}</p>
              <Button variant="ghost" size="sm" onclick={() => handleClauseClick(clause.id)}>
                Highlight Suspicious
              </Button>
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  </div>

  <div class="contract__liability">
    <h2 class="contract__section-title">LIABILITY</h2>
    <p class="contract__liability-text">{data.liabilityClause}</p>
  </div>

  <footer class="contract__signatures">
    <div class="contract__signature">
      <span class="contract__signature-label">Client Signature:</span>
      <span class="contract__signature-value">{data.signatoryClient}</span>
    </div>
    <div class="contract__signature">
      <span class="contract__signature-label">Provider Signature:</span>
      <span class="contract__signature-value">{data.signatoryProvider}</span>
    </div>
  </footer>

  <div class="contract__actions">
    <Button variant="secondary" onclick={handleSign}>Accept Contract</Button>
    <Button variant="ghost" onclick={handleSign}>Reject Contract</Button>
  </div>
</div>

<style>
  .data-salvage-contract {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text);
  }

  .contract__header {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-bottom: var(--space-3);
    border-bottom: var(--border-default);
  }

  .contract__title {
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--color-amber);
    margin: 0;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .contract__meta {
    display: flex;
    gap: var(--space-2);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    flex-wrap: wrap;
  }

  .contract__meta-item {
    display: flex;
    gap: var(--space-1);
  }

  .contract__label {
    color: var(--color-phosphor-green-dim);
  }

  .contract__meta-divider {
    color: var(--color-phosphor-green-dark);
  }

  .contract__meta-link {
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

  .contract__meta-link:hover {
    color: var(--color-amber);
  }

  .contract__meta-link:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .contract__meta-link--highlighted {
    background-color: var(--color-warning);
    color: var(--color-bg-primary);
    padding: 2px 4px;
    border-radius: var(--radius-sm);
  }

  .contract__links {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-2);
  }

  .contract__link {
    font-size: var(--text-xs);
    color: var(--color-info);
    text-decoration: none;
    cursor: pointer;
    transition: color 150ms ease;
  }

  .contract__link:hover {
    color: var(--color-amber);
    text-decoration: underline;
  }

  .contract__link:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .contract__parties {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
  }

  @media (max-width: 600px) {
    .contract__parties {
      grid-template-columns: 1fr;
    }
  }

  .contract__party {
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .contract__party-label {
    font-size: var(--text-xs);
    color: var(--color-amber);
    font-weight: 600;
    text-transform: uppercase;
  }

  .contract__party-name {
    font-weight: 600;
    color: var(--color-text-document);
  }

  .contract__party-org {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .contract__section-title {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-amber);
    margin: 0 0 var(--space-2) 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .contract__data-summary,
  .contract__sla,
  .contract__payment,
  .contract__liability {
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .contract__data-grid,
  .contract__sla-grid,
  .contract__payment-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-2);
  }

  @media (max-width: 600px) {
    .contract__data-grid,
    .contract__sla-grid,
    .contract__payment-grid {
      grid-template-columns: 1fr;
    }
  }

  .contract__data-field,
  .contract__sla-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-0);
  }

  .contract__data-label,
  .contract__sla-label {
    font-size: var(--text-xs);
    color: var(--color-phosphor-green-dim);
  }

  .contract__data-value,
  .contract__sla-value {
    color: var(--color-text-document);
    font-family: var(--font-document);
  }

  .contract__payment-field {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2);
    background: var(--color-bg-primary);
    border-radius: var(--radius-sm);
  }

  .contract__payment-field--total {
    grid-column: 1 / -1;
    border: 1px solid var(--color-amber);
  }

  .contract__payment-label {
    color: var(--color-phosphor-green-dim);
  }

  .contract__payment-value {
    font-weight: 600;
    color: var(--color-text-document);
  }

  .contract__clauses {
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .contract__clauses-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .contract__clause {
    border: 1px solid var(--color-phosphor-green-dark);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .contract__clause-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-2);
    background: var(--color-bg-primary);
    border: none;
    cursor: pointer;
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text-document);
    text-align: left;
    transition: background-color 150ms ease;
  }

  .contract__clause-header:hover {
    background: var(--color-bg-hover);
  }

  .contract__clause-header:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: -2px;
  }

  .contract__clause-number {
    color: var(--color-amber);
    font-weight: 600;
  }

  .contract__clause-title {
    flex: 1;
  }

  .contract__clause-toggle {
    color: var(--color-text-muted);
    font-size: var(--text-xs);
  }

  .contract__clause-content {
    padding: var(--space-2);
    background: var(--color-bg-secondary);
    border-top: 1px solid var(--color-phosphor-green-dark);
  }

  .contract__clause-content p {
    margin: 0 0 var(--space-2) 0;
    font-family: var(--font-document);
    font-size: var(--text-sm);
    color: var(--color-document-white);
    line-height: 1.6;
  }

  .contract__liability-text {
    margin: 0;
    font-family: var(--font-document);
    font-size: var(--text-sm);
    color: var(--color-document-white);
    line-height: 1.6;
  }

  .contract__signatures {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  @media (max-width: 600px) {
    .contract__signatures {
      grid-template-columns: 1fr;
    }
  }

  .contract__signature {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-2);
    border: 1px solid var(--color-phosphor-green-dark);
    border-radius: var(--radius-sm);
  }

  .contract__signature-label {
    font-size: var(--text-xs);
    color: var(--color-phosphor-green-dim);
  }

  .contract__signature-value {
    font-family: var(--font-document);
    font-style: italic;
    color: var(--color-text-document);
  }

  .contract__actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    padding-top: var(--space-3);
    border-top: var(--border-default);
  }
</style>
