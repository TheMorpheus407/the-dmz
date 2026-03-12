<script lang="ts">
  import type { Snippet } from 'svelte';

  type TooltipVariant = 'action' | 'status' | 'warning' | 'info';

  interface Props {
    content: string;
    variant?: TooltipVariant;
    delay?: number;
    position?: 'top' | 'bottom' | 'left' | 'right';
    children: Snippet;
  }

  const { content, variant = 'info', delay = 500, position = 'top', children }: Props = $props();

  let visible = $state(false);
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let tooltipEl: HTMLDivElement | null = $state(null);
  let triggerEl: HTMLDivElement | null = $state(null);

  function showTooltip() {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      visible = true;
      requestAnimationFrame(() => {
        positionTooltip();
      });
    }, delay);
  }

  function hideTooltip() {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    visible = false;
  }

  function positionTooltip() {
    if (!triggerEl || !tooltipEl) return;

    const triggerRect = triggerEl.getBoundingClientRect();
    const tooltipRect = tooltipEl.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - 8;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + 8;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - 8;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + 8;
        break;
    }

    if (left < 8) {
      left = 8;
    } else if (left + tooltipRect.width > viewportWidth - 8) {
      left = viewportWidth - tooltipRect.width - 8;
    }

    if (top < 8) {
      if (position === 'top') {
        top = triggerRect.bottom + 8;
      } else {
        top = 8;
      }
    } else if (top + tooltipRect.height > viewportHeight - 8) {
      if (position === 'bottom') {
        top = triggerRect.top - tooltipRect.height - 8;
      } else {
        top = viewportHeight - tooltipRect.height - 8;
      }
    }

    tooltipEl.style.top = `${top}px`;
    tooltipEl.style.left = `${left}px`;
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && visible) {
      hideTooltip();
    }
  }

  const variantClass = $derived(`tooltip--${variant}`);
</script>

<svelte:window onkeydown={handleKeyDown} />

<div
  class="tooltip-trigger"
  bind:this={triggerEl}
  onmouseenter={showTooltip}
  onmouseleave={hideTooltip}
  onfocus={showTooltip}
  onblur={hideTooltip}
  role="button"
  tabindex="0"
  aria-describedby={visible ? 'tooltip-content' : undefined}
>
  {@render children()}
</div>

{#if visible}
  <div id="tooltip-content" class="tooltip {variantClass}" role="tooltip" bind:this={tooltipEl}>
    <div class="tooltip__content">
      {content}
    </div>
  </div>
{/if}

<style>
  .tooltip-trigger {
    display: inline-block;
    position: relative;
  }

  .tooltip {
    position: fixed;
    z-index: 500;
    max-width: 300px;
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg-tertiary, #1e2832);
    border: 1px solid var(--color-phosphor-green-dark, #334433);
    border-radius: 4px;
    font-family: var(--font-terminal, monospace);
    font-size: var(--text-sm, 0.875rem);
    color: var(--color-document-white, #e0e0e0);
    pointer-events: auto;
    animation: tooltip-fade-in 150ms ease-out;
  }

  @keyframes tooltip-fade-in {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .tooltip {
      animation: none;
    }
  }

  .tooltip--action {
    border-color: var(--color-phosphor-green, #33ff33);
    background: rgba(51, 255, 51, 0.1);
  }

  .tooltip--action .tooltip__content {
    color: var(--color-phosphor-green, #33ff33);
  }

  .tooltip--status {
    border-color: var(--color-safe, #33cc66);
    background: rgba(51, 204, 102, 0.1);
  }

  .tooltip--status .tooltip__content {
    color: var(--color-safe, #33cc66);
  }

  .tooltip--warning {
    border-color: var(--color-warning, #ffcc00);
    background: rgba(255, 204, 0, 0.1);
  }

  .tooltip--warning .tooltip__content {
    color: var(--color-warning, #ffcc00);
  }

  .tooltip--info {
    border-color: var(--color-info, #3399ff);
    background: rgba(51, 153, 255, 0.1);
  }

  .tooltip--info .tooltip__content {
    color: var(--color-info, #3399ff);
  }

  .tooltip__content {
    line-height: 1.5;
  }

  .tooltip__content :global(p) {
    margin: 0;
  }

  .tooltip__content :global(p + p) {
    margin-top: var(--space-2);
  }
</style>
