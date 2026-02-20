<script lang="ts">
  /* eslint-disable prefer-const */
  import type { Snippet } from 'svelte';

  type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
  type Size = 'sm' | 'md' | 'lg';

  interface Props {
    variant?: Variant;
    size?: Size;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    ariaLabel?: string;
    ariaDescribedBy?: string;
    onclick?: (e: MouseEvent) => void;
    children: Snippet;
  }

  let {
    variant = 'primary',
    size = 'md',
    disabled = false,
    type = 'button',
    ariaLabel,
    ariaDescribedBy,
    onclick,
    children,
  }: Props = $props();
</script>

<button
  class="button button--{variant} button--{size}"
  {type}
  {disabled}
  aria-label={ariaLabel}
  aria-describedby={ariaDescribedBy}
  aria-disabled={disabled ? 'true' : undefined}
  {onclick}
>
  {@render children()}
</button>

<style>
  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    font-family: var(--font-ui);
    font-weight: 500;
    border: var(--border-default);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition:
      background-color 200ms ease-out,
      border-color 200ms ease-out,
      color 200ms ease-out;
    text-decoration: none;
  }

  .button:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .button:disabled,
  .button[aria-disabled='true'] {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .button--sm {
    padding: var(--space-1) var(--space-2);
    font-size: var(--text-sm);
  }

  .button--md {
    padding: var(--space-2) var(--space-4);
    font-size: var(--text-base);
  }

  .button--lg {
    padding: var(--space-3) var(--space-5);
    font-size: var(--text-md);
  }

  .button--primary {
    background-color: var(--color-bg-tertiary);
    color: var(--color-text);
    border-color: var(--color-border);
  }

  .button--primary:hover:not(:disabled) {
    background-color: var(--color-bg-hover);
  }

  .button--secondary {
    background-color: transparent;
    color: var(--color-text);
    border-color: var(--color-border);
  }

  .button--secondary:hover:not(:disabled) {
    background-color: var(--color-bg-hover);
  }

  .button--danger {
    background-color: var(--color-danger);
    color: var(--color-document-white);
    border-color: var(--color-danger);
  }

  .button--danger:hover:not(:disabled) {
    filter: brightness(1.1);
  }

  @media (prefers-reduced-motion: reduce) {
    .button--danger:hover:not(:disabled) {
      filter: none;
    }
  }

  .button--ghost {
    background-color: transparent;
    color: var(--color-text-muted);
    border-color: transparent;
  }

  .button--ghost:hover:not(:disabled) {
    background-color: var(--color-bg-hover);
    color: var(--color-text);
  }
</style>
