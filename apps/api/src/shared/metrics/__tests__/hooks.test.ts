import { describe, it, expect, beforeEach } from 'vitest';

import { getAllMetrics, resetMetrics } from '../plugin.js';
import {
  recordQueueDepth,
  recordWebSocketConnection,
  recordWebSocketMessage,
  recordWebSocketLatency,
  recordGameSession,
  recordActiveGameSessions,
  recordAiGeneration,
  recordAiGenerationLatency,
  recordAiGenerationError,
} from '../hooks.js';

describe('Metrics Hooks', () => {
  beforeEach(() => {
    resetMetrics();
  });

  describe('recordQueueDepth', () => {
    it('should set queue depth gauge', () => {
      recordQueueDepth('test-queue', 100);
      const metrics = getAllMetrics();
      expect(metrics.gauges.get('queue_depth{queue_name="test-queue",tenant_id="none"}')).toBe(100);
    });

    it('should set queue depth with tenant ID', () => {
      recordQueueDepth('test-queue', 50, 'tenant-123');
      const metrics = getAllMetrics();
      expect(
        metrics.gauges.get('queue_depth{queue_name="test-queue",tenant_id="tenant-123"}'),
      ).toBe(50);
    });
  });

  describe('recordWebSocketConnection', () => {
    it('should track active connections', () => {
      recordWebSocketConnection('connect', 'tenant-1');
      const metrics = getAllMetrics();
      expect(metrics.gauges.get('websocket_active_connections{tenant_id="tenant-1"}')).toBe(1);
    });

    it('should decrement on disconnect', () => {
      recordWebSocketConnection('connect', 'tenant-1');
      recordWebSocketConnection('connect', 'tenant-1');
      recordWebSocketConnection('disconnect', 'tenant-1');
      const metrics = getAllMetrics();
      expect(metrics.gauges.get('websocket_active_connections{tenant_id="tenant-1"}')).toBe(1);
    });

    it('should not go below zero on disconnect', () => {
      recordWebSocketConnection('disconnect', 'tenant-1');
      const metrics = getAllMetrics();
      expect(metrics.gauges.get('websocket_active_connections{tenant_id="tenant-1"}')).toBe(0);
    });
  });

  describe('recordWebSocketMessage', () => {
    it('should increment sent messages counter', () => {
      recordWebSocketMessage('sent', 'tenant-1');
      const metrics = getAllMetrics();
      expect(
        metrics.counters.get('websocket_messages_total{direction="sent",tenant_id="tenant-1"}'),
      ).toBe(1);
    });

    it('should increment received messages counter', () => {
      recordWebSocketMessage('received', 'tenant-1');
      const metrics = getAllMetrics();
      expect(
        metrics.counters.get('websocket_messages_total{direction="received",tenant_id="tenant-1"}'),
      ).toBe(1);
    });
  });

  describe('recordWebSocketLatency', () => {
    it('should record latency histogram', () => {
      recordWebSocketLatency(50, 'MESSAGE', 'tenant-1');
      const metrics = getAllMetrics();
      const hist = metrics.histograms.get(
        'websocket_message_delivery_seconds{message_type="MESSAGE",tenant_id="tenant-1"}',
      );
      expect(hist).toBeDefined();
      expect(hist?.values.length).toBe(1);
    });
  });

  describe('recordGameSession', () => {
    it('should increment game session counter on start', () => {
      recordGameSession('start', 'tenant-1', 'standard');
      const metrics = getAllMetrics();
      expect(
        metrics.counters.get('game_sessions_total{game_mode="standard",tenant_id="tenant-1"}'),
      ).toBe(1);
    });

    it('should handle default game mode', () => {
      recordGameSession('start', 'tenant-1');
      const metrics = getAllMetrics();
      expect(
        metrics.counters.get('game_sessions_total{game_mode="default",tenant_id="tenant-1"}'),
      ).toBe(1);
    });
  });

  describe('recordActiveGameSessions', () => {
    it('should set active sessions gauge', () => {
      recordActiveGameSessions(10, 'playing', 'tenant-1');
      const metrics = getAllMetrics();
      expect(
        metrics.gauges.get('game_active_sessions{game_phase="playing",tenant_id="tenant-1"}'),
      ).toBe(10);
    });
  });

  describe('recordAiGeneration', () => {
    it('should increment AI generation counter', () => {
      recordAiGeneration('openai', 'email', 'success', 'tenant-1');
      const metrics = getAllMetrics();
      expect(
        metrics.counters.get(
          'ai_generation_total{content_type="email",provider="openai",status="success",tenant_id="tenant-1"}',
        ),
      ).toBe(1);
    });

    it('should track error status', () => {
      recordAiGeneration('openai', 'email', 'error', 'tenant-1');
      const metrics = getAllMetrics();
      expect(
        metrics.counters.get(
          'ai_generation_total{content_type="email",provider="openai",status="error",tenant_id="tenant-1"}',
        ),
      ).toBe(1);
    });
  });

  describe('recordAiGenerationLatency', () => {
    it('should record latency histogram', () => {
      recordAiGenerationLatency(500, 'openai', 'email', 'tenant-1');
      const metrics = getAllMetrics();
      const hist = metrics.histograms.get(
        'ai_generation_latency_seconds{content_type="email",provider="openai",tenant_id="tenant-1"}',
      );
      expect(hist).toBeDefined();
      expect(hist?.values.length).toBe(1);
    });
  });

  describe('recordAiGenerationError', () => {
    it('should increment error counter', () => {
      recordAiGenerationError('openai', 'rate_limit', 'tenant-1');
      const metrics = getAllMetrics();
      expect(
        metrics.counters.get(
          'ai_generation_errors_total{error_type="rate_limit",provider="openai",tenant_id="tenant-1"}',
        ),
      ).toBe(1);
    });
  });
});
