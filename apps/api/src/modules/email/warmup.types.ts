export enum IpWarmupStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETE = 'complete',
  PAUSED = 'paused',
  FAILED = 'failed',
}

export enum IpWarmupPhase {
  INITIAL = 'initial',
  RAMPING = 'ramping',
  SUSTAINED = 'sustained',
}

export interface IpWarmupSchedule {
  integrationId: string;
  tenantId: string;
  status: IpWarmupStatus;
  phase: IpWarmupPhase;
  currentDay: number;
  maxDay: number;
  currentVolume: number;
  targetVolume: number;
  startDate: string;
  lastUpdatedAt: string;
  volumeHistory: Array<{
    day: number;
    volume: number;
    sent: number;
    bounced: number;
    complained: number;
    delivered: number;
    timestamp: string;
  }>;
  pauseReason?: string;
}

export interface IpWarmupConfig {
  initialVolume: number;
  maxVolume: number;
  rampUpDays: number;
  dailyIncreasePercent: number;
  maxBounceRate: number;
  maxComplaintRate: number;
  autoPauseEnabled: boolean;
}

export const DEFAULT_IP_WARMUP_CONFIG: IpWarmupConfig = {
  initialVolume: 50,
  maxVolume: 10000,
  rampUpDays: 30,
  dailyIncreasePercent: 50,
  maxBounceRate: 5,
  maxComplaintRate: 0.1,
  autoPauseEnabled: true,
};

export const WARMUP_VOLUME_BY_DAY = [
  50, 75, 112, 168, 252, 378, 500, 750, 1000, 1500, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000,
  10000,
];

export function calculateVolumeForDay(
  day: number,
  config: IpWarmupConfig = DEFAULT_IP_WARMUP_CONFIG,
): number {
  if (day <= 0) return config.initialVolume;
  if (day >= config.rampUpDays) return config.maxVolume;

  const index = Math.min(day, WARMUP_VOLUME_BY_DAY.length - 1);
  return WARMUP_VOLUME_BY_DAY[index]! ?? config.initialVolume;
}

export function calculateNextVolume(
  currentVolume: number,
  bounceRate: number,
  complaintRate: number,
  config: IpWarmupConfig = DEFAULT_IP_WARMUP_CONFIG,
): { volume: number; shouldPause: boolean; pauseReason?: string } {
  if (bounceRate > config.maxBounceRate) {
    return {
      volume: Math.floor(currentVolume * 0.5),
      shouldPause: config.autoPauseEnabled,
      pauseReason: `Bounce rate ${bounceRate.toFixed(2)}% exceeds maximum ${config.maxBounceRate}%`,
    };
  }

  if (complaintRate > config.maxComplaintRate) {
    return {
      volume: Math.floor(currentVolume * 0.5),
      shouldPause: config.autoPauseEnabled,
      pauseReason: `Complaint rate ${complaintRate.toFixed(2)}% exceeds maximum ${config.maxComplaintRate}%`,
    };
  }

  const increaseFactor = 1 + config.dailyIncreasePercent / 100;
  const newVolume = Math.min(Math.floor(currentVolume * increaseFactor), config.maxVolume);

  return {
    volume: newVolume,
    shouldPause: false,
  };
}

export function getPhaseForDay(day: number, rampUpDays: number): IpWarmupPhase {
  const progress = day / rampUpDays;

  if (progress < 0.1) return IpWarmupPhase.INITIAL;
  if (progress < 0.8) return IpWarmupPhase.RAMPING;
  return IpWarmupPhase.SUSTAINED;
}
