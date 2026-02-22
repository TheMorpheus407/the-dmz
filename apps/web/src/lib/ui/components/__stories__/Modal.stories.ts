import { fn } from '@storybook/test';

import Modal from '../Modal.svelte';

import type { Meta, StoryObj } from '@storybook/svelte';

const meta: Meta<typeof Modal> = {
  title: 'Primitives/Modal',
  component: Modal,
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: { type: 'boolean' },
    },
    title: {
      control: { type: 'text' },
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    closeOnEscape: {
      control: { type: 'boolean' },
    },
    closeOnOverlayClick: {
      control: { type: 'boolean' },
    },
    ariaDescribedBy: {
      control: { type: 'text' },
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A modal dialog component with focus trap, escape key handling, and overlay click to close. Implements ARIA dialog pattern.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: true,
    title: 'Modal Title',
    size: 'md',
    closeOnEscape: true,
    closeOnOverlayClick: true,
    onclose: fn(),
  },
};

export const Small: Story = {
  args: {
    open: true,
    title: 'Confirm Action',
    size: 'sm',
    closeOnEscape: true,
    closeOnOverlayClick: true,
  },
};

export const Large: Story = {
  args: {
    open: true,
    title: 'Detailed View',
    size: 'lg',
    closeOnEscape: true,
    closeOnOverlayClick: true,
  },
};

export const WithFooter: Story = {
  args: {
    open: true,
    title: 'Save Changes',
    size: 'md',
    closeOnEscape: true,
    closeOnOverlayClick: false,
  },
};

export const FocusTrap: Story = {
  args: {
    open: true,
    title: 'Focus Trap Demo',
    size: 'md',
    closeOnEscape: true,
    closeOnOverlayClick: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates focus trap - Tab cycles through focusable elements within the modal.',
      },
    },
  },
};

export const NoCloseOnOverlay: Story = {
  args: {
    open: true,
    title: 'Important Modal',
    size: 'md',
    closeOnEscape: true,
    closeOnOverlayClick: false,
  },
};
