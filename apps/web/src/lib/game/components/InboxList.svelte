<script lang="ts">
  import { SvelteMap } from 'svelte/reactivity';

  import type { EmailInstance, EmailState } from '@the-dmz/shared';
  import {
    createSwipeHandler,
    createLongPressHandler,
    triggerHaptic,
    type SwipeDirection,
  } from '$lib/utils';

  import {
    URGENCY_COLORS,
    CATEGORY_LABELS,
    getEmailCategory,
    getUrgencyFromAccessRequest,
    getFactionColor,
    sortEmails,
    filterEmails,
  } from './inbox';

  import type {
    EmailCategory,
    UrgencyLevel,
    SortOption,
    FilterOption,
    InboxEmailItem,
  } from './inbox';

  interface Props {
    emails: EmailInstance[];
    emailStates: Map<string, EmailState>;
    currentDay: number;
    selectedEmailId?: string | null;
    sortBy?: SortOption;
    filterBy?: FilterOption;
    onSelectEmail?: (emailId: string) => void;
    onFlagEmail?: (emailId: string) => void;
    onApproveEmail?: (emailId: string) => void;
    onDenyEmail?: (emailId: string) => void;
    onNavigateCategory?: (category: EmailCategory) => void;
  }

  const {
    emails,
    emailStates,
    currentDay,
    selectedEmailId = null,
    sortBy = 'urgency',
    filterBy = 'all',
    onSelectEmail,
    onFlagEmail,
    onApproveEmail,
    onDenyEmail,
    onNavigateCategory,
  }: Props = $props();

  let swipeRevealedEmailId = $state<string | null>(null);

  const itemSwipeHandlers = new SvelteMap<string, ReturnType<typeof createSwipeHandler>>();
  const itemLongPressHandlers = new SvelteMap<string, ReturnType<typeof createLongPressHandler>>();

  function getItemSwipeHandler(emailId: string) {
    if (!itemSwipeHandlers.has(emailId)) {
      itemSwipeHandlers.set(
        emailId,
        createSwipeHandler(
          (direction: SwipeDirection) => {
            if (direction === 'right') {
              triggerHaptic('medium');
              swipeRevealedEmailId = emailId;
            }
          },
          { minSwipeDistance: 30, maxSwipeTime: 400 },
        ),
      );
    }
    return itemSwipeHandlers.get(emailId)!;
  }

  function getItemLongPressHandler(emailId: string) {
    if (!itemLongPressHandlers.has(emailId)) {
      itemLongPressHandlers.set(
        emailId,
        createLongPressHandler({
          duration: 500,
          onLongPress: () => {
            triggerHaptic('heavy');
          },
        }),
      );
    }
    return itemLongPressHandlers.get(emailId)!;
  }

  function handleQuickAction(action: 'approve' | 'deny' | 'flag', emailId: string) {
    triggerHaptic('medium');
    if (action === 'approve') {
      onApproveEmail?.(emailId);
    } else if (action === 'deny') {
      onDenyEmail?.(emailId);
    } else if (action === 'flag') {
      onFlagEmail?.(emailId);
    }
    swipeRevealedEmailId = null;
  }

  function closeSwipeReveal() {
    swipeRevealedEmailId = null;
  }

  const urgencyIcons: Record<UrgencyLevel, string> = {
    low: '⏱',
    medium: '⚠',
    high: '!',
    critical: '☠',
  };

  let focusedIndex = $state(0);

  const categories: EmailCategory[] = ['new', 'pending', 'archived', 'flagged'];

  const categorizedEmails = $derived.by(() => {
    const map: Map<EmailCategory, InboxEmailItem[]> = new SvelteMap([
      ['new', []],
      ['pending', []],
      ['archived', []],
      ['flagged', []],
    ]);

    for (const email of emails) {
      const state = emailStates.get(email.emailId);
      if (!state) continue;

      const category = getEmailCategory(state.status);
      const urgency = getUrgencyFromAccessRequest(email.accessRequest.urgency);
      const age = currentDay - email.dayNumber;

      map.get(category)!.push({ email, state, category, urgency, age });
    }

    for (const category of categories) {
      map.set(category, sortEmails(filterEmails(map.get(category)!, filterBy), sortBy));
    }

    return map;
  });

  const flatEmailList = $derived.by(() => {
    const list: { item: InboxEmailItem; category: EmailCategory }[] = [];
    for (const category of categories) {
      for (const item of categorizedEmails.get(category)!) {
        list.push({ item, category });
      }
    }
    return list;
  });

  function handleKeyDown(event: KeyboardEvent) {
    const list = flatEmailList;
    if (list.length === 0) return;

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        focusedIndex = Math.min(focusedIndex + 1, list.length - 1);
        const downItem = list[focusedIndex];
        if (downItem) {
          onSelectEmail?.(downItem.item.email.emailId);
        }
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        focusedIndex = Math.max(focusedIndex - 1, 0);
        const upItem = list[focusedIndex];
        if (upItem) {
          onSelectEmail?.(upItem.item.email.emailId);
        }
        break;
      }
      case 'Enter': {
        event.preventDefault();
        const selectedItem = list[focusedIndex];
        if (selectedItem) {
          onSelectEmail?.(selectedItem.item.email.emailId);
        }
        break;
      }
      case 'f':
      case 'F': {
        event.preventDefault();
        const flagItem = list[focusedIndex];
        if (flagItem) {
          onFlagEmail?.(flagItem.item.email.emailId);
        }
        break;
      }
      case '1':
        event.preventDefault();
        onNavigateCategory?.('new');
        break;
      case '2':
        event.preventDefault();
        onNavigateCategory?.('pending');
        break;
      case '3':
        event.preventDefault();
        onNavigateCategory?.('archived');
        break;
      case '4':
        event.preventDefault();
        onNavigateCategory?.('flagged');
        break;
    }
  }

  function isSelected(emailId: string): boolean {
    return selectedEmailId === emailId;
  }

  function isFocused(emailId: string): boolean {
    const list = flatEmailList;
    return list[focusedIndex]?.item.email.emailId === emailId;
  }

  function getSenderInitials(displayName: string): string {
    const parts = displayName.split(' ');
    if (parts.length >= 2) {
      const firstChar = parts[0]?.[0] ?? '';
      const lastChar = parts[parts.length - 1]?.[0] ?? '';
      return (firstChar + lastChar).toUpperCase();
    }
    return displayName.substring(0, 2).toUpperCase();
  }

  function truncateSubject(subject: string, maxLength = 30): string {
    if (subject.length <= maxLength) return subject;
    return subject.substring(0, maxLength - 3) + '...';
  }
</script>

<div
  class="inbox-list"
  role="listbox"
  aria-label="Email inbox"
  tabindex="0"
  onkeydown={handleKeyDown}
>
  {#each categories as category (category)}
    {@const items = categorizedEmails.get(category)!}
    {@const count = items.length}
    {#if count > 0 || filterBy === 'all'}
      <div class="inbox-category" role="group" aria-label="{CATEGORY_LABELS[category]} section">
        <button
          type="button"
          class="category-header"
          onclick={() => onNavigateCategory?.(category)}
          aria-expanded="true"
        >
          <span class="category-label">{CATEGORY_LABELS[category]}</span>
          <span class="category-count">({count})</span>
        </button>

        {#if items.length > 0}
          <ul class="email-list" role="option">
            {#each items as item (item.email.emailId)}
              {@const email = item.email}
              {@const urgency = item.urgency}
              {@const age = item.age}
              {@const isSwipeRevealed = swipeRevealedEmailId === email.emailId}
              <li
                class="email-item"
                class:selected={isSelected(email.emailId)}
                class:focused={isFocused(email.emailId)}
                class:swipe-revealed={isSwipeRevealed}
                role="option"
                aria-selected={isSelected(email.emailId)}
                style="--urgency-color: {URGENCY_COLORS[urgency]}"
                onclick={() => {
                  closeSwipeReveal();
                  onSelectEmail?.(email.emailId);
                }}
                ondblclick={() => onSelectEmail?.(email.emailId)}
                ontouchstart={(e) => {
                  const handler = getItemSwipeHandler(email.emailId);
                  handler.onTouchStart(e);
                  const longPressHandler = getItemLongPressHandler(email.emailId);
                  longPressHandler.onTouchStart(e);
                }}
                ontouchmove={(e) => {
                  const handler = getItemSwipeHandler(email.emailId);
                  handler.onTouchMove(e);
                }}
                ontouchend={(e) => {
                  const handler = getItemSwipeHandler(email.emailId);
                  handler.onTouchEnd(e);
                  const longPressHandler = getItemLongPressHandler(email.emailId);
                  longPressHandler.onTouchEnd(e);
                }}
              >
                <div class="swipe-reveal-actions">
                  <button
                    type="button"
                    class="action-btn action-btn--approve"
                    aria-label="Approve email"
                    onclick={(e) => {
                      e.stopPropagation();
                      handleQuickAction('approve', email.emailId);
                    }}
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    class="action-btn action-btn--deny"
                    aria-label="Deny email"
                    onclick={(e) => {
                      e.stopPropagation();
                      handleQuickAction('deny', email.emailId);
                    }}
                  >
                    ✗
                  </button>
                  <button
                    type="button"
                    class="action-btn action-btn--flag"
                    aria-label="Flag email"
                    onclick={(e) => {
                      e.stopPropagation();
                      handleQuickAction('flag', email.emailId);
                    }}
                  >
                    ⚑
                  </button>
                </div>
                <div class="urgency-border" aria-hidden="true"></div>
                <div class="email-content">
                  <div class="email-header">
                    <span
                      class="sender-initials"
                      style="background-color: {getFactionColor(email.faction)}"
                    >
                      {getSenderInitials(email.sender.displayName)}
                    </span>
                    <span class="sender-name">{email.sender.displayName}</span>
                    <span class="urgency-icon" aria-label="{urgency} urgency"
                      >{urgencyIcons[urgency]}</span
                    >
                  </div>
                  <div class="email-subject">{truncateSubject(email.headers.subject)}</div>
                  <div class="email-meta">
                    <span class="faction-badge" style="color: {getFactionColor(email.faction)}">
                      {email.faction}
                    </span>
                    {#if age > 0}
                      <span class="age-badge" aria-label="{age} days old">
                        +{age}d
                      </span>
                    {/if}
                  </div>
                </div>
              </li>
            {/each}
          </ul>
        {:else}
          <div class="empty-category">
            <span class="empty-text">No emails</span>
          </div>
        {/if}
      </div>
    {/if}
  {/each}

  {#if flatEmailList.length === 0}
    <div class="empty-inbox" role="status">
      <span class="empty-icon">📭</span>
      <span class="empty-message">Inbox empty</span>
    </div>
  {/if}
</div>

<style>
  .inbox-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-2);
    background-color: var(--color-bg-secondary);
    border-radius: var(--radius-md);
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text);
    outline: none;
    min-height: 400px;
    max-height: 600px;
    overflow-y: auto;
  }

  .inbox-list:focus {
    box-shadow: 0 0 0 2px var(--color-accent);
  }

  .inbox-category {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .category-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background-color: var(--color-bg-tertiary);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    transition: background-color 150ms ease;
  }

  .category-header:hover {
    background-color: var(--color-bg-hover);
    color: var(--color-text);
  }

  .category-label {
    font-weight: 600;
    color: var(--color-amber);
  }

  .category-count {
    color: var(--color-text-muted);
    font-size: var(--text-xs);
  }

  .email-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .email-item {
    position: relative;
    display: flex;
    background-color: var(--color-bg-primary);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background-color 150ms ease;
    overflow: hidden;
  }

  .email-item:hover {
    background-color: var(--color-bg-hover);
  }

  .email-item.selected {
    background-color: var(--color-bg-tertiary);
    border-color: var(--color-accent);
  }

  .email-item.focused {
    outline: 2px solid var(--color-accent);
    outline-offset: -2px;
  }

  .urgency-border {
    width: 4px;
    flex-shrink: 0;
    background-color: var(--urgency-color);
  }

  .email-content {
    flex: 1;
    padding: var(--space-2) var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-width: 0;
  }

  .email-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .sender-initials {
    width: 24px;
    height: 24px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--color-bg-primary);
    flex-shrink: 0;
  }

  .sender-name {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 500;
  }

  .urgency-icon {
    font-size: var(--text-xs);
    flex-shrink: 0;
  }

  .email-subject {
    color: var(--color-text-muted);
    font-size: var(--text-xs);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .email-meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .faction-badge {
    font-size: var(--text-xs);
    font-weight: 500;
  }

  .age-badge {
    font-size: var(--text-xs);
    color: var(--color-warning);
    background-color: var(--color-bg-tertiary);
    padding: 0 var(--space-1);
    border-radius: var(--radius-sm);
  }

  .empty-category {
    padding: var(--space-3);
    text-align: center;
    color: var(--color-text-muted);
    font-size: var(--text-xs);
    font-style: italic;
  }

  .empty-inbox {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-6);
    color: var(--color-text-muted);
  }

  .empty-icon {
    font-size: var(--text-2xl);
  }

  .empty-message {
    font-size: var(--text-sm);
  }

  .email-item {
    touch-action: pan-y;
    min-height: 44px;
  }

  .email-item.swipe-revealed .email-content {
    transform: translateX(80px);
  }

  .swipe-reveal-actions {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: 0 var(--space-2);
    background-color: var(--color-bg-tertiary);
    transform: translateX(-100%);
    transition: transform 200ms ease-out;
    z-index: 1;
  }

  .email-item.swipe-revealed .swipe-reveal-actions {
    transform: translateX(0);
  }

  .action-btn {
    width: 44px;
    height: 44px;
    border: none;
    border-radius: var(--radius-sm);
    font-size: var(--text-lg);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      transform 100ms ease,
      opacity 100ms ease;
    -webkit-tap-highlight-color: transparent;
  }

  .action-btn:active {
    transform: scale(0.95);
    opacity: 0.8;
  }

  .action-btn--approve {
    background-color: var(--color-safe);
    color: var(--color-bg-primary);
  }

  .action-btn--deny {
    background-color: var(--color-danger);
    color: var(--color-bg-primary);
  }

  .action-btn--flag {
    background-color: var(--color-warning);
    color: var(--color-bg-primary);
  }

  @media (pointer: coarse) {
    .email-item {
      padding: var(--space-1) 0;
    }

    .sender-initials {
      width: 32px;
      height: 32px;
      font-size: var(--text-sm);
    }

    .email-content {
      padding: var(--space-2) var(--space-3);
    }
  }
</style>
