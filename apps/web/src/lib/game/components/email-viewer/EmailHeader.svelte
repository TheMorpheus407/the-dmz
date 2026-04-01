<script lang="ts">
  import type { EmailInstance } from '@the-dmz/shared';

  import { formatDate, getAuthResultInfo } from '../email-viewer';

  interface Props {
    email: EmailInstance;
    showFullHeaders: boolean;
    onToggleHeaders: () => void;
  }

  const { email, showFullHeaders, onToggleHeaders }: Props = $props();

  const authInfo = $derived({
    spf: getAuthResultInfo(email.headers.spfResult),
    dkim: getAuthResultInfo(email.headers.dkimResult),
    dmarc: getAuthResultInfo(email.headers.dmarcResult),
  });
</script>

<header class="email-header">
  <div class="email-header__main">
    <div class="email-header__subject-row">
      <span class="email-header__label">Subject:</span>
      <h1 class="email-header__subject">{email.headers.subject}</h1>
    </div>

    <div class="email-header__sender-row">
      <span class="email-header__label">From:</span>
      <span class="email-header__sender">
        <span class="email-header__sender-name">{email.sender.displayName}</span>
        <span class="email-header__sender-address">&lt;{email.sender.emailAddress}&gt;</span>
      </span>
    </div>

    <div class="email-header__meta-row">
      <span class="email-header__label">Date:</span>
      <span class="email-header__date">{formatDate(email.headers.originalDate)}</span>
    </div>
  </div>

  <button
    type="button"
    class="email-header__toggle"
    onclick={onToggleHeaders}
    aria-expanded={showFullHeaders}
    aria-controls="email-viewer-headers"
  >
    {showFullHeaders ? '▼ Hide Headers' : '▶ Show Headers'}
  </button>

  {#if showFullHeaders}
    <div
      class="email-header__headers"
      id="email-viewer-headers"
      role="region"
      aria-label="Email headers"
    >
      <div class="email-header__headers-grid">
        <div class="email-header__header-field">
          <span class="email-header__header-label">From:</span>
          <span class="email-header__header-value">{email.sender.emailAddress}</span>
        </div>
        <div class="email-header__header-field">
          <span class="email-header__header-label">To:</span>
          <span class="email-header__header-value">intake@matrices-gmbh.net</span>
        </div>
        <div class="email-header__header-field">
          <span class="email-header__header-label">Subject:</span>
          <span class="email-header__header-value">{email.headers.subject}</span>
        </div>
        <div class="email-header__header-field">
          <span class="email-header__header-label">Date:</span>
          <span class="email-header__header-value">{formatDate(email.headers.originalDate)}</span>
        </div>
        <div class="email-header__header-field">
          <span class="email-header__header-label">Message-ID:</span>
          <span class="email-header__header-value">{email.headers.messageId}</span>
        </div>
        <div class="email-header__header-field">
          <span class="email-header__header-label">Return-Path:</span>
          <span class="email-header__header-value">{email.headers.returnPath}</span>
        </div>

        {#if email.headers.received.length > 0}
          <div class="email-header__header-field email-header__header-field--full">
            <span class="email-header__header-label">Received:</span>
            <div class="email-header__received-chain">
              {#each email.headers.received as received, index (index)}
                <div class="email-header__received-entry">
                  <span class="email-header__received-num">[{index + 1}]</span>
                  <span class="email-header__received-value">{received}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <div class="email-header__auth-section">
          <span class="email-header__auth-label">Authentication:</span>
          <div class="email-header__auth-results">
            <div class="email-header__auth-result">
              <span class="email-header__auth-type">SPF:</span>
              <span class="email-header__auth-value" style="color: {authInfo.spf.color}"
                >{authInfo.spf.label}</span
              >
            </div>
            <div class="email-header__auth-result">
              <span class="email-header__auth-type">DKIM:</span>
              <span class="email-header__auth-value" style="color: {authInfo.dkim.color}"
                >{authInfo.dkim.label}</span
              >
            </div>
            <div class="email-header__auth-result">
              <span class="email-header__auth-type">DMARC:</span>
              <span class="email-header__auth-value" style="color: {authInfo.dmarc.color}"
                >{authInfo.dmarc.label}</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</header>

<style>
  .email-header {
    padding: var(--space-3);
    border-bottom: var(--border-default);
    background-color: var(--color-bg-tertiary);
  }

  .email-header__main {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .email-header__subject-row {
    display: flex;
    gap: var(--space-2);
    align-items: baseline;
  }

  .email-header__label {
    color: var(--color-amber);
    font-weight: 600;
    min-width: 60px;
    flex-shrink: 0;
  }

  .email-header__subject {
    font-family: var(--font-document);
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--color-text-document);
    margin: 0;
    line-height: 1.4;
  }

  .email-header__sender-row,
  .email-header__meta-row {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }

  .email-header__sender {
    display: flex;
    gap: var(--space-1);
    align-items: center;
  }

  .email-header__sender-name {
    color: var(--color-text-document);
    font-weight: 500;
  }

  .email-header__sender-address {
    color: var(--color-text-muted);
    font-size: var(--text-xs);
  }

  .email-header__date {
    color: var(--color-text-muted);
    font-size: var(--text-xs);
  }

  .email-header__toggle {
    margin-top: var(--space-2);
    padding: var(--space-1) var(--space-2);
    background: transparent;
    border: 1px solid var(--color-phosphor-green-dark);
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    cursor: pointer;
    transition:
      background-color 150ms ease,
      color 150ms ease;
  }

  .email-header__toggle:hover {
    background-color: var(--color-bg-hover);
    color: var(--color-text);
  }

  .email-header__toggle:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .email-header__headers {
    margin-top: var(--space-3);
    padding: var(--space-2);
    background-color: var(--color-bg-primary);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-phosphor-green-dark);
  }

  .email-header__headers-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
  }

  .email-header__header-field {
    display: flex;
    gap: var(--space-2);
  }

  .email-header__header-field--full {
    flex-direction: column;
    margin-top: var(--space-1);
  }

  .email-header__header-label {
    color: var(--color-amber);
    min-width: 80px;
    flex-shrink: 0;
  }

  .email-header__header-value {
    color: var(--color-text-muted);
    word-break: break-all;
  }

  .email-header__received-chain {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    margin-top: var(--space-1);
    margin-left: var(--space-4);
  }

  .email-header__received-entry {
    display: flex;
    gap: var(--space-1);
    color: var(--color-text-muted);
  }

  .email-header__received-num {
    color: var(--color-amber-dim);
    flex-shrink: 0;
  }

  .email-header__received-value {
    word-break: break-all;
  }

  .email-header__auth-section {
    display: flex;
    gap: var(--space-2);
    margin-top: var(--space-2);
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-phosphor-green-dark);
  }

  .email-header__auth-label {
    color: var(--color-amber);
  }

  .email-header__auth-results {
    display: flex;
    gap: var(--space-3);
  }

  .email-header__auth-result {
    display: flex;
    gap: var(--space-1);
  }

  .email-header__auth-type {
    color: var(--color-text-muted);
  }

  .email-header__auth-value {
    font-weight: 600;
  }
</style>
