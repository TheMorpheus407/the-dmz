import { describe, expect, it } from 'vitest';

import {
  UPGRADE_CATALOG,
  getUpgradesByCategory,
  getUpgradeById,
  canPurchase,
} from '$lib/game/data/upgrade-catalog';
import type { PurchasedUpgrade, ShopCategory } from '@the-dmz/shared/types';

const mockUpgrade = UPGRADE_CATALOG[0]!;

describe('UPGRADE_CATALOG', () => {
  it('contains infrastructure upgrades', () => {
    const infrastructure = UPGRADE_CATALOG.filter((u) => u.category === 'infrastructure');
    expect(infrastructure.length).toBeGreaterThan(0);
  });

  it('contains security upgrades', () => {
    const security = UPGRADE_CATALOG.filter((u) => u.category === 'security');
    expect(security.length).toBeGreaterThan(0);
  });

  it('contains staff upgrades', () => {
    const staff = UPGRADE_CATALOG.filter((u) => u.category === 'staff');
    expect(staff.length).toBeGreaterThan(0);
  });

  it('has unique IDs for all upgrades', () => {
    const ids = UPGRADE_CATALOG.map((u) => u.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all upgrades have required properties', () => {
    UPGRADE_CATALOG.forEach((upgrade) => {
      expect(upgrade.id).toBeDefined();
      expect(upgrade.name).toBeDefined();
      expect(upgrade.category).toBeDefined();
      expect(upgrade.tier).toBeDefined();
      expect(upgrade.description).toBeDefined();
      expect(upgrade.cost).toBeGreaterThan(0);
      expect(upgrade.costType).toMatch(/^(one-time|recurring)$/);
      expect(upgrade.installationDays).toBeGreaterThan(0);
      expect(upgrade.opExPerDay).toBeGreaterThanOrEqual(0);
      expect(upgrade.benefits).toBeDefined();
      expect(upgrade.prerequisites).toBeDefined();
    });
  });
});

describe('getUpgradesByCategory', () => {
  it('filters infrastructure upgrades', () => {
    const result = getUpgradesByCategory(UPGRADE_CATALOG, 'infrastructure');
    expect(result.every((u) => u.category === 'infrastructure')).toBe(true);
  });

  it('filters security upgrades', () => {
    const result = getUpgradesByCategory(UPGRADE_CATALOG, 'security');
    expect(result.every((u) => u.category === 'security')).toBe(true);
  });

  it('filters staff upgrades', () => {
    const result = getUpgradesByCategory(UPGRADE_CATALOG, 'staff');
    expect(result.every((u) => u.category === 'staff')).toBe(true);
  });

  it('returns empty array for unknown category', () => {
    const result = getUpgradesByCategory(UPGRADE_CATALOG, 'unknown' as ShopCategory);
    expect(result).toHaveLength(0);
  });
});

describe('getUpgradeById', () => {
  it('finds upgrade by ID', () => {
    const upgrade = UPGRADE_CATALOG[0];
    if (!upgrade) {
      expect(true).toBe(true);
      return;
    }
    const result = getUpgradeById(UPGRADE_CATALOG, upgrade.id);
    expect(result).toBe(upgrade);
  });

  it('returns undefined for unknown ID', () => {
    const result = getUpgradeById(UPGRADE_CATALOG, 'non-existent');
    expect(result).toBeUndefined();
  });
});

describe('canPurchase', () => {
  it('allows purchase with sufficient funds', () => {
    const result = canPurchase(mockUpgrade, 10000, []);
    expect(result.canPurchase).toBe(true);
  });

  it('denies purchase with insufficient funds', () => {
    const result = canPurchase(mockUpgrade, 0, []);
    expect(result.canPurchase).toBe(false);
    expect(result.reason).toBe('Insufficient funds');
  });

  it('denies purchase if already purchased', () => {
    const purchased: PurchasedUpgrade[] = [
      {
        upgradeId: mockUpgrade.id,
        name: mockUpgrade.name,
        category: mockUpgrade.category,
        tier: mockUpgrade.tier,
        purchasedDay: 1,
        completedDay: 1,
        opExPerDay: 0,
        isActive: true,
      },
    ];
    const result = canPurchase(mockUpgrade, 10000, purchased);
    expect(result.canPurchase).toBe(false);
    expect(result.reason).toBe('Already purchased');
  });

  it('denies purchase if prerequisites not met', () => {
    const upgradeWithPrereq = UPGRADE_CATALOG.find(
      (u) => u.prerequisites.length > 0 && u.prerequisites.some((p) => !p.satisfied),
    );
    if (upgradeWithPrereq) {
      const result = canPurchase(upgradeWithPrereq, 10000, []);
      expect(result.canPurchase).toBe(false);
      expect(result.reason).toBe('Prerequisites not met');
    }
  });

  it('allows purchase when exact funds available', () => {
    const result = canPurchase(mockUpgrade, mockUpgrade.cost, []);
    expect(result.canPurchase).toBe(true);
  });
});

describe('Infrastructure upgrades', () => {
  it('has rack space upgrades', () => {
    const rackUpgrades = UPGRADE_CATALOG.filter((u) => u.name.toLowerCase().includes('rack'));
    expect(rackUpgrades.length).toBeGreaterThan(0);
  });

  it('has power upgrades', () => {
    const powerUpgrades = UPGRADE_CATALOG.filter((u) => u.name.toLowerCase().includes('power'));
    expect(powerUpgrades.length).toBeGreaterThan(0);
  });

  it('has cooling upgrades', () => {
    const coolingUpgrades = UPGRADE_CATALOG.filter(
      (u) => u.name.toLowerCase().includes('cooling') || u.name.toLowerCase().includes('ac unit'),
    );
    expect(coolingUpgrades.length).toBeGreaterThan(0);
  });

  it('has bandwidth upgrades', () => {
    const bandwidthUpgrades = UPGRADE_CATALOG.filter(
      (u) =>
        u.name.toLowerCase().includes('bandwidth') || u.name.toLowerCase().includes('internet'),
    );
    expect(bandwidthUpgrades.length).toBeGreaterThan(0);
  });
});

describe('Security upgrades', () => {
  it('has email filter', () => {
    const emailFilter = UPGRADE_CATALOG.find((u) => u.name.toLowerCase().includes('email'));
    expect(emailFilter).toBeDefined();
  });

  it('has IDS', () => {
    const ids = UPGRADE_CATALOG.find((u) => u.name.toLowerCase().includes('intrusion'));
    expect(ids).toBeDefined();
  });

  it('has SIEM', () => {
    const siem = UPGRADE_CATALOG.find((u) => u.name.toLowerCase().includes('siem'));
    expect(siem).toBeDefined();
  });

  it('has WAF', () => {
    const waf = UPGRADE_CATALOG.find((u) => u.name.toLowerCase().includes('firewall'));
    expect(waf).toBeDefined();
  });

  it('has EDR', () => {
    const edr = UPGRADE_CATALOG.find((u) => u.name.toLowerCase().includes('endpoint'));
    expect(edr).toBeDefined();
  });

  it('has honeypot', () => {
    const honeypot = UPGRADE_CATALOG.find(
      (u) =>
        u.name.toLowerCase().includes('honeypot') || u.name.toLowerCase().includes('deception'),
    );
    expect(honeypot).toBeDefined();
  });

  it('has AI defense', () => {
    const aiDefense = UPGRADE_CATALOG.find((u) => u.name.toLowerCase().includes('ai'));
    expect(aiDefense).toBeDefined();
  });

  it('has zero trust', () => {
    const zeroTrust = UPGRADE_CATALOG.find((u) => u.name.toLowerCase().includes('zero trust'));
    expect(zeroTrust).toBeDefined();
  });
});

describe('Staff upgrades', () => {
  it('has hire specialists', () => {
    const specialists = UPGRADE_CATALOG.find(
      (u) =>
        u.name.toLowerCase().includes('specialist') || u.name.toLowerCase().includes('engineer'),
    );
    expect(specialists).toBeDefined();
  });

  it('has training programs', () => {
    const training = UPGRADE_CATALOG.find((u) => u.name.toLowerCase().includes('training'));
    expect(training).toBeDefined();
  });
});
