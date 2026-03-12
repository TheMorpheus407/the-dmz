<script module lang="ts">
  function getFileIcon(fileType: string): string {
    const type = fileType.toLowerCase();
    if (type.includes('pdf')) return '📄';
    if (type.includes('csv') || type.includes('spreadsheet')) return '📊';
    if (type.includes('doc') || type.includes('word')) return '📝';
    if (
      type.includes('image') ||
      type.includes('png') ||
      type.includes('jpg') ||
      type.includes('jpeg')
    )
      return '🖼';
    if (type.includes('txt') || type.includes('text')) return '📃';
    return '📎';
  }
</script>

<script lang="ts">
  import LoadingState from '$lib/ui/components/LoadingState.svelte';
  import ContextMenu from '$lib/ui/components/ContextMenu.svelte';
  import {
    buildContextMenu,
    getMenuPosition,
    type ContextMenuState,
  } from '$lib/ui/components/context-menu';
  import type { EmailInstance, EmbeddedLink } from '@the-dmz/shared';

  import {
    formatFileSize,
    extractDomain,
    formatDate,
    truncateHash,
    getAuthResultInfo,
  } from './email-viewer';

  interface Props {
    email: EmailInstance | null;
    isLoading?: boolean;
    error?: string | null;
    onAttachmentClick?: (attachmentId: string) => void;
    onLinkClick?: (url: string) => void;
    onAddNote?: (content: string) => void;
    onMarkRead?: (read: boolean) => void;
    onFlagForReview?: () => void;
  }

  const {
    email = null,
    isLoading = false,
    error = null,
    onAttachmentClick,
    onLinkClick,
    onAddNote,
    onMarkRead,
    onFlagForReview,
  }: Props = $props();

  let showFullHeaders = $state(false);
  let hoveredLink: string | null = $state(null);
  let focusedLink: string | null = $state(null);

  let contextMenuState = $state<ContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    sections: [],
    documentType: 'email',
  });

  const authInfo = $derived(
    email
      ? {
          spf: getAuthResultInfo(email.headers.spfResult),
          dkim: getAuthResultInfo(email.headers.dkimResult),
          dmarc: getAuthResultInfo(email.headers.dmarcResult),
        }
      : null,
  );

  function toggleHeaders() {
    showFullHeaders = !showFullHeaders;
  }

  function handleAttachmentClick(attachmentId: string) {
    onAttachmentClick?.(attachmentId);
  }

  function handleLinkClick(url: string, event: MouseEvent) {
    event.preventDefault();
    onLinkClick?.(url);
  }

  function handleLinkMouseEnter(url: string) {
    hoveredLink = url;
  }

  function handleLinkMouseLeave() {
    hoveredLink = null;
  }

  function handleLinkFocus(url: string) {
    focusedLink = url;
  }

  function handleLinkBlur() {
    focusedLink = null;
  }

  function handleLinkKeyDown(event: KeyboardEvent, url: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onLinkClick?.(url);
    }
  }

  function handleContextMenu(event: MouseEvent) {
    event.preventDefault();
    const selectedText = window.getSelection()?.toString() || '';
    const targetElement = (event.target as HTMLElement).tagName.toLowerCase();

    const sections = buildContextMenu({
      documentType: 'email',
      selectedText,
      targetElement,
    });

    const position = getMenuPosition(event.clientX, event.clientY, 220, sections.length * 40);

    contextMenuState = {
      isOpen: true,
      position,
      sections,
      documentType: 'email',
      selectedText,
      targetElement,
    };
  }

  async function handleContextMenuSelect(itemId: string) {
    switch (itemId) {
      case 'copy-selection':
        if (contextMenuState.selectedText) {
          await navigator.clipboard.writeText(contextMenuState.selectedText);
        }
        break;
      case 'select-all':
        document.execCommand('selectAll');
        break;
      case 'add-note':
        onAddNote?.(contextMenuState.selectedText || '');
        break;
      case 'mark-read':
        onMarkRead?.(true);
        break;
      case 'mark-unread':
        onMarkRead?.(false);
        break;
      case 'flag-review':
        onFlagForReview?.();
        break;
      case 'view-headers':
        showFullHeaders = true;
        break;
    }
    closeContextMenu();
  }

  function closeContextMenu() {
    contextMenuState = {
      ...contextMenuState,
      isOpen: false,
    };
  }

  function getActiveLink(): string | null {
    return hoveredLink || focusedLink;
  }

  function getActiveLinkInfo(
    link: EmbeddedLink | undefined,
  ): { display: string; target: string } | null {
    if (!link) return null;
    const active = getActiveLink();
    if (!active || active !== link.actualUrl) return null;
    return {
      display: link.displayText,
      target: extractDomain(link.actualUrl),
    };
  }
</script>

<div
  class="email-viewer"
  role="region"
  aria-label="Email content"
  oncontextmenu={handleContextMenu}
>
  <ContextMenu
    contextState={contextMenuState}
    onSelect={handleContextMenuSelect}
    onClose={closeContextMenu}
  />
  {#if isLoading}
    <div class="email-viewer__loading">
      <LoadingState
        variant="dots"
        size="md"
        message="Loading email..."
        label="Loading email content"
      />
    </div>
  {:else if error}
    <div class="email-viewer__error" role="alert">
      <div class="email-viewer__error-icon">⚠</div>
      <div class="email-viewer__error-message">{error}</div>
      <div class="email-viewer__error-hint">
        Unable to load email content. Please try again later.
      </div>
    </div>
  {:else if !email}
    <div class="email-viewer__empty">
      <div class="email-viewer__empty-icon">📧</div>
      <div class="email-viewer__empty-message">No email selected</div>
      <div class="email-viewer__empty-hint">
        Select an email from the inbox to view its contents
      </div>
    </div>
  {:else}
    {@const activeLink = getActiveLinkInfo(
      email.body.embeddedLinks.find((l) => getActiveLink() === l.actualUrl),
    )}

    <div class="email-viewer__content">
      <header class="email-viewer__header">
        <div class="email-viewer__header-main">
          <div class="email-viewer__subject-row">
            <span class="email-viewer__label">Subject:</span>
            <h1 class="email-viewer__subject">{email.headers.subject}</h1>
          </div>

          <div class="email-viewer__sender-row">
            <span class="email-viewer__label">From:</span>
            <span class="email-viewer__sender">
              <span class="email-viewer__sender-name">{email.sender.displayName}</span>
              <span class="email-viewer__sender-address">&lt;{email.sender.emailAddress}&gt;</span>
            </span>
          </div>

          <div class="email-viewer__meta-row">
            <span class="email-viewer__label">Date:</span>
            <span class="email-viewer__date">{formatDate(email.headers.originalDate)}</span>
          </div>
        </div>

        <button
          type="button"
          class="email-viewer__header-toggle"
          onclick={toggleHeaders}
          aria-expanded={showFullHeaders}
          aria-controls="email-viewer-headers"
        >
          {showFullHeaders ? '▼ Hide Headers' : '▶ Show Headers'}
        </button>

        {#if showFullHeaders}
          <div
            class="email-viewer__headers"
            id="email-viewer-headers"
            role="region"
            aria-label="Email headers"
          >
            <div class="email-viewer__headers-grid">
              <div class="email-viewer__header-field">
                <span class="email-viewer__header-label">From:</span>
                <span class="email-viewer__header-value">{email.sender.emailAddress}</span>
              </div>
              <div class="email-viewer__header-field">
                <span class="email-viewer__header-label">To:</span>
                <span class="email-viewer__header-value">intake@matrices-gmbh.net</span>
              </div>
              <div class="email-viewer__header-field">
                <span class="email-viewer__header-label">Subject:</span>
                <span class="email-viewer__header-value">{email.headers.subject}</span>
              </div>
              <div class="email-viewer__header-field">
                <span class="email-viewer__header-label">Date:</span>
                <span class="email-viewer__header-value"
                  >{formatDate(email.headers.originalDate)}</span
                >
              </div>
              <div class="email-viewer__header-field">
                <span class="email-viewer__header-label">Message-ID:</span>
                <span class="email-viewer__header-value">{email.headers.messageId}</span>
              </div>
              <div class="email-viewer__header-field">
                <span class="email-viewer__header-label">Return-Path:</span>
                <span class="email-viewer__header-value">{email.headers.returnPath}</span>
              </div>

              {#if email.headers.received.length > 0}
                <div class="email-viewer__header-field email-viewer__header-field--full">
                  <span class="email-viewer__header-label">Received:</span>
                  <div class="email-viewer__received-chain">
                    {#each email.headers.received as received, index (index)}
                      <div class="email-viewer__received-entry">
                        <span class="email-viewer__received-num">[{index + 1}]</span>
                        <span class="email-viewer__received-value">{received}</span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}

              <div class="email-viewer__auth-section">
                <span class="email-viewer__auth-label">Authentication:</span>
                <div class="email-viewer__auth-results">
                  {#if authInfo}
                    <div class="email-viewer__auth-result">
                      <span class="email-viewer__auth-type">SPF:</span>
                      <span class="email-viewer__auth-value" style="color: {authInfo.spf.color}"
                        >{authInfo.spf.label}</span
                      >
                    </div>
                    <div class="email-viewer__auth-result">
                      <span class="email-viewer__auth-type">DKIM:</span>
                      <span class="email-viewer__auth-value" style="color: {authInfo.dkim.color}"
                        >{authInfo.dkim.label}</span
                      >
                    </div>
                    <div class="email-viewer__auth-result">
                      <span class="email-viewer__auth-type">DMARC:</span>
                      <span class="email-viewer__auth-value" style="color: {authInfo.dmarc.color}"
                        >{authInfo.dmarc.label}</span
                      >
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        {/if}
      </header>

      <div class="email-viewer__body">
        <div class="email-viewer__body-content">
          {email.body.fullBody}
        </div>

        {#if email.body.embeddedLinks.length > 0}
          <div class="email-viewer__links">
            <div class="email-viewer__links-header">Links:</div>
            <ul class="email-viewer__links-list">
              {#each email.body.embeddedLinks as link (link.actualUrl)}
                <li class="email-viewer__link-item">
                  <a
                    href={link.actualUrl}
                    class="email-viewer__link"
                    class:email-viewer__link--suspicious={link.isSuspicious}
                    onclick={(e) => handleLinkClick(link.actualUrl, e)}
                    onmouseenter={() => handleLinkMouseEnter(link.actualUrl)}
                    onmouseleave={handleLinkMouseLeave}
                    onfocus={() => handleLinkFocus(link.actualUrl)}
                    onblur={handleLinkBlur}
                    onkeydown={(e) => handleLinkKeyDown(e, link.actualUrl)}
                    target="_self"
                    rel="noopener noreferrer"
                  >
                    {link.displayText}
                  </a>
                  {#if hoveredLink === link.actualUrl || focusedLink === link.actualUrl}
                    <div class="email-viewer__link-preview" role="tooltip">
                      <span class="email-viewer__link-preview-text">{link.displayText}</span>
                      <span class="email-viewer__link-preview-domain"
                        >→ {extractDomain(link.actualUrl)}</span
                      >
                      {#if link.isSuspicious}
                        <span class="email-viewer__link-preview-warning">⚠ Suspicious</span>
                      {/if}
                    </div>
                  {/if}
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>

      {#if email.attachments.length > 0}
        <footer class="email-viewer__attachments">
          <div class="email-viewer__attachments-header">
            <span class="email-viewer__label">Attachments:</span>
            <span class="email-viewer__attachments-count">({email.attachments.length})</span>
          </div>

          <ul class="email-viewer__attachments-list">
            {#each email.attachments as attachment (attachment.attachmentId)}
              {@const icon = getFileIcon(attachment.fileType)}
              <li class="email-viewer__attachment">
                <button
                  type="button"
                  class="email-viewer__attachment-button"
                  onclick={() => handleAttachmentClick(attachment.attachmentId)}
                  aria-label="View attachment: {attachment.fileName}"
                >
                  <span class="email-viewer__attachment-icon">{icon}</span>
                  <span class="email-viewer__attachment-name">{attachment.fileName}</span>
                  <span class="email-viewer__attachment-meta">
                    <span class="email-viewer__attachment-type">{attachment.fileType}</span>
                    <span class="email-viewer__attachment-size"
                      >{formatFileSize(attachment.fileSize)}</span
                    >
                  </span>
                  {#if attachment.isSuspicious}
                    <span
                      class="email-viewer__attachment-warning"
                      title="This attachment may be suspicious">⚠</span
                    >
                  {/if}
                </button>
                <div class="email-viewer__attachment-hash" title="SHA-256: {attachment.hash}">
                  Hash: {truncateHash(attachment.hash)}
                </div>
              </li>
            {/each}
          </ul>
        </footer>
      {/if}

      {#if activeLink}
        <div class="email-viewer__link-toast" role="status" aria-live="polite">
          <span class="email-viewer__link-toast-label">Link Preview:</span>
          <span class="email-viewer__link-toast-display">{activeLink.display}</span>
          <span class="email-viewer__link-toast-target">→ {activeLink.target}</span>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .email-viewer {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: var(--color-bg-secondary);
    border: var(--border-default);
    border-radius: var(--radius-md);
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text);
    overflow: hidden;
  }

  .email-viewer__loading,
  .email-viewer__error,
  .email-viewer__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: var(--space-4);
    text-align: center;
  }

  .email-viewer__error {
    color: var(--color-danger);
  }

  .email-viewer__error-icon,
  .email-viewer__empty-icon {
    font-size: var(--text-2xl);
    margin-bottom: var(--space-2);
  }

  .email-viewer__error-message {
    font-weight: 600;
    margin-bottom: var(--space-1);
  }

  .email-viewer__error-hint,
  .email-viewer__empty-hint {
    color: var(--color-text-muted);
    font-size: var(--text-xs);
  }

  .email-viewer__empty {
    color: var(--color-text-muted);
  }

  .email-viewer__empty-message {
    font-size: var(--text-md);
    margin-bottom: var(--space-1);
  }

  .email-viewer__content {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: auto;
  }

  .email-viewer__header {
    padding: var(--space-3);
    border-bottom: var(--border-default);
    background-color: var(--color-bg-tertiary);
  }

  .email-viewer__header-main {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .email-viewer__subject-row {
    display: flex;
    gap: var(--space-2);
    align-items: baseline;
  }

  .email-viewer__label {
    color: var(--color-amber);
    font-weight: 600;
    min-width: 60px;
    flex-shrink: 0;
  }

  .email-viewer__subject {
    font-family: var(--font-document);
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--color-text-document);
    margin: 0;
    line-height: 1.4;
  }

  .email-viewer__sender-row,
  .email-viewer__meta-row {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }

  .email-viewer__sender {
    display: flex;
    gap: var(--space-1);
    align-items: center;
  }

  .email-viewer__sender-name {
    color: var(--color-text-document);
    font-weight: 500;
  }

  .email-viewer__sender-address {
    color: var(--color-text-muted);
    font-size: var(--text-xs);
  }

  .email-viewer__date {
    color: var(--color-text-muted);
    font-size: var(--text-xs);
  }

  .email-viewer__header-toggle {
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

  .email-viewer__header-toggle:hover {
    background-color: var(--color-bg-hover);
    color: var(--color-text);
  }

  .email-viewer__header-toggle:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .email-viewer__headers {
    margin-top: var(--space-3);
    padding: var(--space-2);
    background-color: var(--color-bg-primary);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-phosphor-green-dark);
  }

  .email-viewer__headers-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
  }

  .email-viewer__header-field {
    display: flex;
    gap: var(--space-2);
  }

  .email-viewer__header-field--full {
    flex-direction: column;
    margin-top: var(--space-1);
  }

  .email-viewer__header-label {
    color: var(--color-amber);
    min-width: 80px;
    flex-shrink: 0;
  }

  .email-viewer__header-value {
    color: var(--color-text-muted);
    word-break: break-all;
  }

  .email-viewer__received-chain {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    margin-top: var(--space-1);
    margin-left: var(--space-4);
  }

  .email-viewer__received-entry {
    display: flex;
    gap: var(--space-1);
    color: var(--color-text-muted);
  }

  .email-viewer__received-num {
    color: var(--color-amber-dim);
    flex-shrink: 0;
  }

  .email-viewer__received-value {
    word-break: break-all;
  }

  .email-viewer__auth-section {
    display: flex;
    gap: var(--space-2);
    margin-top: var(--space-2);
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-phosphor-green-dark);
  }

  .email-viewer__auth-label {
    color: var(--color-amber);
  }

  .email-viewer__auth-results {
    display: flex;
    gap: var(--space-3);
  }

  .email-viewer__auth-result {
    display: flex;
    gap: var(--space-1);
  }

  .email-viewer__auth-type {
    color: var(--color-text-muted);
  }

  .email-viewer__auth-value {
    font-weight: 600;
  }

  .email-viewer__body {
    flex: 1;
    padding: var(--space-3);
    overflow-y: auto;
  }

  .email-viewer__body-content {
    font-family: var(--font-document);
    font-size: var(--text-base);
    line-height: 1.6;
    color: var(--color-text-document);
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .email-viewer__links {
    margin-top: var(--space-3);
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-phosphor-green-dark);
  }

  .email-viewer__links-header {
    color: var(--color-amber);
    font-size: var(--text-xs);
    margin-bottom: var(--space-1);
  }

  .email-viewer__links-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .email-viewer__link-item {
    position: relative;
  }

  .email-viewer__link {
    color: var(--color-info);
    text-decoration: underline;
    cursor: pointer;
    transition: color 150ms ease;
  }

  .email-viewer__link:hover,
  .email-viewer__link:focus {
    color: var(--color-amber);
    outline: none;
  }

  .email-viewer__link:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .email-viewer__link--suspicious {
    color: var(--color-warning);
  }

  .email-viewer__link-preview {
    position: absolute;
    bottom: 100%;
    left: 0;
    z-index: 10;
    padding: var(--space-2);
    background-color: var(--color-bg-primary);
    border: 1px solid var(--color-phosphor-green-dark);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    white-space: nowrap;
    box-shadow: 0 -4px 8px rgba(0, 0, 0, 0.3);
  }

  .email-viewer__link-preview-text {
    display: block;
    color: var(--color-text-document);
    margin-bottom: var(--space-1);
  }

  .email-viewer__link-preview-domain {
    display: block;
    color: var(--color-text-muted);
  }

  .email-viewer__link-preview-warning {
    display: block;
    margin-top: var(--space-1);
    color: var(--color-warning);
    font-weight: 600;
  }

  .email-viewer__attachments {
    padding: var(--space-3);
    border-top: var(--border-default);
    background-color: var(--color-bg-tertiary);
  }

  .email-viewer__attachments-header {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    margin-bottom: var(--space-2);
  }

  .email-viewer__attachments-count {
    color: var(--color-text-muted);
    font-size: var(--text-xs);
  }

  .email-viewer__attachments-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .email-viewer__attachment {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .email-viewer__attachment-button {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    background-color: var(--color-bg-primary);
    border: 1px solid var(--color-phosphor-green-dark);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition:
      background-color 150ms ease,
      border-color 150ms ease;
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text);
    text-align: left;
    width: 100%;
  }

  .email-viewer__attachment-button:hover {
    background-color: var(--color-bg-hover);
    border-color: var(--color-phosphor-green);
  }

  .email-viewer__attachment-button:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .email-viewer__attachment-icon {
    font-size: var(--text-lg);
    flex-shrink: 0;
  }

  .email-viewer__attachment-name {
    flex: 1;
    color: var(--color-text-document);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .email-viewer__attachment-meta {
    display: flex;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .email-viewer__attachment-type {
    padding: 0 var(--space-1);
    background-color: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    color: var(--color-amber);
    text-transform: uppercase;
  }

  .email-viewer__attachment-size {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .email-viewer__attachment-warning {
    color: var(--color-warning);
    font-size: var(--text-md);
    flex-shrink: 0;
  }

  .email-viewer__attachment-hash {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    padding-left: calc(var(--space-2) + var(--text-lg) + var(--space-2));
  }

  .email-viewer__link-toast {
    position: sticky;
    bottom: 0;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background-color: var(--color-bg-primary);
    border-top: 1px solid var(--color-phosphor-green-dark);
    font-size: var(--text-xs);
  }

  .email-viewer__link-toast-label {
    color: var(--color-amber);
  }

  .email-viewer__link-toast-display {
    color: var(--color-text-document);
  }

  .email-viewer__link-toast-target {
    color: var(--color-text-muted);
  }
</style>
