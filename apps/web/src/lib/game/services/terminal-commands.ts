import { HELP_TOPICS, getHelpForTopic, getHelpIndex } from '../data/help-content';

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

  if (commandName === 'help' && args.length > 0) {
    return executeHelpCommand(args);
  }

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

function executeHelpCommand(args: string[]): string {
  const topicId = args[0]?.toLowerCase();

  if (!topicId) {
    return getHelpText();
  }

  if (topicId === 'index' || topicId === 'topics' || topicId === 'list') {
    return getHelpIndex();
  }

  const topic = getHelpForTopic(topicId);

  if (topic) {
    return topic.content;
  }

  const suggestions = HELP_TOPICS.map((t) => t.name).join(', ');
  return `Help topic not found: ${topicId}\n\nAvailable topics: ${suggestions}\n\nType 'help' for the general index.`;
}

export function getCommandNames(): string[] {
  return Array.from(commands.keys());
}

export function getHelpText(): string {
  const commandList = Array.from(commands.values())
    .map((cmd) => `  ${cmd.name.padEnd(12)} - ${cmd.description}`)
    .join('\n');

  return `Available commands:
${commandList}

For more detailed help, use 'help <topic>'.
Type 'help' alone for the SYSOP-7 operator manual index.`;
}
