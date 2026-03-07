import { describe, expect, it } from 'vitest';

import type { ClientLease, FacilityState } from '@the-dmz/shared/types';
import ClientList from '$lib/game/components/ClientList.svelte';
import ResourceMeter from '$lib/game/components/ResourceMeter.svelte';
import FinancialSummary from '$lib/game/components/FinancialSummary.svelte';
import QuickActions from '$lib/game/components/QuickActions.svelte';
import DashboardHeader from '$lib/game/components/DashboardHeader.svelte';
import FacilityDashboard from '$lib/game/components/FacilityDashboard.svelte';

import { render } from '../../../__tests__/helpers/render';

const createMockClient = (overrides: Partial<ClientLease> = {}): ClientLease => ({
  clientId: 'client-1',
  clientName: 'Test Corp',
  organization: 'Test Organization',
  rackUnitsU: 10,
  powerKw: 5,
  coolingTons: 2,
  bandwidthMbps: 100,
  dailyRate: 500,
  leaseStartDay: 1,
  leaseEndDay: 30,
  isActive: true,
  burstProfile: 'steady',
  ...overrides,
});

const createMockFacility = (overrides: Partial<FacilityState> = {}): FacilityState => ({
  tier: 'outpost',
  capacities: {
    rackCapacityU: 100,
    powerCapacityKw: 50,
    coolingCapacityTons: 20,
    bandwidthCapacityMbps: 1000,
  },
  usage: {
    rackUsedU: 50,
    powerUsedKw: 25,
    coolingUsedTons: 10,
    bandwidthUsedMbps: 500,
  },
  clients: [],
  upgrades: [],
  maintenanceDebt: 0,
  facilityHealth: 100,
  operatingCostPerDay: 100,
  securityToolOpExPerDay: 50,
  attackSurfaceScore: 10,
  lastTickDay: 1,
  ...overrides,
});

describe('ResourceMeter', () => {
  it('renders with correct label', () => {
    const { container } = render(ResourceMeter, {
      props: {
        label: 'Rack Space',
        used: 50,
        total: 100,
        unit: 'U',
      },
    });

    expect(container.textContent).toContain('Rack Space');
  });

  it('displays usage correctly', () => {
    const { container } = render(ResourceMeter, {
      props: {
        label: 'Power',
        used: 25,
        total: 50,
        unit: 'kW',
      },
    });

    expect(container.textContent).toContain('25 / 50 kW');
    expect(container.textContent).toContain('50%');
  });

  it('backward compatible with capacity prop', () => {
    const { container } = render(ResourceMeter, {
      props: {
        label: 'Test',
        used: 50,
        capacity: 100,
        unit: 'U',
      },
    });

    expect(container.textContent).toContain('50%');
  });

  it('shows normal state at 60% (green)', () => {
    const { container } = render(ResourceMeter, {
      props: {
        label: 'Test',
        used: 60,
        total: 100,
        unit: 'U',
      },
    });

    const meter = container.querySelector('.resource-meter');
    expect(meter?.classList.contains('resource-meter--warning')).toBe(false);
    expect(meter?.classList.contains('resource-meter--critical')).toBe(false);
    expect(meter?.classList.contains('resource-meter--flashing')).toBe(false);
    expect(container.textContent).not.toContain('WARNING');
    expect(container.textContent).not.toContain('CRITICAL');
  });

  it('shows warning state at 61-80%', () => {
    const { container } = render(ResourceMeter, {
      props: {
        label: 'Cooling',
        used: 70,
        total: 100,
        unit: 'tons',
      },
    });

    expect(container.textContent).toContain('WARNING');
    expect(
      container.querySelector('.resource-meter')?.classList.contains('resource-meter--warning'),
    ).toBe(true);
  });

  it('shows critical state at 81-95%', () => {
    const { container } = render(ResourceMeter, {
      props: {
        label: 'Bandwidth',
        used: 90,
        total: 100,
        unit: 'Mbps',
      },
    });

    expect(container.textContent).toContain('CRITICAL');
    expect(
      container.querySelector('.resource-meter')?.classList.contains('resource-meter--critical'),
    ).toBe(true);
  });

  it('shows flashing state at 96-100%', () => {
    const { container } = render(ResourceMeter, {
      props: {
        label: 'Test',
        used: 98,
        total: 100,
        unit: 'U',
      },
    });

    expect(container.textContent).toContain('CRITICAL');
    const meter = container.querySelector('.resource-meter');
    expect(meter?.classList.contains('resource-meter--flashing')).toBe(true);
    expect(
      container
        .querySelector('.resource-meter__fill')
        ?.classList.contains('resource-meter__fill--flashing'),
    ).toBe(true);
  });

  it('hides values when showValues is false', () => {
    const { container } = render(ResourceMeter, {
      props: {
        label: 'Test',
        used: 50,
        total: 100,
        unit: 'U',
        showValues: false,
      },
    });

    expect(container.textContent).not.toContain('50 / 100 U');
  });

  it('disables animation when animated is false', () => {
    const { container } = render(ResourceMeter, {
      props: {
        label: 'Test',
        used: 50,
        total: 100,
        unit: 'U',
        animated: false,
      },
    });

    expect(
      container
        .querySelector('.resource-meter__fill')
        ?.classList.contains('resource-meter__fill--no-animation'),
    ).toBe(true);
  });

  it('renders compact variant', () => {
    const { container } = render(ResourceMeter, {
      props: {
        label: 'Test',
        used: 50,
        total: 100,
        unit: 'U',
        variant: 'compact',
      },
    });

    expect(
      container.querySelector('.resource-meter')?.classList.contains('resource-meter--compact'),
    ).toBe(true);
  });

  it('renders vertical variant', () => {
    const { container } = render(ResourceMeter, {
      props: {
        label: 'Test',
        used: 50,
        total: 100,
        unit: 'U',
        variant: 'vertical',
      },
    });

    expect(
      container.querySelector('.resource-meter')?.classList.contains('resource-meter--vertical'),
    ).toBe(true);
    expect(container.querySelector('.resource-meter__bar-vertical')).toBeTruthy();
  });

  it('renders trend variant with up arrow', () => {
    const { container } = render(ResourceMeter, {
      props: {
        label: 'Test',
        used: 50,
        total: 100,
        unit: 'U',
        variant: 'trend',
        trend: 'up',
      },
    });

    expect(
      container.querySelector('.resource-meter')?.classList.contains('resource-meter--trend'),
    ).toBe(true);
    expect(container.textContent).toContain('↑');
  });

  it('renders trend variant with down arrow', () => {
    const { container } = render(ResourceMeter, {
      props: {
        label: 'Test',
        used: 50,
        total: 100,
        unit: 'U',
        variant: 'trend',
        trend: 'down',
      },
    });

    expect(container.textContent).toContain('↓');
  });

  it('renders trend variant with stable arrow', () => {
    const { container } = render(ResourceMeter, {
      props: {
        label: 'Test',
        used: 50,
        total: 100,
        unit: 'U',
        variant: 'trend',
        trend: 'stable',
      },
    });

    expect(container.textContent).toContain('→');
  });

  it('handles used greater than total', () => {
    const { container } = render(ResourceMeter, {
      props: {
        label: 'Test',
        used: 150,
        total: 100,
        unit: 'U',
      },
    });

    expect(container.textContent).toContain('100%');
  });

  it('handles zero total', () => {
    const { container } = render(ResourceMeter, {
      props: {
        label: 'Test',
        used: 0,
        total: 0,
        unit: 'U',
      },
    });

    expect(container.textContent).toContain('0%');
  });

  it('uses custom thresholds', () => {
    const { container } = render(ResourceMeter, {
      props: {
        label: 'Test',
        used: 50,
        total: 100,
        unit: 'U',
        warningThreshold: 40,
        criticalThreshold: 60,
      },
    });

    expect(container.textContent).toContain('WARNING');
  });
});

describe('ClientList', () => {
  it('renders empty state', () => {
    const { container } = render(ClientList, {
      props: {
        clients: [],
      },
    });

    expect(container.textContent).toContain('No active clients');
    expect(container.textContent).toContain('[0]');
  });

  it('renders client count', () => {
    const { container } = render(ClientList, {
      props: {
        clients: [createMockClient()],
      },
    });

    expect(container.textContent).toContain('[1]');
    expect(container.textContent).toContain('Test Corp');
  });

  it('renders multiple clients', () => {
    const { container } = render(ClientList, {
      props: {
        clients: [
          createMockClient({ clientId: '1', clientName: 'Client A' }),
          createMockClient({ clientId: '2', clientName: 'Client B' }),
          createMockClient({ clientId: '3', clientName: 'Client C' }),
        ],
      },
    });

    expect(container.textContent).toContain('Client A');
    expect(container.textContent).toContain('Client B');
    expect(container.textContent).toContain('Client C');
  });

  it('shows pagination for more than 6 clients', () => {
    const clients = Array.from({ length: 8 }, (_, i) =>
      createMockClient({ clientId: `client-${i}`, clientName: `Client ${i}` }),
    );

    const { container } = render(ClientList, {
      props: { clients },
    });

    expect(container.textContent).toContain('Page 1 of 2');
    expect(container.querySelectorAll('.client-card')).toHaveLength(6);
  });

  it('calls onviewclient callback', () => {
    let clientId: string | null = null;
    const { container } = render(ClientList, {
      props: {
        clients: [createMockClient({ clientId: 'test-id' })],
        onviewclient: (id: string) => {
          clientId = id;
        },
      },
    });

    (container.querySelector('.client-card__actions button') as HTMLButtonElement)?.click();
    expect(clientId).toBe('test-id');
  });
});

describe('FinancialSummary', () => {
  it('displays total funds', () => {
    const { container } = render(FinancialSummary, {
      props: {
        funds: 10000,
        facility: createMockFacility(),
      },
    });

    expect(container.textContent).toContain('Total Funds');
    expect(container.textContent).toContain('10,000');
  });

  it('calculates daily revenue from clients', () => {
    const facility = createMockFacility({
      clients: [createMockClient({ dailyRate: 500 }), createMockClient({ dailyRate: 300 })],
    });

    const { container } = render(FinancialSummary, {
      props: {
        funds: 10000,
        facility,
      },
    });

    expect(container.textContent).toContain('800');
  });

  it('calculates daily net correctly', () => {
    const facility = createMockFacility({
      operatingCostPerDay: 100,
      securityToolOpExPerDay: 50,
      clients: [createMockClient({ dailyRate: 500 })],
    });

    const { container } = render(FinancialSummary, {
      props: {
        funds: 10000,
        facility,
      },
    });

    expect(container.textContent).toContain('350');
  });

  it('displays ransom reserve', () => {
    const { container } = render(FinancialSummary, {
      props: {
        funds: 10000,
        facility: createMockFacility(),
      },
    });

    expect(container.textContent).toContain('Ransom Reserve');
    expect(container.textContent).toContain('1,000');
  });
});

describe('QuickActions', () => {
  it('renders all action buttons', () => {
    const { container } = render(QuickActions, {
      props: {},
    });

    expect(container.textContent).toContain('Upgrade Shop');
    expect(container.textContent).toContain('Intel Brief');
    expect(container.textContent).toContain('Incident Log');
  });

  it('calls onupgradeshop callback', () => {
    let called = false;
    const { container } = render(QuickActions, {
      props: {
        onupgradeshop: () => {
          called = true;
        },
      },
    });

    container.querySelectorAll('button')[0]?.click();
    expect(called).toBe(true);
  });

  it('calls onintelbrief callback', () => {
    let called = false;
    const { container } = render(QuickActions, {
      props: {
        onintelbrief: () => {
          called = true;
        },
      },
    });

    container.querySelectorAll('button')[1]?.click();
    expect(called).toBe(true);
  });

  it('calls onincidentlog callback', () => {
    let called = false;
    const { container } = render(QuickActions, {
      props: {
        onincidentlog: () => {
          called = true;
        },
      },
    });

    container.querySelectorAll('button')[2]?.click();
    expect(called).toBe(true);
  });
});

describe('DashboardHeader', () => {
  it('displays organization name', () => {
    const { container } = render(DashboardHeader, {
      props: {
        organizationName: 'Test Org',
        currentDay: 5,
        facilityTier: 'station',
      },
    });

    expect(container.textContent).toContain('Test Org');
  });

  it('displays current day', () => {
    const { container } = render(DashboardHeader, {
      props: {
        currentDay: 42,
        facilityTier: 'outpost',
      },
    });

    expect(container.textContent).toContain('42');
  });

  it('displays time', () => {
    const { container } = render(DashboardHeader, {
      props: {
        currentDay: 1,
        currentTime: '14:30',
        facilityTier: 'outpost',
      },
    });

    expect(container.textContent).toContain('14:30');
  });

  it('displays facility tier', () => {
    const { container } = render(DashboardHeader, {
      props: {
        currentDay: 1,
        facilityTier: 'vault',
      },
    });

    expect(container.textContent).toContain('VAULT');
  });

  it('displays facility health', () => {
    const { container } = render(DashboardHeader, {
      props: {
        currentDay: 1,
        facilityTier: 'outpost',
        facilityHealth: 85,
      },
    });

    expect(container.textContent).toContain('85%');
  });
});

describe('FacilityDashboard', () => {
  it('renders all sections', () => {
    const { container } = render(FacilityDashboard, {
      props: {
        funds: 10000,
        facility: createMockFacility({
          clients: [createMockClient()],
        }),
      },
    });

    expect(container.textContent).toContain('Resource Overview');
    expect(container.textContent).toContain('Financial Summary');
    expect(container.textContent).toContain('Active Clients');
    expect(container.textContent).toContain('Quick Actions');
  });

  it('renders all resource meters', () => {
    const { container } = render(FacilityDashboard, {
      props: {
        funds: 10000,
        facility: createMockFacility(),
      },
    });

    expect(container.textContent).toContain('Rack Space');
    expect(container.textContent).toContain('Power');
    expect(container.textContent).toContain('Cooling');
    expect(container.textContent).toContain('Bandwidth');
  });

  it('renders header with correct props', () => {
    const { container } = render(FacilityDashboard, {
      props: {
        organizationName: 'My Org',
        currentDay: 15,
        currentTime: '12:00',
        funds: 50000,
        facility: createMockFacility({ tier: 'fortress' }),
      },
    });

    expect(container.textContent).toContain('My Org');
    expect(container.textContent).toContain('15');
    expect(container.textContent).toContain('12:00');
    expect(container.textContent).toContain('FORTRESS');
  });
});
