import type { DomainEvent } from '../../shared/events/event-types.js';

export interface AchievementCriteria {
  eventType: string;
  conditions: {
    count?: number;
    accuracyThreshold?: number;
    timeWindow?: string;
    consecutiveDays?: number;
    verificationUsed?: boolean;
    [key: string]: unknown;
  };
}

export interface AchievementProgress {
  currentCount: number;
  lastUpdated: string;
  eventsProcessed: string[];
  completed: boolean;
  completedAt?: string;
}

export interface CriteriaEvaluationContext {
  playerId: string;
  tenantId: string;
  event: DomainEvent<Record<string, unknown>>;
}

export function parseTimeWindow(timeWindow: string): { value: number; unit: string } | null {
  const match = timeWindow.match(/^(\d+)([smhd])$/);
  if (!match || !match[1] || !match[2]) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  return { value, unit };
}

export function getTimeWindowMs(timeWindow: string): number {
  const parsed = parseTimeWindow(timeWindow);
  if (!parsed) return 0;

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return parsed.value * (multipliers[parsed.unit] || 0);
}

export function evaluateCountCondition(
  progress: AchievementProgress,
  criteria: AchievementCriteria,
): boolean {
  const requiredCount = criteria.conditions.count ?? 0;
  return progress.currentCount >= requiredCount;
}

export function evaluateAccuracyThreshold(
  event: DomainEvent<Record<string, unknown>>,
  criteria: AchievementCriteria,
): boolean {
  const payload = event.payload;
  const accuracy = payload['accuracy'] as number | undefined;
  if (accuracy === undefined) return false;

  const threshold = criteria.conditions.accuracyThreshold ?? 0;
  return accuracy >= threshold;
}

export function evaluateTimeWindow(
  progress: AchievementProgress,
  criteria: AchievementCriteria,
): boolean {
  const timeWindow = criteria.conditions.timeWindow;
  if (!timeWindow) return true;

  const windowMs = getTimeWindowMs(timeWindow);
  if (windowMs === 0) return true;

  const lastUpdated = new Date(progress.lastUpdated).getTime();
  const now = Date.now();
  const elapsed = now - lastUpdated;

  return elapsed <= windowMs;
}

export function evaluateConsecutiveDays(
  progress: AchievementProgress,
  _criteria: AchievementCriteria,
): boolean {
  const requiredDays = _criteria.conditions.consecutiveDays ?? 0;
  const currentDays = progress.currentCount || 0;
  return currentDays >= requiredDays;
}

export function evaluateCriteria(
  criteria: AchievementCriteria,
  progress: AchievementProgress,
  event: DomainEvent<Record<string, unknown>>,
): boolean {
  if (criteria.conditions.count !== undefined) {
    if (!evaluateCountCondition(progress, criteria)) {
      return false;
    }
  }

  if (criteria.conditions.accuracyThreshold !== undefined) {
    if (!evaluateAccuracyThreshold(event, criteria)) {
      return false;
    }
  }

  if (criteria.conditions.timeWindow !== undefined) {
    if (!evaluateTimeWindow(progress, criteria)) {
      return false;
    }
  }

  if (criteria.conditions.consecutiveDays !== undefined) {
    if (!evaluateConsecutiveDays(progress, criteria)) {
      return false;
    }
  }

  return true;
}

export function updateProgress(
  currentProgress: AchievementProgress,
  event: DomainEvent<Record<string, unknown>>,
  criteria: AchievementCriteria,
): AchievementProgress {
  const eventId = event.eventId;
  const eventsProcessed = currentProgress.eventsProcessed.includes(eventId)
    ? currentProgress.eventsProcessed
    : [...currentProgress.eventsProcessed, eventId];

  let newCount = currentProgress.currentCount;

  switch (criteria.eventType) {
    case 'game.decision.denied':
    case 'game.decision.approved':
    case 'game.incident.resolved':
    case 'game.verification.packet_opened':
    case 'game.upgrade.purchased':
    case 'game.session.completed':
      newCount = eventsProcessed.length;
      break;
    case 'game.session.started':
      newCount = eventsProcessed.length;
      break;
    default:
      newCount = eventsProcessed.length;
  }

  const isCompleted = newCount >= (criteria.conditions.count ?? 0);

  const baseProgress = {
    currentCount: newCount,
    lastUpdated: new Date().toISOString(),
    eventsProcessed,
    completed: evaluateCriteria(criteria, { ...currentProgress, currentCount: newCount }, event),
  };

  const updatedProgress: AchievementProgress = isCompleted
    ? { ...baseProgress, completedAt: new Date().toISOString() }
    : baseProgress;

  return updatedProgress;
}

export function shouldUnlockAchievement(
  progress: AchievementProgress,
  criteria: AchievementCriteria,
): boolean {
  if (criteria.conditions.count !== undefined) {
    if (progress.currentCount < criteria.conditions.count) {
      return false;
    }
  }

  if (criteria.conditions.accuracyThreshold !== undefined) {
    const payload = {} as Record<string, unknown>;
    const accuracy = payload['accuracy'] as number | undefined;
    if (accuracy !== undefined && accuracy < criteria.conditions.accuracyThreshold) {
      return false;
    }
  }

  return true;
}

export function extractPlayerIdFromEvent(
  event: DomainEvent<Record<string, unknown>>,
): string | null {
  const payload = event.payload;
  return (payload['userId'] as string) || null;
}

export function extractTenantIdFromEvent(
  event: DomainEvent<Record<string, unknown>>,
): string | null {
  return event.tenantId || null;
}
