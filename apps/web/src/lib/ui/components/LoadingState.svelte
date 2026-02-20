<script lang="ts">
  /* eslint-disable prefer-const */
  type Variant = 'spinner' | 'dots' | 'skeleton';
  type Size = 'sm' | 'md' | 'lg';

  interface Props {
    loading?: boolean;
    variant?: Variant;
    size?: Size;
    message?: string;
    label?: string;
  }

  let {
    loading = true,
    variant = 'spinner',
    size = 'md',
    message = 'Loading...',
    label = 'Loading content',
  }: Props = $props();
</script>

{#if loading}
  <div
    class="loading loading--{variant} loading--{size}"
    role="status"
    aria-live="polite"
    aria-busy="true"
    aria-label={label}
  >
    {#if variant === 'spinner'}
      <span class="loading__spinner"></span>
    {:else if variant === 'dots'}
      <span class="loading__dot"></span>
      <span class="loading__dot"></span>
      <span class="loading__dot"></span>
    {:else if variant === 'skeleton'}
      <div class="loading__skeleton"></div>
    {/if}

    {#if message}
      <span class="loading__message">{message}</span>
    {/if}

    <span class="visually-hidden">{label}: {message}</span>
  </div>
{/if}

<style>
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    padding: var(--space-4);
    color: var(--color-text-muted);
    font-family: var(--font-ui);
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .loading--sm {
    font-size: var(--text-sm);
  }

  .loading--md {
    font-size: var(--text-base);
  }

  .loading--lg {
    font-size: var(--text-lg);
  }

  .loading__spinner {
    width: 1em;
    height: 1em;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .loading--sm .loading__spinner {
    width: 0.75em;
    height: 0.75em;
  }

  .loading--lg .loading__spinner {
    width: 1.5em;
    height: 1.5em;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading__dot {
    width: 0.5em;
    height: 0.5em;
    background-color: var(--color-accent);
    border-radius: 50%;
    animation: pulse 1.4s ease-in-out infinite;
  }

  .loading__dot:nth-child(1) {
    animation-delay: 0s;
  }

  .loading__dot:nth-child(2) {
    animation-delay: 0.2s;
  }

  .loading__dot:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes pulse {
    0%,
    80%,
    100% {
      opacity: 0.3;
      transform: scale(0.8);
    }
    40% {
      opacity: 1;
      transform: scale(1);
    }
  }

  .loading__skeleton {
    width: 100%;
    height: 1em;
    background: linear-gradient(
      90deg,
      var(--color-bg-tertiary) 25%,
      var(--color-bg-hover) 50%,
      var(--color-bg-tertiary) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
    border-radius: var(--radius-sm);
  }

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  .loading__message {
    text-align: center;
  }

  @media (prefers-reduced-motion: reduce) {
    .loading__spinner,
    .loading__dot,
    .loading__skeleton {
      animation: none;
    }
  }
</style>
