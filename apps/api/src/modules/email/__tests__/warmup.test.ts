import { describe, it, expect, beforeEach } from 'vitest';

import { createTestId } from '@the-dmz/shared/testing';

import {
  calculateVolumeForDay,
  calculateNextVolume,
  getPhaseForDay,
  IpWarmupStatus,
  IpWarmupPhase,
} from '../warmup.types.js';
import { warmupService } from '../warmup.service.js';

describe('warmup.types', () => {
  describe('calculateVolumeForDay', () => {
    it('should return initial volume for day 0', () => {
      expect(calculateVolumeForDay(0)).toBe(50);
    });

    it('should return correct volume for day 1', () => {
      expect(calculateVolumeForDay(1)).toBe(75);
    });

    it('should return correct volume for ramp-up days', () => {
      expect(calculateVolumeForDay(7)).toBeGreaterThanOrEqual(50);
      expect(calculateVolumeForDay(14)).toBeGreaterThanOrEqual(50);
      expect(calculateVolumeForDay(30)).toBe(10000);
    });

    it('should cap at max volume', () => {
      expect(calculateVolumeForDay(100)).toBe(10000);
    });
  });

  describe('calculateNextVolume', () => {
    it('should increase volume when metrics are good', () => {
      const result = calculateNextVolume(50, 0, 0);
      expect(result.volume).toBe(75);
      expect(result.shouldPause).toBe(false);
    });

    it('should decrease and pause when bounce rate exceeds threshold', () => {
      const result = calculateNextVolume(1000, 10, 0);
      expect(result.volume).toBe(500);
      expect(result.shouldPause).toBe(true);
      expect(result.pauseReason).toContain('Bounce rate');
    });

    it('should decrease and pause when complaint rate exceeds threshold', () => {
      const result = calculateNextVolume(1000, 0, 1);
      expect(result.volume).toBe(500);
      expect(result.shouldPause).toBe(true);
      expect(result.pauseReason).toContain('Complaint rate');
    });

    it('should not increase beyond max volume', () => {
      const result = calculateNextVolume(10000, 0, 0);
      expect(result.volume).toBe(10000);
    });
  });

  describe('getPhaseForDay', () => {
    it('should return INITIAL phase for early days', () => {
      expect(getPhaseForDay(1, 30)).toBe(IpWarmupPhase.INITIAL);
      expect(getPhaseForDay(2, 30)).toBe(IpWarmupPhase.INITIAL);
    });

    it('should return RAMPING phase for middle days', () => {
      expect(getPhaseForDay(10, 30)).toBe(IpWarmupPhase.RAMPING);
      expect(getPhaseForDay(20, 30)).toBe(IpWarmupPhase.RAMPING);
    });

    it('should return SUSTAINED phase for late days', () => {
      expect(getPhaseForDay(25, 30)).toBe(IpWarmupPhase.SUSTAINED);
      expect(getPhaseForDay(30, 30)).toBe(IpWarmupPhase.SUSTAINED);
    });
  });
});

describe('warmupService', () => {
  beforeEach(async () => {
    await warmupService.resetAllWarmups();
  });

  describe('startWarmup', () => {
    it('should create a new warmup schedule', async () => {
      const schedule = await warmupService.startWarmup('int-1', 'tenant-1');

      expect(schedule.integrationId).toBe('int-1');
      expect(schedule.tenantId).toBe('tenant-1');
      expect(schedule.status).toBe(IpWarmupStatus.IN_PROGRESS);
      expect(schedule.currentDay).toBe(1);
      expect(schedule.currentVolume).toBe(50);
    });
  });

  describe('getSchedule', () => {
    it('should return null for non-existent schedule', async () => {
      const schedule = await warmupService.getSchedule('non-existent');
      expect(schedule).toBeNull();
    });
  });

  describe('advanceDay', () => {
    it('should advance to next day and increase volume', async () => {
      const testId = createTestId('advance');
      await warmupService.startWarmup(testId, 'tenant-1');
      const advanced = await warmupService.advanceDay(testId);

      expect(advanced?.currentDay).toBe(2);
      expect(advanced?.currentVolume).toBeGreaterThan(50);
    });
  });

  describe('pauseWarmup', () => {
    it('should pause the warmup', async () => {
      const testId = createTestId('pause');
      await warmupService.startWarmup(testId, 'tenant-1');
      const paused = await warmupService.pauseWarmup(testId, 'Testing pause');

      expect(paused?.status).toBe(IpWarmupStatus.PAUSED);
      expect(paused?.pauseReason).toBe('Testing pause');
    });
  });

  describe('resumeWarmup', () => {
    it('should resume a paused warmup', async () => {
      const testId = createTestId('resume');
      await warmupService.startWarmup(testId, 'tenant-1');
      await warmupService.pauseWarmup(testId);
      const resumed = await warmupService.resumeWarmup(testId);

      expect(resumed?.status).toBe(IpWarmupStatus.IN_PROGRESS);
      expect(resumed?.pauseReason).toBeUndefined();
    });
  });

  describe('getAllowedVolume', () => {
    it('should return current allowed volume', async () => {
      const testId = createTestId('allowed');
      const schedule = await warmupService.startWarmup(testId, 'tenant-1');
      const allowed = warmupService.getAllowedVolume(schedule);
      expect(allowed).toBe(50);
    });
  });

  describe('canSend', () => {
    it('should allow sending within volume limit', async () => {
      const testId = createTestId('cansend1');
      const schedule = await warmupService.startWarmup(testId, 'tenant-1');
      expect(warmupService.canSend(schedule, 30)).toBe(true);
    });

    it('should deny sending above volume limit', async () => {
      const testId = createTestId('cansend2');
      const schedule = await warmupService.startWarmup(testId, 'tenant-1');
      expect(warmupService.canSend(schedule, 100)).toBe(false);
    });

    it('should deny sending when paused', async () => {
      const testId = createTestId('cansend3');
      await warmupService.startWarmup(testId, 'tenant-1');
      await warmupService.pauseWarmup(testId);
      const pausedSchedule = await warmupService.getSchedule(testId);
      expect(warmupService.canSend(pausedSchedule!, 30)).toBe(false);
    });
  });
});
