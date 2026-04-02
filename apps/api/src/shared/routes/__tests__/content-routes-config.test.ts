import { describe, expect, it } from 'vitest';

import { authGuard } from '../../middleware/authorization.js';
import { tenantContext } from '../../middleware/tenant-context.js';
import { tenantStatusGuard } from '../../middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../schemas/error-schemas.js';
import {
  protectedRoutePreHandlers,
  contentReadRoutePreHandlers,
  contentWriteRoutePreHandlers,
  analyticsReadRoutePreHandlers,
  adminReadRoutePreHandlers,
  adminWriteRoutePreHandlers,
  tenantInactiveOrForbiddenResponseJsonSchema,
} from '../content-routes-config.js';

describe('content-routes-config', () => {
  describe('protectedRoutePreHandlers identity and order', () => {
    it('has 3 handlers', () => {
      expect(protectedRoutePreHandlers).toHaveLength(3);
    });

    it('first handler is authGuard', () => {
      expect(protectedRoutePreHandlers[0]).toBe(authGuard);
    });

    it('second handler is tenantContext', () => {
      expect(protectedRoutePreHandlers[1]).toBe(tenantContext);
    });

    it('third handler is tenantStatusGuard', () => {
      expect(protectedRoutePreHandlers[2]).toBe(tenantStatusGuard);
    });
  });

  describe('contentReadRoutePreHandlers composition', () => {
    it('has 4 handlers', () => {
      expect(contentReadRoutePreHandlers).toHaveLength(4);
    });

    it('extends protectedRoutePreHandlers in correct order', () => {
      expect(contentReadRoutePreHandlers[0]).toBe(authGuard);
      expect(contentReadRoutePreHandlers[1]).toBe(tenantContext);
      expect(contentReadRoutePreHandlers[2]).toBe(tenantStatusGuard);
    });

    it('last element is permission handler for admin read', () => {
      expect(contentReadRoutePreHandlers[3]).toBeInstanceOf(Function);
    });
  });

  describe('contentWriteRoutePreHandlers composition', () => {
    it('has 4 handlers', () => {
      expect(contentWriteRoutePreHandlers).toHaveLength(4);
    });

    it('extends protectedRoutePreHandlers in correct order', () => {
      expect(contentWriteRoutePreHandlers[0]).toBe(authGuard);
      expect(contentWriteRoutePreHandlers[1]).toBe(tenantContext);
      expect(contentWriteRoutePreHandlers[2]).toBe(tenantStatusGuard);
    });

    it('last element is permission handler for admin write', () => {
      expect(contentWriteRoutePreHandlers[3]).toBeInstanceOf(Function);
    });
  });

  describe('analyticsReadRoutePreHandlers composition', () => {
    it('has 4 handlers', () => {
      expect(analyticsReadRoutePreHandlers).toHaveLength(4);
    });

    it('extends protectedRoutePreHandlers in correct order', () => {
      expect(analyticsReadRoutePreHandlers[0]).toBe(authGuard);
      expect(analyticsReadRoutePreHandlers[1]).toBe(tenantContext);
      expect(analyticsReadRoutePreHandlers[2]).toBe(tenantStatusGuard);
    });

    it('last element is permission handler for analytics read', () => {
      expect(analyticsReadRoutePreHandlers[3]).toBeInstanceOf(Function);
    });
  });

  describe('admin alias verification', () => {
    it('adminReadRoutePreHandlers references the same array as contentReadRoutePreHandlers', () => {
      expect(adminReadRoutePreHandlers).toBe(contentReadRoutePreHandlers);
    });

    it('adminWriteRoutePreHandlers references the same array as contentWriteRoutePreHandlers', () => {
      expect(adminWriteRoutePreHandlers).toBe(contentWriteRoutePreHandlers);
    });

    it('adminReadRoutePreHandlers has 4 handlers', () => {
      expect(adminReadRoutePreHandlers).toHaveLength(4);
    });

    it('adminWriteRoutePreHandlers has 4 handlers', () => {
      expect(adminWriteRoutePreHandlers).toHaveLength(4);
    });
  });

  describe('tenantInactiveOrForbiddenResponseJsonSchema structure', () => {
    it('has oneOf structure', () => {
      expect(tenantInactiveOrForbiddenResponseJsonSchema).toHaveProperty('oneOf');
    });

    it('oneOf contains exactly 2 schemas', () => {
      expect(tenantInactiveOrForbiddenResponseJsonSchema.oneOf).toHaveLength(2);
    });

    it('oneOf[0] is TenantInactive schema', () => {
      expect(tenantInactiveOrForbiddenResponseJsonSchema.oneOf[0]).toBe(
        errorResponseSchemas.TenantInactive,
      );
    });

    it('oneOf[1] is Forbidden schema', () => {
      expect(tenantInactiveOrForbiddenResponseJsonSchema.oneOf[1]).toBe(
        errorResponseSchemas.Forbidden,
      );
    });
  });
});
