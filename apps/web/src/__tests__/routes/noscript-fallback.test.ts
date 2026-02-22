import * as fs from 'node:fs';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

const appHtmlPath = path.resolve(__dirname, '../../app.html');
const appHtmlContent = fs.readFileSync(appHtmlPath, 'utf-8');

describe('No-JS Fallback (app.html)', () => {
  it('contains noscript tag', () => {
    expect(appHtmlContent).toContain('<noscript>');
  });

  it('renders meaningful fallback message when JavaScript is unavailable', () => {
    expect(appHtmlContent).toContain('JavaScript Required');
    expect(appHtmlContent).toContain('requires JavaScript');
  });

  it('provides link to documentation for help', () => {
    expect(appHtmlContent).toContain('/docs');
    expect(appHtmlContent).toContain('documentation');
  });

  it('warns about protected routes requiring JS', () => {
    expect(appHtmlContent).toContain('Protected routes');
    expect(appHtmlContent).toContain('authentication');
  });

  it('has accessible role alert attribute', () => {
    expect(appHtmlContent).toContain('role="alert"');
  });

  it('has styled fallback UI with dark theme', () => {
    expect(appHtmlContent).toContain('.noscript-fallback');
    expect(appHtmlContent).toContain('background:');
    expect(appHtmlContent).toContain('color:');
  });

  it('has inline styles for noscript fallback', () => {
    expect(appHtmlContent).toContain('<style>');
    expect(appHtmlContent).toContain('</style>');
  });
});
