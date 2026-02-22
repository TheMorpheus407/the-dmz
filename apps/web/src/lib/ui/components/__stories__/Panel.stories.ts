import Panel from '../Panel.svelte';

import type { Meta, StoryObj } from '@storybook/svelte';

const meta: Meta<typeof Panel> = {
  title: 'Primitives/Panel',
  component: Panel,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'elevated', 'outlined', 'highlight'],
    },
    role: {
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
          'A container component for grouping related content with multiple visual variants.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'default',
    role: 'region',
  },
};

export const Elevated: Story = {
  args: {
    variant: 'elevated',
    role: 'region',
  },
};

export const Outlined: Story = {
  args: {
    variant: 'outlined',
    role: 'region',
  },
};

export const Highlight: Story = {
  args: {
    variant: 'highlight',
    role: 'region',
  },
};
