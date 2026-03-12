import { describe, expect, it, vi } from 'vitest';

import IncidentResponseView from '$lib/game/components/IncidentResponseView.svelte';
import type { IncidentResponseData } from '$lib/game/components/incident-response';

import { render } from '../../../__tests__/helpers/render';

const createMockData = (overrides: Partial<IncidentResponseData> = {}): IncidentResponseData => ({
  incidentId: 'INC-001',
  title: 'PHISHING CAMPAIGN DETECTED',
  type: 'phishing',
  severity: 'high',
  status: 'open',
  detectedAt: '2024-01-15T10:00:00Z',
  detectedDay: 14,
  affectedSystems: ['email-gateway-1', 'user-workstation-3'],
  currentFunds: 5000,
  currentBandwidth: 100,
  currentRackSpace: 20,
  currentTrust: 85.5,
  hasActiveRansom: false,
  evidenceLog: [
    {
      id: 'ev-1',
      timestamp: '2024-01-15T10:00:00Z',
      day: 14,
      eventType: 'detection',
      affectedSystem: 'email-gateway-1',
      severity: 'high',
      description: 'Suspicious email detected from external sender',
      rawLogData: [
        '2024-01-15 10:00:01 [EMAIL-GW] Suspicious sender: support@company-updates.net',
        '2024-01-15 10:00:02 [EMAIL-GW] Domain similarity: 0.87 to legitimate domain',
        '2024-01-15 10:00:03 [EMAIL-GW] Attachment detected: invoice_final.pdf.exe',
      ],
    },
    {
      id: 'ev-2',
      timestamp: '2024-01-15T10:05:00Z',
      day: 14,
      eventType: 'breach',
      affectedSystem: 'user-workstation-3',
      severity: 'critical',
      description: 'User opened malicious attachment',
      rawLogData: [
        '2024-01-15 10:05:00 [EDR] Process spawned: cmd.exe',
        '2024-01-15 10:05:01 [EDR] Network connection: 192.168.1.105 -> 45.33.xxx.xxx',
        '2024-01-15 10:05:02 [EDR] Credential dump attempt detected',
      ],
    },
    {
      id: 'ev-3',
      timestamp: '2024-01-15T10:10:00Z',
      day: 14,
      eventType: 'containment',
      affectedSystem: 'user-workstation-3',
      severity: 'medium',
      description: 'Workstation isolated from network',
      rawLogData: [
        '2024-01-15 10:10:00 [SOAR] Executing containment playbook',
        '2024-01-15 10:10:01 [SOAR] Network isolation: enabled',
        '2024-01-15 10:10:02 [SOAR] User notified: jsmith@company.com',
      ],
    },
  ],
  containmentActions: [
    {
      id: 'isolate-1',
      type: 'isolate',
      name: 'ISOLATE',
      description: 'Disconnect affected systems from the network',
      costCredits: 500,
      riskLevel: 'low',
      expectedOutcome: 'Reduces breach spread by 60%',
    },
    {
      id: 'lockdown-1',
      type: 'lockdown',
      name: 'LOCKDOWN',
      description: 'Restrict access to compromised accounts',
      costCredits: 300,
      riskLevel: 'medium',
      expectedOutcome: 'Prevents lateral movement',
      affectsTrust: true,
      trustImpact: -5,
    },
    {
      id: 'patch-1',
      type: 'patch',
      name: 'PATCH',
      description: 'Apply emergency security patches',
      costCredits: 800,
      riskLevel: 'medium',
      expectedOutcome: 'Closes vulnerability vectors',
      requiresBandwidth: true,
      bandwidthCost: 20,
    },
  ],
  recoveryActions: [
    {
      id: 'restore-1',
      type: 'restore',
      name: 'RESTORE',
      description: 'Recover systems from backup',
      costCredits: 1000,
      successProbability: 0.85,
      timeRequired: 1,
      requiresRackSpace: true,
      rackSpaceCost: 5,
    },
    {
      id: 'investigate-1',
      type: 'investigate',
      name: 'INVESTIGATE',
      description: 'Gather forensic evidence',
      costCredits: 200,
      successProbability: 0.95,
      timeRequired: 2,
    },
  ],
  availableResponseActions: ['deny_email', 'quarantine_data', 'forensic_scan'],
  ...overrides,
});

describe('IncidentResponseView', () => {
  it('renders incident response title', () => {
    const { container } = render(IncidentResponseView, {
      props: { data: createMockData() },
    });

    expect(container.textContent).toContain('INCIDENT RESPONSE');
  });

  it('renders incident details', () => {
    const { container } = render(IncidentResponseView, {
      props: { data: createMockData() },
    });

    expect(container.textContent).toContain('INCIDENT #INC-001');
    expect(container.textContent).toContain('PHISHING CAMPAIGN DETECTED');
    expect(container.textContent).toContain('[HIGH]');
    expect(container.textContent).toContain('[OPEN]');
  });

  it('renders player resources', () => {
    const { container } = render(IncidentResponseView, {
      props: { data: createMockData() },
    });

    expect(container.textContent).toContain('CR: 5,000');
    expect(container.textContent).toContain('BW: 100 Mbps');
    expect(container.textContent).toContain('RACK: 20 U');
    expect(container.textContent).toContain('TRUST: 85.5%');
  });

  it('renders evidence log section', () => {
    const { container } = render(IncidentResponseView, {
      props: { data: createMockData() },
    });

    expect(container.textContent).toContain('EVIDENCE LOG');
  });

  it('renders evidence entries with expandable details', async () => {
    const { container } = render(IncidentResponseView, {
      props: { data: createMockData() },
    });

    const evidenceHeaders = container.querySelectorAll('.incident-response__evidence-header-row');
    expect(evidenceHeaders.length).toBe(3);

    const firstHeader = evidenceHeaders[0] as HTMLButtonElement;
    firstHeader.click();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const details = container.querySelector('.incident-response__evidence-details');
    expect(details?.textContent).toContain('RAW LOG DATA');
  });

  it('filters evidence by event type', async () => {
    const { container } = render(IncidentResponseView, {
      props: { data: createMockData() },
    });

    const filterSelect = container.querySelector('.incident-response__filter') as HTMLSelectElement;
    if (filterSelect) {
      filterSelect.value = 'breach';
      filterSelect.dispatchEvent(new Event('change'));
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    const evidenceItems = container.querySelectorAll('.incident-response__evidence-item');
    expect(evidenceItems.length).toBeGreaterThanOrEqual(1);
  });

  it('searches evidence entries', async () => {
    const { container } = render(IncidentResponseView, {
      props: { data: createMockData() },
    });

    const searchInput = container.querySelector('.incident-response__search') as HTMLInputElement;
    if (searchInput) {
      searchInput.value = 'cmd.exe';
      searchInput.dispatchEvent(new Event('input'));
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    const evidenceItems = container.querySelectorAll('.incident-response__evidence-item');
    expect(evidenceItems.length).toBeGreaterThanOrEqual(1);
  });

  it('renders containment actions section', () => {
    const { container } = render(IncidentResponseView, {
      props: { data: createMockData() },
    });

    expect(container.textContent).toContain('CONTAINMENT ACTIONS');
    expect(container.textContent).toContain('ISOLATE');
    expect(container.textContent).toContain('LOCKDOWN');
    expect(container.textContent).toContain('PATCH');
  });

  it('renders recovery actions section', () => {
    const { container } = render(IncidentResponseView, {
      props: { data: createMockData() },
    });

    expect(container.textContent).toContain('RECOVERY ACTIONS');
    expect(container.textContent).toContain('RESTORE');
    expect(container.textContent).toContain('INVESTIGATE');
  });

  it('disables actions when insufficient resources', () => {
    const { container } = render(IncidentResponseView, {
      props: {
        data: createMockData({
          currentFunds: 0,
          currentBandwidth: 0,
          currentRackSpace: 0,
        }),
      },
    });

    const disabledCards = container.querySelectorAll('.incident-response__action-card--disabled');
    expect(disabledCards.length).toBeGreaterThan(0);
  });

  it('calls onExecuteContainment when containment action is clicked', async () => {
    const onExecuteContainment = vi.fn();
    const { container } = render(IncidentResponseView, {
      props: {
        data: createMockData(),
        onExecuteContainment,
      },
    });

    const isolateButton = Array.from(
      container.querySelectorAll('.incident-response__action-card'),
    ).find((btn) => btn.textContent?.includes('ISOLATE'));

    if (isolateButton) {
      (isolateButton as HTMLButtonElement).click();
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(onExecuteContainment).toHaveBeenCalled();
  });

  it('calls onExecuteRecovery when recovery action is clicked', async () => {
    const onExecuteRecovery = vi.fn();
    const { container } = render(IncidentResponseView, {
      props: {
        data: createMockData(),
        onExecuteRecovery,
      },
    });

    const restoreButton = Array.from(
      container.querySelectorAll('.incident-response__action-card'),
    ).find((btn) => btn.textContent?.includes('RESTORE'));

    if (restoreButton) {
      (restoreButton as HTMLButtonElement).click();
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(onExecuteRecovery).toHaveBeenCalled();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    const { container } = render(IncidentResponseView, {
      props: {
        data: createMockData(),
        onClose,
      },
    });

    const closeButton = container.querySelector(
      '.incident-response__header button',
    ) as HTMLButtonElement;

    if (closeButton) {
      closeButton.click();
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(onClose).toHaveBeenCalled();
  });

  it('is keyboard navigable', () => {
    const { container } = render(IncidentResponseView, {
      props: { data: createMockData() },
    });

    const region = container.querySelector('.incident-response');
    expect(region?.getAttribute('tabindex')).toBe('0');
  });

  it('displays keyboard hints in footer', () => {
    const { container } = render(IncidentResponseView, {
      props: { data: createMockData() },
    });

    expect(container.textContent).toContain('Navigate');
    expect(container.textContent).toContain('Execute Action');
    expect(container.textContent).toContain('Close');
  });

  it('shows empty state when no evidence matches filter', async () => {
    const { container } = render(IncidentResponseView, {
      props: { data: createMockData() },
    });

    const searchInput = container.querySelector('.incident-response__search') as HTMLInputElement;
    if (searchInput) {
      searchInput.value = 'nonexistent-search-term-12345';
      searchInput.dispatchEvent(new Event('input'));
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(container.textContent).toContain('No evidence entries found');
  });

  it('displays action costs correctly', () => {
    const { container } = render(IncidentResponseView, {
      props: { data: createMockData() },
    });

    expect(container.textContent).toContain('Cost: 500 CR');
    expect(container.textContent).toContain('Cost: 1,000 CR');
    expect(container.textContent).toContain('Time: 1 day(s)');
    expect(container.textContent).toContain('Time: 2 day(s)');
  });

  it('displays success probability for recovery actions', () => {
    const { container } = render(IncidentResponseView, {
      props: { data: createMockData() },
    });

    expect(container.textContent).toContain('85% SUCCESS');
    expect(container.textContent).toContain('95% SUCCESS');
  });

  it('displays risk levels for containment actions', () => {
    const { container } = render(IncidentResponseView, {
      props: { data: createMockData() },
    });

    expect(container.textContent).toContain('[LOW RISK]');
    expect(container.textContent).toContain('[MEDIUM RISK]');
  });
});
