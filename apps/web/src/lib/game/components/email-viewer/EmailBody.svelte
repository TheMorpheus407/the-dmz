<script lang="ts">
  import type { EmailInstance } from '@the-dmz/shared';

  import { extractDomain } from '../email-viewer';

  interface Props {
    body: EmailInstance['body'];
    onLinkClick?: (url: string, event: MouseEvent) => void;
    onLinkMouseEnter?: (url: string) => void;
    onLinkMouseLeave?: () => void;
    onLinkFocus?: (url: string) => void;
    onLinkBlur?: () => void;
    onLinkKeyDown?: (event: KeyboardEvent, url: string) => void;
    hoveredLink: string | null;
    focusedLink: string | null;
  }

  const {
    body,
    onLinkClick,
    onLinkMouseEnter,
    onLinkMouseLeave,
    onLinkFocus,
    onLinkBlur,
    onLinkKeyDown,
    hoveredLink,
    focusedLink,
  }: Props = $props();
</script>

<div class="email-body">
  <div class="email-body__content">
    {body.fullBody}
  </div>

  {#if body.embeddedLinks.length > 0}
    <div class="email-body__links">
      <div class="email-body__links-header">Links:</div>
      <ul class="email-body__links-list">
        {#each body.embeddedLinks as link (link.actualUrl)}
          <li class="email-body__link-item">
            <a
              href={link.actualUrl}
              class="email-body__link"
              class:email-body__link--suspicious={link.isSuspicious}
              onclick={(e) => onLinkClick?.(link.actualUrl, e)}
              onmouseenter={() => onLinkMouseEnter?.(link.actualUrl)}
              onmouseleave={onLinkMouseLeave}
              onfocus={() => onLinkFocus?.(link.actualUrl)}
              onblur={onLinkBlur}
              onkeydown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                }
                onLinkKeyDown?.(e, link.actualUrl);
              }}
              target="_self"
              rel="noopener noreferrer"
            >
              {link.displayText}
            </a>
            {#if hoveredLink === link.actualUrl || focusedLink === link.actualUrl}
              <div class="email-body__link-preview" role="tooltip">
                <span class="email-body__link-preview-text">{link.displayText}</span>
                <span class="email-body__link-preview-domain"
                  >→ {extractDomain(link.actualUrl)}</span
                >
                {#if link.isSuspicious}
                  <span class="email-body__link-preview-warning">⚠ Suspicious</span>
                {/if}
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .email-body {
    flex: 1;
    padding: var(--space-3);
    overflow-y: auto;
  }

  .email-body__content {
    font-family: var(--font-document);
    font-size: var(--text-base);
    line-height: 1.6;
    color: var(--color-text-document);
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .email-body__links {
    margin-top: var(--space-3);
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-phosphor-green-dark);
  }

  .email-body__links-header {
    color: var(--color-amber);
    font-size: var(--text-xs);
    margin-bottom: var(--space-1);
  }

  .email-body__links-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .email-body__link-item {
    position: relative;
  }

  .email-body__link {
    color: var(--color-info);
    text-decoration: underline;
    cursor: pointer;
    transition: color 150ms ease;
  }

  .email-body__link:hover,
  .email-body__link:focus {
    color: var(--color-amber);
    outline: none;
  }

  .email-body__link:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .email-body__link--suspicious {
    color: var(--color-warning);
  }

  .email-body__link-preview {
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

  .email-body__link-preview-text {
    display: block;
    color: var(--color-text-document);
    margin-bottom: var(--space-1);
  }

  .email-body__link-preview-domain {
    display: block;
    color: var(--color-text-muted);
  }

  .email-body__link-preview-warning {
    display: block;
    margin-top: var(--space-1);
    color: var(--color-warning);
    font-weight: 600;
  }
</style>
