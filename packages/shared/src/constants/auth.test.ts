import { describe, expect, it } from 'vitest';

import {
  SERVICE_ACCOUNT_STATUS_ACTIVE,
  SERVICE_ACCOUNT_STATUS_DISABLED,
  SERVICE_ACCOUNT_STATUS_DELETED,
  serviceAccountStatuses,
  type ServiceAccountStatus,
} from './auth.js';

describe('auth constants', () => {
  describe('SERVICE_ACCOUNT_STATUS_ACTIVE', () => {
    it('is active string', () => {
      expect(SERVICE_ACCOUNT_STATUS_ACTIVE).toBe('active');
    });
  });

  describe('SERVICE_ACCOUNT_STATUS_DISABLED', () => {
    it('is disabled string', () => {
      expect(SERVICE_ACCOUNT_STATUS_DISABLED).toBe('disabled');
    });
  });

  describe('SERVICE_ACCOUNT_STATUS_DELETED', () => {
    it('is deleted string', () => {
      expect(SERVICE_ACCOUNT_STATUS_DELETED).toBe('deleted');
    });
  });

  describe('serviceAccountStatuses', () => {
    it('contains all status values', () => {
      expect(serviceAccountStatuses).toContain('active');
      expect(serviceAccountStatuses).toContain('disabled');
      expect(serviceAccountStatuses).toContain('deleted');
    });

    it('has exactly 3 statuses', () => {
      expect(serviceAccountStatuses).toHaveLength(3);
    });

    it('is a readonly tuple', () => {
      expect(serviceAccountStatuses).toEqual(['active', 'disabled', 'deleted'] as const);
    });
  });

  describe('ServiceAccountStatus type', () => {
    it('allows only valid status values', () => {
      const activeStatus: ServiceAccountStatus = SERVICE_ACCOUNT_STATUS_ACTIVE;
      const disabledStatus: ServiceAccountStatus = SERVICE_ACCOUNT_STATUS_DISABLED;
      const deletedStatus: ServiceAccountStatus = SERVICE_ACCOUNT_STATUS_DELETED;

      expect(activeStatus).toBe('active');
      expect(disabledStatus).toBe('disabled');
      expect(deletedStatus).toBe('deleted');
    });
  });
});
