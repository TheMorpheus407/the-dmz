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

    registerCommand({
      name: 'help',
      description: 'Show available commands',
      execute: () => getHelpText(),
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

  describe('help command', () => {
    it('should show general help index', () => {
      const result = executeCommand('help');
      expect(result).toContain('Available commands');
      expect(result).toContain('SYSOP-7');
    });

    it('should show specific topic help', () => {
      const result = executeCommand('help email');
      expect(result).toContain('EMAIL HELP');
      expect(result).toContain('READING EMAILS');
    });

    it('should handle topic case insensitively', () => {
      const result = executeCommand('help EMAIL');
      expect(result).toContain('EMAIL HELP');
    });

    it('should show error for unknown topic', () => {
      const result = executeCommand('help nonexistent');
      expect(result).toContain('Help topic not found');
      expect(result).toContain('Available topics');
    });

    it('should show index with help topics', () => {
      const result = executeCommand('help index');
      expect(result).toContain('MATRICES GmbH OPERATOR MANUAL');
      expect(result).toContain('general');
      expect(result).toContain('email');
    });
  });

  describe('getHelpText', () => {
    it('should return help text with registered commands', () => {
      const help = getHelpText();
      expect(help).toContain('test');
      expect(help).toContain('A test command');
    });

    it('should include SYSOP-7 reference', () => {
      const help = getHelpText();
      expect(help).toContain('SYSOP-7');
    });
  });
});
