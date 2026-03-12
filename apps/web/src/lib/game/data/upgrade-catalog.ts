import type { UpgradeCatalogItem, PurchasedUpgrade, ShopCategory } from '@the-dmz/shared/types';

export const UPGRADE_CATALOG: UpgradeCatalogItem[] = [
  {
    id: 'rack-space-1',
    name: 'Basic Rack Cabinet',
    category: 'infrastructure',
    tier: 'basic',
    description: 'Standard 42U rack cabinet for housing servers and networking equipment.',
    longDescription:
      'A fundamental infrastructure upgrade providing additional rack space for servers, storage, and networking gear. Essential for scaling your facility operations.',
    cost: 1500,
    costType: 'one-time',
    installationDays: 2,
    opExPerDay: 5,
    benefits: [{ description: 'Additional rack capacity', impact: '+4U', value: 4, unit: 'U' }],
    prerequisites: [{ type: 'facility_tier', name: 'Facility Tier', value: 1, satisfied: true }],
    prerequisitesMet: true,
    threatSurfaceDelta: 0,
    icon: '▦',
  },
  {
    id: 'rack-space-2',
    name: 'Expanded Rack Suite',
    category: 'infrastructure',
    tier: 'standard',
    description: 'Larger rack installation with enhanced cable management.',
    longDescription:
      'An expanded rack suite with improved cable management, power distribution, and cooling efficiency. Allows for higher density deployments.',
    cost: 3500,
    costType: 'one-time',
    installationDays: 3,
    opExPerDay: 12,
    benefits: [
      { description: 'Additional rack capacity', impact: '+12U', value: 12, unit: 'U' },
      { description: 'Improved cable management', impact: '+15%', value: 15, unit: 'efficiency' },
    ],
    prerequisites: [
      { type: 'facility_tier', name: 'Facility Tier', value: 2, satisfied: false },
      { type: 'upgrade', name: 'Basic Rack Cabinet', value: 1, satisfied: true },
    ],
    prerequisitesMet: false,
    threatSurfaceDelta: 0,
    icon: '▦',
  },
  {
    id: 'power-1',
    name: 'Power Distribution Unit',
    category: 'infrastructure',
    tier: 'basic',
    description: 'Additional power capacity for expanding operations.',
    longDescription:
      'A reliable power distribution unit that provides clean, stable power to your critical infrastructure. Includes surge protection and monitoring.',
    cost: 2000,
    costType: 'one-time',
    installationDays: 2,
    opExPerDay: 8,
    benefits: [{ description: 'Additional power capacity', impact: '+5kW', value: 5, unit: 'kW' }],
    prerequisites: [{ type: 'facility_tier', name: 'Facility Tier', value: 1, satisfied: true }],
    prerequisitesMet: true,
    threatSurfaceDelta: 0,
    icon: '⚡',
  },
  {
    id: 'power-2',
    name: 'Redundant Power System',
    category: 'infrastructure',
    tier: 'advanced',
    description: 'Dual-redundant power supplies with automatic failover.',
    longDescription:
      'Enterprise-grade redundant power system with automatic failover capability. Ensures zero downtime during power fluctuations or failures.',
    cost: 5000,
    costType: 'one-time',
    installationDays: 4,
    opExPerDay: 20,
    benefits: [
      { description: 'Additional power capacity', impact: '+15kW', value: 15, unit: 'kW' },
      { description: 'Power redundancy', impact: 'N+1', value: 100, unit: 'uptime' },
    ],
    prerequisites: [
      { type: 'facility_tier', name: 'Facility Tier', value: 2, satisfied: false },
      { type: 'upgrade', name: 'Power Distribution Unit', value: 1, satisfied: true },
    ],
    prerequisitesMet: false,
    threatSurfaceDelta: 0,
    icon: '⚡',
  },
  {
    id: 'cooling-1',
    name: 'Precision AC Unit',
    category: 'infrastructure',
    tier: 'basic',
    description: 'Climate control system for temperature-sensitive equipment.',
    longDescription:
      'Precision air conditioning unit designed for data center environments. Maintains optimal temperature and humidity levels for equipment longevity.',
    cost: 2500,
    costType: 'one-time',
    installationDays: 2,
    opExPerDay: 15,
    benefits: [{ description: 'Cooling capacity', impact: '+3 tons', value: 3, unit: 'tons' }],
    prerequisites: [{ type: 'facility_tier', name: 'Facility Tier', value: 1, satisfied: true }],
    prerequisitesMet: true,
    threatSurfaceDelta: 0,
    icon: '❄',
  },
  {
    id: 'cooling-2',
    name: 'Chilled Water System',
    category: 'infrastructure',
    tier: 'advanced',
    description: 'Industrial-grade cooling with hot aisle containment.',
    longDescription:
      'Advanced chilled water cooling system with hot aisle containment. Maximizes cooling efficiency for high-density deployments.',
    cost: 7500,
    costType: 'one-time',
    installationDays: 5,
    opExPerDay: 35,
    benefits: [
      { description: 'Cooling capacity', impact: '+10 tons', value: 10, unit: 'tons' },
      { description: 'Energy efficiency', impact: '+25%', value: 25, unit: 'efficiency' },
    ],
    prerequisites: [
      { type: 'facility_tier', name: 'Facility Tier', value: 3, satisfied: false },
      { type: 'upgrade', name: 'Precision AC Unit', value: 1, satisfied: true },
    ],
    prerequisitesMet: false,
    threatSurfaceDelta: 0,
    icon: '❄',
  },
  {
    id: 'bandwidth-1',
    name: 'Dedicated Internet Line',
    category: 'infrastructure',
    tier: 'basic',
    description: 'High-speed dedicated bandwidth for client services.',
    longDescription:
      'Reliable dedicated internet connection with guaranteed bandwidth. Essential for serving client hosting needs.',
    cost: 800,
    costType: 'recurring',
    installationDays: 3,
    opExPerDay: 25,
    benefits: [
      { description: 'Bandwidth capacity', impact: '+100 Mbps', value: 100, unit: 'Mbps' },
    ],
    prerequisites: [{ type: 'facility_tier', name: 'Facility Tier', value: 1, satisfied: true }],
    prerequisitesMet: true,
    threatSurfaceDelta: 5,
    icon: '◈',
  },
  {
    id: 'bandwidth-2',
    name: 'Fiber Uplink',
    category: 'infrastructure',
    tier: 'standard',
    description: 'High-capacity fiber connection with redundant routes.',
    longDescription:
      'Enterprise fiber uplink with diverse path redundancy. Provides massive bandwidth for demanding workloads.',
    cost: 2500,
    costType: 'recurring',
    installationDays: 5,
    opExPerDay: 50,
    benefits: [
      { description: 'Bandwidth capacity', impact: '+500 Mbps', value: 500, unit: 'Mbps' },
      { description: 'Redundant routes', impact: 'Diverse', value: 100, unit: 'uptime' },
    ],
    prerequisites: [
      { type: 'facility_tier', name: 'Facility Tier', value: 2, satisfied: false },
      { type: 'upgrade', name: 'Dedicated Internet Line', value: 1, satisfied: true },
    ],
    prerequisitesMet: false,
    threatSurfaceDelta: 8,
    icon: '◈',
  },
  {
    id: 'email-filter-1',
    name: 'Email Filter Gateway',
    category: 'security',
    tier: 'basic',
    description: 'Basic email filtering for spam and malware.',
    longDescription:
      'Essential email security gateway that filters spam, phishing attempts, and malicious attachments before they reach your network.',
    cost: 500,
    costType: 'recurring',
    installationDays: 1,
    opExPerDay: 10,
    benefits: [
      { description: 'Email threat protection', impact: '+40%', value: 40, unit: 'detection' },
    ],
    prerequisites: [{ type: 'facility_tier', name: 'Facility Tier', value: 1, satisfied: true }],
    prerequisitesMet: true,
    threatSurfaceDelta: -5,
    icon: '✉',
  },
  {
    id: 'ids-1',
    name: 'Intrusion Detection System',
    category: 'security',
    tier: 'basic',
    description: 'Network monitoring for suspicious activity.',
    longDescription:
      'Network-based intrusion detection system that monitors traffic for signs of unauthorized access or attacks.',
    cost: 1200,
    costType: 'one-time',
    installationDays: 2,
    opExPerDay: 8,
    benefits: [
      { description: 'Network monitoring', impact: '+30%', value: 30, unit: 'visibility' },
    ],
    prerequisites: [{ type: 'facility_tier', name: 'Facility Tier', value: 1, satisfied: true }],
    prerequisitesMet: true,
    threatSurfaceDelta: -3,
    icon: '◉',
  },
  {
    id: 'siem-1',
    name: 'SIEM Platform',
    category: 'security',
    tier: 'standard',
    description: 'Security information and event management system.',
    longDescription:
      'Centralized security monitoring platform that aggregates logs and events from across your infrastructure for real-time threat detection.',
    cost: 3500,
    costType: 'recurring',
    installationDays: 3,
    opExPerDay: 25,
    benefits: [
      { description: 'Threat detection', impact: '+50%', value: 50, unit: 'visibility' },
      { description: 'Incident response', impact: '+35%', value: 35, unit: 'speed' },
    ],
    prerequisites: [
      { type: 'facility_tier', name: 'Facility Tier', value: 2, satisfied: false },
      { type: 'upgrade', name: 'Intrusion Detection System', value: 1, satisfied: false },
    ],
    prerequisitesMet: false,
    threatSurfaceDelta: 2,
    icon: '⬡',
  },
  {
    id: 'waf-1',
    name: 'Web Application Firewall',
    category: 'security',
    tier: 'standard',
    description: 'Protection for web-facing applications.',
    longDescription:
      'Web application firewall that filters and monitors HTTP traffic to protect against SQL injection, XSS, and other web attacks.',
    cost: 2000,
    costType: 'recurring',
    installationDays: 2,
    opExPerDay: 15,
    benefits: [{ description: 'Web protection', impact: '+45%', value: 45, unit: 'security' }],
    prerequisites: [{ type: 'facility_tier', name: 'Facility Tier', value: 2, satisfied: false }],
    prerequisitesMet: false,
    threatSurfaceDelta: -8,
    icon: '🛡',
  },
  {
    id: 'edr-1',
    name: 'Endpoint Detection & Response',
    category: 'security',
    tier: 'advanced',
    description: 'Advanced endpoint security with threat hunting.',
    longDescription:
      'Next-generation endpoint protection with behavioral analysis, threat hunting capabilities, and automated response actions.',
    cost: 4500,
    costType: 'recurring',
    installationDays: 3,
    opExPerDay: 30,
    benefits: [
      { description: 'Endpoint protection', impact: '+60%', value: 60, unit: 'security' },
      { description: 'Threat response', impact: '+50%', value: 50, unit: 'speed' },
    ],
    prerequisites: [{ type: 'facility_tier', name: 'Facility Tier', value: 2, satisfied: false }],
    prerequisitesMet: false,
    threatSurfaceDelta: -10,
    icon: '◈',
  },
  {
    id: 'honeypot-1',
    name: 'Deception Network',
    category: 'security',
    tier: 'advanced',
    description: 'Decoy systems to detect and confuse attackers.',
    longDescription:
      'Network of deceptive honeypots and breadcrumbs designed to detect intruders early and gather intelligence on attack techniques.',
    cost: 3000,
    costType: 'one-time',
    installationDays: 4,
    opExPerDay: 12,
    benefits: [
      { description: 'Early detection', impact: '+25%', value: 25, unit: 'detection' },
      { description: 'Threat intelligence', impact: '+40%', value: 40, unit: 'visibility' },
    ],
    prerequisites: [
      { type: 'facility_tier', name: 'Facility Tier', value: 3, satisfied: false },
      { type: 'upgrade', name: 'SIEM Platform', value: 1, satisfied: false },
    ],
    prerequisitesMet: false,
    threatSurfaceDelta: 5,
    icon: '◇',
  },
  {
    id: 'ai-defense-1',
    name: 'AI Threat Defense',
    category: 'security',
    tier: 'enterprise',
    description: 'Machine learning-based anomaly detection system.',
    longDescription:
      'Advanced AI-powered security system that learns normal behavior patterns and detects sophisticated attacks that traditional systems miss.',
    cost: 8000,
    costType: 'recurring',
    installationDays: 5,
    opExPerDay: 45,
    benefits: [
      { description: 'Anomaly detection', impact: '+70%', value: 70, unit: 'detection' },
      { description: 'False positive reduction', impact: '-60%', value: -60, unit: 'noise' },
    ],
    prerequisites: [
      { type: 'facility_tier', name: 'Facility Tier', value: 3, satisfied: false },
      { type: 'upgrade', name: 'SIEM Platform', value: 1, satisfied: false },
      { type: 'upgrade', name: 'EDR Solution', value: 1, satisfied: false },
    ],
    prerequisitesMet: false,
    threatSurfaceDelta: -15,
    icon: '⚛',
  },
  {
    id: 'zero-trust-1',
    name: 'Zero Trust Gateway',
    category: 'security',
    tier: 'enterprise',
    description: 'Complete zero-trust network architecture.',
    longDescription:
      'Full zero-trust implementation with micro-segmentation, continuous verification, and least-privilege access controls.',
    cost: 12000,
    costType: 'one-time',
    installationDays: 7,
    opExPerDay: 60,
    benefits: [
      { description: 'Network security', impact: '+80%', value: 80, unit: 'security' },
      { description: 'Access control', impact: 'Zero Trust', value: 100, unit: 'model' },
    ],
    prerequisites: [
      { type: 'facility_tier', name: 'Facility Tier', value: 3, satisfied: false },
      { type: 'upgrade', name: 'Web Application Firewall', value: 1, satisfied: false },
      { type: 'upgrade', name: 'AI Threat Defense', value: 1, satisfied: false },
    ],
    prerequisitesMet: false,
    threatSurfaceDelta: -20,
    icon: '⊛',
  },
  {
    id: 'staff-1',
    name: 'Security Specialist',
    category: 'staff',
    tier: 'basic',
    description: 'Hire a dedicated security operations staff member.',
    longDescription:
      'Add a skilled security specialist to your team. Provides continuous monitoring and rapid response capabilities.',
    cost: 3000,
    costType: 'recurring',
    installationDays: 3,
    opExPerDay: 50,
    benefits: [
      { description: 'Security monitoring', impact: '+25%', value: 25, unit: 'coverage' },
      { description: 'Response capability', impact: '+20%', value: 20, unit: 'speed' },
    ],
    prerequisites: [{ type: 'facility_tier', name: 'Facility Tier', value: 1, satisfied: true }],
    prerequisitesMet: true,
    threatSurfaceDelta: -5,
    icon: '♟',
  },
  {
    id: 'staff-2',
    name: 'Network Engineer',
    category: 'staff',
    tier: 'standard',
    description: 'Expert network infrastructure management.',
    longDescription:
      'Hire a certified network engineer to optimize your infrastructure performance and reliability.',
    cost: 4000,
    costType: 'recurring',
    installationDays: 3,
    opExPerDay: 65,
    benefits: [
      { description: 'Network uptime', impact: '+15%', value: 15, unit: 'uptime' },
      { description: 'Performance', impact: '+20%', value: 20, unit: 'efficiency' },
    ],
    prerequisites: [{ type: 'facility_tier', name: 'Facility Tier', value: 2, satisfied: false }],
    prerequisitesMet: false,
    threatSurfaceDelta: 0,
    icon: '♞',
  },
  {
    id: 'staff-3',
    name: 'Training Program',
    category: 'staff',
    tier: 'basic',
    description: 'Staff security awareness training.',
    longDescription:
      'Comprehensive security training program for all staff. Reduces human error and improves overall security posture.',
    cost: 800,
    costType: 'recurring',
    installationDays: 1,
    opExPerDay: 5,
    benefits: [
      { description: 'Security awareness', impact: '+30%', value: 30, unit: 'training' },
      { description: 'Phishing resistance', impact: '+25%', value: 25, unit: 'resistance' },
    ],
    prerequisites: [{ type: 'facility_tier', name: 'Facility Tier', value: 1, satisfied: true }],
    prerequisitesMet: true,
    threatSurfaceDelta: -8,
    icon: '⬡',
  },
  {
    id: 'staff-4',
    name: 'SOC Team',
    category: 'staff',
    tier: 'enterprise',
    description: '24/7 Security Operations Center team.',
    longDescription:
      'Full 24/7 Security Operations Center team with dedicated analysts, incident responders, and threat hunters.',
    cost: 15000,
    costType: 'recurring',
    installationDays: 7,
    opExPerDay: 200,
    benefits: [
      { description: 'Continuous monitoring', impact: '24/7', value: 100, unit: 'coverage' },
      { description: 'Incident response', impact: '+60%', value: 60, unit: 'speed' },
      { description: 'Threat hunting', impact: '+50%', value: 50, unit: 'proactive' },
    ],
    prerequisites: [
      { type: 'facility_tier', name: 'Facility Tier', value: 3, satisfied: false },
      { type: 'upgrade', name: 'Security Specialist', value: 1, satisfied: false },
      { type: 'upgrade', name: 'SIEM Platform', value: 1, satisfied: false },
    ],
    prerequisitesMet: false,
    threatSurfaceDelta: -15,
    icon: '⬢',
  },
];

export function getUpgradesByCategory(
  catalog: UpgradeCatalogItem[],
  category: ShopCategory,
): UpgradeCatalogItem[] {
  return catalog.filter((upgrade) => upgrade.category === category);
}

export function getUpgradeById(
  catalog: UpgradeCatalogItem[],
  upgradeId: string,
): UpgradeCatalogItem | undefined {
  return catalog.find((upgrade) => upgrade.id === upgradeId);
}

export function canPurchase(
  upgrade: UpgradeCatalogItem,
  funds: number,
  purchased: PurchasedUpgrade[],
): { canPurchase: boolean; reason?: string } {
  if (funds < upgrade.cost) {
    return { canPurchase: false, reason: 'Insufficient funds' };
  }

  if (!upgrade.prerequisitesMet) {
    return { canPurchase: false, reason: 'Prerequisites not met' };
  }

  const alreadyPurchased = purchased.some((p) => p.upgradeId === upgrade.id);
  if (alreadyPurchased) {
    return { canPurchase: false, reason: 'Already purchased' };
  }

  return { canPurchase: true };
}
