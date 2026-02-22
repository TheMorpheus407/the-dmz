import Tabs from '../Tabs.svelte';

import type { Meta, StoryObj } from '@storybook/svelte';

const meta: Meta<typeof Tabs> = {
  title: 'Primitives/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  argTypes: {
    activeTab: {
      control: { type: 'text' },
    },
    ariaLabel: {
      control: { type: 'text' },
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A tabbed navigation component with full keyboard support (Arrow keys, Home, End). Implements ARIA tab pattern.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    activeTab: 'overview',
    ariaLabel: 'Product tabs',
  },
};

export const WithDisabledTab: Story = {
  args: {
    activeTab: 'active',
    ariaLabel: 'Tabs with disabled example',
  },
};

export const KeyboardNavigation: Story = {
  args: {
    activeTab: 'step1',
    ariaLabel: 'Keyboard navigation demo',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates full keyboard navigation support. Use arrow keys, Home, and End to navigate between tabs.',
      },
    },
  },
};

export const LongContent: Story = {
  args: {
    activeTab: 'details',
    ariaLabel: 'Long content example',
  },
};
