<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';
  import type { CoopRole, CoopDecisionProposal } from '@the-dmz/shared/schemas';

  interface CoopProposalWithMeta extends CoopDecisionProposal {
    playerName?: string;
    emailSubject?: string;
  }

  interface Props {
    proposals: CoopProposalWithMeta[];
    currentPlayerId: string | null;
    isAuthority: boolean;
    onConfirm?: (proposalId: string) => void;
    onOverride?: (proposalId: string, reason: string) => void;
    onSelectEmail?: (emailId: string) => void;
    disabled?: boolean;
  }

  const {
    proposals,
    currentPlayerId,
    isAuthority,
    onConfirm,
    onOverride,
    onSelectEmail,
    disabled = false,
  }: Props = $props();

  let selectedConflictReason = $state<string | null>(null);
  let overrideTargetId = $state<string | null>(null);

  const pendingProposals = $derived(proposals.filter((p) => p.status === 'proposed'));
  const resolvedProposals = $derived(proposals.filter((p) => p.status !== 'proposed'));

  const actionLabels: Record<string, string> = {
    approve: 'APPROVE',
    deny: 'DENY',
    flag: 'FLAG',
    request_verification: 'VERIFY',
  };

  const roleLabels: Record<CoopRole, string> = {
    triage_lead: 'Triage Lead',
    verification_lead: 'Verification Lead',
  };

  const conflictReasonOptions = [
    { value: 'insufficient_verification', label: 'Insufficient Verification' },
    { value: 'risk_tolerance', label: 'Risk Tolerance Mismatch' },
    { value: 'factual_dispute', label: 'Factual Dispute' },
    { value: 'policy_conflict', label: 'Policy Conflict' },
  ];

  function handleConfirm(proposalId: string) {
    onConfirm?.(proposalId);
  }

  function handleOverrideClick(proposalId: string) {
    overrideTargetId = proposalId;
    selectedConflictReason = null;
  }

  function handleOverrideSubmit() {
    if (overrideTargetId && selectedConflictReason) {
      onOverride?.(overrideTargetId, selectedConflictReason);
      overrideTargetId = null;
      selectedConflictReason = null;
    }
  }

  function handleOverrideCancel() {
    overrideTargetId = null;
    selectedConflictReason = null;
  }

  function handleEmailClick(emailId: string) {
    onSelectEmail?.(emailId);
  }
</script>

<div class="decision-queue" role="region" aria-label="Decision Queue">
  <div class="decision-queue__header">
    <h3 class="decision-queue__title">DECISION QUEUE</h3>
    <span class="decision-queue__count" aria-label="{pendingProposals.length} pending decisions">
      {pendingProposals.length}
    </span>
  </div>

  <div class="decision-queue__content" aria-live="polite" aria-label="Pending decisions">
    {#if pendingProposals.length === 0}
      <div class="decision-queue__empty" role="status">
        <span class="decision-queue__empty-icon" aria-hidden="true">[ ]</span>
        <span class="decision-queue__empty-text">No pending decisions</span>
      </div>
    {:else}
      <ul class="decision-queue__list" role="list">
        {#each pendingProposals as proposal (proposal.proposalId)}
          {@const isOwnProposal = proposal.playerId === currentPlayerId}
          <li
            class="proposal-card"
            class:proposal-card--own={isOwnProposal}
            role="listitem"
            aria-label="Proposal by {proposal.playerName ?? 'Unknown'} for {actionLabels[
              proposal.action
            ] ?? proposal.action}"
          >
            <div class="proposal-card__header">
              <span class="proposal-card__role">{roleLabels[proposal.role] ?? proposal.role}</span>
              <span class="proposal-card__action proposal-card__action--{proposal.action}">
                {actionLabels[proposal.action] ?? proposal.action}
              </span>
            </div>

            <button
              type="button"
              class="proposal-card__email"
              onclick={() => handleEmailClick(proposal.emailId)}
              aria-label="View email for this decision"
            >
              <span class="proposal-card__email-icon" aria-hidden="true">@</span>
              <span class="proposal-card__email-id">{proposal.emailId.slice(0, 8)}...</span>
            </button>

            <div class="proposal-card__footer">
              {#if isOwnProposal}
                <span class="proposal-card__author">(You)</span>
              {:else}
                <span class="proposal-card__author">{proposal.playerName ?? 'Unknown'}</span>
              {/if}
            </div>

            {#if isAuthority && !isOwnProposal}
              <div class="proposal-card__actions" role="group" aria-label="Authority actions">
                {#if overrideTargetId === proposal.proposalId}
                  <div class="override-form">
                    <select
                      class="override-form__select"
                      bind:value={selectedConflictReason}
                      aria-label="Select conflict reason"
                    >
                      <option value={null}>Select reason...</option>
                      {#each conflictReasonOptions as option (option.value)}
                        <option value={option.value}>{option.label}</option>
                      {/each}
                    </select>
                    <div class="override-form__buttons">
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={!selectedConflictReason || disabled}
                        onclick={handleOverrideSubmit}
                      >
                        CONFIRM
                      </Button>
                      <Button variant="ghost" size="sm" {disabled} onclick={handleOverrideCancel}>
                        CANCEL
                      </Button>
                    </div>
                  </div>
                {:else}
                  <Button
                    variant="primary"
                    size="sm"
                    {disabled}
                    onclick={() => handleConfirm(proposal.proposalId)}
                  >
                    CONFIRM
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    {disabled}
                    onclick={() => handleOverrideClick(proposal.proposalId)}
                  >
                    OVERRIDE
                  </Button>
                {/if}
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  {#if resolvedProposals.length > 0}
    <div class="decision-queue__resolved" aria-label="Resolved decisions">
      <h4 class="decision-queue__subtitle">RESOLVED</h4>
      <ul class="decision-queue__list decision-queue__list--resolved" role="list">
        {#each resolvedProposals.slice(0, 5) as proposal (proposal.proposalId)}
          <li
            class="proposal-card proposal-card--resolved"
            class:proposal-card--confirmed={proposal.status === 'confirmed'}
            class:proposal-card--overridden={proposal.status === 'overridden'}
            role="listitem"
          >
            <span class="proposal-card__action proposal-card__action--{proposal.action}">
              {actionLabels[proposal.action] ?? proposal.action}
            </span>
            <span class="proposal-card__status proposal-card__status--{proposal.status}">
              {proposal.status.toUpperCase()}
            </span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .decision-queue {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    height: 100%;
    overflow: hidden;
  }

  .decision-queue__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-3);
    background-color: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border);
  }

  .decision-queue__title {
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text);
    margin: 0;
  }

  .decision-queue__count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 24px;
    padding: 0 var(--space-2);
    background-color: var(--color-amber);
    color: var(--color-bg-primary);
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    font-weight: 700;
    border-radius: var(--radius-full);
  }

  .decision-queue__content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2);
  }

  .decision-queue__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-6);
    color: var(--color-text-muted);
    text-align: center;
  }

  .decision-queue__empty-icon {
    font-family: var(--font-terminal);
    font-size: var(--text-2xl);
    opacity: 0.5;
  }

  .decision-queue__empty-text {
    font-size: var(--text-sm);
  }

  .decision-queue__list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .proposal-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3);
    background-color: var(--color-bg-tertiary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    transition: border-color 150ms ease;
  }

  .proposal-card:hover {
    border-color: var(--color-text-muted);
  }

  .proposal-card:focus-visible {
    outline: 2px solid var(--color-amber);
    outline-offset: 2px;
  }

  .proposal-card--own {
    border-left: 3px solid var(--color-info);
  }

  .proposal-card--resolved {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2);
    opacity: 0.7;
  }

  .proposal-card--confirmed {
    border-left: 3px solid var(--color-safe);
  }

  .proposal-card--overridden {
    border-left: 3px solid var(--color-danger);
  }

  .proposal-card__header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .proposal-card__role {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .proposal-card__action {
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    font-weight: 700;
    padding: var(--space-0) var(--space-2);
    border-radius: var(--radius-sm);
  }

  .proposal-card__action--approve {
    background-color: color-mix(in srgb, var(--color-safe) 20%, transparent);
    color: var(--color-safe);
  }

  .proposal-card__action--deny {
    background-color: color-mix(in srgb, var(--color-danger) 20%, transparent);
    color: var(--color-danger);
  }

  .proposal-card__action--flag {
    background-color: color-mix(in srgb, var(--color-warning) 20%, transparent);
    color: var(--color-warning);
  }

  .proposal-card__action--request_verification {
    background-color: color-mix(in srgb, var(--color-info) 20%, transparent);
    color: var(--color-info);
  }

  .proposal-card__email {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-2);
    background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all 150ms ease;
  }

  .proposal-card__email:hover {
    border-color: var(--color-amber);
    color: var(--color-amber);
  }

  .proposal-card__email:focus-visible {
    outline: 2px solid var(--color-amber);
    outline-offset: 2px;
  }

  .proposal-card__footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .proposal-card__author {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    font-style: italic;
  }

  .proposal-card__actions {
    display: flex;
    gap: var(--space-2);
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-border);
    margin-top: var(--space-1);
  }

  .override-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    width: 100%;
  }

  .override-form__select {
    padding: var(--space-1) var(--space-2);
    background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-text);
  }

  .override-form__buttons {
    display: flex;
    gap: var(--space-2);
  }

  .proposal-card__status {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
  }

  .proposal-card__status--confirmed {
    color: var(--color-safe);
  }

  .proposal-card__status--overridden {
    color: var(--color-danger);
  }

  .decision-queue__resolved {
    padding: var(--space-2);
    border-top: 1px solid var(--color-border);
  }

  .decision-queue__subtitle {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    margin: 0 0 var(--space-2) 0;
  }

  .decision-queue__list--resolved {
    gap: var(--space-1);
  }
</style>
