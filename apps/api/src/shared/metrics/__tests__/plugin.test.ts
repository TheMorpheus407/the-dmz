import { describe, it, expect, beforeEach } from 'vitest';

import {
  incrementCounter,
  observeHistogram,
  setGauge,
  getAllMetrics,
  resetMetrics,
} from '../plugin.js';

describe('Metrics Plugin', () => {
  beforeEach(() => {
    resetMetrics();
  });

  describe('incrementCounter', () => {
    it('should increment a counter', () => {
      incrementCounter('test_counter', { label: 'value' });
      const metrics = getAllMetrics();
      expect(metrics.counters.get('test_counter{label="value"}')).toBe(1);
    });

    it('should increment multiple times', () => {
      incrementCounter('test_counter', { label: 'value' });
      incrementCounter('test_counter', { label: 'value' });
      const metrics = getAllMetrics();
      expect(metrics.counters.get('test_counter{label="value"}')).toBe(2);
    });

    it('should handle different labels separately', () => {
      incrementCounter('test_counter', { label: 'a' });
      incrementCounter('test_counter', { label: 'b' });
      const metrics = getAllMetrics();
      expect(metrics.counters.get('test_counter{label="a"}')).toBe(1);
      expect(metrics.counters.get('test_counter{label="b"}')).toBe(1);
    });
  });

  describe('setGauge', () => {
    it('should set a gauge value', () => {
      setGauge('test_gauge', 10, { label: 'value' });
      const metrics = getAllMetrics();
      expect(metrics.gauges.get('test_gauge{label="value"}')).toBe(10);
    });

    it('should overwrite existing gauge value', () => {
      setGauge('test_gauge', 10, { label: 'value' });
      setGauge('test_gauge', 20, { label: 'value' });
      const metrics = getAllMetrics();
      expect(metrics.gauges.get('test_gauge{label="value"}')).toBe(20);
    });
  });

  describe('observeHistogram', () => {
    it('should record histogram values', () => {
      observeHistogram('test_histogram', 0.1, { label: 'value' });
      const metrics = getAllMetrics();
      const hist = metrics.histograms.get('test_histogram{label="value"}');
      expect(hist).toBeDefined();
      expect(hist?.values).toContain(0.1);
    });

    it('should update bucket counts', () => {
      observeHistogram('test_histogram', 0.1, { label: 'value' });
      const metrics = getAllMetrics();
      const hist = metrics.histograms.get('test_histogram{label="value"}');
      expect(hist?.buckets.get(0.1)).toBe(1);
      expect(hist?.buckets.get(0.05)).toBe(0);
      expect(hist?.buckets.get(0.2)).toBe(1);
    });

    it('should handle multiple observations', () => {
      observeHistogram('test_histogram', 0.05, { label: 'value' });
      observeHistogram('test_histogram', 0.15, { label: 'value' });
      const metrics = getAllMetrics();
      const hist = metrics.histograms.get('test_histogram{label="value"}');
      expect(hist?.values.length).toBe(2);
    });
  });

  describe('resetMetrics', () => {
    it('should clear all metrics', () => {
      incrementCounter('test_counter', { label: 'value' });
      setGauge('test_gauge', 10, { label: 'value' });
      observeHistogram('test_histogram', 0.1, { label: 'value' });

      resetMetrics();

      const metrics = getAllMetrics();
      expect(metrics.counters.size).toBe(0);
      expect(metrics.gauges.size).toBe(0);
      expect(metrics.histograms.size).toBe(0);
    });
  });
});
