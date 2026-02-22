import type { Meta } from '@storybook/svelte';

const meta: Meta = {
  title: 'Design System/Tokens',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Reference documentation for M1 design tokens. These CSS custom properties drive all component styling and theming.',
      },
    },
  },
};

export default meta;

export const ColorTokens = () => ({
  template: `
    <div style="display: flex; flex-direction: column; gap: 2rem; padding: 1rem;">
      <div>
        <h3>Game Core Surfaces</h3>
        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
          <div style="width: 100px;">
            <div style="width: 100%; height: 60px; background: var(--color-bg-primary); border: 1px solid var(--color-border);"></div>
            <code>--color-bg-primary</code>
            <small>#0a0e14</small>
          </div>
          <div style="width: 100px;">
            <div style="width: 100%; height: 60px; background: var(--color-bg-secondary); border: 1px solid var(--color-border);"></div>
            <code>--color-bg-secondary</code>
            <small>#141a22</small>
          </div>
          <div style="width: 100px;">
            <div style="width: 100%; height: 60px; background: var(--color-bg-tertiary); border: 1px solid var(--color-border);"></div>
            <code>--color-bg-tertiary</code>
            <small>#1e2832</small>
          </div>
          <div style="width: 100px;">
            <div style="width: 100%; height: 60px; background: var(--color-bg-hover); border: 1px solid var(--color-border);"></div>
            <code>--color-bg-hover</code>
            <small>#253040</small>
          </div>
        </div>
      </div>

      <div>
        <h3>Phosphor Terminal Colors</h3>
        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
          <div style="width: 100px;">
            <div style="width: 100%; height: 60px; background: var(--color-phosphor-green);"></div>
            <code>--color-phosphor-green</code>
            <small>#33ff33</small>
          </div>
          <div style="width: 100px;">
            <div style="width: 100%; height: 60px; background: var(--color-phosphor-green-dim);"></div>
            <code>--color-phosphor-green-dim</code>
            <small>#88aa88</small>
          </div>
          <div style="width: 100px;">
            <div style="width: 100%; height: 60px; background: var(--color-amber);"></div>
            <code>--color-amber</code>
            <small>#ffb000</small>
          </div>
        </div>
      </div>

      <div>
        <h3>Semantic Status</h3>
        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
          <div style="width: 100px;">
            <div style="width: 100%; height: 60px; background: var(--color-safe);"></div>
            <code>--color-safe</code>
            <small>#33cc66</small>
          </div>
          <div style="width: 100px;">
            <div style="width: 100%; height: 60px; background: var(--color-warning);"></div>
            <code>--color-warning</code>
            <small>#ffcc00</small>
          </div>
          <div style="width: 100px;">
            <div style="width: 100%; height: 60px; background: var(--color-danger);"></div>
            <code>--color-danger</code>
            <small>#ff5555</small>
          </div>
          <div style="width: 100px;">
            <div style="width: 100%; height: 60px; background: var(--color-info);"></div>
            <code>--color-info</code>
            <small>#3399ff</small>
          </div>
        </div>
      </div>

      <div>
        <h3>Admin Palette</h3>
        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
          <div style="width: 100px;">
            <div style="width: 100%; height: 60px; background: var(--admin-bg-primary);"></div>
            <code>--admin-bg-primary</code>
            <small>#1a1a2e</small>
          </div>
          <div style="width: 100px;">
            <div style="width: 100%; height: 60px; background: var(--admin-accent);"></div>
            <code>--admin-accent</code>
            <small>#4d9eff</small>
          </div>
          <div style="width: 100px;">
            <div style="width: 100%; height: 60px; background: var(--admin-success);"></div>
            <code>--admin-success</code>
            <small>#2ea96e</small>
          </div>
        </div>
      </div>
    </div>

    <style>
      h3 { margin-bottom: 1rem; color: var(--color-text); }
      code { display: block; font-size: 0.75rem; margin-top: 0.25rem; color: var(--color-text-muted); }
      small { display: block; font-size: 0.65rem; color: var(--color-text-muted); opacity: 0.7; }
    </style>
  `,
});

export const TypographyTokens = () => ({
  template: `
    <div style="display: flex; flex-direction: column; gap: 1.5rem; padding: 1rem;">
      <div>
        <h3>Font Families</h3>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          <div style="font-family: var(--font-terminal);">Terminal: JetBrains Mono / Fira Code</div>
          <div style="font-family: var(--font-document);">Document: IBM Plex Sans / Inter</div>
          <div style="font-family: var(--font-admin);">Admin: Inter / Segoe UI</div>
          <div style="font-family: var(--font-ui);">UI: Uses terminal font by default</div>
        </div>
      </div>

      <div>
        <h3>Type Scale</h3>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          <div style="font-size: var(--text-xs);">XS: 0.75rem (--text-xs)</div>
          <div style="font-size: var(--text-sm);">SM: 0.875rem (--text-sm)</div>
          <div style="font-size: var(--text-base);">Base: 1rem (--text-base)</div>
          <div style="font-size: var(--text-md);">MD: 1.125rem (--text-md)</div>
          <div style="font-size: var(--text-lg);">LG: 1.25rem (--text-lg)</div>
          <div style="font-size: var(--text-xl);">XL: 1.5rem (--text-xl)</div>
          <div style="font-size: var(--text-2xl);">2XL: 2rem (--text-2xl)</div>
          <div style="font-size: var(--text-3xl);">3XL: 2.5rem (--text-3xl)</div>
        </div>
      </div>
    </div>

    <style>
      h3 { margin-bottom: 1rem; color: var(--color-text); }
    </style>
  `,
});

export const SpacingTokens = () => ({
  template: `
    <div style="display: flex; flex-direction: column; gap: 1.5rem; padding: 1rem;">
      <div>
        <h3>Spacing Scale</h3>
        <div style="display: flex; align-items: flex-end; gap: 0.25rem; height: 120px;">
          <div style="width: var(--space-0); height: 4px; background: var(--color-accent);"><span style="font-size: 0.6rem;">0</span></div>
          <div style="width: var(--space-1); height: 8px; background: var(--color-accent);"><span style="font-size: 0.6rem;">1</span></div>
          <div style="width: var(--space-2); height: 12px; background: var(--color-accent);"><span style="font-size: 0.6rem;">2</span></div>
          <div style="width: var(--space-3); height: 16px; background: var(--color-accent);"><span style="font-size: 0.6rem;">3</span></div>
          <div style="width: var(--space-4); height: 24px; background: var(--color-accent);"><span style="font-size: 0.6rem;">4</span></div>
          <div style="width: var(--space-5); height: 32px; background: var(--color-accent);"><span style="font-size: 0.6rem;">5</span></div>
          <div style="width: var(--space-6); height: 48px; background: var(--color-accent);"><span style="font-size: 0.6rem;">6</span></div>
          <div style="width: var(--space-8); height: 64px; background: var(--color-accent);"><span style="font-size: 0.6rem;">8</span></div>
        </div>
      </div>

      <div>
        <h3>Values</h3>
        <ul style="list-style: none; padding: 0;">
          <li><code>--space-0</code>: 0px</li>
          <li><code>--space-1</code>: 0.25rem (4px)</li>
          <li><code>--space-2</code>: 0.5rem (8px)</li>
          <li><code>--space-3</code>: 0.75rem (12px)</li>
          <li><code>--space-4</code>: 1rem (16px)</li>
          <li><code>--space-5</code>: 1.5rem (24px)</li>
          <li><code>--space-6</code>: 2rem (32px)</li>
          <li><code>--space-8</code>: 3rem (48px)</li>
        </ul>
      </div>
    </div>

    <style>
      h3 { margin-bottom: 1rem; color: var(--color-text); }
      li { margin-bottom: 0.25rem; }
      code { color: var(--color-text-muted); }
    </style>
  `,
});

export const BorderRadiusTokens = () => ({
  template: `
    <div style="display: flex; flex-direction: column; gap: 1.5rem; padding: 1rem;">
      <div>
        <h3>Border Radius</h3>
        <div style="display: flex; gap: 1.5rem; flex-wrap: wrap;">
          <div style="text-align: center;">
            <div style="width: 60px; height: 60px; background: var(--color-bg-tertiary); border: 1px solid var(--color-border); border-radius: var(--radius-sm);"></div>
            <code>--radius-sm</code>
          </div>
          <div style="text-align: center;">
            <div style="width: 60px; height: 60px; background: var(--color-bg-tertiary); border: 1px solid var(--color-border); border-radius: var(--radius-md);"></div>
            <code>--radius-md</code>
          </div>
          <div style="text-align: center;">
            <div style="width: 60px; height: 60px; background: var(--color-bg-tertiary); border: 1px solid var(--color-border); border-radius: var(--radius-lg);"></div>
            <code>--radius-lg</code>
          </div>
          <div style="text-align: center;">
            <div style="width: 60px; height: 60px; background: var(--color-bg-tertiary); border: 1px solid var(--color-border); border-radius: var(--radius-full);"></div>
            <code>--radius-full</code>
          </div>
        </div>
      </div>
    </div>

    <style>
      h3 { margin-bottom: 1rem; color: var(--color-text); }
      code { display: block; font-size: 0.75rem; margin-top: 0.5rem; color: var(--color-text-muted); }
    </style>
  `,
});

export const ThemeComparison = () => ({
  template: `
    <div style="display: flex; flex-direction: column; gap: 2rem; padding: 1rem;">
      <div>
        <h3>Theme Comparison</h3>
        <p style="color: var(--color-text-muted);">Use the theme toolbar above to switch between themes.</p>
        
        <div style="margin-top: 1rem; padding: 1rem; background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: var(--radius-md);">
          <h4>Current Theme Sample</h4>
          <p>This panel demonstrates the current theme's colors.</p>
          <button style="background: var(--color-bg-tertiary); color: var(--color-text); border: var(--border-default); padding: var(--space-2) var(--space-4); border-radius: var(--radius-sm); cursor: pointer;">
            Sample Button
          </button>
        </div>
      </div>

      <div>
        <h4>Theme Characteristics</h4>
        <ul>
          <li><strong>Green:</strong> Terminal aesthetic, CRT effects enabled</li>
          <li><strong>Amber:</strong> Warm alternative terminal, CRT effects enabled</li>
          <li><strong>High Contrast:</strong> Maximum readability, CRT effects disabled</li>
          <li><strong>Enterprise:</strong> Professional admin look, CRT effects disabled</li>
        </ul>
      </div>
    </div>

    <style>
      h3, h4 { color: var(--color-text); margin-bottom: 0.5rem; }
      code { color: var(--color-text-muted); }
      li { margin-bottom: 0.25rem; color: var(--color-text-document); }
    </style>
  `,
  parameters: {
    backgrounds: {
      default: 'green',
    },
  },
});
