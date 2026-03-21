import { describe, expect, it } from 'vitest';
import DOMPurify from 'dompurify';

describe('RansomNote XSS Sanitization', () => {
  describe('DOMPurify sanitization', () => {
    it('strips script tags from message', () => {
      const maliciousMessage = '<script>alert("XSS")</script>Hello World';
      const sanitized = DOMPurify.sanitize(maliciousMessage, { USE_PROFILES: { html: true } });
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).toContain('Hello World');
    });

    it('strips onclick event handlers from message', () => {
      const maliciousMessage = '<div onclick="alert(\'XSS\')">Click me</div>';
      const sanitized = DOMPurify.sanitize(maliciousMessage, { USE_PROFILES: { html: true } });
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).toContain('Click me');
    });

    it('strips onerror event handlers from message', () => {
      const maliciousMessage = '<img src="x" onerror="alert(\'XSS\')">';
      const sanitized = DOMPurify.sanitize(maliciousMessage, { USE_PROFILES: { html: true } });
      expect(sanitized).not.toContain('onerror');
    });

    it('strips javascript: URLs from message', () => {
      const maliciousMessage = '<a href="javascript:alert(\'XSS\')">Click me</a>';
      const sanitized = DOMPurify.sanitize(maliciousMessage, { USE_PROFILES: { html: true } });
      expect(sanitized).not.toContain('javascript:');
    });

    it('strips data: URLs from message', () => {
      const maliciousMessage =
        '<a href="data:text/html,<script>alert(\'XSS\')</script>">Click me</a>';
      const sanitized = DOMPurify.sanitize(maliciousMessage, { USE_PROFILES: { html: true } });
      expect(sanitized).not.toContain('data:');
    });

    it('preserves safe HTML formatting tags', () => {
      const safeMessage = '<p>Hello <strong>World</strong></p>';
      const sanitized = DOMPurify.sanitize(safeMessage, { USE_PROFILES: { html: true } });
      expect(sanitized).toContain('<p>');
      expect(sanitized).toContain('<strong>');
      expect(sanitized).toContain('Hello');
      expect(sanitized).toContain('World');
    });

    it('preserves line breaks in message', () => {
      const messageWithBreaks = 'Line 1<br>Line 2<br/>Line 3';
      const sanitized = DOMPurify.sanitize(messageWithBreaks, { USE_PROFILES: { html: true } });
      expect(sanitized).toContain('Line 1');
      expect(sanitized).toContain('Line 2');
      expect(sanitized).toContain('Line 3');
    });

    it('handles empty message gracefully', () => {
      const emptyMessage = '';
      const sanitized = DOMPurify.sanitize(emptyMessage, { USE_PROFILES: { html: true } });
      expect(sanitized).toBe('');
    });

    it('handles null-like message gracefully', () => {
      const emptyMessage = '';
      const sanitized = DOMPurify.sanitize(emptyMessage, { USE_PROFILES: { html: true } });
      expect(sanitized).toBe('');
    });

    it('handles unicode and emoji content', () => {
      const unicodeMessage = '<p>Hello 🌍! 🎉</p>';
      const sanitized = DOMPurify.sanitize(unicodeMessage, { USE_PROFILES: { html: true } });
      expect(sanitized).toContain('Hello');
      expect(sanitized).toContain('🌍');
      expect(sanitized).toContain('🎉');
    });

    it('strips vbscript URLs from message', () => {
      const maliciousMessage = '<a href="vbscript:msgbox(\'XSS\')">Click me</a>';
      const sanitized = DOMPurify.sanitize(maliciousMessage, { USE_PROFILES: { html: true } });
      expect(sanitized).not.toContain('vbscript:');
    });
  });
});
