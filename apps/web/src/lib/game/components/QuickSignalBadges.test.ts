import { describe, expect, it, vi, beforeEach } from 'vitest';

import { render, fireEvent } from '../../../__tests__/helpers/render';

import QuickSignalBadges from './QuickSignalBadges.svelte';

describe('QuickSignalBadges', () => {
  const mockOnSignal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders signal buttons', () => {
    const { container } = render(QuickSignalBadges, {
      props: {
        playerId: 'player-1',
        onSignal: mockOnSignal,
        disabled: false,
      },
    });

    expect(container.textContent).toContain('[OK]');
    expect(container.textContent).toContain('...');
    expect(container.textContent).toContain('[X]');
    expect(container.textContent).toContain('?');
    expect(container.textContent).toContain('!');
  });

  it('calls onSignal when a signal button is clicked', async () => {
    const { container } = render(QuickSignalBadges, {
      props: {
        playerId: 'player-1',
        onSignal: mockOnSignal,
        disabled: false,
      },
    });

    const buttons = container.querySelectorAll('.quick-signal-btn');
    const readyButton = Array.from(buttons).find(
      (btn) => btn.getAttribute('aria-label') === 'READY',
    );

    if (readyButton) {
      await fireEvent.click(readyButton);
    }

    expect(mockOnSignal).toHaveBeenCalledWith('ready');
  });

  it('disables buttons when disabled prop is true', () => {
    const { container } = render(QuickSignalBadges, {
      props: {
        playerId: 'player-1',
        onSignal: mockOnSignal,
        disabled: true,
      },
    });

    const buttons = container.querySelectorAll('.quick-signal-btn');
    expect(buttons.length).toBe(6);

    const firstButton = buttons[0];
    expect(firstButton).toBeTruthy();
    expect(firstButton!.classList.contains('quick-signal-btn--cooldown')).toBe(true);
  });
});
