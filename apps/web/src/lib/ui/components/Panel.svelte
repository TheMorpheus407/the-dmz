<script lang="ts">
  /* eslint-disable prefer-const */
  import type { Snippet } from 'svelte';

  type Variant = 'default' | 'elevated' | 'outlined' | 'highlight' | 'admin';

  interface Props {
    variant?: Variant;
    role?: string;
    ariaLabel?: string;
    children: Snippet;
  }

  let { variant = 'default', role = 'region', ariaLabel, children }: Props = $props();
</script>

<div class="panel panel--{variant}" {role} aria-label={ariaLabel}>
  {@render children()}
</div>

<style>
  .panel {
    contain: layout style;
    background-color: var(--color-surface);
    border: var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-4);
  }

  .panel--default {
    background-color: var(--color-bg-secondary);
    border-color: var(--color-border);
  }

  .panel--elevated {
    background-color: var(--color-bg-tertiary);
    border-color: var(--color-border);
    box-shadow: var(--shadow-soft);
  }

  .panel--outlined {
    background-color: transparent;
    border: 2px solid var(--color-border);
  }

  .panel--highlight {
    background-color: var(--color-bg-tertiary);
    border-color: var(--color-accent);
  }

  .panel--admin {
    font-family: var(--font-admin);
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
</style>
