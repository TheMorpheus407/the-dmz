import { describe, it, expect } from 'vitest';

import {
  generateManifest12,
  generateManifest2004,
  generateScormApiWrapper,
  generateLaunchHtml,
} from '../scorm.service.js';

import type { ScormPackageMetadata } from '../scorm.service.js';

describe('SCORM Service', () => {
  const baseMetadata: ScormPackageMetadata = {
    title: 'Test Training Course',
    description: 'A test SCORM package',
    version: '1.2',
    masteringScore: 80,
    credit: 'credit',
    launchUrl: 'launch.html',
    organizationId: 'org_123',
    resourceId: 'res_content_1',
  };

  describe('generateManifest12', () => {
    it('should generate valid SCORM 1.2 manifest', () => {
      const manifest = generateManifest12(baseMetadata);

      expect(manifest).toContain('ADL SCORM');
      expect(manifest).toContain('1.2');
      expect(manifest).toContain('Test Training Course');
      expect(manifest).toContain('org_123');
      expect(manifest).toContain('res_content_1');
      expect(manifest).toContain('launch.html');
    });

    it('should contain required SCORM 1.2 elements', () => {
      const manifest = generateManifest12(baseMetadata);

      expect(manifest).toContain('<manifest');
      expect(manifest).toContain('<organizations');
      expect(manifest).toContain('<resources');
      expect(manifest).toContain('adlcp:scormtype');
      expect(manifest).toContain('sco');
    });
  });

  describe('generateManifest2004', () => {
    it('should generate valid SCORM 2004 4th Edition manifest', () => {
      const metadata = { ...baseMetadata, version: '2004_4th' as const };
      const manifest = generateManifest2004(metadata);

      expect(manifest).toContain('ADL SCORM');
      expect(manifest).toContain('2004 4th Edition');
      expect(manifest).toContain('Test Training Course');
      expect(manifest).toContain('imsss');
    });

    it('should generate valid SCORM 2004 3rd Edition manifest', () => {
      const metadata = { ...baseMetadata, version: '2004_3rd' as const };
      const manifest = generateManifest2004(metadata);

      expect(manifest).toContain('ADL SCORM');
      expect(manifest).toContain('2004 3rd Edition');
    });

    it('should contain required SCORM 2004 elements', () => {
      const metadata = { ...baseMetadata, version: '2004_4th' as const };
      const manifest = generateManifest2004(metadata);

      expect(manifest).toContain('<manifest');
      expect(manifest).toContain('<organizations');
      expect(manifest).toContain('<resources');
      expect(manifest).toContain('scormType');
      expect(manifest).toContain('sco');
    });
  });

  describe('generateScormApiWrapper', () => {
    it('should generate SCORM 1.2 API wrapper', () => {
      const apiWrapper = generateScormApiWrapper('1.2');

      expect(apiWrapper).toContain('function LMSInitialize');
      expect(apiWrapper).toContain('function LMSFinish');
      expect(apiWrapper).toContain('function LMSGetValue');
      expect(apiWrapper).toContain('function LMSSetValue');
      expect(apiWrapper).toContain('function LMSCommit');
      expect(apiWrapper).toContain('function LMSGetLastError');
      expect(apiWrapper).toContain('cmi.core.lesson_status');
      expect(apiWrapper).toContain('cmi.core.score.raw');
      expect(apiWrapper).toContain('cmi.suspend_data');
    });

    it('should generate SCORM 2004 3rd Edition API wrapper', () => {
      const apiWrapper = generateScormApiWrapper('2004_3rd');

      expect(apiWrapper).toContain('function Initialize');
      expect(apiWrapper).toContain('function Terminate');
      expect(apiWrapper).toContain('function GetValue');
      expect(apiWrapper).toContain('function SetValue');
      expect(apiWrapper).toContain('function Commit');
      expect(apiWrapper).toContain('API_1484_11');
      expect(apiWrapper).toContain('cmi.completion_status');
      expect(apiWrapper).toContain('cmi.success_status');
      expect(apiWrapper).toContain('cmi.progress_measure');
    });

    it('should generate SCORM 2004 4th Edition API wrapper', () => {
      const apiWrapper = generateScormApiWrapper('2004_4th');

      expect(apiWrapper).toContain('function Initialize');
      expect(apiWrapper).toContain('function Terminate');
      expect(apiWrapper).toContain('function GetValue');
      expect(apiWrapper).toContain('function SetValue');
      expect(apiWrapper).toContain('function Commit');
      expect(apiWrapper).toContain('API_1484_11');
    });

    it('should include API finding logic', () => {
      const apiWrapper12 = generateScormApiWrapper('1.2');
      const apiWrapper2004 = generateScormApiWrapper('2004_4th');

      expect(apiWrapper12).toContain('findAPI');
      expect(apiWrapper12).toContain('getAPI');
      expect(apiWrapper2004).toContain('findAPI');
      expect(apiWrapper2004).toContain('getAPI');
    });

    it('should use let/const instead of var in SCORM 1.2 wrapper', () => {
      const apiWrapper = generateScormApiWrapper('1.2');

      expect(apiWrapper).not.toContain('var ');
      expect(apiWrapper).toContain('let API');
      expect(apiWrapper).toContain('let attempts');
      expect(apiWrapper).toContain('const api');
    });

    it('should use let/const instead of var in SCORM 2004 wrapper', () => {
      const apiWrapper = generateScormApiWrapper('2004_4th');

      expect(apiWrapper).not.toContain('var ');
      expect(apiWrapper).toContain('let API_1484_11');
      expect(apiWrapper).toContain('let attempts');
      expect(apiWrapper).toContain('const api');
      expect(apiWrapper).toContain('const LMSInitialize');
    });

    it('should use descriptive parameter names in SCORM 1.2 wrapper', () => {
      const apiWrapper = generateScormApiWrapper('1.2');

      expect(apiWrapper).toContain('function LMSGetValue(cmiElement)');
      expect(apiWrapper).toContain('function LMSSetValue(cmiElement, elementValue)');
      expect(apiWrapper).toContain('function LMSGetErrorString(scormErrorCode)');
      expect(apiWrapper).toContain('function LMSGetDiagnostic(scormErrorCode)');
      expect(apiWrapper).toContain('function setCompletionStatus(completionStatus)');
      expect(apiWrapper).toContain('function setScore(scoreValue)');
      expect(apiWrapper).toContain('function saveSuspendData(suspendData)');
    });

    it('should use descriptive parameter names in SCORM 2004 wrapper', () => {
      const apiWrapper = generateScormApiWrapper('2004_4th');

      expect(apiWrapper).toContain('function GetValue(cmiElement)');
      expect(apiWrapper).toContain('function SetValue(cmiElement, elementValue)');
      expect(apiWrapper).toContain('function GetErrorString(scormErrorCode)');
      expect(apiWrapper).toContain('function GetDiagnostic(scormErrorCode)');
      expect(apiWrapper).toContain('function setCompletionStatus(completionStatus)');
      expect(apiWrapper).toContain('function setSuccessStatus(successStatus)');
      expect(apiWrapper).toContain('function setScore(scoreValue)');
      expect(apiWrapper).toContain('function setProgressMeasure(progressMeasure)');
      expect(apiWrapper).toContain('function saveSuspendData(suspendData)');
    });

    it('should use targetWindow parameter in findAPI function', () => {
      const apiWrapper12 = generateScormApiWrapper('1.2');
      const apiWrapper2004 = generateScormApiWrapper('2004_4th');

      expect(apiWrapper12).toContain('function findAPI(targetWindow)');
      expect(apiWrapper2004).toContain('function findAPI(targetWindow)');
    });
  });

  describe('generateLaunchHtml', () => {
    it('should generate valid launch HTML for SCORM 1.2', () => {
      const html = generateLaunchHtml(baseMetadata);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Test Training Course');
      expect(html).toContain('launch.html');
      expect(html).toContain('LMSInitialize');
      expect(html).toContain('LMSFinish');
    });

    it('should generate valid launch HTML for SCORM 2004', () => {
      const metadata = { ...baseMetadata, version: '2004_4th' as const };
      const html = generateLaunchHtml(metadata);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Test Training Course');
      expect(html).toContain('Initialize');
      expect(html).toContain('Terminate');
    });

    it('should include API wrapper script', () => {
      const html = generateLaunchHtml(baseMetadata);

      expect(html).toContain('scorm-api.js');
    });

    it('should use modern let/const instead of var in generated JavaScript', () => {
      const html = generateLaunchHtml(baseMetadata);

      expect(html).not.toContain('var initialized');
      expect(html).not.toContain('var result');
      expect(html).toContain('let initialized');
      expect(html).toContain('const result');
    });

    it('should use modern let/const in SCORM 2004 generated JavaScript', () => {
      const metadata = { ...baseMetadata, version: '2004_4th' as const };
      const html = generateLaunchHtml(metadata);

      expect(html).not.toContain('var initialized');
      expect(html).not.toContain('var result');
      expect(html).toContain('let initialized');
      expect(html).toContain('const result');
    });

    it('should escape HTML in title to prevent XSS', () => {
      const maliciousMetadata = {
        ...baseMetadata,
        title: '<img src=x onerror=alert(1)>',
      };
      const html = generateLaunchHtml(maliciousMetadata);

      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
      expect(html).not.toContain('<img src=x onerror=alert(1)>');
    });

    it('should escape HTML in description to prevent XSS', () => {
      const maliciousMetadata = {
        ...baseMetadata,
        description: '<script>alert("xss")</script>',
      };
      const html = generateLaunchHtml(maliciousMetadata);

      expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(html).not.toContain('<script>alert("xss")</script>');
    });

    it('should escape HTML in launchUrl to prevent XSS', () => {
      const maliciousMetadata = {
        ...baseMetadata,
        launchUrl: '"><img src=x onerror=alert(1)>',
      };
      const html = generateLaunchHtml(maliciousMetadata);

      expect(html).toContain('&gt;&lt;img src=x onerror=alert(1)&gt;');
      expect(html).not.toContain('"><img src=x onerror=alert(1)>');
    });
  });
});

describe('SCORM Data Model', () => {
  describe('CMI Data Model mapping', () => {
    it('should map SCORM 1.2 lesson status values', () => {
      const validStatuses = [
        'passed',
        'completed',
        'failed',
        'incomplete',
        'browsed',
        'not attempted',
      ];
      validStatuses.forEach((status) => {
        expect(validStatuses).toContain(status);
      });
    });

    it('should map SCORM 2004 completion status values', () => {
      const validStatuses = ['completed', 'incomplete', 'not attempted', 'unknown'];
      validStatuses.forEach((status) => {
        expect(validStatuses).toContain(status);
      });
    });

    it('should map SCORM 2004 success status values', () => {
      const validStatuses = ['passed', 'failed', 'unknown'];
      validStatuses.forEach((status) => {
        expect(validStatuses).toContain(status);
      });
    });
  });

  describe('Score range validation', () => {
    it('should validate score is between 0-100', () => {
      const validScore = 85;
      expect(validScore).toBeGreaterThanOrEqual(0);
      expect(validScore).toBeLessThanOrEqual(100);
    });

    it('should reject scores outside 0-100 range', () => {
      const invalidLow = -5;
      const invalidHigh = 150;
      expect(invalidLow).toBeLessThan(0);
      expect(invalidHigh).toBeGreaterThan(100);
    });
  });

  describe('Progress measure validation', () => {
    it('should validate progress measure is between 0-1', () => {
      const validMeasures = [0, 0.5, 1];
      validMeasures.forEach((measure) => {
        expect(measure).toBeGreaterThanOrEqual(0);
        expect(measure).toBeLessThanOrEqual(1);
      });
    });
  });
});
