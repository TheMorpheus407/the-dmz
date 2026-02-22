import { describe, expect, it, vi } from 'vitest';

import Drawer from '$lib/ui/components/Drawer.svelte';

import { render, fireEvent } from '../helpers/render';

/* eslint-disable @typescript-eslint/no-explicit-any */
describe('Drawer', () => {
  it('renders nothing when closed', () => {
    const { container } = render(Drawer, {
      props: { open: false, children: () => '' as any },
    });

    const backdrop = container.querySelector('.drawer-backdrop');
    expect(backdrop).toBeFalsy();
  });

  it('renders when open', () => {
    const { container } = render(Drawer, {
      props: { open: true, children: () => '' as any },
    });

    const backdrop = container.querySelector('.drawer-backdrop');
    expect(backdrop).toBeTruthy();

    const drawer = container.querySelector('.drawer');
    expect(drawer).toBeTruthy();
  });

  it('renders with correct position class', () => {
    const { container } = render(Drawer, {
      props: { open: true, position: 'left', children: () => '' as any },
    });

    const drawer = container.querySelector('.drawer');
    expect(drawer?.classList.contains('drawer--left')).toBe(true);
  });

  it('renders right position by default', () => {
    const { container } = render(Drawer, {
      props: { open: true, children: () => '' as any },
    });

    const drawer = container.querySelector('.drawer');
    expect(drawer?.classList.contains('drawer--right')).toBe(true);
  });

  it('has close button', () => {
    const { container } = render(Drawer, {
      props: { open: true, children: () => '' as any },
    });

    const closeButton = container.querySelector('.drawer__close');
    expect(closeButton).toBeTruthy();
    expect(closeButton?.getAttribute('aria-label')).toBe('Close drawer');
  });

  it('closes on close button click', async () => {
    const onClose = vi.fn();

    const { container } = render(Drawer, {
      props: { open: true, onclose: onClose, children: () => '' as any },
    });

    const closeButton = container.querySelector('.drawer__close');
    expect(closeButton).toBeTruthy();
    if (closeButton) {
      await fireEvent.click(closeButton);
    }

    expect(onClose).toHaveBeenCalled();
  });

  it('applies aria-label', () => {
    const { container } = render(Drawer, {
      props: { open: true, ariaLabel: 'Custom Drawer', children: () => '' as any },
    });

    const backdrop = container.querySelector('.drawer-backdrop');
    expect(backdrop?.getAttribute('aria-label')).toBe('Custom Drawer');
  });

  it('applies role dialog', () => {
    const { container } = render(Drawer, {
      props: { open: true, children: () => '' as any },
    });

    const backdrop = container.querySelector('.drawer-backdrop');
    expect(backdrop?.getAttribute('role')).toBe('dialog');
  });

  it('applies aria-modal', () => {
    const { container } = render(Drawer, {
      props: { open: true, children: () => '' as any },
    });

    const backdrop = container.querySelector('.drawer-backdrop');
    expect(backdrop?.getAttribute('aria-modal')).toBe('true');
  });
});
