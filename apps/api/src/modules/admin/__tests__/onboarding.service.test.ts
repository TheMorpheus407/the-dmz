import { describe, expect, it } from 'vitest';

import {
  getNextStep,
  canProceedToStep,
  DEFAULT_ONBOARDING_STATE,
  STEP_ORDER,
  type OnboardingStep,
} from '../onboarding.service.js';

describe('onboarding-service', () => {
  describe('STEP_ORDER', () => {
    it('should have correct step order', () => {
      expect(STEP_ORDER).toEqual([
        'org_profile',
        'idp_config',
        'scim_token',
        'compliance',
        'complete',
      ]);
    });
  });

  describe('DEFAULT_ONBOARDING_STATE', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_ONBOARDING_STATE.currentStep).toBe('not_started');
      expect(DEFAULT_ONBOARDING_STATE.completedSteps).toEqual([]);
      expect(DEFAULT_ONBOARDING_STATE.startedAt).toBeNull();
      expect(DEFAULT_ONBOARDING_STATE.completedAt).toBeNull();
    });
  });

  describe('getNextStep', () => {
    it('should return org_profile when current is not_started', () => {
      const result = getNextStep('not_started');
      expect(result).toBe('org_profile');
    });

    it('should return idp_config when current is org_profile', () => {
      const result = getNextStep('org_profile');
      expect(result).toBe('idp_config');
    });

    it('should return scim_token when current is idp_config', () => {
      const result = getNextStep('idp_config');
      expect(result).toBe('scim_token');
    });

    it('should return compliance when current is scim_token', () => {
      const result = getNextStep('scim_token');
      expect(result).toBe('compliance');
    });

    it('should return complete when current is compliance', () => {
      const result = getNextStep('compliance');
      expect(result).toBe('complete');
    });

    it('should return null when current is complete', () => {
      const result = getNextStep('complete');
      expect(result).toBeNull();
    });
  });

  describe('canProceedToStep', () => {
    it('should allow proceeding to org_profile from not_started', () => {
      const state = { ...DEFAULT_ONBOARDING_STATE, currentStep: 'not_started' as OnboardingStep };
      expect(canProceedToStep(state, 'org_profile')).toBe(true);
    });

    it('should allow proceeding to org_profile when already on org_profile', () => {
      const state = { ...DEFAULT_ONBOARDING_STATE, currentStep: 'org_profile' as OnboardingStep };
      expect(canProceedToStep(state, 'org_profile')).toBe(true);
    });

    it('should NOT allow proceeding to idp_config without org_profile completed', () => {
      const state = {
        ...DEFAULT_ONBOARDING_STATE,
        currentStep: 'org_profile' as OnboardingStep,
        completedSteps: [] as OnboardingStep[],
      };
      expect(canProceedToStep(state, 'idp_config')).toBe(false);
    });

    it('should allow proceeding to idp_config with org_profile completed', () => {
      const state = {
        ...DEFAULT_ONBOARDING_STATE,
        currentStep: 'org_profile' as OnboardingStep,
        completedSteps: ['org_profile'] as OnboardingStep[],
      };
      expect(canProceedToStep(state, 'idp_config')).toBe(true);
    });

    it('should allow proceeding to scim_token with idp_config completed', () => {
      const state = {
        ...DEFAULT_ONBOARDING_STATE,
        currentStep: 'idp_config' as OnboardingStep,
        completedSteps: ['org_profile', 'idp_config'] as OnboardingStep[],
      };
      expect(canProceedToStep(state, 'scim_token')).toBe(true);
    });

    it('should NOT allow proceeding to scim_token without idp_config completed', () => {
      const state = {
        ...DEFAULT_ONBOARDING_STATE,
        currentStep: 'idp_config' as OnboardingStep,
        completedSteps: ['org_profile'] as OnboardingStep[],
      };
      expect(canProceedToStep(state, 'scim_token')).toBe(false);
    });

    it('should allow proceeding to compliance with scim_token completed', () => {
      const state = {
        ...DEFAULT_ONBOARDING_STATE,
        currentStep: 'scim_token' as OnboardingStep,
        completedSteps: ['org_profile', 'idp_config', 'scim_token'] as OnboardingStep[],
      };
      expect(canProceedToStep(state, 'compliance')).toBe(true);
    });

    it('should allow proceeding to complete with compliance completed', () => {
      const state = {
        ...DEFAULT_ONBOARDING_STATE,
        currentStep: 'compliance' as OnboardingStep,
        completedSteps: [
          'org_profile',
          'idp_config',
          'scim_token',
          'compliance',
        ] as OnboardingStep[],
      };
      expect(canProceedToStep(state, 'complete')).toBe(true);
    });
  });
});
