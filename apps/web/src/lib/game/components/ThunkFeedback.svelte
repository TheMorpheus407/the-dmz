<script lang="ts">
  interface Props {
    type?: 'approve' | 'deny' | 'flag' | 'verify' | 'default';
    message?: string;
    visible?: boolean;
    duration?: number;
  }

  const { type = 'default', message = '', visible = false, duration = 300 }: Props = $props();

  let isAnimating = $state(false);

  $effect(() => {
    if (visible) {
      isAnimating = true;
      const timer = setTimeout(() => {
        isAnimating = false;
      }, duration);
      return () => clearTimeout(timer);
    }
    return undefined;
  });

  const typeLabels: Record<string, string> = {
    approve: 'APPROVED',
    deny: 'DENIED',
    flag: 'FLAGGED',
    verify: 'VERIFYING...',
    default: '',
  };
</script>

{#if visible}
  <div
    class="thunk-feedback"
    class:thunk-feedback--visible={isAnimating}
    class:thunk-feedback--approve={type === 'approve'}
    class:thunk-feedback--deny={type === 'deny'}
    class:thunk-feedback--flag={type === 'flag'}
    class:thunk-feedback--verify={type === 'verify'}
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    <div class="thunk-feedback__stamp">
      <span class="thunk-feedback__label">{message || typeLabels[type]}</span>
    </div>
    <div class="thunk-feedback__ripple"></div>
  </div>
{/if}

<style>
  .thunk-feedback {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 0;
    pointer-events: none;
    z-index: 900;
    transition:
      transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1),
      opacity 150ms ease;
  }

  .thunk-feedback--visible {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }

  .thunk-feedback__stamp {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 200px;
    height: 200px;
    border: 8px solid var(--color-phosphor-green, #33ff33);
    border-radius: 50%;
    background-color: rgba(10, 14, 20, 0.95);
    transform: rotate(-15deg);
  }

  .thunk-feedback--approve .thunk-feedback__stamp {
    border-color: var(--color-safe, #33cc66);
    box-shadow:
      0 0 20px rgba(51, 204, 102, 0.4),
      inset 0 0 20px rgba(51, 204, 102, 0.1);
  }

  .thunk-feedback--deny .thunk-feedback__stamp {
    border-color: var(--color-danger, #ff5555);
    box-shadow:
      0 0 20px rgba(255, 85, 85, 0.4),
      inset 0 0 20px rgba(255, 85, 85, 0.1);
  }

  .thunk-feedback--flag .thunk-feedback__stamp {
    border-color: var(--color-flagged, #ff9900);
    box-shadow:
      0 0 20px rgba(255, 153, 0, 0.4),
      inset 0 0 20px rgba(255, 153, 0, 0.1);
  }

  .thunk-feedback--verify .thunk-feedback__stamp {
    border-color: var(--color-info, #3399ff);
    box-shadow:
      0 0 20px rgba(51, 153, 255, 0.4),
      inset 0 0 20px rgba(51, 153, 255, 0.1);
  }

  .thunk-feedback__label {
    font-family: var(--font-terminal, monospace);
    font-size: var(--text-xl, 1.5rem);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-phosphor-green, #33ff33);
  }

  .thunk-feedback--approve .thunk-feedback__label {
    color: var(--color-safe, #33cc66);
  }

  .thunk-feedback--deny .thunk-feedback__label {
    color: var(--color-danger, #ff5555);
  }

  .thunk-feedback--flag .thunk-feedback__label {
    color: var(--color-flagged, #ff9900);
  }

  .thunk-feedback--verify .thunk-feedback__label {
    color: var(--color-info, #3399ff);
  }

  .thunk-feedback__ripple {
    position: absolute;
    inset: -20px;
    border-radius: 50%;
    border: 2px solid var(--color-phosphor-green, #33ff33);
    opacity: 0;
    transform: scale(0.8);
  }

  .thunk-feedback--visible .thunk-feedback__ripple {
    animation: ripple 400ms ease-out;
  }

  .thunk-feedback--approve .thunk-feedback__ripple {
    border-color: var(--color-safe, #33cc66);
  }

  .thunk-feedback--deny .thunk-feedback__ripple {
    border-color: var(--color-danger, #ff5555);
  }

  .thunk-feedback--flag .thunk-feedback__ripple {
    border-color: var(--color-flagged, #ff9900);
  }

  .thunk-feedback--verify .thunk-feedback__ripple {
    border-color: var(--color-info, #3399ff);
  }

  @keyframes ripple {
    0% {
      opacity: 0.8;
      transform: scale(0.8);
    }
    100% {
      opacity: 0;
      transform: scale(1.5);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .thunk-feedback {
      transition: opacity 100ms ease;
    }

    .thunk-feedback__ripple {
      animation: none;
      opacity: 0;
    }
  }
</style>
