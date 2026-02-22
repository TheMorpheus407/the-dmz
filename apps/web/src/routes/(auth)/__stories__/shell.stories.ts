import type { Meta, StoryObj } from '@storybook/svelte';

const meta: Meta = {
  title: 'Shells/Auth Shell',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Neutral authentication shell with centered card layout. Used for login, register, and other auth-related pages. Features minimal, focused design.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    template: `
      <section class="surface surface-auth" data-surface="auth" style="min-height: 400px; display: flex; align-items: center; justify-content: center; padding: var(--space-4); background: linear-gradient(180deg, var(--color-bg) 0%, var(--color-surface) 100%);">
        <div style="width: 100%; max-width: 420px;">
          <header style="text-align: center; margin-bottom: var(--space-6);">
            <h1 style="font-family: var(--font-ui); font-size: var(--text-2xl); font-weight: 700; color: var(--color-text); margin: 0 0 var(--space-1) 0;">The DMZ</h1>
            <p style="font-family: var(--font-ui); font-size: var(--text-sm); color: var(--color-text-muted); margin: 0;">Archive Gate System</p>
          </header>
          <div style="background: var(--color-surface); border: var(--border-default); border-radius: var(--radius-md); padding: var(--space-6);">
            <span style="color: var(--color-text-muted); font-family: var(--font-ui);">Auth Form Content</span>
          </div>
          <footer style="text-align: center; margin-top: var(--space-4);">
            <p style="font-family: var(--font-ui); font-size: var(--text-xs); color: var(--color-text-muted); margin: 0;">Secure access terminal</p>
          </footer>
        </div>
      </section>
    `,
  }),
};

export const Wide: Story = {
  render: () => ({
    template: `
      <section class="surface surface-auth" data-surface="auth" style="min-height: 400px; display: flex; align-items: center; justify-content: center; padding: var(--space-4); background: linear-gradient(180deg, var(--color-bg) 0%, var(--color-surface) 100%);">
        <div style="width: 100%; max-width: 480px;">
          <header style="text-align: center; margin-bottom: var(--space-6);">
            <h1 style="font-family: var(--font-ui); font-size: var(--text-3xl); font-weight: 700; color: var(--color-text); margin: 0 0 var(--space-1) 0;">The DMZ</h1>
            <p style="font-family: var(--font-ui); font-size: var(--text-sm); color: var(--color-text-muted); margin: 0;">Archive Gate System</p>
          </header>
          <div style="background: var(--color-surface); border: var(--border-default); border-radius: var(--radius-md); padding: var(--space-8);">
            <span style="color: var(--color-text-muted); font-family: var(--font-ui);">Wide Auth Form (Tablet+)</span>
          </div>
          <footer style="text-align: center; margin-top: var(--space-4);">
            <p style="font-family: var(--font-ui); font-size: var(--text-xs); color: var(--color-text-muted); margin: 0;">Secure access terminal</p>
          </footer>
        </div>
      </section>
    `,
  }),
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
};
