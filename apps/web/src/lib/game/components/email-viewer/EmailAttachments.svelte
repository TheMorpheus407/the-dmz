<script lang="ts" module>
  export function getFileIcon(fileType: string): string {
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
  import type { EmailInstance } from '@the-dmz/shared';

  import { formatFileSize, truncateHash } from '../email-viewer';

  interface Props {
    attachments: EmailInstance['attachments'];
    onAttachmentClick?: (attachmentId: string) => void;
  }

  const { attachments, onAttachmentClick }: Props = $props();
</script>

{#if attachments.length > 0}
  <footer class="email-attachments">
    <div class="email-attachments__header">
      <span class="email-attachments__label">Attachments:</span>
      <span class="email-attachments__count">({attachments.length})</span>
    </div>

    <ul class="email-attachments__list">
      {#each attachments as attachment (attachment.attachmentId)}
        {@const icon = getFileIcon(attachment.fileType)}
        <li class="email-attachments__item">
          <button
            type="button"
            class="email-attachments__button"
            onclick={() => onAttachmentClick?.(attachment.attachmentId)}
            aria-label="View attachment: {attachment.fileName}"
          >
            <span class="email-attachments__icon">{icon}</span>
            <span class="email-attachments__name">{attachment.fileName}</span>
            <span class="email-attachments__meta">
              <span class="email-attachments__type">{attachment.fileType}</span>
              <span class="email-attachments__size">{formatFileSize(attachment.fileSize)}</span>
            </span>
            {#if attachment.isSuspicious}
              <span class="email-attachments__warning" title="This attachment may be suspicious"
                >⚠</span
              >
            {/if}
          </button>
          <div class="email-attachments__hash" title="SHA-256: {attachment.hash}">
            Hash: {truncateHash(attachment.hash)}
          </div>
        </li>
      {/each}
    </ul>
  </footer>
{/if}

<style>
  .email-attachments {
    padding: var(--space-3);
    border-top: var(--border-default);
    background-color: var(--color-bg-tertiary);
  }

  .email-attachments__header {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    margin-bottom: var(--space-2);
  }

  .email-attachments__label {
    color: var(--color-amber);
    font-weight: 600;
  }

  .email-attachments__count {
    color: var(--color-text-muted);
    font-size: var(--text-xs);
  }

  .email-attachments__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .email-attachments__item {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .email-attachments__button {
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

  .email-attachments__button:hover {
    background-color: var(--color-bg-hover);
    border-color: var(--color-phosphor-green);
  }

  .email-attachments__button:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .email-attachments__icon {
    font-size: var(--text-lg);
    flex-shrink: 0;
  }

  .email-attachments__name {
    flex: 1;
    color: var(--color-text-document);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .email-attachments__meta {
    display: flex;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .email-attachments__type {
    padding: 0 var(--space-1);
    background-color: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    color: var(--color-amber);
    text-transform: uppercase;
  }

  .email-attachments__size {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .email-attachments__warning {
    color: var(--color-warning);
    font-size: var(--text-md);
    flex-shrink: 0;
  }

  .email-attachments__hash {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    padding-left: calc(var(--space-2) + var(--text-lg) + var(--space-2));
  }
</style>
