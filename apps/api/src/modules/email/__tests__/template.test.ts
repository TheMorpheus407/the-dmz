import { describe, it, expect } from 'vitest';

import { substituteVariables, extractVariables, templateService } from '../template.service.js';

describe('templateService', () => {
  describe('substituteVariables', () => {
    it('should substitute existing variables', () => {
      const template = 'Hello {{name}}, welcome to {{company}}!';
      const result = substituteVariables(template, { name: 'John', company: 'Acme' });
      expect(result).toBe('Hello John, welcome to Acme!');
    });

    it('should keep unreplaced variables as-is', () => {
      const template = 'Hello {{name}}, your role is {{role}}';
      const result = substituteVariables(template, { name: 'John' });
      expect(result).toBe('Hello John, your role is {{role}}');
    });

    it('should handle nested variable names', () => {
      const template = 'Welcome {{user.profile.name}}';
      const result = substituteVariables(template, { 'user.profile.name': 'Jane' });
      expect(result).toBe('Welcome Jane');
    });

    it('should handle null and undefined values', () => {
      const template = 'Hello {{name}}, your role is {{role}}';
      const result = substituteVariables(template, { name: 'John', role: null });
      expect(result).toBe('Hello John, your role is {{role}}');
    });

    it('should handle numbers and booleans', () => {
      const template = 'Day {{day}}, Active: {{active}}';
      const result = substituteVariables(template, { day: 5, active: true });
      expect(result).toBe('Day 5, Active: true');
    });
  });

  describe('extractVariables', () => {
    it('should extract all variables from template', () => {
      const template = 'Hello {{name}}, welcome to {{company}}!';
      const vars = extractVariables(template);
      expect(vars).toContain('name');
      expect(vars).toContain('company');
    });

    it('should return empty array for no variables', () => {
      const template = 'Hello World!';
      const vars = extractVariables(template);
      expect(vars).toHaveLength(0);
    });

    it('should not return duplicates', () => {
      const template = '{{name}} said hello to {{name}}';
      const vars = extractVariables(template);
      expect(vars).toEqual(['name']);
    });
  });

  describe('render', () => {
    it('should render template with variables', () => {
      const template = {
        subject: 'Welcome {{name}}',
        bodyHtml: '<p>Hello {{name}}!</p>',
        fromEmail: 'noreply@example.com',
      };

      const result = templateService.render(template, { name: 'John' });

      expect(result.subject).toBe('Welcome John');
      expect(result.bodyHtml).toContain('Hello John!');
    });

    it('should render text version from HTML if not provided', () => {
      const template = {
        subject: 'Test',
        bodyHtml: '<p>Hello <strong>World</strong>!</p>',
        fromEmail: 'test@example.com',
      };

      const result = templateService.render(template, {});

      expect(result.bodyText).toBe('Hello World!');
    });

    it('should use provided text version', () => {
      const template = {
        subject: 'Test',
        bodyHtml: '<p>Hello World!</p>',
        bodyText: 'Hello World! (Plain text)',
        fromEmail: 'test@example.com',
      };

      const result = templateService.render(template, {});

      expect(result.bodyText).toBe('Hello World! (Plain text)');
    });

    it('should apply branding colors and company name', () => {
      const template = {
        subject: 'Test',
        bodyHtml: '<p>Hello {{name}}!</p>',
        fromEmail: 'test@example.com',
      };

      const branding = {
        companyName: 'Acme Corp',
        primaryColor: '#ff0000',
      };

      const result = templateService.render(template, { name: 'John' }, branding);

      expect(result.fromName).toBe('Acme Corp');
      expect(result.bodyHtml).toContain('#ff0000');
    });
  });

  describe('validateVariables', () => {
    it('should validate all required variables provided', () => {
      const template = {
        subject: 'Welcome {{name}}',
        bodyHtml: '<p>Hello {{name}}!</p>',
      };

      const result = templateService.validateVariables(template, { name: 'John' });

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should detect missing required variables', () => {
      const template = {
        subject: 'Welcome {{name}}',
        bodyHtml: '<p>Hello {{name}}!</p>',
      };

      const result = templateService.validateVariables(template, {});

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('name');
    });

    it('should detect extra variables', () => {
      const template = {
        subject: 'Welcome {{name}}',
        bodyHtml: '<p>Hello {{name}}!</p>',
      };

      const result = templateService.validateVariables(template, {
        name: 'John',
        extra: 'value',
      });

      expect(result.valid).toBe(true);
      expect(result.extra).toContain('extra');
    });
  });
});
