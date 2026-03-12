export interface TerminalCommand {
  name: string;
  description: string;
  execute: (args: string[]) => string;
}

const commands = new Map<string, TerminalCommand>();

export function registerCommand(command: TerminalCommand): void {
  commands.set(command.name.toLowerCase(), command);
}

export function executeCommand(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return '';
  }

  const parts = trimmed.split(/\s+/);
  const commandName = parts[0]?.toLowerCase() ?? '';
  const args = parts.slice(1);

  const command = commands.get(commandName);

  if (!command) {
    return `Command not found: ${commandName}. Type 'help' for available commands.`;
  }

  try {
    return command.execute(args);
  } catch (error) {
    return `Error executing command: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

export function getCommandNames(): string[] {
  return Array.from(commands.keys());
}

export function getHelpText(): string {
  const commandList = Array.from(commands.values())
    .map((cmd) => `  ${cmd.name.padEnd(12)} - ${cmd.description}`)
    .join('\n');

  return `Available commands:\n${commandList}`;
}
