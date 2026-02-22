import type { Meta, StoryObj } from '@storybook/svelte';

const meta: Meta = {
  title: 'Shells/Public Shell',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Neutral public-facing shell with header, main content area, and footer. Used for landing pages, documentation, and public-facing content.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    template: `
      <section class="surface surface-public" data-surface="public" style="min-height: 400px; display: flex; flex-direction: column;">
        <header style="padding: var(--space-3) var(--space-4); border-bottom: var(--border-default); background: var(--color-surface);">
          <div style="display: flex; align-items: center; justify-content: space-between; max-width: 1200px; margin: 0 auto; width: 100%;">
            <a href="#" style="font-family: var(--font-ui); font-size: var(--text-lg); font-weight: 700; color: var(--color-text); text-decoration: none;">The DMZ</a>
            <nav style="display: flex; align-items: center; gap: var(--space-4);">
              <a href="#" style="font-family: var(--font-ui); font-size: var(--text-sm); color: var(--color-text-muted); text-decoration: none;">About</a>
              <a href="#" style="font-family: var(--font-ui); font-size: var(--text-sm); color: var(--color-text-muted); text-decoration: none;">Docs</a>
              <button style="padding: var(--space-2) var(--space-3); background: var(--color-bg-tertiary); border: var(--border-default); border-radius: var(--radius-sm); color: var(--color-text); font-family: var(--font-ui); font-size: var(--text-sm); cursor: pointer;">Sign In</button>
            </nav>
          </div>
        </header>
        <main style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: var(--space-6);">
          <div style="width: 100%; max-width: 800px;">
            <span style="color: var(--color-text-muted); font-family: var(--font-ui);">Main Content Area</span>
          </div>
        </main>
        <footer style="padding: var(--space-4); border-top: var(--border-default); background: var(--color-surface);">
          <div style="display: flex; align-items: center; justify-content: space-between; max-width: 1200px; margin: 0 auto; width: 100%;">
            <p style="font-family: var(--font-ui); font-size: var(--text-xs); color: var(--color-text-muted); margin: 0;">© 2026 The DMZ — Archive Gate System</p>
            <nav style="display: flex; gap: var(--space-4);">
              <a href="#" style="font-family: var(--font-ui); font-size: var(--text-xs); color: var(--color-text-muted); text-decoration: none;">Privacy</a>
              <a href="#" style="font-family: var(--font-ui); font-size: var(--text-xs); color: var(--color-text-muted); text-decoration: none;">Terms</a>
            </nav>
          </div>
        </footer>
      </section>
    `,
  }),
};

export const Mobile: Story = {
  render: () => ({
    template: `
      <section class="surface surface-public" data-surface="public" style="min-height: 500px; display: flex; flex-direction: column;">
        <header style="padding: var(--space-3) var(--space-4); border-bottom: var(--border-default); background: var(--color-surface);">
          <div style="display: flex; align-items: center; justify-content: space-between; max-width: 1200px; margin: 0 auto; width: 100%;">
            <a href="#" style="font-family: var(--font-ui); font-size: var(--text-base); font-weight: 700; color: var(--color-text); text-decoration: none;">The DMZ</a>
            <button style="padding: var(--space-2); background: transparent; border: none; color: var(--color-text-muted); font-size: var(--text-lg); cursor: pointer;">☰</button>
          </div>
        </header>
        <main style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: var(--space-4);">
          <span style="color: var(--color-text-muted); font-family: var(--font-ui);">Main Content (Mobile)</span>
        </main>
        <footer style="padding: var(--space-4); border-top: var(--border-default); background: var(--color-surface);">
          <div style="display: flex; flex-direction: column; gap: var(--space-2); text-align: center;">
            <p style="font-family: var(--font-ui); font-size: var(--text-xs); color: var(--color-text-muted); margin: 0;">© 2026 The DMZ — Archive Gate System</p>
            <nav style="display: flex; gap: var(--space-4); justify-content: center;">
              <a href="#" style="font-family: var(--font-ui); font-size: var(--text-xs); color: var(--color-text-muted); text-decoration: none;">Privacy</a>
              <a href="#" style="font-family: var(--font-ui); font-size: var(--text-xs); color: var(--color-text-muted); text-decoration: none;">Terms</a>
            </nav>
          </div>
        </footer>
      </section>
    `,
  }),
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
  },
};
