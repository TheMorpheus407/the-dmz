import { describe, it, expect, beforeEach } from 'vitest';

import {
  registerCommand,
  executeCommand,
  getCommandNames,
  getHelpText,
} from '$lib/game/services/terminal-commands';

describe('terminal-commands', () => {
  beforeEach(() => {
    registerCommand({
      name: 'test',
      description: 'A test command',
      execute: () => 'test output',
    });
  });

  describe('registerCommand', () => {
    it('should register a command', () => {
      const commands = getCommandNames();
      expect(commands).toContain('test');
    });
  });

  describe('executeCommand', () => {
    it('should execute a registered command', () => {
      const result = executeCommand('test');
      expect(result).toBe('test output');
    });

    it('should handle unknown commands', () => {
      const result = executeCommand('unknown');
      expect(result).toContain('Command not found');
    });

    it('should handle empty input', () => {
      const result = executeCommand('');
      expect(result).toBe('');
    });

    it('should handle command with arguments', () => {
      registerCommand({
        name: 'echo',
        description: 'Echo arguments',
        execute: (args) => args.join(' '),
      });
      const result = executeCommand('echo hello world');
      expect(result).toBe('hello world');
    });

    it('should handle command case insensitivity', () => {
      const result = executeCommand('TEST');
      expect(result).toBe('test output');
    });
  });

  describe('getHelpText', () => {
    it('should return help text with registered commands', () => {
      const help = getHelpText();
      expect(help).toContain('test');
      expect(help).toContain('A test command');
    });
  });
});
