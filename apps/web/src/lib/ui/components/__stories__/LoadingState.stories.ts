import LoadingState from '../LoadingState.svelte';

import type { Meta, StoryObj } from '@storybook/svelte';

const meta: Meta<typeof LoadingState> = {
  title: 'Primitives/LoadingState',
  component: LoadingState,
  tags: ['autodocs'],
  argTypes: {
    loading: {
      control: { type: 'boolean' },
    },
    variant: {
      control: { type: 'select' },
      options: ['spinner', 'dots', 'skeleton'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    message: {
      control: { type: 'text' },
    },
    label: {
      control: { type: 'text' },
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A loading indicator component with multiple variants (spinner, dots, skeleton) and sizes. Implements ARIA live regions for accessibility.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Spinner: Story = {
  args: {
    loading: true,
    variant: 'spinner',
    size: 'md',
    message: 'Loading...',
    label: 'Loading content',
  },
};

export const Dots: Story = {
  args: {
    loading: true,
    variant: 'dots',
    size: 'md',
    message: 'Loading...',
    label: 'Loading content',
  },
};

export const Skeleton: Story = {
  args: {
    loading: true,
    variant: 'skeleton',
    size: 'md',
    message: 'Loading content...',
    label: 'Loading content',
  },
};

export const Small: Story = {
  args: {
    loading: true,
    variant: 'spinner',
    size: 'sm',
    message: 'Loading...',
    label: 'Loading',
  },
};

export const Large: Story = {
  args: {
    loading: true,
    variant: 'spinner',
    size: 'lg',
    message: 'Loading...',
    label: 'Loading content',
  },
};

export const NoMessage: Story = {
  args: {
    loading: true,
    variant: 'spinner',
    size: 'md',
    message: '',
    label: 'Loading',
  },
};
