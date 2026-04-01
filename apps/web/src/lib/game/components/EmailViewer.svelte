<script lang="ts">
  import LoadingState from '$lib/ui/components/LoadingState.svelte';
  import ContextMenu from '$lib/ui/components/ContextMenu.svelte';
  import {
    buildContextMenu,
    getMenuPosition,
    type ContextMenuState,
  } from '$lib/ui/components/context-menu';
  import type { EmailInstance, EmbeddedLink } from '@the-dmz/shared';

  import { extractDomain } from './email-viewer';
  import EmailHeader from './email-viewer/EmailHeader.svelte';
  import EmailBody from './email-viewer/EmailBody.svelte';
  import EmailAttachments from './email-viewer/EmailAttachments.svelte';
  import LinkPreviewToast from './email-viewer/LinkPreviewToast.svelte';

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
      <EmailHeader {email} {showFullHeaders} onToggleHeaders={toggleHeaders} />

      <EmailBody
        body={email.body}
        onLinkClick={handleLinkClick}
        onLinkMouseEnter={handleLinkMouseEnter}
        onLinkMouseLeave={handleLinkMouseLeave}
        onLinkFocus={handleLinkFocus}
        onLinkBlur={handleLinkBlur}
        onLinkKeyDown={handleLinkKeyDown}
        {hoveredLink}
        {focusedLink}
      />

      <EmailAttachments attachments={email.attachments} onAttachmentClick={handleAttachmentClick} />

      {#if activeLink}
        <LinkPreviewToast display={activeLink.display} target={activeLink.target} />
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
</style>
