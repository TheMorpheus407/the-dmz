<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';

  interface UpgradeProposalData {
    proposalId: string;
    upgradeName: string;
    upgradeCategory: string;
    description: string;
    benefits: string[];
    prerequisites: string[];
    costs: {
      purchaseCost: string;
      installationTime: string;
      dailyOpEx: string;
      totalFirstMonth: string;
    };
    expectedROI: {
      description: string;
      estimatedImprovement: string;
      paybackPeriod: string;
    };
    risks: {
      description: string;
      severity: 'low' | 'medium' | 'high';
    }[];
    alternativeOptions: {
      name: string;
      cost: string;
      pros: string[];
      cons: string[];
    }[];
    validUntil: string;
  }

  interface Props {
    data: UpgradeProposalData;
    highlightedFieldId?: string | null;
    onFieldClick?: (documentId: string, field: string) => void;
    onLinkClick?: (url: string) => void;
    onApprove?: () => void;
    onDefer?: () => void;
    onReject?: () => void;
  }

  const {
    data,
    highlightedFieldId = null,
    onFieldClick,
    onLinkClick,
    onApprove,
    onDefer,
    onReject,
  }: Props = $props();

  function getRiskColor(severity: 'low' | 'medium' | 'high'): string {
    const colors = {
      low: 'var(--color-safe)',
      medium: 'var(--color-warning)',
      high: 'var(--color-danger)',
    };
    return colors[severity];
  }

  function isFieldHighlighted(fieldId: string): boolean {
    return highlightedFieldId === fieldId;
  }

  function handleFieldClick(fieldId: string) {
    onFieldClick?.(data.proposalId, fieldId);
  }

  function handleLinkClick(url: string, event: MouseEvent) {
    event.preventDefault();
    onLinkClick?.(url);
  }
</script>

<div class="upgrade-proposal" role="region" aria-labelledby="proposal-title">
  <header class="proposal__header">
    <h1 id="proposal-title" class="proposal__title">UPGRADE PROPOSAL</h1>
    <div class="proposal__meta">
      <button
        type="button"
        class="proposal__meta-item proposal__meta-link"
        class:proposal__meta-link--highlighted={isFieldHighlighted('proposalId')}
        onclick={() => handleFieldClick('proposalId')}
      >
        <span class="proposal__label">Proposal ID:</span>
        #{data.proposalId}
      </button>
    </div>
    <div class="proposal__links">
      <a
        href="internal://upgrades/catalog"
        class="proposal__link"
        onclick={(e) => handleLinkClick('internal://upgrades/catalog', e)}
      >
        [View Upgrade Catalog]
      </a>
      <a
        href="internal://upgrades/history"
        class="proposal__link"
        onclick={(e) => handleLinkClick('internal://upgrades/history', e)}
      >
        [Upgrade History]
      </a>
    </div>
    <div class="proposal__meta">
      <span class="proposal__meta-item">
        <span class="proposal__label">Category:</span>
        {data.upgradeCategory}
      </span>
      <span class="proposal__meta-divider">|</span>
      <span class="proposal__meta-item">
        <span class="proposal__label">Valid Until:</span>
        {data.validUntil}
      </span>
    </div>
  </header>

  <div class="proposal__name">
    <h2 class="proposal__upgrade-name">{data.upgradeName}</h2>
  </div>

  <div class="proposal__description">
    <h3 class="proposal__section-title">DESCRIPTION</h3>
    <p class="proposal__description-text">{data.description}</p>
  </div>

  <div class="proposal__benefits">
    <h3 class="proposal__section-title">BENEFITS</h3>
    <ul class="proposal__benefits-list">
      {#each data.benefits as benefit (benefit)}
        <li class="proposal__benefit">✓ {benefit}</li>
      {/each}
    </ul>
  </div>

  <div class="proposal__prerequisites">
    <h3 class="proposal__section-title">PREREQUISITES</h3>
    <ul class="proposal__prereqs-list">
      {#each data.prerequisites as prereq (prereq)}
        <li class="proposal__prereq">• {prereq}</li>
      {/each}
    </ul>
  </div>

  <div class="proposal__costs">
    <h3 class="proposal__section-title">COST ANALYSIS</h3>
    <div class="proposal__costs-grid">
      <div class="proposal__cost-field">
        <span class="proposal__cost-label">Purchase Cost:</span>
        <span class="proposal__cost-value">{data.costs.purchaseCost}</span>
      </div>
      <div class="proposal__cost-field">
        <span class="proposal__cost-label">Installation Time:</span>
        <span class="proposal__cost-value">{data.costs.installationTime}</span>
      </div>
      <div class="proposal__cost-field">
        <span class="proposal__cost-label">Daily OpEx:</span>
        <span class="proposal__cost-value">{data.costs.dailyOpEx}</span>
      </div>
      <div class="proposal__cost-field proposal__cost-field--total">
        <span class="proposal__cost-label">Total (First Month):</span>
        <span class="proposal__cost-value">{data.costs.totalFirstMonth}</span>
      </div>
    </div>
  </div>

  <div class="proposal__roi">
    <h3 class="proposal__section-title">EXPECTED ROI</h3>
    <div class="proposal__roi-grid">
      <div class="proposal__roi-field">
        <span class="proposal__roi-label">Improvement:</span>
        <span class="proposal__roi-value">{data.expectedROI.estimatedImprovement}</span>
      </div>
      <div class="proposal__roi-field">
        <span class="proposal__roi-label">Payback Period:</span>
        <span class="proposal__roi-value">{data.expectedROI.paybackPeriod}</span>
      </div>
      <div class="proposal__roi-field proposal__roi-field--full">
        <span class="proposal__roi-label">Details:</span>
        <span class="proposal__roi-value">{data.expectedROI.description}</span>
      </div>
    </div>
  </div>

  {#if data.risks.length > 0}
    <div class="proposal__risks">
      <h3 class="proposal__section-title">RISKS</h3>
      <ul class="proposal__risks-list">
        {#each data.risks as risk (risk.description)}
          <li class="proposal__risk" style="border-left-color: {getRiskColor(risk.severity)}">
            <span class="proposal__risk-description">{risk.description}</span>
            <span class="proposal__risk-severity" style="color: {getRiskColor(risk.severity)}">
              [{risk.severity.toUpperCase()}]
            </span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if data.alternativeOptions.length > 0}
    <div class="proposal__alternatives">
      <h3 class="proposal__section-title">ALTERNATIVE OPTIONS</h3>
      {#each data.alternativeOptions as alt (alt.name)}
        <div class="proposal__alternative">
          <div class="proposal__alternative-header">
            <span class="proposal__alternative-name">{alt.name}</span>
            <span class="proposal__alternative-cost">{alt.cost}</span>
          </div>
          <div class="proposal__alternative-details">
            <span class="proposal__alternative-pros">Pros: {alt.pros.join(', ')}</span>
            <span class="proposal__alternative-cons">Cons: {alt.cons.join(', ')}</span>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <div class="proposal__actions">
    <Button variant="primary" onclick={() => onApprove?.()}>Approve</Button>
    <Button variant="secondary" onclick={() => onDefer?.()}>Defer</Button>
    <Button variant="ghost" onclick={() => onReject?.()}>Reject</Button>
  </div>
</div>

<style>
  .upgrade-proposal {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text);
  }

  .proposal__header {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-bottom: var(--space-3);
    border-bottom: var(--border-default);
  }

  .proposal__title {
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--color-amber);
    margin: 0;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .proposal__meta {
    display: flex;
    gap: var(--space-2);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    flex-wrap: wrap;
  }

  .proposal__meta-item {
    display: flex;
    gap: var(--space-1);
  }

  .proposal__label {
    color: var(--color-phosphor-green-dim);
  }

  .proposal__meta-divider {
    color: var(--color-phosphor-green-dark);
  }

  .proposal__meta-link {
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

  .proposal__meta-link:hover {
    color: var(--color-amber);
  }

  .proposal__meta-link:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .proposal__meta-link--highlighted {
    background-color: var(--color-warning);
    color: var(--color-bg-primary);
    padding: 2px 4px;
    border-radius: var(--radius-sm);
  }

  .proposal__links {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-2);
  }

  .proposal__link {
    font-size: var(--text-xs);
    color: var(--color-info);
    text-decoration: none;
    cursor: pointer;
    transition: color 150ms ease;
  }

  .proposal__link:hover {
    color: var(--color-amber);
    text-decoration: underline;
  }

  .proposal__link:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .proposal__name {
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    border-left: 3px solid var(--color-amber);
  }

  .proposal__upgrade-name {
    font-size: var(--text-md);
    font-weight: 600;
    color: var(--color-text-document);
    margin: 0;
  }

  .proposal__description,
  .proposal__benefits,
  .proposal__prerequisites,
  .proposal__costs,
  .proposal__roi,
  .proposal__risks,
  .proposal__alternatives {
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .proposal__section-title {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-amber);
    margin: 0 0 var(--space-2) 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .proposal__description-text {
    margin: 0;
    font-family: var(--font-document);
    font-size: var(--text-base);
    color: var(--color-document-white);
    line-height: 1.6;
  }

  .proposal__benefits-list,
  .proposal__prereqs-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .proposal__benefit {
    color: var(--color-safe);
    font-family: var(--font-document);
  }

  .proposal__prereq {
    color: var(--color-text-document);
    font-family: var(--font-document);
  }

  .proposal__costs-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-2);
  }

  @media (max-width: 600px) {
    .proposal__costs-grid {
      grid-template-columns: 1fr;
    }
  }

  .proposal__cost-field {
    display: flex;
    justify-content: space-between;
    padding: var(--space-2);
    background: var(--color-bg-primary);
    border-radius: var(--radius-sm);
  }

  .proposal__cost-field--total {
    grid-column: 1 / -1;
    border: 1px solid var(--color-amber);
  }

  .proposal__cost-label {
    color: var(--color-phosphor-green-dim);
  }

  .proposal__cost-value {
    font-weight: 600;
    color: var(--color-text-document);
  }

  .proposal__roi-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-2);
  }

  @media (max-width: 600px) {
    .proposal__roi-grid {
      grid-template-columns: 1fr;
    }
  }

  .proposal__roi-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-0);
  }

  .proposal__roi-field--full {
    grid-column: 1 / -1;
  }

  .proposal__roi-label {
    font-size: var(--text-xs);
    color: var(--color-phosphor-green-dim);
  }

  .proposal__roi-value {
    color: var(--color-text-document);
  }

  .proposal__risks-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .proposal__risk {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2);
    background: var(--color-bg-primary);
    border-radius: var(--radius-sm);
    border-left: 3px solid;
  }

  .proposal__risk-description {
    color: var(--color-text-document);
    font-family: var(--font-document);
  }

  .proposal__risk-severity {
    font-weight: 600;
    font-size: var(--text-xs);
  }

  .proposal__alternatives {
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .proposal__alternative {
    padding: var(--space-2);
    background: var(--color-bg-primary);
    border-radius: var(--radius-sm);
    margin-bottom: var(--space-2);
  }

  .proposal__alternative:last-child {
    margin-bottom: 0;
  }

  .proposal__alternative-header {
    display: flex;
    justify-content: space-between;
    font-weight: 600;
    color: var(--color-text-document);
  }

  .proposal__alternative-details {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    margin-top: var(--space-1);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .proposal__actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    padding-top: var(--space-3);
    border-top: var(--border-default);
  }
</style>
