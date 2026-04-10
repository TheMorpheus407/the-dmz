import type {
  GameState,
  PurchaseUpgradePayload,
  AdjustResourcePayload,
  OnboardClientPayload,
  EvictClientPayload,
  ProcessFacilityTickPayload,
  UpgradeFacilityTierPayload,
  PurchaseFacilityUpgradePayload,
} from '@the-dmz/shared';

import { UPGRADE_CATALOG } from './upgrade-catalog.js';
import {
  isActionAllowedInPhase,
  processInstallations,
  recalculateSecurityOpEx,
  recalculateAttackSurface,
  validateUpgradePurchase,
  installUpgrade,
  applyUpgradeEffects,
} from './handler-utils.js';

import type { DomainEvent } from './handler-utils.js';

export function handlePurchaseUpgrade(
  state: GameState,
  action: PurchaseUpgradePayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('PURCHASE_UPGRADE', state.currentPhase)) {
    throw new Error('PURCHASE_UPGRADE not allowed in current phase');
  }
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.upgrade.purchased',
    timestamp: state.updatedAt,
    payload: { upgradeId: action.upgradeId },
  });
}

export function handleAdjustResource(
  state: GameState,
  action: AdjustResourcePayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('ADJUST_RESOURCE', state.currentPhase)) {
    throw new Error('ADJUST_RESOURCE not allowed in current phase');
  }
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.resource.adjusted',
    timestamp: state.updatedAt,
    payload: { resourceId: action.resourceId, delta: action.delta },
  });
}

function validateClientCapacity(
  facility: GameState['facility'],
  action: OnboardClientPayload,
): void {
  const newRackUsage = facility.usage.rackUsedU + action.rackUnitsU;
  const newPowerUsage = facility.usage.powerUsedKw + action.powerKw;
  const newCoolingUsage = facility.usage.coolingUsedTons + action.coolingTons;
  const newBandwidthUsage = facility.usage.bandwidthUsedMbps + action.bandwidthMbps;

  const rackPercent = newRackUsage / facility.capacities.rackCapacityU;
  const powerPercent = newPowerUsage / facility.capacities.powerCapacityKw;
  const coolingPercent = newCoolingUsage / facility.capacities.coolingCapacityTons;
  const bandwidthPercent = newBandwidthUsage / facility.capacities.bandwidthCapacityMbps;

  if (rackPercent > 1 || powerPercent > 1 || coolingPercent > 1 || bandwidthPercent > 1) {
    const bottleneck = [
      { resource: 'rack', percent: rackPercent },
      { resource: 'power', percent: powerPercent },
      { resource: 'cooling', percent: coolingPercent },
      { resource: 'bandwidth', percent: bandwidthPercent },
    ].reduce((max, curr) => (curr.percent > max.percent ? curr : max));

    throw new Error(
      `Capacity exceeded: ${bottleneck.resource} at ${Math.floor(bottleneck.percent * 100)}%`,
    );
  }
}

function createAndAddClient(
  facility: GameState['facility'],
  state: GameState,
  action: OnboardClientPayload,
): void {
  const newClient = {
    clientId: action.clientId,
    clientName: action.clientName,
    organization: action.organization,
    rackUnitsU: action.rackUnitsU,
    powerKw: action.powerKw,
    coolingTons: action.coolingTons,
    bandwidthMbps: action.bandwidthMbps,
    dailyRate: action.dailyRate,
    leaseStartDay: state.currentDay,
    leaseEndDay: action.durationDays ? state.currentDay + action.durationDays : null,
    isActive: true,
    burstProfile: action.burstProfile || 'steady',
  };
  facility.usage.rackUsedU += action.rackUnitsU;
  facility.usage.powerUsedKw += action.powerKw;
  facility.usage.coolingUsedTons += action.coolingTons;
  facility.usage.bandwidthUsedMbps += action.bandwidthMbps;
  facility.clients.push(newClient);
  facility.attackSurfaceScore += Math.floor(
    (action.rackUnitsU + action.powerKw + action.coolingTons + action.bandwidthMbps) / 10,
  );
}

function pushClientOnboardedEvent(
  events: DomainEvent[],
  state: GameState,
  action: OnboardClientPayload,
): void {
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'facility.client.onboarded',
    timestamp: state.updatedAt,
    payload: {
      clientId: action.clientId,
      clientName: action.clientName,
      organization: action.organization,
      resources: {
        rackUnitsU: action.rackUnitsU,
        powerKw: action.powerKw,
        coolingTons: action.coolingTons,
        bandwidthMbps: action.bandwidthMbps,
      },
      dailyRate: action.dailyRate,
    },
  });
}

export function handleOnboardClient(
  state: GameState,
  action: OnboardClientPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('ADJUST_RESOURCE', state.currentPhase)) {
    throw new Error('ONBOARD_CLIENT not allowed in current phase');
  }
  const facility = state.facility;

  validateClientCapacity(facility, action);
  createAndAddClient(facility, state, action);
  pushClientOnboardedEvent(events, state, action);
}

export function handleEvictClient(
  state: GameState,
  action: EvictClientPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('ADJUST_RESOURCE', state.currentPhase)) {
    throw new Error('EVICT_CLIENT not allowed in current phase');
  }
  const facility = state.facility;
  const clientIndex = facility.clients.findIndex((c) => c.clientId === action.clientId);
  if (clientIndex === -1) {
    throw new Error('Client not found');
  }
  const client = facility.clients[clientIndex];
  if (!client) {
    throw new Error('Client not found');
  }
  facility.usage.rackUsedU -= client.rackUnitsU;
  facility.usage.powerUsedKw -= client.powerKw;
  facility.usage.coolingUsedTons -= client.coolingTons;
  facility.usage.bandwidthUsedMbps -= client.bandwidthMbps;
  facility.attackSurfaceScore = Math.max(
    0,
    facility.attackSurfaceScore -
      Math.floor(
        (client.rackUnitsU + client.powerKw + client.coolingTons + client.bandwidthMbps) / 10,
      ),
  );
  facility.clients.splice(clientIndex, 1);
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'facility.client.evicted',
    timestamp: state.updatedAt,
    payload: {
      clientId: action.clientId,
      reason: action.reason,
    },
  });
}

function calculateRevenueAndConsumption(facility: GameState['facility']): {
  totalRevenue: number;
  totalConsumption: number;
} {
  let totalRevenue = 0;
  let totalConsumption = 1.0;
  for (const client of facility.clients) {
    if (!client.isActive) continue;
    totalRevenue += client.dailyRate;
    const burstMultiplier =
      client.burstProfile === 'spiky' ? 1.5 : client.burstProfile === 'moderate' ? 1.2 : 1.0;
    totalConsumption *= burstMultiplier;
  }
  return { totalRevenue, totalConsumption };
}

function applyConsumptionToFacility(
  facility: GameState['facility'],
  totalConsumption: number,
): void {
  facility.usage.rackUsedU = Math.floor(facility.usage.rackUsedU * totalConsumption);
  facility.usage.powerUsedKw = Math.floor(facility.usage.powerUsedKw * totalConsumption);
  facility.usage.coolingUsedTons = Math.floor(facility.usage.coolingUsedTons * totalConsumption);
  facility.usage.bandwidthUsedMbps = Math.floor(
    facility.usage.bandwidthUsedMbps * totalConsumption,
  );
}

function calculateUtilizationPercent(facility: GameState['facility']): number {
  return Math.max(
    facility.usage.rackUsedU / facility.capacities.rackCapacityU,
    facility.usage.powerUsedKw / facility.capacities.powerCapacityKw,
    facility.usage.coolingUsedTons / facility.capacities.coolingCapacityTons,
    facility.usage.bandwidthUsedMbps / facility.capacities.bandwidthCapacityMbps,
  );
}

function processUtilizationEffects(
  facility: GameState['facility'],
  utilizationPercent: number,
  events: DomainEvent[],
  state: GameState,
): void {
  if (utilizationPercent > 0.9) {
    facility.maintenanceDebt += Math.floor((utilizationPercent - 0.9) * 100);
    facility.facilityHealth = Math.max(0, facility.facilityHealth - 2);
    events.push({
      eventId: crypto.randomUUID(),
      eventType: 'facility.resource.critical',
      timestamp: state.updatedAt,
      payload: {
        utilizationPercent,
        maintenanceDebt: facility.maintenanceDebt,
        facilityHealth: facility.facilityHealth,
      },
    });
  } else if (utilizationPercent > 0.7) {
    facility.maintenanceDebt += 1;
    facility.facilityHealth = Math.max(0, facility.facilityHealth - 1);
  }
}

function calculateAndDeductOperatingCosts(
  state: GameState,
  facility: GameState['facility'],
  dayNumber: number,
  events: DomainEvent[],
): number {
  facility.operatingCostPerDay = Math.floor(
    50 *
      (1 +
        facility.usage.rackUsedU / facility.capacities.rackCapacityU +
        facility.usage.powerUsedKw / facility.capacities.powerCapacityKw),
  );
  const totalOpEx = facility.operatingCostPerDay + (facility.securityToolOpExPerDay ?? 0);
  state.funds -= totalOpEx;

  if (totalOpEx > 0) {
    events.push({
      eventId: crypto.randomUUID(),
      eventType: 'game.economy.credits_changed',
      timestamp: state.updatedAt,
      payload: {
        sessionId: state.sessionId,
        amount: -totalOpEx,
        balanceBefore: state.funds + totalOpEx,
        balanceAfter: state.funds,
        reason: 'operational_cost',
        context: { day: dayNumber },
      },
    });
  }
  return totalOpEx;
}

export interface RevenueEventContext {
  events: DomainEvent[];
  state: GameState;
  dayNumber: number;
  totalRevenue: number;
  clientCount: number;
}

function pushRevenueEvent(ctx: RevenueEventContext): void {
  if (ctx.totalRevenue > 0) {
    ctx.events.push({
      eventId: crypto.randomUUID(),
      eventType: 'game.economy.credits_changed',
      timestamp: ctx.state.updatedAt,
      payload: {
        sessionId: ctx.state.sessionId,
        amount: ctx.totalRevenue,
        balanceBefore: ctx.state.funds - ctx.totalRevenue,
        balanceAfter: ctx.state.funds,
        reason: 'client_approval',
        context: { day: ctx.dayNumber, clientCount: ctx.clientCount },
      },
    });
  }
}

export function handleProcessFacilityTick(
  state: GameState,
  action: ProcessFacilityTickPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('ADJUST_RESOURCE', state.currentPhase)) {
    throw new Error('PROCESS_FACILITY_TICK not allowed in current phase');
  }
  state.currentDay = action.dayNumber;
  const facility = state.facility;

  const { totalRevenue, totalConsumption } = calculateRevenueAndConsumption(facility);
  state.funds += totalRevenue;
  pushRevenueEvent({
    events,
    state,
    dayNumber: action.dayNumber,
    totalRevenue,
    clientCount: facility.clients.length,
  });

  applyConsumptionToFacility(facility, totalConsumption);
  const utilizationPercent = calculateUtilizationPercent(facility);
  processUtilizationEffects(facility, utilizationPercent, events, state);

  const totalOpEx = calculateAndDeductOperatingCosts(state, facility, action.dayNumber, events);

  processInstallations(state, events);

  facility.lastTickDay = action.dayNumber;
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'facility.tick.processed',
    timestamp: state.updatedAt,
    payload: {
      dayNumber: action.dayNumber,
      revenue: totalRevenue,
      operatingCost: totalOpEx,
      baseOperatingCost: facility.operatingCostPerDay,
      securityToolOpEx: facility.securityToolOpExPerDay,
      utilizationPercent,
      maintenanceDebt: facility.maintenanceDebt,
      facilityHealth: facility.facilityHealth,
    },
  });
}

export function handleUpgradeFacilityTier(
  state: GameState,
  action: UpgradeFacilityTierPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('ADJUST_RESOURCE', state.currentPhase)) {
    throw new Error('UPGRADE_FACILITY_TIER not allowed in current phase');
  }
  const tierUpgrades: Record<
    string,
    { rack: number; power: number; cooling: number; bandwidth: number; cost: number }
  > = {
    outpost: { rack: 84, power: 25, cooling: 12, bandwidth: 500, cost: 5000 },
    station: { rack: 168, power: 50, cooling: 25, bandwidth: 1000, cost: 15000 },
    vault: { rack: 336, power: 100, cooling: 50, bandwidth: 2500, cost: 50000 },
    fortress: { rack: 672, power: 200, cooling: 100, bandwidth: 5000, cost: 150000 },
  };
  const upgrade = tierUpgrades[action.targetTier];
  if (!upgrade) {
    throw new Error('Invalid target tier');
  }
  if (state.funds < upgrade.cost) {
    throw new Error('Insufficient funds for tier upgrade');
  }
  state.funds -= upgrade.cost;
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.economy.credits_changed',
    timestamp: state.updatedAt,
    payload: {
      sessionId: state.sessionId,
      amount: -upgrade.cost,
      balanceBefore: state.funds + upgrade.cost,
      balanceAfter: state.funds,
      reason: 'facility_upgrade',
      context: { fromTier: state.facilityTier, toTier: action.targetTier },
    },
  });
  state.facilityTier = action.targetTier as typeof state.facilityTier;
  state.facility.tier = action.targetTier;
  state.facility.capacities.rackCapacityU = upgrade.rack;
  state.facility.capacities.powerCapacityKw = upgrade.power;
  state.facility.capacities.coolingCapacityTons = upgrade.cooling;
  state.facility.capacities.bandwidthCapacityMbps = upgrade.bandwidth;
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'facility.tier.upgraded',
    timestamp: state.updatedAt,
    payload: {
      fromTier: state.facilityTier,
      toTier: action.targetTier,
      cost: upgrade.cost,
    },
  });
}

function pushUpgradePurchasedEvent(
  events: DomainEvent[],
  state: GameState,
  action: PurchaseFacilityUpgradePayload,
  upgradeDef: (typeof UPGRADE_CATALOG)[keyof typeof UPGRADE_CATALOG],
): void {
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'facility.upgrade.purchased',
    timestamp: state.updatedAt,
    payload: {
      upgradeType: action.upgradeType,
      category: upgradeDef.category,
      cost: upgradeDef.baseCost,
      installationDays: upgradeDef.installationDays,
      completesDay: state.currentDay + upgradeDef.installationDays,
    },
  });
}

function handleZeroDayInstallation(
  state: GameState,
  action: PurchaseFacilityUpgradePayload,
  upgradeDef: (typeof UPGRADE_CATALOG)[keyof typeof UPGRADE_CATALOG],
  events: DomainEvent[],
): void {
  applyUpgradeEffects(state, action.upgradeType);
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'facility.upgrade.completed',
    timestamp: state.updatedAt,
    payload: {
      upgradeType: action.upgradeType,
      category: upgradeDef.category,
      cost: upgradeDef.baseCost,
    },
  });
}

export function handlePurchaseFacilityUpgrade(
  state: GameState,
  action: PurchaseFacilityUpgradePayload,
  events: DomainEvent[],
): void {
  const upgradeDef = UPGRADE_CATALOG[action.upgradeType];
  if (!upgradeDef) {
    throw new Error(`Unknown upgrade type: ${action.upgradeType}`);
  }

  validateUpgradePurchase(state, upgradeDef, action.upgradeType);

  state.funds -= upgradeDef.baseCost;

  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.economy.credits_changed',
    timestamp: state.updatedAt,
    payload: {
      sessionId: state.sessionId,
      amount: -upgradeDef.baseCost,
      balanceBefore: state.funds + upgradeDef.baseCost,
      balanceAfter: state.funds,
      reason: 'upgrade_purchase',
      context: { upgradeType: action.upgradeType, category: upgradeDef.category },
    },
  });

  installUpgrade(state, upgradeDef, action.upgradeType);

  state.facility.securityToolOpExPerDay = recalculateSecurityOpEx(state.facility);
  state.facility.attackSurfaceScore = recalculateAttackSurface(
    state.facility,
    action.upgradeType,
    upgradeDef.threatSurfaceDelta,
  );

  pushUpgradePurchasedEvent(events, state, action, upgradeDef);

  if (upgradeDef.installationDays === 0) {
    handleZeroDayInstallation(state, action, upgradeDef, events);
  }
}
