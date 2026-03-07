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
    onShowHelp?: () => void;
    onHideHelp?: () => void;
    onToggleFacility?: () => void;
    onToggleUpgrades?: () => void;
    onSelectNextEmail?: () => void;
    onRefresh?: () => void;
  }

  interface Props {
    handlers?: ShortcutHandlers;
  }

  const { handlers = {} }: Props = $props();

  let helpVisible = $state(false);

  function handleKeyDown(event: KeyboardEvent) {
    if (!$keyboardShortcutsEnabled) return;

    const key = event.key;
    const allowedShortcuts = $currentShortcutConfig.shortcuts;

    if (key === '?' && !helpVisible) {
      helpVisible = true;
      handlers.onShowHelp?.();
      return;
    }

    if (key === 'Escape' && helpVisible) {
      helpVisible = false;
      handlers.onHideHelp?.();
      return;
    }

    if (helpVisible) return;

    if (!allowedShortcuts.includes(key)) return;

    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    event.preventDefault();

    switch (key) {
      case 'ArrowDown':
      case 'j':
        handlers.onSelectNext?.();
        break;
      case 'ArrowUp':
      case 'k':
        handlers.onSelectPrevious?.();
        break;
      case 'Enter':
        handlers.onOpen?.();
        handlers.onAdvanceDay?.();
        handlers.onRestart?.();
        handlers.onUpgrade?.();
        break;
      case 'v':
        handlers.onVerify?.();
        break;
      case 'w':
        handlers.onOpen?.();
        break;
      case 'r':
        handlers.onRefresh?.();
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
      case 's':
        handlers.onViewStats?.();
        break;
      case 'h':
        handlers.onToggleFacility?.();
        break;
      case 'm':
        handlers.onToggleUpgrades?.();
        break;
      case 'e':
        handlers.onSelectNextEmail?.();
        break;
      case 'n':
        handlers.onAdvanceDay?.();
        break;
      case 'Escape':
        handlers.onCancel?.();
        break;
    }
  }

  export function hideHelp() {
    helpVisible = false;
  }

  export function isHelpVisible() {
    return helpVisible;
  }
</script>

<svelte:window onkeydown={handleKeyDown} />
