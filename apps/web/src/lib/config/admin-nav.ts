export interface AdminNavItem {
  href: string;
  label: string;
  icon: string;
  description?: string;
}

export interface AdminNavSection {
  title?: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: '◉', description: 'Overview and metrics' },
  {
    href: '/admin/campaigns',
    label: 'Campaigns',
    icon: '◎',
    description: 'Manage phishing campaigns',
  },
  { href: '/admin/users', label: 'Users', icon: '◯', description: 'User management' },
  {
    href: '/admin/phishing-sim',
    label: 'Phishing Sim',
    icon: '◈',
    description: 'Phishing simulation settings',
  },
  {
    href: '/admin/compliance',
    label: 'Compliance',
    icon: '▣',
    description: 'Compliance tracking and reports',
  },
  {
    href: '/admin/saml',
    label: 'SSO / SAML',
    icon: '🔐',
    description: 'SAML Single Sign-On configuration',
  },
  { href: '/admin/reports', label: 'Reports', icon: '◧', description: 'Analytics and reports' },
  {
    href: '/admin/integrations',
    label: 'Integrations',
    icon: '⚡',
    description: 'Third-party integrations',
  },
  { href: '/admin/settings', label: 'Settings', icon: '⚙', description: 'System settings' },
  { href: '/admin/help', label: 'Help', icon: '❓', description: 'Help and documentation' },
];

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    title: 'Main',
    items: ADMIN_NAV_ITEMS.slice(0, 5),
  },
  {
    title: 'System',
    items: ADMIN_NAV_ITEMS.slice(5),
  },
];

export function getAdminNavItemByHref(href: string): AdminNavItem | undefined {
  return ADMIN_NAV_ITEMS.find((item) => item.href === href);
}

export function isActiveAdminNavItem(href: string, currentPath: string): boolean {
  if (href === '/admin') {
    return currentPath === '/admin' || currentPath === '/admin/';
  }
  return currentPath.startsWith(href);
}
