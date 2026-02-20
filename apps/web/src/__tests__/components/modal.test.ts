import { describe, expect, it } from 'vitest';

import Modal from '$lib/ui/components/Modal.svelte';

import { render } from '../helpers/render';

/* eslint-disable @typescript-eslint/no-explicit-any */
describe('Modal', () => {
  it('renders modal when open is true', () => {
    const { container } = render(Modal, {
      props: { open: true, title: 'Test Modal', children: () => 'Modal content' as any },
    });

    expect(container.querySelector('[role="dialog"]')).toBeTruthy();
  });

  it('does not render when open is false', () => {
    const { container } = render(Modal, {
      props: { open: false, title: 'Test Modal', children: () => 'Content' as any },
    });

    expect(container.querySelector('[role="dialog"]')).toBeFalsy();
  });

  it('renders close button', () => {
    const { getByLabelText } = render(Modal, {
      props: { open: true, title: 'Modal', children: () => 'Content' as any },
    });

    expect(getByLabelText('Close modal')).toBeTruthy();
  });

  it('has role dialog and aria-modal', () => {
    const { container } = render(Modal, {
      props: { open: true, title: 'Modal', children: () => 'Content' as any },
    });

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('role')).toBe('dialog');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
  });

  it('has aria-labelledby referencing title', () => {
    const { container } = render(Modal, {
      props: { open: true, title: 'My Modal', children: () => 'Content' as any },
    });

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-labelledby')).toBe('modal-title');
  });

  it('has tabindex on dialog', () => {
    const { container } = render(Modal, {
      props: { open: true, title: 'Modal', children: () => 'Content' as any },
    });

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('tabindex')).toBe('-1');
  });
});
