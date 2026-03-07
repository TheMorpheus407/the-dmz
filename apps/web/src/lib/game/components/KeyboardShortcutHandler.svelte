<script lang="ts">
  import { currentShortcutConfig, keyboardShortcutsEnabled } from '$lib/game/store/ui-store';

  interface ShortcutHandlers {
    onSelectNext?: () => void;
    onSelectPrevious?: () => void;
    onOpen?: () => void;
    onVerify?: () => void;
    onApprove?: () => void;
    onDeny?: () => void;
    onFlag?: () => void;
    onContain?: () => void;
    onInvestigate?: () => void;
    onRecover?: () => void;
    onUpgrade?: () => void;
    onViewStats?: () => void;
    onAdvanceDay?: () => void;
    onRestart?: () => void;
    onCancel?: () => void;
  }

  interface Props {
    handlers?: ShortcutHandlers;
  }

  const { handlers = {} }: Props = $props();

  function handleKeyDown(event: KeyboardEvent) {
    if (!$keyboardShortcutsEnabled) return;

    const key = event.key;
    const allowedShortcuts = $currentShortcutConfig.shortcuts;

    if (!allowedShortcuts.includes(key)) return;

    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (key) {
      case 'j':
        handlers.onSelectNext?.();
        break;
      case 'k':
        handlers.onSelectPrevious?.();
        break;
      case 'Enter':
        handlers.onOpen?.();
        handlers.onAdvanceDay?.();
        handlers.onRestart?.();
        break;
      case 'v':
        handlers.onVerify?.();
        break;
      case 'w':
        handlers.onOpen?.();
        break;
      case 'r':
        handlers.onVerify?.();
        handlers.onRestart?.();
        break;
      case 'Tab':
        handlers.onSelectNext?.();
        break;
      case 'f':
        handlers.onFlag?.();
        break;
      case 'a':
        handlers.onApprove?.();
        break;
      case 'd':
        handlers.onDeny?.();
        handlers.onViewStats?.();
        break;
      case 'c':
        handlers.onContain?.();
        handlers.onViewStats?.();
        break;
      case 'i':
        handlers.onInvestigate?.();
        break;
      case 'u':
        handlers.onUpgrade?.();
        break;
      case 'g':
        handlers.onViewStats?.();
        break;
      case 's':
        handlers.onViewStats?.();
        break;
      case 'Esc':
        handlers.onCancel?.();
        break;
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />
