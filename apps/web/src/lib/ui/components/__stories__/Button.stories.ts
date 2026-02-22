import Button from '../Button.svelte';

import type { Meta, StoryObj } from '@storybook/svelte';

const meta: Meta<typeof Button> = {
  title: 'Primitives/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'danger', 'ghost'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    disabled: {
      control: { type: 'boolean' },
    },
    type: {
      control: { type: 'select' },
      options: ['button', 'submit', 'reset'],
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A versatile button component with multiple variants and sizes. Supports keyboard navigation and follows accessibility guidelines.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    disabled: false,
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    size: 'md',
    disabled: false,
  },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    size: 'md',
    disabled: false,
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    size: 'md',
    disabled: false,
  },
};

export const Small: Story = {
  args: {
    variant: 'primary',
    size: 'sm',
    disabled: false,
  },
};

export const Large: Story = {
  args: {
    variant: 'primary',
    size: 'lg',
    disabled: false,
  },
};

export const Disabled: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    disabled: true,
  },
};
