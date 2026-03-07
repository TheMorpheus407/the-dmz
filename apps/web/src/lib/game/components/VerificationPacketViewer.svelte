<script lang="ts">
  import { SvelteMap } from 'svelte/reactivity';

  import Tabs from '$lib/ui/components/Tabs.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Modal from '$lib/ui/components/Modal.svelte';
  import type { VerificationPacket } from '@the-dmz/shared';

  import {
    extractIdentityData,
    extractOwnershipData,
    extractChainOfCustodyData,
    getValidityColor,
    getValidityLabel,
    formatTimestamp,
    getDocumentTypeLabel,
    type FlaggedDiscrepancy,
    type TabId,
  } from './verification-packet';

  import type { Snippet } from 'svelte';

  interface Tab {
    id: string;
    label: string;
    content: Snippet;
    disabled?: boolean;
  }

  interface DiscrepancyInfo {
    tabId: TabId;
    fieldId: string;
    fieldLabel: string;
  }

  interface Props {
    packet: VerificationPacket;
    emailId: string;
    onFlagDiscrepancy?: (discrepancy: FlaggedDiscrepancy) => void;
    onClose?: () => void;
  }

  const { packet, emailId, onFlagDiscrepancy, onClose }: Props = $props();

  let activeTab = $state<TabId>('identity');
  const flaggedDiscrepancies = new SvelteMap<string, string>();
  let isModalOpen = $state(false);
  let currentDiscrepancy = $state<DiscrepancyInfo | null>(null);
  let discrepancyNotes = $state('');

  const identityData = $derived(extractIdentityData(packet.artifacts));
  const ownershipData = $derived(extractOwnershipData(packet.artifacts));
  const chainOfCustodyData = $derived(extractChainOfCustodyData(packet.artifacts));

  function openDiscrepancyModal(tabId: TabId, fieldId: string, fieldLabel: string) {
    const key = `${tabId}-${fieldId}`;
    const existingNotes = flaggedDiscrepancies.get(key) || '';
    currentDiscrepancy = { tabId, fieldId, fieldLabel };
    discrepancyNotes = existingNotes;
    isModalOpen = true;
  }

  function submitDiscrepancy() {
    if (!currentDiscrepancy || !discrepancyNotes.trim()) {
      isModalOpen = false;
      return;
    }

    const key = `${currentDiscrepancy.tabId}-${currentDiscrepancy.fieldId}`;
    flaggedDiscrepancies.set(key, discrepancyNotes.trim());

    onFlagDiscrepancy?.({
      fieldId: currentDiscrepancy.fieldId,
      fieldLabel: currentDiscrepancy.fieldLabel,
      notes: discrepancyNotes.trim(),
      flaggedAt: new Date().toISOString(),
    });

    isModalOpen = false;
    currentDiscrepancy = null;
    discrepancyNotes = '';
  }

  function cancelDiscrepancy() {
    isModalOpen = false;
    currentDiscrepancy = null;
    discrepancyNotes = '';
  }

  function getVerificationStatusColor(
    status: 'verified' | 'unverified' | 'flagged' | 'suspended',
  ): string {
    switch (status) {
      case 'verified':
        return 'var(--color-safe)';
      case 'flagged':
        return 'var(--color-danger)';
      case 'suspended':
        return 'var(--color-warning)';
      default:
        return 'var(--color-archived)';
    }
  }

  function getDiscrepancySeverityColor(severity: 'low' | 'medium' | 'high'): string {
    switch (severity) {
      case 'high':
        return 'var(--color-danger)';
      case 'medium':
        return 'var(--color-warning)';
      default:
        return 'var(--color-info)';
    }
  }

  const tabs: Tab[] = $derived([
    {
      id: 'identity',
      label: 'Identity',
      content: identityTabContent,
    },
    {
      id: 'ownership',
      label: 'Ownership',
      content: ownershipTabContent,
    },
    {
      id: 'chain-of-custody',
      label: 'Chain of Custody',
      content: chainTabContent,
    },
  ]);

  function handleTabChange(tabId: string) {
    activeTab = tabId as TabId;
  }
</script>

<div class="verification-packet" role="dialog" aria-labelledby="vp-title">
  <header class="vp-header">
    <div class="vp-title-row">
      <h1 id="vp-title" class="vp-title">VERIFICATION PACKET</h1>
      {#if onClose}
        <Button variant="ghost" size="sm" onclick={onClose} ariaLabel="Close verification packet">
          ✕
        </Button>
      {/if}
    </div>
    <div class="vp-meta">
      <span class="vp-meta-item">Request: #{emailId.slice(0, 8)}</span>
      <span class="vp-meta-divider">|</span>
      <span class="vp-meta-item">Packet ID: {packet.packetId.slice(0, 8)}</span>
      <span class="vp-meta-divider">|</span>
      <span class="vp-meta-item">Created: {formatTimestamp(packet.createdAt)}</span>
    </div>
    {#if packet.hasIntelligenceBrief}
      <div class="vp-brief-indicator">
        <span class="vp-brief-icon">📊</span>
        <span class="vp-brief-text">Intelligence Brief Available</span>
      </div>
    {/if}
  </header>

  <Tabs {tabs} bind:activeTab ariaLabel="Verification Packet tabs" ontabchange={handleTabChange} />

  <div class="vp-artifacts">
    <h3 class="vp-artifacts-title">Attached Artifacts</h3>
    <ul class="vp-artifacts-list" role="list">
      {#each packet.artifacts as artifact (artifact.artifactId)}
        <li
          class="vp-artifact"
          class:vp-artifact--warning={artifact.validityIndicator === 'suspicious' ||
            artifact.validityIndicator === 'invalid'}
        >
          <span class="vp-artifact-type">{getDocumentTypeLabel(artifact.documentType)}</span>
          <span class="vp-artifact-title">{artifact.title}</span>
          <span
            class="vp-artifact-validity"
            style="color: {getValidityColor(artifact.validityIndicator)}"
          >
            {getValidityLabel(artifact.validityIndicator)}
          </span>
        </li>
      {/each}
    </ul>
  </div>
</div>

{#snippet identityTabContent()}
  <div class="vp-tab-content">
    <div class="vp-section">
      <div class="vp-field">
        <span class="vp-label">Requester Name:</span>
        <span class="vp-value" class:vp-value--highlight={identityData.discrepancies.length > 0}
          >{identityData.requesterName}</span
        >
      </div>
      <div class="vp-field">
        <span class="vp-label">Role:</span>
        <span class="vp-value">{identityData.requesterRole}</span>
      </div>
      <div class="vp-field">
        <span class="vp-label">Organization:</span>
        <span class="vp-value">{identityData.organization}</span>
      </div>
      <div class="vp-field">
        <span class="vp-label">Contact Email:</span>
        <span class="vp-value">{identityData.contactEmail}</span>
      </div>
      {#if identityData.contactPhone}
        <div class="vp-field">
          <span class="vp-label">Contact Phone:</span>
          <span class="vp-value">{identityData.contactPhone}</span>
        </div>
      {/if}
      <div class="vp-field">
        <span class="vp-label">Verification Status:</span>
        <span
          class="vp-value vp-value--status"
          style="color: {getVerificationStatusColor(identityData.verificationStatus)}"
        >
          {identityData.verificationStatus.toUpperCase()}
        </span>
      </div>
    </div>

    {#if identityData.discrepancies.length > 0}
      <div class="vp-discrepancies">
        {#each identityData.discrepancies as d (d.fieldId)}
          <div
            class="vp-discrepancy"
            style="border-left-color: {getDiscrepancySeverityColor(d.severity)}"
          >
            <div class="vp-discrepancy-header">⚠ {d.fieldLabel} - MISMATCH</div>
            <div class="vp-discrepancy-detail">
              Claimed: {d.claimedValue} | Verified: {d.verifiedValue}
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <div class="vp-actions">
      <Button
        variant="danger"
        size="sm"
        onclick={() => openDiscrepancyModal('identity', 'identity_all', 'Identity Verification')}
      >
        Flag Discrepancy
      </Button>
    </div>
  </div>
{/snippet}

{#snippet ownershipTabContent()}
  <div class="vp-tab-content">
    <div class="vp-section">
      <div class="vp-field">
        <span class="vp-label">Asset:</span>
        <span class="vp-value" class:vp-value--highlight={ownershipData.discrepancies.length > 0}
          >{ownershipData.assetName}</span
        >
      </div>
      <div class="vp-field">
        <span class="vp-label">Asset Type:</span>
        <span class="vp-value">{ownershipData.assetType}</span>
      </div>
      <div class="vp-field">
        <span class="vp-label">Current Owner:</span>
        <span class="vp-value">{ownershipData.currentOwner}</span>
      </div>
      <div class="vp-field">
        <span class="vp-label">Custodian:</span>
        <span class="vp-value">{ownershipData.custodian}</span>
      </div>
    </div>

    {#if ownershipData.authorizationChain.length > 0}
      <div class="vp-subsection">
        <h3 class="vp-subsection-title">Authorization Chain</h3>
        {#each ownershipData.authorizationChain as entry (entry.id)}
          <div class="vp-entry">
            {entry.authorizedBy} ({entry.role}) - {entry.scope} - {formatTimestamp(
              entry.authorizedDate,
            )}
          </div>
        {/each}
      </div>
    {/if}

    {#if ownershipData.previousAccessHistory.length > 0}
      <div class="vp-subsection">
        <h3 class="vp-subsection-title">Previous Access History</h3>
        {#each ownershipData.previousAccessHistory as entry (entry.id)}
          <div class="vp-entry">
            {entry.accessDate}: {entry.accessor} - {entry.action} [{entry.result.toUpperCase()}]
          </div>
        {/each}
      </div>
    {/if}

    {#if ownershipData.discrepancies.length > 0}
      <div class="vp-discrepancies">
        {#each ownershipData.discrepancies as d (d.fieldId)}
          <div
            class="vp-discrepancy"
            style="border-left-color: {getDiscrepancySeverityColor(d.severity)}"
          >
            <div class="vp-discrepancy-header">⚠ {d.fieldLabel} - MISMATCH</div>
            <div class="vp-discrepancy-detail">
              Claimed: {d.claimedValue} | Verified: {d.verifiedValue}
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <div class="vp-actions">
      <Button
        variant="danger"
        size="sm"
        onclick={() => openDiscrepancyModal('ownership', 'ownership_all', 'Ownership Verification')}
      >
        Flag Discrepancy
      </Button>
    </div>
  </div>
{/snippet}

{#snippet chainTabContent()}
  <div class="vp-tab-content">
    {#if chainOfCustodyData.timeline.length > 0}
      <div class="vp-section">
        <h3 class="vp-subsection-title">Request Timeline</h3>
        {#each chainOfCustodyData.timeline as entry (entry.id)}
          <div class="vp-timeline-entry">
            <span class="vp-timeline-timestamp">{formatTimestamp(entry.timestamp)}</span>
            <span>{entry.event} - {entry.actor}</span>
          </div>
        {/each}
      </div>
    {/if}

    {#if chainOfCustodyData.approvers.length > 0}
      <div class="vp-section">
        <h3 class="vp-subsection-title">Approvers & Sign-offs</h3>
        {#each chainOfCustodyData.approvers as entry (entry.id)}
          <div class="vp-entry">
            <span
              class="vp-status"
              style="color: {entry.status === 'approved'
                ? 'var(--color-safe)'
                : entry.status === 'rejected'
                  ? 'var(--color-danger)'
                  : 'var(--color-warning)'}"
            >
              [{entry.status.toUpperCase()}]
            </span>
            <span> {entry.name} ({entry.role}) - {formatTimestamp(entry.approvalDate)}</span>
          </div>
        {/each}
      </div>
    {/if}

    {#if chainOfCustodyData.auditTrail.length > 0}
      <div class="vp-section">
        <h3 class="vp-subsection-title">Audit Trail</h3>
        {#each chainOfCustodyData.auditTrail as entry (entry.id)}
          <div class="vp-entry vp-entry--audit">
            <span class="vp-timestamp">{formatTimestamp(entry.timestamp)}</span>
            <span> {entry.action} by {entry.performedBy} - {entry.result}</span>
          </div>
        {/each}
      </div>
    {/if}

    {#if chainOfCustodyData.discrepancies.length > 0}
      <div class="vp-discrepancies">
        {#each chainOfCustodyData.discrepancies as d (d.fieldId)}
          <div
            class="vp-discrepancy"
            style="border-left-color: {getDiscrepancySeverityColor(d.severity)}"
          >
            <div class="vp-discrepancy-header">⚠ {d.fieldLabel} - MISMATCH</div>
            <div class="vp-discrepancy-detail">
              Claimed: {d.claimedValue} | Verified: {d.verifiedValue}
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <div class="vp-actions">
      <Button
        variant="danger"
        size="sm"
        onclick={() =>
          openDiscrepancyModal('chain-of-custody', 'chain_all', 'Chain of Custody Verification')}
      >
        Flag Discrepancy
      </Button>
    </div>
  </div>
{/snippet}

<Modal bind:open={isModalOpen} title="Flag Discrepancy" size="sm" onclose={cancelDiscrepancy}>
  <div class="discrepancy-modal-content">
    <p class="discrepancy-modal-field">
      <strong>Field:</strong>
      {currentDiscrepancy?.fieldLabel}
    </p>
    <label for="discrepancy-notes" class="discrepancy-modal-label"> Notes (required): </label>
    <textarea
      id="discrepancy-notes"
      class="discrepancy-modal-textarea"
      bind:value={discrepancyNotes}
      placeholder="Enter details about this discrepancy..."
      rows="4"
    ></textarea>
  </div>
  {#snippet footer()}
    <Button variant="ghost" onclick={cancelDiscrepancy}>Cancel</Button>
    <Button variant="danger" onclick={submitDiscrepancy} disabled={!discrepancyNotes.trim()}>
      Submit
    </Button>
  {/snippet}
</Modal>

<style>
  .verification-packet {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-4);
    background: var(--color-bg-secondary);
    border: var(--border-default);
    border-radius: var(--radius-md);
    max-width: 800px;
  }

  .vp-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-bottom: var(--space-3);
    border-bottom: var(--border-default);
  }

  .vp-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .vp-title {
    font-family: var(--font-terminal);
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--color-amber);
    margin: 0;
    letter-spacing: 0.05em;
  }

  .vp-meta {
    display: flex;
    gap: var(--space-2);
    font-size: var(--text-xs);
    color: var(--color-phosphor-green-dim);
    font-family: var(--font-terminal);
  }

  .vp-meta-divider {
    color: var(--color-phosphor-green-dark);
  }

  .vp-brief-indicator {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    color: var(--color-info);
  }

  .vp-tab-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .vp-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .vp-field {
    display: flex;
    gap: var(--space-2);
    font-size: var(--text-sm);
    color: var(--color-phosphor-green-dim);
    font-family: var(--font-document);
  }

  .vp-label {
    min-width: 140px;
  }

  .vp-value {
    color: var(--color-document-white);
    font-family: var(--font-terminal);
  }

  .vp-value--highlight {
    color: var(--color-warning);
    font-weight: 600;
  }

  .vp-value--status {
    font-weight: 600;
  }

  .vp-subsection {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .vp-subsection-title {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-amber);
    margin: 0;
    font-family: var(--font-terminal);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .vp-entry {
    padding: var(--space-2);
    font-size: var(--text-xs);
    color: var(--color-document-muted);
    font-family: var(--font-terminal);
    border-left: 2px solid var(--color-phosphor-green-dark);
  }

  .vp-entry--audit {
    border-left-color: var(--color-info);
  }

  .vp-timeline-entry {
    padding: var(--space-2);
    font-size: var(--text-xs);
    color: var(--color-document-muted);
    font-family: var(--font-terminal);
    display: flex;
    gap: var(--space-2);
  }

  .vp-timeline-timestamp {
    color: var(--color-phosphor-green-dim);
    min-width: 160px;
  }

  .vp-status {
    font-weight: 600;
  }

  .vp-timestamp {
    color: var(--color-phosphor-green-dim);
  }

  .vp-discrepancies {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3);
    background: rgba(255, 85, 85, 0.1);
    border: 1px solid var(--color-danger);
    border-radius: var(--radius-sm);
  }

  .vp-discrepancy {
    padding: var(--space-2);
    border-left: 3px solid var(--color-danger);
    background: var(--color-bg-tertiary);
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  }

  .vp-discrepancy-header {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-danger);
    font-family: var(--font-terminal);
  }

  .vp-discrepancy-detail {
    font-size: var(--text-xs);
    color: var(--color-document-muted);
    margin-top: var(--space-1);
    font-family: var(--font-terminal);
  }

  .vp-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    padding-top: var(--space-3);
    border-top: var(--border-default);
  }

  .vp-artifacts {
    margin-top: var(--space-4);
    padding-top: var(--space-3);
    border-top: var(--border-default);
  }

  .vp-artifacts-title {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-amber);
    margin: 0 0 var(--space-2) 0;
    font-family: var(--font-terminal);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .vp-artifacts-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .vp-artifact {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    font-family: var(--font-terminal);
    border-left: 3px solid var(--color-safe);
  }

  .vp-artifact--warning {
    border-left-color: var(--color-warning);
  }

  .vp-artifact-type {
    color: var(--color-phosphor-green-dim);
    min-width: 120px;
  }

  .vp-artifact-title {
    flex: 1;
    color: var(--color-document-white);
  }

  .vp-artifact-validity {
    font-weight: 600;
  }

  .discrepancy-modal-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .discrepancy-modal-field {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--color-phosphor-green-dim);
    font-family: var(--font-terminal);
  }

  .discrepancy-modal-label {
    font-size: var(--text-sm);
    color: var(--color-text);
    font-family: var(--font-ui);
    font-weight: 500;
  }

  .discrepancy-modal-textarea {
    width: 100%;
    padding: var(--space-3);
    background: var(--color-bg-tertiary);
    border: var(--border-default);
    border-radius: var(--radius-sm);
    color: var(--color-document-white);
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    resize: vertical;
    min-height: 100px;
    box-sizing: border-box;
  }

  .discrepancy-modal-textarea:focus {
    outline: none;
    border-color: var(--color-danger);
  }

  .discrepancy-modal-textarea::placeholder {
    color: var(--color-phosphor-green-dark);
  }
</style>
