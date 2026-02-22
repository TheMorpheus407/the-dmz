import type { Meta, StoryObj } from '@storybook/svelte';

const meta: Meta = {
  title: 'Shells/Admin Shell',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Enterprise-oriented admin shell with sidebar navigation, header, and main content area. Clean, professional layout for administrative interfaces.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    template: `
      <section class="surface surface-admin" data-surface="admin" style="min-height: 400px; display: flex; flex-direction: column;">
        <header style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-3) var(--space-4); border-bottom: var(--border-default); background: var(--color-surface);">
          <h1 style="font-family: var(--font-ui); font-size: var(--text-lg); font-weight: 600; color: var(--color-text); margin: 0;">Admin Console</h1>
          <button style="padding: var(--space-2) var(--space-3); background: transparent; border: 1px solid var(--color-border); border-radius: var(--radius-sm); color: var(--color-text-muted); font-family: var(--font-ui); font-size: var(--text-sm); cursor: pointer;">Logout</button>
        </header>
        <div style="display: grid; grid-template-columns: 240px 1fr; flex: 1;">
          <aside style="padding: var(--space-4); border-right: var(--border-default); background: var(--color-bg);">
            <nav style="display: flex; flex-direction: column; gap: var(--space-1);">
              <a href="#" style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); color: var(--color-text); background: var(--color-bg-tertiary); border-left: 2px solid var(--color-accent); border-radius: var(--radius-sm); text-decoration: none; font-family: var(--font-ui); font-size: var(--text-sm);">
                <span style="width: 20px; text-align: center;">◉</span>
                <span>Dashboard</span>
              </a>
              <a href="#" style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); color: var(--color-text-muted); border-radius: var(--radius-sm); text-decoration: none; font-family: var(--font-ui); font-size: var(--text-sm);">
                <span style="width: 20px; text-align: center;">◯</span>
                <span>Users</span>
              </a>
              <a href="#" style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); color: var(--color-text-muted); border-radius: var(--radius-sm); text-decoration: none; font-family: var(--font-ui); font-size: var(--text-sm);">
                <span style="width: 20px; text-align: center;">◎</span>
                <span>Campaigns</span>
              </a>
              <a href="#" style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); color: var(--color-text-muted); border-radius: var(--radius-sm); text-decoration: none; font-family: var(--font-ui); font-size: var(--text-sm);">
                <span style="width: 20px; text-align: center;">◈</span>
                <span>Reports</span>
              </a>
              <a href="#" style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); color: var(--color-text-muted); border-radius: var(--radius-sm); text-decoration: none; font-family: var(--font-ui); font-size: var(--text-sm);">
                <span style="width: 20px; text-align: center;">▣</span>
                <span>Audit</span>
              </a>
              <a href="#" style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); color: var(--color-text-muted); border-radius: var(--radius-sm); text-decoration: none; font-family: var(--font-ui); font-size: var(--text-sm);">
                <span style="width: 20px; text-align: center;">⚙</span>
                <span>Settings</span>
              </a>
            </nav>
          </aside>
          <main style="padding: var(--space-4); background: var(--color-bg);">
            <span style="color: var(--color-text-muted); font-family: var(--font-ui);">Main Content Area</span>
          </main>
        </div>
      </section>
    `,
  }),
};

export const Mobile: Story = {
  render: () => ({
    template: `
      <section class="surface surface-admin" data-surface="admin" style="min-height: 500px; display: flex; flex-direction: column;">
        <header style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-3) var(--space-4); border-bottom: var(--border-default); background: var(--color-surface);">
          <h1 style="font-family: var(--font-ui); font-size: var(--text-base); font-weight: 600; color: var(--color-text); margin: 0;">Admin Console</h1>
          <button style="padding: var(--space-2); background: transparent; border: none; color: var(--color-text-muted); font-size: var(--text-lg); cursor: pointer;">☰</button>
        </header>
        <main style="padding: var(--space-2); flex: 1; background: var(--color-bg);">
          <span style="color: var(--color-text-muted); font-family: var(--font-ui);">Main Content Area (Mobile)</span>
        </main>
      </section>
    `,
  }),
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
  },
};
