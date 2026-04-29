import {
  GAME_ACTIONS,
  type GameState,
  type UpgradeType,
  type UpgradeDefinition,
} from '@the-dmz/shared';

import { isActionAllowedInPhase } from '../state-machine.js';

import { UPGRADE_CATALOG } from './upgrade-catalog.js';

export { isActionAllowedInPhase };

export interface DomainEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface AggregatedSecurityDeltas {
  breachProbabilityModifier: number;
  detectionProbabilityModifier: number;
  mitigationBonus: number;
  threatVectorModifiers: Record<string, number>;
  securityToolCoverage: number;
}

export function aggregateSecurityDeltas(state: GameState): AggregatedSecurityDeltas {
  const completedUpgrades = state.facility.upgrades.filter((u) => u.isCompleted);

  const result: AggregatedSecurityDeltas = {
    breachProbabilityModifier: 0,
    detectionProbabilityModifier: 0,
    mitigationBonus: 0,
    threatVectorModifiers: {},
    securityToolCoverage: 0,
  };

  for (const upgrade of completedUpgrades) {
    if (upgrade.securityDelta) {
      result.breachProbabilityModifier += upgrade.securityDelta.breachProbabilityModifier ?? 0;
      result.detectionProbabilityModifier +=
        upgrade.securityDelta.detectionProbabilityModifier ?? 0;
      result.mitigationBonus += upgrade.securityDelta.mitigationBonus ?? 0;
      result.securityToolCoverage += 0.1;

      if (upgrade.securityDelta.threatVectorModifiers) {
        for (const [vector, modifier] of Object.entries(
          upgrade.securityDelta.threatVectorModifiers,
        )) {
          result.threatVectorModifiers[vector] =
            (result.threatVectorModifiers[vector] ?? 0) + modifier;
        }
      }
    }
  }

  result.securityToolCoverage = Math.min(1, result.securityToolCoverage);

  return result;
}

export function applyUpgradeEffects(state: GameState, upgradeType: UpgradeType): void {
  const upgradeDef = UPGRADE_CATALOG[upgradeType];
  const upgrade = state.facility.upgrades.find((u) => u.upgradeType === upgradeType);
  if (!upgrade || !upgrade.isCompleted) return;

  if (upgradeDef.resourceDelta.rackCapacity) {
    state.facility.capacities.rackCapacityU += upgradeDef.resourceDelta.rackCapacity;
  }
  if (upgradeDef.resourceDelta.powerCapacity) {
    state.facility.capacities.powerCapacityKw += upgradeDef.resourceDelta.powerCapacity;
  }
  if (upgradeDef.resourceDelta.coolingCapacity) {
    state.facility.capacities.coolingCapacityTons += upgradeDef.resourceDelta.coolingCapacity;
  }
  if (upgradeDef.resourceDelta.bandwidthCapacity) {
    state.facility.capacities.bandwidthCapacityMbps += upgradeDef.resourceDelta.bandwidthCapacity;
  }

  if (upgradeDef.maintenanceDelta) {
    state.facility.maintenanceDebt = Math.max(
      0,
      Math.min(1, state.facility.maintenanceDebt + upgradeDef.maintenanceDelta),
    );
  }

  state.facility.securityToolOpExPerDay = state.facility.upgrades.reduce(
    (sum, u) => sum + (u.isCompleted ? u.opExPerDay : 0),
    0,
  );
}

export function completeInstallations(state: GameState, events: DomainEvent[]): void {
  const facility = state.facility;

  for (const upgrade of facility.upgrades) {
    if (
      upgrade.status === 'installing' &&
      upgrade.completesDay &&
      state.currentDay >= upgrade.completesDay
    ) {
      upgrade.status = 'completed';
      upgrade.isCompleted = true;
      upgrade.completionDay = state.currentDay;

      applyUpgradeEffects(state, upgrade.upgradeType);

      const upgradeDef = UPGRADE_CATALOG[upgrade.upgradeType];
      events.push({
        eventId: crypto.randomUUID(),
        eventType: 'facility.upgrade.completed',
        timestamp: state.updatedAt,
        payload: {
          upgradeType: upgrade.upgradeType,
          category: upgradeDef?.category,
          tierLevel: upgrade.tierLevel,
        },
      });
    }
  }
}

export function recalculateSecurityOpEx(facility: GameState['facility']): number {
  return facility.upgrades.reduce((sum, u) => sum + (u.isCompleted ? u.opExPerDay : 0), 0);
}

export function recalculateAttackSurface(
  facility: GameState['facility'],
  newUpgradeType: UpgradeType,
  threatSurfaceDelta: number,
): number {
  return Math.max(
    0,
    facility.attackSurfaceScore +
      facility.upgrades.reduce((sum, u) => {
        if (u.isCompleted || u.upgradeType === newUpgradeType) {
          return sum + threatSurfaceDelta;
        }
        return sum;
      }, 0),
  );
}

export function validateUpgradePurchase(
  state: GameState,
  upgradeDef: UpgradeDefinition,
  upgradeType: UpgradeType,
): void {
  if (!isActionAllowedInPhase(GAME_ACTIONS.ADJUST_RESOURCE, state.currentPhase)) {
    throw new Error('PURCHASE_FACILITY_UPGRADE not allowed in current phase');
  }

  const tierOrder = ['outpost', 'station', 'vault', 'fortress', 'citadel'];
  const currentTierIndex = tierOrder.indexOf(state.facilityTier);
  const requiredTierIndex = tierOrder.indexOf(upgradeDef.minTier);
  if (currentTierIndex < requiredTierIndex) {
    throw new Error(`Requires ${upgradeDef.minTier} tier. Current: ${state.facilityTier}`);
  }

  for (const prereqId of upgradeDef.prerequisites) {
    const hasPrereq = state.facility.upgrades.some(
      (u) => u.upgradeType === prereqId && u.isCompleted,
    );
    if (!hasPrereq) {
      throw new Error(`Prerequisite upgrade not completed: ${prereqId}`);
    }
  }

  if (state.funds < upgradeDef.baseCost) {
    throw new Error('Insufficient funds for upgrade');
  }

  const alreadyInstalled = state.facility.upgrades.some(
    (u) => u.upgradeType === upgradeType && u.isCompleted,
  );
  if (alreadyInstalled) {
    throw new Error('Upgrade already installed');
  }
}

export function installUpgrade(
  state: GameState,
  upgradeDef: UpgradeDefinition,
  upgradeType: UpgradeType,
): void {
  const existingInProgress = state.facility.upgrades.find(
    (u) => u.upgradeType === upgradeType && !u.isCompleted,
  );

  if (existingInProgress) {
    existingInProgress.status = 'installing';
    existingInProgress.completesDay = state.currentDay + upgradeDef.installationDays;
    existingInProgress.tierLevel += 1;
    return;
  }

  const isZeroDayInstall = upgradeDef.installationDays === 0;
  const newUpgrade: (typeof state.facility.upgrades)[number] = {
    upgradeId: crypto.randomUUID(),
    upgradeType: upgradeType,
    category: upgradeDef.category,
    tierLevel: 1,
    status: isZeroDayInstall ? 'completed' : 'installing',
    purchasedDay: state.currentDay,
    completesDay: isZeroDayInstall
      ? state.currentDay
      : state.currentDay + upgradeDef.installationDays,
    isCompleted: isZeroDayInstall,
    ...(isZeroDayInstall && { completionDay: state.currentDay }),
    resourceDelta: upgradeDef.resourceDelta,
    ...(upgradeDef.securityDelta && { securityDelta: upgradeDef.securityDelta }),
    ...(upgradeDef.maintenanceDelta !== undefined && {
      maintenanceDelta: upgradeDef.maintenanceDelta,
    }),
    opExPerDay: upgradeDef.opExPerDay,
    threatSurfaceDelta: upgradeDef.threatSurfaceDelta,
    ...(upgradeDef.installationOverhead && {
      installationOverhead: upgradeDef.installationOverhead,
    }),
  };
  state.facility.upgrades.push(newUpgrade);
}
