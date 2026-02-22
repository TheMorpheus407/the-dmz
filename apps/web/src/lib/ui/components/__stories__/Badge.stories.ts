import Badge from '../Badge.svelte';

import type { Meta, StoryObj } from '@storybook/svelte';

const meta: Meta<typeof Badge> = {
  title: 'Primitives/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'success', 'warning', 'danger', 'info'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md'],
    },
    ariaLabel: {
      control: { type: 'text' },
    },
  },
  parameters: {
    docs: {
      description: {
        component: 'A small status indicator for labeling, categorization, or status display.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'default',
    size: 'md',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    size: 'md',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    size: 'md',
  },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    size: 'md',
  },
};

export const Info: Story = {
  args: {
    variant: 'info',
    size: 'md',
  },
};

export const Small: Story = {
  args: {
    variant: 'default',
    size: 'sm',
  },
};
