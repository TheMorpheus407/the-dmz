import type { EmailInstance, EmailState } from '@the-dmz/shared';
import { EMAIL_STATUS } from '@the-dmz/shared';

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

export type EmailCategory = 'new' | 'pending' | 'archived' | 'flagged';

type EmailStateStatus = EmailState['status'];

export interface InboxEmailItem {
  email: EmailInstance;
  state: EmailState;
  category: EmailCategory;
  urgency: UrgencyLevel;
  age: number;
}

export const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  low: 'var(--color-safe)',
  medium: 'var(--color-warning)',
  high: 'var(--color-threat-4)',
  critical: 'var(--color-critical)',
};

export const FACTION_COLORS: Record<string, string> = {
  'The Sovereign Compact': 'var(--color-faction-sovereign)',
  'Nexion Industries': 'var(--color-faction-nexion)',
  'The Librarians': 'var(--color-faction-librarians)',
  'Hacktivist Collectives': 'var(--color-faction-hacktivist)',
  'Criminal Networks': 'var(--color-faction-criminal)',
};

export const CATEGORY_LABELS: Record<EmailCategory, string> = {
  new: 'NEW',
  pending: 'PENDING',
  archived: 'ARCHIVED',
  flagged: 'FLAGGED',
};

export function getEmailCategory(status: EmailStateStatus): EmailCategory {
  if (
    status === EMAIL_STATUS.PENDING ||
    status === EMAIL_STATUS.OPENED ||
    status === EMAIL_STATUS.REQUEST_VERIFICATION
  ) {
    return 'pending';
  }
  if (status === EMAIL_STATUS.FLAGGED) {
    return 'flagged';
  }
  if (
    status === EMAIL_STATUS.APPROVED ||
    status === EMAIL_STATUS.DENIED ||
    status === EMAIL_STATUS.DEFERRED
  ) {
    return 'archived';
  }
  return 'new';
}

export function getUrgencyFromAccessRequest(urgency: string): UrgencyLevel {
  const lowerCasedUrgency = urgency.toLowerCase();
  if (lowerCasedUrgency === 'critical') return 'critical';
  if (lowerCasedUrgency === 'high') return 'high';
  if (lowerCasedUrgency === 'medium') return 'medium';
  return 'low';
}

export function getUrgencyFromThreatTier(threatTier: string): UrgencyLevel {
  const upperCasedTier = threatTier.toUpperCase();
  if (upperCasedTier === 'SEVERE' || upperCasedTier === 'HIGH') return 'critical';
  if (upperCasedTier === 'ELEVATED') return 'high';
  if (upperCasedTier === 'GUARDED') return 'medium';
  return 'low';
}

export function getFactionColor(faction: string): string {
  return FACTION_COLORS[faction] || 'var(--color-archived)';
}

export type SortOption = 'urgency' | 'time' | 'sender' | 'faction';

export type FilterOption = 'all' | 'undecided' | 'flagged' | 'new' | 'pending' | 'archived';

export function categorizeEmails(
  emails: EmailInstance[],
  states: Map<string, EmailState>,
  currentDay: number,
): Map<EmailCategory, InboxEmailItem[]> {
  const categorized = new Map<EmailCategory, InboxEmailItem[]>([
    ['new', []],
    ['pending', []],
    ['archived', []],
    ['flagged', []],
  ]);

  for (const email of emails) {
    const state = states.get(email.emailId);
    if (!state) continue;

    const category = getEmailCategory(state.status);
    const urgency = getUrgencyFromAccessRequest(email.accessRequest.urgency);
    const age = currentDay - email.dayNumber;

    categorized.get(category)!.push({
      email,
      state,
      category,
      urgency,
      age,
    });
  }

  return categorized;
}

export function sortEmails(
  items: InboxEmailItem[],
  sortBy: SortOption,
  ascending = false,
): InboxEmailItem[] {
  const sorted = [...items];

  sorted.sort((a, b) => {
    let comparisonResult = 0;

    switch (sortBy) {
      case 'urgency': {
        const urgencyRank: Record<UrgencyLevel, number> = {
          critical: 4,
          high: 3,
          medium: 2,
          low: 1,
        };
        comparisonResult = urgencyRank[b.urgency] - urgencyRank[a.urgency];
        if (comparisonResult === 0) comparisonResult = b.age - a.age;
        break;
      }
      case 'time':
        comparisonResult =
          new Date(b.email.createdAt).getTime() - new Date(a.email.createdAt).getTime();
        break;
      case 'sender':
        comparisonResult = a.email.sender.displayName.localeCompare(b.email.sender.displayName);
        break;
      case 'faction':
        comparisonResult = a.email.faction.localeCompare(b.email.faction);
        break;
    }

    return comparisonResult;
  });

  if (ascending) sorted.reverse();

  return sorted;
}

export function filterEmails(items: InboxEmailItem[], filterBy: FilterOption): InboxEmailItem[] {
  if (filterBy === 'all') return items;

  return items.filter((item) => {
    switch (filterBy) {
      case 'undecided':
        return item.category === 'new' || item.category === 'pending';
      case 'flagged':
        return item.category === 'flagged';
      case 'new':
        return item.category === 'new';
      case 'pending':
        return item.category === 'pending';
      case 'archived':
        return item.category === 'archived';
      default:
        return true;
    }
  });
}
