import { describe, expect, it } from 'vitest';

import { render } from '../../../__tests__/helpers/render';

import RoleHeaderBadge from './RoleHeaderBadge.svelte';

describe('RoleHeaderBadge', () => {
  it('renders triage lead badge with correct label', () => {
    const { container } = render(RoleHeaderBadge, {
      props: {
        role: 'triage_lead',
        isAuthority: false,
        showLabel: true,
      },
    });

    expect(container.textContent).toContain('TRIAGE LEAD');
  });

  it('renders verification lead badge with correct label', () => {
    const { container } = render(RoleHeaderBadge, {
      props: {
        role: 'verification_lead',
        isAuthority: false,
        showLabel: true,
      },
    });

    expect(container.textContent).toContain('VERIFICATION LEAD');
  });

  it('shows authority indicator when isAuthority is true', () => {
    const { container } = render(RoleHeaderBadge, {
      props: {
        role: 'triage_lead',
        isAuthority: true,
        showLabel: true,
      },
    });

    expect(container.textContent).toContain('*');
  });

  it('hides label when showLabel is false', () => {
    const { container } = render(RoleHeaderBadge, {
      props: {
        role: 'triage_lead',
        isAuthority: false,
        showLabel: false,
      },
    });

    expect(container.textContent).not.toContain('TRIAGE LEAD');
  });
});
