<script lang="ts">
  import { browser } from '$app/environment';

  interface Props {
    text: string;
    speed?: number;
    onComplete?: () => void;
  }

  const { text, speed = 40, onComplete }: Props = $props();

  let displayedText = $state('');
  let isComplete = $state(false);
  let charIndex = $state(0);

  const reducedMotion = $derived(
    browser ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : true,
  );

  function typeNextChar() {
    if (charIndex < text.length) {
      displayedText = text.slice(0, charIndex + 1);
      charIndex++;
      if (browser && !reducedMotion) {
        timeoutId = setTimeout(typeNextChar, speed);
      } else {
        displayedText = text;
        charIndex = text.length;
        isComplete = true;
        onComplete?.();
      }
    } else {
      isComplete = true;
      onComplete?.();
    }
  }

  function skipToEnd() {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    displayedText = text;
    charIndex = text.length;
    isComplete = true;
    onComplete?.();
  }

  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    displayedText = '';
    charIndex = 0;
    isComplete = false;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (browser && !reducedMotion) {
      timeoutId = setTimeout(typeNextChar, speed);
    } else {
      displayedText = text;
      charIndex = text.length;
      isComplete = true;
      onComplete?.();
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  });

  function handleClick() {
    if (!isComplete) {
      skipToEnd();
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (!isComplete) {
        skipToEnd();
      }
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<div
  class="dialog-text"
  role="button"
  tabindex="0"
  onclick={handleClick}
  onkeydown={(e) => e.key === 'Enter' && handleClick()}
>
  <p class="dialog-text__content">
    {displayedText}<span class="dialog-text__cursor" class:dialog-text__cursor--hidden={isComplete}
      >█</span
    >
  </p>
</div>

<style>
  .dialog-text {
    cursor: pointer;
    padding: var(--space-3, 0.75rem);
    background: var(--color-bg-primary, #0a0e14);
    border: 1px solid var(--color-phosphor-green-dark, #334433);
    border-radius: 4px;
    min-height: 80px;
    transition: border-color 150ms ease;
  }

  .dialog-text:hover {
    border-color: var(--color-phosphor-green, #33ff33);
  }

  .dialog-text:focus {
    outline: none;
    border-color: var(--color-phosphor-green, #33ff33);
  }

  .dialog-text__content {
    margin: 0;
    font-family: var(--font-terminal, monospace);
    font-size: var(--text-base, 1rem);
    line-height: 1.6;
    color: var(--color-document-white, #e0e0e0);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .dialog-text__cursor {
    display: inline-block;
    color: var(--color-phosphor-green, #33ff33);
    animation: blink 530ms step-end infinite;
  }

  .dialog-text__cursor--hidden {
    opacity: 0;
  }

  @keyframes blink {
    0%,
    50% {
      opacity: 1;
    }
    51%,
    100% {
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .dialog-text__cursor {
      animation: none;
    }
  }
</style>
