import type { Meta, StoryObj } from '@storybook/svelte';

const meta: Meta = {
  title: 'Shells/Game Shell',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Terminal-oriented game shell with three-panel layout (Inbox, Document, Status). Features CRT effects and terminal aesthetic for the game route.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    component: {
      onMount() {},
    },
    template: `
      <section class="surface surface-game" data-surface="game" style="min-height: 400px; padding: var(--space-4);">
        <div class="shell-game" style="display: grid; grid-template-columns: 280px 1fr 300px; gap: var(--space-4); height: 100%;">
          <div class="shell-game__panel--inbox" style="background: var(--color-bg-secondary); border: var(--border-default); border-radius: var(--radius-md); padding: var(--space-4);">
            <span style="color: var(--color-text-muted); font-family: var(--font-ui);">Inbox Panel</span>
          </div>
          <div class="shell-game__panel--document" style="background: var(--color-bg-secondary); border: var(--border-default); border-radius: var(--radius-md); padding: var(--space-4);">
            <span style="color: var(--color-text-muted); font-family: var(--font-ui);">Document Panel (Content Area)</span>
          </div>
          <div class="shell-game__panel--status" style="background: var(--color-bg-secondary); border: var(--border-default); border-radius: var(--radius-md); padding: var(--space-4);">
            <span style="color: var(--color-text-muted); font-family: var(--font-ui);">Status Panel</span>
          </div>
        </div>
      </section>
    `,
  }),
};

export const Mobile: Story = {
  render: () => ({
    template: `
      <section class="surface surface-game" data-surface="game" style="min-height: 500px; padding: var(--space-2);">
        <div style="display: flex; flex-direction: column; gap: var(--space-2);">
          <div class="shell-game__panel--document shell-game__panel--active" style="background: var(--color-bg-secondary); border: var(--border-default); border-radius: var(--radius-md); padding: var(--space-4); flex: 1; min-height: 300px;">
            <span style="color: var(--color-text-muted); font-family: var(--font-ui);">Document Panel (Active)</span>
          </div>
        </div>
        <nav class="shell-game__mobile-nav" style="display: flex; position: fixed; bottom: 0; left: 0; right: 0; background: var(--color-surface); border-top: var(--border-default);" aria-label="Panel navigation">
          <button type="button" class="shell-game__mobile-tab" style="flex: 1; padding: var(--space-3); background: transparent; border: none; color: var(--color-text-muted); font-family: var(--font-ui);">Inbox</button>
          <button type="button" class="shell-game__mobile-tab shell-game__mobile-tab--active" style="flex: 1; padding: var(--space-3); background: transparent; border: none; color: var(--color-text); border-top: 2px solid var(--color-accent); font-family: var(--font-ui);">Document</button>
          <button type="button" class="shell-game__mobile-tab" style="flex: 1; padding: var(--space-3); background: transparent; border: none; color: var(--color-text-muted); font-family: var(--font-ui);">Status</button>
        </nav>
      </section>
    `,
  }),
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
  },
};
