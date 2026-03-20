import { describe, expect, it, vi } from 'vitest';

import { render, fireEvent } from '../../../__tests__/helpers/render';

import CoopDecisionQueue from './CoopDecisionQueue.svelte';

describe('CoopDecisionQueue', () => {
  const mockOnConfirm = vi.fn();
  const mockOnOverride = vi.fn();

  const mockProposals = [
    {
      proposalId: 'proposal-1',
      sessionId: 'session-1',
      playerId: 'player-1',
      role: 'triage_lead' as const,
      emailId: 'email-1',
      action: 'approve' as const,
      status: 'proposed' as const,
      authorityAction: null,
      conflictFlag: false,
      conflictReason: null,
      rationale: null,
      proposedAt: new Date().toISOString(),
      resolvedAt: null,
      playerName: 'Player One',
    },
    {
      proposalId: 'proposal-2',
      sessionId: 'session-1',
      playerId: 'player-2',
      role: 'verification_lead' as const,
      emailId: 'email-2',
      action: 'deny' as const,
      status: 'proposed' as const,
      authorityAction: null,
      conflictFlag: false,
      conflictReason: null,
      rationale: null,
      proposedAt: new Date().toISOString(),
      resolvedAt: null,
      playerName: 'Player Two',
    },
  ];

  it('renders pending proposals', () => {
    const { container } = render(CoopDecisionQueue, {
      props: {
        proposals: mockProposals,
        currentPlayerId: 'player-1',
        isAuthority: false,
      },
    });

    expect(container.textContent).toContain('APPROVE');
    expect(container.textContent).toContain('DENY');
  });

  it('shows empty state when no proposals', () => {
    const { container } = render(CoopDecisionQueue, {
      props: {
        proposals: [],
        currentPlayerId: 'player-1',
        isAuthority: false,
      },
    });

    expect(container.textContent).toContain('No pending decisions');
  });

  it('shows confirm and override buttons for authority when not own proposal', () => {
    const proposal2 = mockProposals[1]!;
    const { container } = render(CoopDecisionQueue, {
      props: {
        proposals: [proposal2],
        currentPlayerId: 'player-1',
        isAuthority: true,
        onConfirm: mockOnConfirm,
        onOverride: mockOnOverride,
      },
    });

    expect(container.textContent).toContain('CONFIRM');
    expect(container.textContent).toContain('OVERRIDE');
  });

  it('does not show authority buttons for own proposal', () => {
    const proposal1 = mockProposals[0]!;
    const { container } = render(CoopDecisionQueue, {
      props: {
        proposals: [proposal1],
        currentPlayerId: 'player-1',
        isAuthority: true,
        onConfirm: mockOnConfirm,
        onOverride: mockOnOverride,
      },
    });

    expect(container.textContent).not.toContain('CONFIRM');
    expect(container.textContent).not.toContain('OVERRIDE');
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const proposal2 = mockProposals[1]!;
    const { container } = render(CoopDecisionQueue, {
      props: {
        proposals: [proposal2],
        currentPlayerId: 'player-1',
        isAuthority: true,
        onConfirm: mockOnConfirm,
        onOverride: mockOnOverride,
      },
    });

    const confirmButton = Array.from(container.querySelectorAll('button')).find(
      (btn) => btn.textContent === 'CONFIRM',
    );

    if (confirmButton) {
      await fireEvent.click(confirmButton);
    }

    expect(mockOnConfirm).toHaveBeenCalledWith('proposal-2');
  });
});
