<script lang="ts">
  import { type DialogSpeaker, type Faction } from '@the-dmz/shared/types';

  interface Props {
    speaker: DialogSpeaker;
    factionId?: Faction | undefined;
  }

  const { speaker, factionId = undefined }: Props = $props();

  const speakerName = $derived(
    speaker === 'morpheus'
      ? 'MORPHEUS'
      : speaker === 'sysop7'
        ? 'SYSOP-7'
        : (factionId?.toUpperCase() ?? 'FACTION'),
  );

  const speakerTitle = $derived(
    speaker === 'morpheus'
      ? 'AI Guide'
      : speaker === 'sysop7'
        ? 'System Operator'
        : getFactionTitle(factionId),
  );

  const speakerColor = $derived(
    speaker === 'morpheus'
      ? 'var(--color-phosphor-green, #33ff33)'
      : speaker === 'sysop7'
        ? 'var(--color-info, #3399ff)'
        : getFactionColor(factionId),
  );

  const asciiArt = $derived(getAsciiArt(speaker, factionId));

  function getFactionTitle(factionId?: Faction): string {
    switch (factionId) {
      case 'Sovereign Compact':
        return 'Government Liaison';
      case 'Nexion Industries':
        return 'Corporate Rep';
      case 'Librarians':
        return 'Archivist';
      case 'Hacktivists':
        return 'Activist';
      case 'Criminal Networks':
        return 'Unknown Contact';
      default:
        return 'Representative';
    }
  }

  function getFactionColor(factionId?: Faction): string {
    switch (factionId) {
      case 'Sovereign Compact':
        return '#4488cc';
      case 'Nexion Industries':
        return '#cc8844';
      case 'Librarians':
        return '#44aa88';
      case 'Hacktivists':
        return '#aa44cc';
      case 'Criminal Networks':
        return '#cc4444';
      default:
        return 'var(--color-document-white, #e0e0e0)';
    }
  }

  function getAsciiArt(speaker: DialogSpeaker, factionId?: Faction): string[] {
    if (speaker === 'morpheus') {
      return [
        '    ╔═══════════════╗',
        '    ║  ◊◊◊ ◊◊◊ ◊◊◊  ║',
        '    ║  ◊ ◊◊◊ ◊ ◊◊◊ ║',
        '    ║  ◊◊◊ ◊◊◊ ◊◊◊  ║',
        '    ║     ▓▓▓▓▓     ║',
        '    ╚═══════════════╝',
      ];
    }
    if (speaker === 'sysop7') {
      return [
        '    ╔═══════════════╗',
        '    ║  ┌─┐ ┌─┐ ┌─┐  ║',
        '    ║  │█│ │█│ │█│  ║',
        '    ║  └─┘ └─┘ └─┘  ║',
        '    ║     ▓▓▓▓▓     ║',
        '    ╚═══════════════╝',
      ];
    }
    switch (factionId) {
      case 'Sovereign Compact':
        return [
          '    ╔═══════════════╗',
          '    ║  ╔═══╗ ╔═══╗  ║',
          '    ║  ║ ▲ ║ ║ ▲ ║  ║',
          '    ║  ╚═══╝ ╚═══╝  ║',
          '    ║     ▓▓▓▓▓     ║',
          '    ╚═══════════════╝',
        ];
      case 'Nexion Industries':
        return [
          '    ╔═══════════════╗',
          '    ║  ╔═╗╔═╗╔═╗╔═╗  ║',
          '    ║  ║█║║█║║█║║█║  ║',
          '    ║  ╚═╝╚═╝╚═╝╚═╝  ║',
          '    ║     ▓▓▓▓▓     ║',
          '    ╚═══════════════╝',
        ];
      case 'Librarians':
        return [
          '    ╔═══════════════╗',
          '    ║  ╔═══════╗    ║',
          '    ║  ║ ════ ║    ║',
          '    ║  ╚═══════╝    ║',
          '    ║     ▓▓▓▓▓     ║',
          '    ╚═══════════════╝',
        ];
      case 'Hacktivists':
        return [
          '    ╔═══════════════╗',
          '    ║  ◄► ◄► ◄►    ║',
          '    ║  ►◄ ►◄ ►◄    ║',
          '    ║  ◄► ◄► ◄►    ║',
          '    ║     ▓▓▓▓▓     ║',
          '    ╚═══════════════╝',
        ];
      case 'Criminal Networks':
        return [
          '    ╔═══════════════╗',
          '    ║  ▄   ▄   ▄   ║',
          '    ║   ▀▄   ▄▀    ║',
          '    ║  ▄   ▄   ▄   ║',
          '    ║     ▓▓▓▓▓     ║',
          '    ╚═══════════════╝',
        ];
      default:
        return [
          '    ╔═══════════════╗',
          '    ║  ?   ?   ?   ║',
          '    ║   ?   ?   ?   ║',
          '    ║  ?   ?   ?   ║',
          '    ║     ▓▓▓▓▓     ║',
          '    ╚═══════════════╝',
        ];
    }
  }
</script>

<div class="character-portrait" style="--speaker-color: {speakerColor}">
  <div class="character-portrait__ascii">
    {#each asciiArt as line, i (i)}
      <pre class="character-portrait__line">{line}</pre>
    {/each}
  </div>
  <div class="character-portrait__info">
    <span class="character-portrait__name">{speakerName}</span>
    <span class="character-portrait__title">{speakerTitle}</span>
  </div>
</div>

<style>
  .character-portrait {
    display: flex;
    flex-direction: column;
    gap: var(--space-2, 0.5rem);
    padding: var(--space-2, 0.5rem);
    background: var(--color-bg-tertiary, #1e2832);
    border: 1px solid var(--speaker-color);
    border-radius: 4px;
  }

  .character-portrait__ascii {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: var(--color-bg-primary, #0a0e14);
    padding: var(--space-1, 0.25rem);
    border-radius: 2px;
  }

  .character-portrait__line {
    margin: 0;
    font-family: var(--font-terminal, monospace);
    font-size: var(--text-xs, 0.75rem);
    line-height: 1.2;
    color: var(--speaker-color);
  }

  .character-portrait__info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1, 0.25rem);
  }

  .character-portrait__name {
    font-family: var(--font-terminal, monospace);
    font-size: var(--text-sm, 0.875rem);
    font-weight: 600;
    color: var(--speaker-color);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .character-portrait__title {
    font-family: var(--font-terminal, monospace);
    font-size: var(--text-xs, 0.75rem);
    color: var(--color-document-muted, #b0b0b0);
  }
</style>
