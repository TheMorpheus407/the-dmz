<script lang="ts">
  /* eslint-disable prefer-const */
  import type { Snippet } from 'svelte';

  type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info';

  interface Props {
    variant?: Variant;
    size?: 'sm' | 'md';
    ariaLabel?: string;
    children: Snippet;
  }

  let { variant = 'default', size = 'md', ariaLabel, children }: Props = $props();
</script>

<span class="badge badge--{variant} badge--{size}" role="status" aria-label={ariaLabel}>
  {@render children()}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-ui);
    font-weight: 500;
    border-radius: var(--radius-full);
    white-space: nowrap;
  }

  .badge--sm {
    padding: var(--space-0) var(--space-2);
    font-size: var(--text-xs);
  }

  .badge--md {
    padding: var(--space-1) var(--space-3);
    font-size: var(--text-sm);
  }

  .badge--default {
    background-color: var(--color-bg-tertiary);
    color: var(--color-text);
    border: 1px solid var(--color-border);
  }

  .badge--success {
    background-color: var(--color-safe);
    color: var(--color-bg-primary);
  }

  .badge--warning {
    background-color: var(--color-warning);
    color: var(--color-bg-primary);
  }

  .badge--danger {
    background-color: var(--color-danger);
    color: var(--color-document-white);
  }

  .badge--info {
    background-color: var(--color-info);
    color: var(--color-document-white);
  }
</style>
