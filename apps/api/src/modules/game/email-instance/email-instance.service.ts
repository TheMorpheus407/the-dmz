import type {
  RNGInstance,
  EmailInstance,
  EmailQueueItem,
  EmailDifficulty,
  EmailIntent,
  EmailTechnique,
  GameThreatTier,
} from '@the-dmz/shared';

export interface EmailContentPool {
  emails: EmailInstance[];
  metadata: {
    totalCount: number;
    byDifficulty: Record<EmailDifficulty, number>;
    byIntent: Record<EmailIntent, number>;
    byTechnique: Record<EmailTechnique, number>;
    byThreatTier: Record<GameThreatTier, number>;
  };
}

export interface QueueGenerationParams {
  sessionId: string;
  dayNumber: number;
  seed: bigint;
  threatTier: GameThreatTier;
  emailCount: number;
  pool: EmailContentPool;
  rng: RNGInstance;
}

export interface EmailInstanceService {
  generateDailyQueue(params: QueueGenerationParams): EmailQueueItem[];
  getEmailById(emailId: string): EmailInstance | undefined;
  selectEmailsForDay(
    pool: EmailContentPool,
    params: {
      dayNumber: number;
      threatTier: GameThreatTier;
      emailCount: number;
      rng: RNGInstance;
    },
  ): EmailInstance[];
}

export const MIN_LEGITIMATE_RATIO = 0.25;

export function selectEmailsForDay(
  pool: EmailContentPool,
  params: {
    dayNumber: number;
    threatTier: GameThreatTier;
    emailCount: number;
    rng: RNGInstance;
  },
): EmailInstance[] {
  const { dayNumber, threatTier, emailCount, rng } = params;

  const legitCount = Math.max(1, Math.floor(emailCount * MIN_LEGITIMATE_RATIO));

  const legitEmails = pool.emails.filter(
    (e) => e.intent === 'legitimate' && e.threatTier === threatTier,
  );
  const maliciousEmails = pool.emails.filter(
    (e) => e.intent === 'malicious' && e.threatTier === threatTier,
  );

  const selectedLegit =
    legitEmails.length >= legitCount ? rng.pickN(legitEmails, legitCount) : [...legitEmails];

  const remainingSlots = emailCount - selectedLegit.length;
  const selectedMalicious =
    maliciousEmails.length >= remainingSlots
      ? rng.pickN(maliciousEmails, remainingSlots)
      : [...maliciousEmails];

  const selected = [...selectedLegit, ...selectedMalicious];

  const shuffled = rng.shuffle(selected);

  return shuffled.map((email, index) => ({
    ...email,
    emailId: rng.uuid(`email-${dayNumber}-${index}`),
    sessionId: '',
    dayNumber,
  }));
}

export function generateDailyQueue(params: QueueGenerationParams): EmailQueueItem[] {
  const { sessionId, rng } = params;

  const selectedEmails = selectEmailsForDay(params.pool, {
    dayNumber: params.dayNumber,
    threatTier: params.threatTier,
    emailCount: params.emailCount,
    rng,
  });

  const sortedByUrgency = selectedEmails.sort((a, b) => {
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return urgencyOrder[a.accessRequest.urgency] - urgencyOrder[b.accessRequest.urgency];
  });

  const now = new Date().toISOString();

  return sortedByUrgency.map((email, index) => ({
    email: {
      ...email,
      sessionId,
    },
    status: 'new' as const,
    receivedAt: now,
    age: 0,
    order: index,
  }));
}
