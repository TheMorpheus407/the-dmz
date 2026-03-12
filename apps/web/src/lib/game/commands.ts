import { get } from 'svelte/store';

import { registerCommand, getHelpText } from './services/terminal-commands';
import { dialogHistory } from './store/ui-store';

let commandsRegistered = false;

export function registerGameCommands(): void {
  if (commandsRegistered) {
    return;
  }

  registerCommand({
    name: 'history',
    description: 'Show dialog history',
    execute: () => {
      const history = get(dialogHistory);

      if (history.length === 0) {
        return 'No dialog history available.';
      }

      const lines: string[] = ['=== DIALOG HISTORY ===', ''];

      for (let i = 0; i < history.length; i++) {
        const entry = history[i];
        if (!entry) continue;

        const speakerLabel =
          entry.speaker === 'morpheus'
            ? '[MORPHEUS]'
            : entry.speaker === 'sysop7'
              ? '[SYSOP-7]'
              : '[FACTION]';

        lines.push(`${i + 1}. ${speakerLabel}: ${entry.text}`);

        if (entry.choiceId) {
          lines.push(`   > Choice: ${entry.text}`);
        }
      }

      lines.push('');
      lines.push(`Total entries: ${history.length}`);

      return lines.join('\n');
    },
  });

  registerCommand({
    name: 'help',
    description: 'Show available commands',
    execute: () => getHelpText(),
  });

  commandsRegistered = true;
}
