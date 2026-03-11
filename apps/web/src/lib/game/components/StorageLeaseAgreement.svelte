<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';

  interface RackAllocation {
    rackId: string;
    rackName: string;
    size: number;
    used: number;
    unitPrice: number;
  }

  interface BandwidthTier {
    name: string;
    includedMbps: number;
    overageRate: number;
  }

  interface StorageLeaseAgreementData {
    agreementId: string;
    emailId: string;
    clientName: string;
    clientOrganization: string;
    startDate: string;
    endDate: string;
    termMonths: number;
    autoRenewal: boolean;
    rackAllocations: RackAllocation[];
    bandwidthTier: BandwidthTier;
    powerAllocation: {
      allocatedWatts: number;
      ratePerWatt: number;
    };
    coolingIncluded: boolean;
    monthlyCost: string;
    setupFee: string;
    latePaymentPenalty: string;
    terminationClause: string;
    signatoryClient: string;
    signatoryProvider: string;
  }

  interface Props {
    data: StorageLeaseAgreementData;
    highlightedFieldId?: string | null;
    onFieldClick?: (documentId: string, field: string) => void;
    onLinkClick?: (url: string) => void;
    onAccept?: () => void;
    onReject?: () => void;
    onCounter?: () => void;
  }

  const {
    data,
    highlightedFieldId = null,
    onFieldClick,
    onLinkClick,
    onAccept,
    onReject,
    onCounter,
  }: Props = $props();

  function calculateTotalMonthly(): number {
    let total = 0;
    for (const rack of data.rackAllocations) {
      total += rack.used * rack.unitPrice;
    }
    total += data.bandwidthTier.overageRate * 100;
    total += data.powerAllocation.allocatedWatts * data.powerAllocation.ratePerWatt;
    return total;
  }

  function isFieldHighlighted(fieldId: string): boolean {
    return highlightedFieldId === fieldId;
  }

  function handleFieldClick(fieldId: string) {
    onFieldClick?.(data.agreementId, fieldId);
  }

  function handleLinkClick(url: string, event: MouseEvent) {
    event.preventDefault();
    onLinkClick?.(url);
  }
</script>

<div class="storage-lease" role="region" aria-labelledby="lease-title">
  <header class="lease__header">
    <h1 id="lease-title" class="lease__title">STORAGE LEASE AGREEMENT</h1>
    <div class="lease__meta">
      <button
        type="button"
        class="lease__meta-item lease__meta-link"
        class:lease__meta-link--highlighted={isFieldHighlighted('agreementId')}
        onclick={() => handleFieldClick('agreementId')}
      >
        <span class="lease__label">Agreement ID:</span>
        #{data.agreementId}
      </button>
      <span class="lease__meta-divider">|</span>
      <button
        type="button"
        class="lease__meta-item lease__meta-link"
        class:lease__meta-link--highlighted={isFieldHighlighted('emailId')}
        onclick={() => handleFieldClick('emailId')}
      >
        <span class="lease__label">Request:</span>
        #{data.emailId.slice(0, 8)}
      </button>
    </div>
    <div class="lease__links">
      <a
        href="internal://facility/layout"
        class="lease__link"
        onclick={(e) => handleLinkClick('internal://facility/layout', e)}
      >
        [View Facility Layout]
      </a>
      <a
        href="internal://pricing/storage"
        class="lease__link"
        onclick={(e) => handleLinkClick('internal://pricing/storage', e)}
      >
        [Pricing Tiers]
      </a>
    </div>
  </header>

  <div class="lease__parties">
    <div class="lease__party">
      <span class="lease__party-label">LESSEE:</span>
      <span class="lease__party-name">{data.clientName}</span>
      <span class="lease__party-org">{data.clientOrganization}</span>
    </div>
    <div class="lease__party">
      <span class="lease__party-label">LESSOR:</span>
      <span class="lease__party-name">Matrices GmbH</span>
      <span class="lease__party-org">Colocation Services</span>
    </div>
  </div>

  <div class="lease__term">
    <h2 class="lease__section-title">LEASE TERM</h2>
    <div class="lease__term-grid">
      <div class="lease__term-field">
        <span class="lease__term-label">Start Date:</span>
        <span class="lease__term-value">{data.startDate}</span>
      </div>
      <div class="lease__term-field">
        <span class="lease__term-label">End Date:</span>
        <span class="lease__term-value">{data.endDate}</span>
      </div>
      <div class="lease__term-field">
        <span class="lease__term-label">Duration:</span>
        <span class="lease__term-value">{data.termMonths} months</span>
      </div>
      <div class="lease__term-field">
        <span class="lease__term-label">Auto-Renewal:</span>
        <span class="lease__term-value">{data.autoRenewal ? 'Yes' : 'No'}</span>
      </div>
    </div>
  </div>

  <div class="lease__racks">
    <h2 class="lease__section-title">RACK ALLOCATION</h2>
    <table class="lease__racks-table">
      <thead>
        <tr>
          <th>Rack ID</th>
          <th>Size (U)</th>
          <th>Used</th>
          <th>Rate/U</th>
          <th>Subtotal</th>
        </tr>
      </thead>
      <tbody>
        {#each data.rackAllocations as rack (rack.rackId)}
          <tr>
            <td>{rack.rackName}</td>
            <td>{rack.size}</td>
            <td>{rack.used}</td>
            <td>{rack.unitPrice} CR</td>
            <td>{rack.used * rack.unitPrice} CR</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="lease__resources">
    <h2 class="lease__section-title">RESOURCES</h2>
    <div class="lease__resource-grid">
      <div class="lease__resource">
        <span class="lease__resource-label">Bandwidth Tier:</span>
        <span class="lease__resource-value"
          >{data.bandwidthTier.name} ({data.bandwidthTier.includedMbps} Mbps included)</span
        >
      </div>
      <div class="lease__resource">
        <span class="lease__resource-label">Overage Rate:</span>
        <span class="lease__resource-value">{data.bandwidthTier.overageRate} CR/Mbps</span>
      </div>
      <div class="lease__resource">
        <span class="lease__resource-label">Power Allocation:</span>
        <span class="lease__resource-value"
          >{data.powerAllocation.allocatedWatts}W @ {data.powerAllocation.ratePerWatt} CR/W</span
        >
      </div>
      <div class="lease__resource">
        <span class="lease__resource-label">Cooling:</span>
        <span class="lease__resource-value"
          >{data.coolingIncluded ? 'Included' : 'Not Included'}</span
        >
      </div>
    </div>
  </div>

  <div class="lease__pricing">
    <h2 class="lease__section-title">PRICING</h2>
    <div class="lease__pricing-grid">
      <div class="lease__pricing-field">
        <span class="lease__pricing-label">Setup Fee:</span>
        <span class="lease__pricing-value">{data.setupFee}</span>
      </div>
      <div class="lease__pricing-field">
        <span class="lease__pricing-label">Monthly Recurring:</span>
        <span class="lease__pricing-value">{data.monthlyCost}</span>
      </div>
      <div class="lease__pricing-field lease__pricing-field--total">
        <span class="lease__pricing-label">Estimated Monthly Total:</span>
        <span class="lease__pricing-value">{calculateTotalMonthly()} CR</span>
      </div>
    </div>
  </div>

  <div class="lease__terms">
    <h2 class="lease__section-title">TERMS</h2>
    <div class="lease__term-item">
      <span class="lease__term-item-label">Late Payment:</span>
      <span class="lease__term-item-value">{data.latePaymentPenalty}</span>
    </div>
    <div class="lease__term-item">
      <span class="lease__term-item-label">Termination:</span>
      <span class="lease__term-item-value">{data.terminationClause}</span>
    </div>
  </div>

  <div class="lease__signatures">
    <div class="lease__signature-block">
      <span class="lease__signature-label">Client Signature:</span>
      <span class="lease__signature-value">{data.signatoryClient}</span>
    </div>
    <div class="lease__signature-block">
      <span class="lease__signature-label">Provider Signature:</span>
      <span class="lease__signature-value">{data.signatoryProvider}</span>
    </div>
  </div>

  <div class="lease__actions">
    <Button variant="primary" onclick={() => onAccept?.()}>Accept Agreement</Button>
    <Button variant="secondary" onclick={() => onCounter?.()}>Counter Offer</Button>
    <Button variant="ghost" onclick={() => onReject?.()}>Reject</Button>
  </div>
</div>

<style>
  .storage-lease {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text);
  }

  .lease__header {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-bottom: var(--space-3);
    border-bottom: var(--border-default);
  }

  .lease__title {
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--color-amber);
    margin: 0;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .lease__meta {
    display: flex;
    gap: var(--space-2);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .lease__meta-item {
    display: flex;
    gap: var(--space-1);
  }

  .lease__label {
    color: var(--color-phosphor-green-dim);
  }

  .lease__meta-divider {
    color: var(--color-phosphor-green-dark);
  }

  .lease__meta-link {
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

  .lease__meta-link:hover {
    color: var(--color-amber);
  }

  .lease__meta-link:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .lease__meta-link--highlighted {
    background-color: var(--color-warning);
    color: var(--color-bg-primary);
    padding: 2px 4px;
    border-radius: var(--radius-sm);
  }

  .lease__links {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-2);
  }

  .lease__link {
    font-size: var(--text-xs);
    color: var(--color-info);
    text-decoration: none;
    cursor: pointer;
    transition: color 150ms ease;
  }

  .lease__link:hover {
    color: var(--color-amber);
    text-decoration: underline;
  }

  .lease__link:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .lease__parties {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
  }

  @media (max-width: 600px) {
    .lease__parties {
      grid-template-columns: 1fr;
    }
  }

  .lease__party {
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .lease__party-label {
    font-size: var(--text-xs);
    color: var(--color-amber);
    font-weight: 600;
    text-transform: uppercase;
  }

  .lease__party-name {
    font-weight: 600;
    color: var(--color-text-document);
  }

  .lease__party-org {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .lease__section-title {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-amber);
    margin: 0 0 var(--space-2) 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .lease__term,
  .lease__racks,
  .lease__resources,
  .lease__pricing,
  .lease__terms {
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .lease__term-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-2);
  }

  @media (max-width: 600px) {
    .lease__term-grid {
      grid-template-columns: 1fr;
    }
  }

  .lease__term-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-0);
  }

  .lease__term-label {
    font-size: var(--text-xs);
    color: var(--color-phosphor-green-dim);
  }

  .lease__term-value {
    color: var(--color-text-document);
  }

  .lease__racks-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-xs);
  }

  .lease__racks-table th,
  .lease__racks-table td {
    padding: var(--space-2);
    text-align: left;
    border-bottom: 1px solid var(--color-phosphor-green-dark);
  }

  .lease__racks-table th {
    color: var(--color-amber);
    font-weight: 600;
    text-transform: uppercase;
    font-size: var(--text-xs);
  }

  .lease__racks-table td {
    color: var(--color-text-document);
    font-family: var(--font-document);
  }

  .lease__resource-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-2);
  }

  @media (max-width: 600px) {
    .lease__resource-grid {
      grid-template-columns: 1fr;
    }
  }

  .lease__resource {
    display: flex;
    flex-direction: column;
    gap: var(--space-0);
  }

  .lease__resource-label {
    font-size: var(--text-xs);
    color: var(--color-phosphor-green-dim);
  }

  .lease__resource-value {
    color: var(--color-text-document);
  }

  .lease__pricing-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .lease__pricing-field {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2);
    background: var(--color-bg-primary);
    border-radius: var(--radius-sm);
  }

  .lease__pricing-field--total {
    border: 1px solid var(--color-amber);
  }

  .lease__pricing-label {
    color: var(--color-phosphor-green-dim);
  }

  .lease__pricing-value {
    font-weight: 600;
    color: var(--color-text-document);
  }

  .lease__term-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    margin-bottom: var(--space-2);
  }

  .lease__term-item:last-child {
    margin-bottom: 0;
  }

  .lease__term-item-label {
    font-size: var(--text-xs);
    color: var(--color-phosphor-green-dim);
  }

  .lease__term-item-value {
    font-family: var(--font-document);
    font-size: var(--text-sm);
    color: var(--color-text-document);
  }

  .lease__signatures {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    border: var(--border-default);
  }

  .lease__signature-block {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .lease__signature-label {
    font-size: var(--text-xs);
    color: var(--color-phosphor-green-dim);
  }

  .lease__signature-value {
    font-family: var(--font-document);
    font-size: var(--text-sm);
    color: var(--color-text-document);
    font-style: italic;
  }

  .lease__actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    padding-top: var(--space-3);
    border-top: var(--border-default);
  }
</style>
