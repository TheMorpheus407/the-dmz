<script lang="ts">
  import { Panel } from '$lib/ui';
  import type { FacilityState, FacilityTierLevel } from '@the-dmz/shared/types';

  import ResourceMeter from './ResourceMeter.svelte';
  import ClientList from './ClientList.svelte';
  import FinancialSummary from './FinancialSummary.svelte';
  import QuickActions from './QuickActions.svelte';
  import DashboardHeader from './DashboardHeader.svelte';
  import ThreatIndicator from './ThreatIndicator.svelte';

  interface Props {
    organizationName?: string;
    currentDay?: number;
    currentTime?: string;
    funds: number;
    facility: FacilityState;
    threatLevel?: 1 | 2 | 3 | 4 | 5;
    onviewclient?: (clientId: string) => void;
    onupgradeshop?: () => void;
    onintelbrief?: () => void;
    onincidentlog?: () => void;
  }

  const {
    organizationName = 'The DMZ',
    currentDay = 1,
    currentTime = '08:00',
    funds = 0,
    facility,
    threatLevel = 1,
    onviewclient = () => {},
    onupgradeshop = () => {},
    onintelbrief = () => {},
    onincidentlog = () => {},
  }: Props = $props();
</script>

<div class="facility-dashboard">
  <DashboardHeader
    {organizationName}
    {currentDay}
    {currentTime}
    facilityTier={facility.tier as FacilityTierLevel}
    facilityHealth={facility.facilityHealth}
  />

  <Panel variant="default" ariaLabel="Threat Level">
    <h2 class="facility-dashboard__section-title">Threat Status</h2>
    <ThreatIndicator level={threatLevel} variant="full" />
  </Panel>

  <div class="facility-dashboard__grid">
    <Panel variant="default" ariaLabel="Resource Overview">
      <h2 class="facility-dashboard__section-title">Resource Overview</h2>
      <div class="facility-dashboard__meters">
        <ResourceMeter
          label="Rack Space"
          used={facility.usage.rackUsedU}
          capacity={facility.capacities.rackCapacityU}
          unit="U"
          type="rack"
        />
        <ResourceMeter
          label="Power"
          used={facility.usage.powerUsedKw}
          capacity={facility.capacities.powerCapacityKw}
          unit="kW"
          type="power"
        />
        <ResourceMeter
          label="Cooling"
          used={facility.usage.coolingUsedTons}
          capacity={facility.capacities.coolingCapacityTons}
          unit="tons"
          type="cooling"
        />
        <ResourceMeter
          label="Bandwidth"
          used={facility.usage.bandwidthUsedMbps}
          capacity={facility.capacities.bandwidthCapacityMbps}
          unit="Mbps"
          type="bandwidth"
        />
      </div>
    </Panel>

    <Panel variant="default" ariaLabel="Financial Summary">
      <FinancialSummary {funds} {facility} />
    </Panel>

    <Panel variant="default" ariaLabel="Active Clients">
      <ClientList clients={facility.clients} {onviewclient} />
    </Panel>

    <Panel variant="default" ariaLabel="Quick Actions">
      <QuickActions {onupgradeshop} {onintelbrief} {onincidentlog} />
    </Panel>
  </div>
</div>

<style>
  .facility-dashboard {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-4);
    max-width: 1400px;
    margin: 0 auto;
  }

  .facility-dashboard__grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
  }

  .facility-dashboard__section-title {
    font-family: var(--font-terminal);
    font-size: var(--text-base);
    color: var(--color-amber);
    margin: 0 0 var(--space-3) 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .facility-dashboard__meters {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-3);
  }

  @media (max-width: 1024px) {
    .facility-dashboard__grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    .facility-dashboard__meters {
      grid-template-columns: 1fr;
    }
  }
</style>
