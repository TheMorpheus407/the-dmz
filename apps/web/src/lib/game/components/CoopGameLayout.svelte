<script lang="ts">
  import type { CoopRole, CoopDecisionProposal } from '@the-dmz/shared/schemas';

  import RoleHeaderBadge from './RoleHeaderBadge.svelte';
  import AuthorityIndicator from './AuthorityIndicator.svelte';
  import CoopDecisionQueue from './CoopDecisionQueue.svelte';
  import QuickSignalBadges, { type QuickSignalType } from './QuickSignalBadges.svelte';

  import type { Snippet } from 'svelte';

  interface CoopSessionData {
    dayNumber: number;
    roles: Array<{
      playerId: string;
      role: CoopRole;
      isAuthority: boolean;
    }>;
  }

  interface Props {
    session: CoopSessionData;
    currentPlayerId: string | null;
    currentPlayerRole: CoopRole | null;
    isAuthority: boolean;
    proposals: CoopDecisionProposal[];
    onConfirmProposal?: (proposalId: string) => void;
    onOverrideProposal?: (proposalId: string, reason: string) => void;
    onSelectEmail?: (emailId: string) => void;
    onSendSignal?: (signal: QuickSignalType) => void;
    inboxContent: Snippet;
    viewerContent: Snippet;
  }

  const {
    session,
    currentPlayerId,
    currentPlayerRole,
    isAuthority,
    proposals,
    onConfirmProposal,
    onOverrideProposal,
    onSelectEmail,
    onSendSignal,
    inboxContent,
    viewerContent,
  }: Props = $props();

  let showDayAdvanceModal = $state(false);

  const otherPlayer = $derived(() => {
    if (!currentPlayerId || !session.roles) return null;
    return session.roles.find((r: { playerId: string }) => r.playerId !== currentPlayerId);
  });

  const proposalsWithMeta = $derived(
    proposals.map((p) => ({
      ...p,
      playerName:
        session.roles?.find((r: { playerId: string }) => r.playerId === p.playerId)?.playerId ===
        currentPlayerId
          ? 'You'
          : 'Partner',
    })),
  );

  function handleDayAdvance() {
    showDayAdvanceModal = true;
  }

  function confirmDayAdvance() {
    showDayAdvanceModal = false;
  }

  function cancelDayAdvance() {
    showDayAdvanceModal = false;
  }

  function handleSignal(signal: QuickSignalType) {
    onSendSignal?.(signal);
  }
</script>

<div class="coop-layout" role="main" aria-label="Cooperative game view">
  <header class="coop-layout__header">
    <div class="coop-layout__header-left">
      <span class="coop-layout__title">CO-OP SESSION</span>
      <span class="coop-layout__day">DAY {session.dayNumber}</span>
    </div>

    <div class="coop-layout__header-center">
      {#if currentPlayerRole}
        <RoleHeaderBadge role={currentPlayerRole} {isAuthority} size="md" />
      {/if}
      {#if isAuthority}
        <AuthorityIndicator {isAuthority} playerName="You" isCurrentPlayer={true} compact={true} />
      {:else if otherPlayer()}
        <AuthorityIndicator
          isAuthority={true}
          playerName="Partner"
          isCurrentPlayer={false}
          compact={true}
        />
      {/if}
    </div>

    <div class="coop-layout__header-right">
      <QuickSignalBadges
        playerId={currentPlayerId ?? ''}
        onSignal={handleSignal}
        disabled={!currentPlayerId}
      />
      {#if isAuthority}
        <button
          type="button"
          class="coop-layout__advance-btn"
          onclick={handleDayAdvance}
          aria-label="Advance to next day"
        >
          ADVANCE DAY
        </button>
      {/if}
    </div>
  </header>

  <div class="coop-layout__main">
    <aside class="coop-layout__left-pane" aria-label="Inbox panel">
      <div class="coop-layout__pane-header">
        <h2 class="coop-layout__pane-title">INBOX</h2>
      </div>
      <div class="coop-layout__pane-content">
        {@render inboxContent()}
      </div>
    </aside>

    <div class="coop-layout__right-pane">
      <div class="coop-layout__viewer-pane" aria-label="Document viewer panel">
        <div class="coop-layout__pane-header">
          <h2 class="coop-layout__pane-title">
            {#if currentPlayerRole === 'verification_lead'}
              VERIFICATION PACKET
            {:else}
              EMAIL VIEWER
            {/if}
          </h2>
        </div>
        <div class="coop-layout__pane-content">
          {@render viewerContent()}
        </div>
      </div>

      <div class="coop-layout__queue-pane" aria-label="Decision queue panel">
        <CoopDecisionQueue
          proposals={proposalsWithMeta}
          {currentPlayerId}
          {isAuthority}
          onConfirm={onConfirmProposal ?? (() => {})}
          onOverride={onOverrideProposal ?? (() => {})}
          onSelectEmail={onSelectEmail ?? (() => {})}
        />
      </div>
    </div>
  </div>
</div>

{#if showDayAdvanceModal}
  <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="day-advance-title">
    <div class="modal-content">
      <h2 id="day-advance-title" class="modal-title">ADVANCE TO DAY {session.dayNumber + 1}?</h2>
      <p class="modal-body">
        {#if isAuthority}
          You are about to advance to the next day. Authority will be rotated to the other player.
        {:else}
          The authority player is about to advance to the next day.
        {/if}
      </p>
      <div class="modal-actions">
        {#if isAuthority}
          <button type="button" class="modal-btn modal-btn--confirm" onclick={confirmDayAdvance}>
            CONFIRM
          </button>
        {/if}
        <button type="button" class="modal-btn modal-btn--cancel" onclick={cancelDayAdvance}>
          {isAuthority ? 'CANCEL' : 'CLOSE'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .coop-layout {
    display: grid;
    grid-template-rows: auto 1fr;
    height: 100vh;
    background-color: var(--color-bg-primary);
    color: var(--color-text);
  }

  .coop-layout__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-4);
    background-color: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border);
    gap: var(--space-4);
  }

  .coop-layout__header-left {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .coop-layout__title {
    font-family: var(--font-terminal);
    font-size: var(--text-lg);
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--color-phosphor-green);
  }

  .coop-layout__day {
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-amber);
    padding: var(--space-1) var(--space-3);
    background-color: color-mix(in srgb, var(--color-amber) 15%, transparent);
    border: 1px solid var(--color-amber);
    border-radius: var(--radius-sm);
  }

  .coop-layout__header-center {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .coop-layout__header-right {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .coop-layout__advance-btn {
    padding: var(--space-2) var(--space-4);
    background-color: var(--color-amber);
    color: var(--color-bg-primary);
    border: 1px solid var(--color-amber);
    border-radius: var(--radius-sm);
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    font-weight: 700;
    cursor: pointer;
    transition: all 150ms ease;
  }

  .coop-layout__advance-btn:hover {
    filter: brightness(1.1);
    box-shadow: 0 0 8px color-mix(in srgb, var(--color-amber) 40%, transparent);
  }

  .coop-layout__advance-btn:focus-visible {
    outline: 2px solid var(--color-phosphor-green);
    outline-offset: 2px;
  }

  .coop-layout__main {
    display: grid;
    grid-template-columns: 320px 1fr;
    height: 100%;
    overflow: hidden;
  }

  .coop-layout__left-pane {
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--color-border);
    background-color: var(--color-bg-secondary);
  }

  .coop-layout__right-pane {
    display: grid;
    grid-template-rows: 1fr 280px;
    overflow: hidden;
  }

  .coop-layout__viewer-pane {
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid var(--color-border);
    overflow: hidden;
  }

  .coop-layout__queue-pane {
    display: flex;
    flex-direction: column;
    background-color: var(--color-bg-secondary);
    overflow: hidden;
  }

  .coop-layout__pane-header {
    display: flex;
    align-items: center;
    padding: var(--space-2) var(--space-3);
    background-color: var(--color-bg-tertiary);
    border-bottom: 1px solid var(--color-border);
  }

  .coop-layout__pane-title {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-text-muted);
    margin: 0;
  }

  .coop-layout__pane-content {
    flex: 1;
    overflow: auto;
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.8);
    z-index: 1000;
  }

  .modal-content {
    background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-amber);
    border-radius: var(--radius-md);
    padding: var(--space-6);
    max-width: 480px;
    text-align: center;
  }

  .modal-title {
    font-family: var(--font-terminal);
    font-size: var(--text-xl);
    font-weight: 700;
    color: var(--color-amber);
    margin: 0 0 var(--space-4) 0;
  }

  .modal-body {
    font-size: var(--text-base);
    color: var(--color-text-muted);
    margin: 0 0 var(--space-6) 0;
    line-height: 1.6;
  }

  .modal-actions {
    display: flex;
    justify-content: center;
    gap: var(--space-3);
  }

  .modal-btn {
    padding: var(--space-2) var(--space-6);
    border-radius: var(--radius-sm);
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    font-weight: 700;
    cursor: pointer;
    transition: all 150ms ease;
  }

  .modal-btn--confirm {
    background-color: var(--color-amber);
    color: var(--color-bg-primary);
    border: 1px solid var(--color-amber);
  }

  .modal-btn--confirm:hover {
    filter: brightness(1.1);
  }

  .modal-btn--cancel {
    background-color: transparent;
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
  }

  .modal-btn--cancel:hover {
    background-color: var(--color-bg-hover);
    color: var(--color-text);
  }

  @media (max-width: 1024px) {
    .coop-layout__main {
      grid-template-columns: 280px 1fr;
    }
  }

  @media (max-width: 768px) {
    .coop-layout__main {
      grid-template-columns: 1fr;
      grid-template-rows: 1fr 200px;
    }

    .coop-layout__left-pane {
      border-right: none;
      border-bottom: 1px solid var(--color-border);
    }

    .coop-layout__header {
      flex-wrap: wrap;
      gap: var(--space-2);
    }
  }
</style>
