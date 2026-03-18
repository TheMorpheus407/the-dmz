import {
  IpWarmupStatus,
  IpWarmupPhase,
  type IpWarmupSchedule,
  type IpWarmupConfig,
  DEFAULT_IP_WARMUP_CONFIG,
  calculateVolumeForDay,
  calculateNextVolume,
  getPhaseForDay,
} from './warmup.types.js';

const warmupSchedules = new Map<string, IpWarmupSchedule>();

export const warmupService = {
  async startWarmup(
    integrationId: string,
    tenantId: string,
    config: IpWarmupConfig = DEFAULT_IP_WARMUP_CONFIG,
  ): Promise<IpWarmupSchedule> {
    const existing = warmupSchedules.get(integrationId);
    if (
      existing &&
      existing.status !== IpWarmupStatus.NOT_STARTED &&
      existing.status !== IpWarmupStatus.FAILED
    ) {
      throw new Error(`Warmup already in progress or completed for integration ${integrationId}`);
    }

    const now = new Date().toISOString();
    const schedule: IpWarmupSchedule = {
      integrationId,
      tenantId,
      status: IpWarmupStatus.IN_PROGRESS,
      phase: IpWarmupPhase.INITIAL,
      currentDay: 1,
      maxDay: config.rampUpDays,
      currentVolume: config.initialVolume,
      targetVolume: config.maxVolume,
      startDate: now,
      lastUpdatedAt: now,
      volumeHistory: [],
    };

    warmupSchedules.set(integrationId, schedule);
    return schedule;
  },

  async getSchedule(integrationId: string): Promise<IpWarmupSchedule | null> {
    return warmupSchedules.get(integrationId) ?? null;
  },

  async getScheduleByTenant(tenantId: string): Promise<IpWarmupSchedule[]> {
    return Array.from(warmupSchedules.values()).filter((s) => s.tenantId === tenantId);
  },

  async updateWarmupMetrics(
    integrationId: string,
    metrics: { sent: number; bounced: number; complained: number; delivered: number },
  ): Promise<IpWarmupSchedule | null> {
    const schedule = warmupSchedules.get(integrationId);
    if (!schedule) return null;

    const bounceRate = metrics.sent > 0 ? (metrics.bounced / metrics.sent) * 100 : 0;
    const complaintRate = metrics.sent > 0 ? (metrics.complained / metrics.sent) * 100 : 0;

    const { volume, shouldPause, pauseReason } = calculateNextVolume(
      schedule.currentVolume,
      bounceRate,
      complaintRate,
    );

    const historyEntry = {
      day: schedule.currentDay,
      volume: schedule.currentVolume,
      sent: metrics.sent,
      bounced: metrics.bounced,
      complained: metrics.complained,
      delivered: metrics.delivered,
      timestamp: new Date().toISOString(),
    };

    const pauseReasonValue = shouldPause ? (pauseReason ?? schedule.pauseReason) : undefined;

    const updatedSchedule: IpWarmupSchedule = {
      ...schedule,
      currentVolume: volume,
      status: shouldPause ? IpWarmupStatus.PAUSED : schedule.status,
      ...(pauseReasonValue !== undefined && { pauseReason: pauseReasonValue }),
      lastUpdatedAt: new Date().toISOString(),
      volumeHistory: [...schedule.volumeHistory, historyEntry].slice(-30),
    };

    warmupSchedules.set(integrationId, updatedSchedule);
    return updatedSchedule;
  },

  async advanceDay(integrationId: string): Promise<IpWarmupSchedule | null> {
    const schedule = warmupSchedules.get(integrationId);
    if (!schedule) return null;

    if (schedule.status === IpWarmupStatus.COMPLETE) {
      return schedule;
    }

    if (schedule.status === IpWarmupStatus.PAUSED) {
      throw new Error(`Cannot advance day while warmup is paused: ${schedule.pauseReason}`);
    }

    const nextDay = schedule.currentDay + 1;
    const config = DEFAULT_IP_WARMUP_CONFIG;
    const newVolume = calculateVolumeForDay(nextDay, config);
    const phase = getPhaseForDay(nextDay, config.rampUpDays);

    const updatedSchedule: IpWarmupSchedule = {
      ...schedule,
      currentDay: nextDay,
      currentVolume: newVolume,
      phase,
      status: newVolume >= config.maxVolume ? IpWarmupStatus.COMPLETE : IpWarmupStatus.IN_PROGRESS,
      lastUpdatedAt: new Date().toISOString(),
    };

    warmupSchedules.set(integrationId, updatedSchedule);
    return updatedSchedule;
  },

  async pauseWarmup(integrationId: string, reason?: string): Promise<IpWarmupSchedule | null> {
    const schedule = warmupSchedules.get(integrationId);
    if (!schedule) return null;

    if (schedule.status === IpWarmupStatus.COMPLETE) {
      throw new Error('Cannot pause a completed warmup');
    }

    const updatedSchedule: IpWarmupSchedule = {
      ...schedule,
      status: IpWarmupStatus.PAUSED,
      pauseReason: reason ?? 'Manually paused',
      lastUpdatedAt: new Date().toISOString(),
    };

    warmupSchedules.set(integrationId, updatedSchedule);
    return updatedSchedule;
  },

  async resumeWarmup(integrationId: string): Promise<IpWarmupSchedule | null> {
    const schedule = warmupSchedules.get(integrationId);
    if (!schedule) return null;

    if (schedule.status !== IpWarmupStatus.PAUSED) {
      throw new Error('Can only resume a paused warmup');
    }

    const { pauseReason: _removed, ...restSchedule } = schedule;
    const updatedSchedule: IpWarmupSchedule = {
      ...restSchedule,
      status: IpWarmupStatus.IN_PROGRESS,
      lastUpdatedAt: new Date().toISOString(),
    };

    warmupSchedules.set(integrationId, updatedSchedule);
    return updatedSchedule;
  },

  async resetWarmup(integrationId: string): Promise<void> {
    warmupSchedules.delete(integrationId);
  },

  async resetAllWarmups(): Promise<void> {
    warmupSchedules.clear();
  },

  getAllowedVolume(schedule: IpWarmupSchedule): number {
    return schedule.currentVolume;
  },

  canSend(schedule: IpWarmupSchedule, requestedVolume: number): boolean {
    return (
      schedule.status === IpWarmupStatus.IN_PROGRESS && requestedVolume <= schedule.currentVolume
    );
  },
};
