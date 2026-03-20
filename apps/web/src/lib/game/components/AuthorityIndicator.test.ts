import { describe, expect, it } from 'vitest';

import { render } from '../../../__tests__/helpers/render';

import AuthorityIndicator from './AuthorityIndicator.svelte';

describe('AuthorityIndicator', () => {
  it('renders nothing when isAuthority is false', () => {
    const { container } = render(AuthorityIndicator, {
      props: {
        isAuthority: false,
      },
    });

    expect(container.textContent).toBe('');
  });

  it('renders authority indicator when isAuthority is true', () => {
    const { container } = render(AuthorityIndicator, {
      props: {
        isAuthority: true,
        playerName: 'Test Player',
      },
    });

    expect(container.textContent).toContain('AUTHORITY');
    expect(container.textContent).toContain('Test Player');
  });

  it('shows current player indicator when isCurrentPlayer is true', () => {
    const { container } = render(AuthorityIndicator, {
      props: {
        isAuthority: true,
        playerName: 'You',
        isCurrentPlayer: true,
      },
    });

    expect(container.textContent).toContain('You');
  });

  it('renders in compact mode', () => {
    const { container } = render(AuthorityIndicator, {
      props: {
        isAuthority: true,
        compact: true,
      },
    });

    expect(container.textContent).toContain('*');
    expect(container.textContent).not.toContain('AUTHORITY');
  });
});
