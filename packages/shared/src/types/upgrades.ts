export type ShopCategory = 'infrastructure' | 'security' | 'staff';

export type UpgradeTier = 'basic' | 'standard' | 'advanced' | 'enterprise';

export type UpgradeCostType = 'one-time' | 'recurring';

export type PurchaseStatus = 'available' | 'purchased' | 'installing' | 'locked';

export interface UpgradeBenefit {
  description: string;
  impact: string;
  value: number;
  unit: string;
}

export interface UpgradePrerequisite {
  type: 'facility_tier' | 'upgrade' | 'resource';
  name: string;
  value: number;
  satisfied: boolean;
}

export interface UpgradeCatalogItem {
  id: string;
  name: string;
  category: ShopCategory;
  tier: UpgradeTier;
  description: string;
  longDescription?: string;
  cost: number;
  costType: UpgradeCostType;
  installationDays: number;
  opExPerDay: number;
  benefits: UpgradeBenefit[];
  prerequisites: UpgradePrerequisite[];
  prerequisitesMet: boolean;
  threatSurfaceDelta: number;
  icon?: string;
}

export interface QueuedUpgrade {
  upgradeId: string;
  name: string;
  category: ShopCategory;
  purchasedDay: number;
  completesDay: number;
  progress: number;
}

export interface PurchasedUpgrade {
  upgradeId: string;
  name: string;
  category: ShopCategory;
  tier: UpgradeTier;
  purchasedDay: number;
  completedDay: number;
  opExPerDay: number;
  isActive: boolean;
}

export interface UpgradeShopState {
  availableFunds: number;
  catalog: UpgradeCatalogItem[];
  purchased: PurchasedUpgrade[];
  queued: QueuedUpgrade[];
  selectedCategory: ShopCategory;
  selectedUpgradeId: string | null;
}
