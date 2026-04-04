import { describe, expect, it } from 'vitest';

import type { VerificationArtifact } from '@the-dmz/shared';
import {
  getValidityColor,
  getValidityLabel,
  formatTimestamp,
  getDocumentTypeLabel,
  extractIdentityData,
  extractOwnershipData,
  extractChainOfCustodyData,
} from '$lib/game/components/verification-packet';

const createMockArtifact = (
  overrides: Partial<VerificationArtifact> = {},
): VerificationArtifact => ({
  artifactId: 'artifact-1',
  documentType: 'id_document',
  title: 'Test Document',
  description: 'Test description',
  issuer: 'Test Issuer',
  issuedDate: '2026-01-01T00:00:00Z',
  validityIndicator: 'valid',
  metadata: {},
  ...overrides,
});

describe('verification-packet utilities', () => {
  describe('getValidityColor', () => {
    it('returns correct color for valid', () => {
      expect(getValidityColor('valid')).toBe('var(--color-safe)');
    });

    it('returns correct color for suspicious', () => {
      expect(getValidityColor('suspicious')).toBe('var(--color-warning)');
    });

    it('returns correct color for invalid', () => {
      expect(getValidityColor('invalid')).toBe('var(--color-danger)');
    });

    it('returns correct color for unknown', () => {
      expect(getValidityColor('unknown')).toBe('var(--color-archived)');
    });
  });

  describe('getValidityLabel', () => {
    it('returns correct label for valid', () => {
      expect(getValidityLabel('valid')).toBe('VALID');
    });

    it('returns correct label for suspicious', () => {
      expect(getValidityLabel('suspicious')).toBe('SUSPICIOUS');
    });

    it('returns correct label for invalid', () => {
      expect(getValidityLabel('invalid')).toBe('INVALID');
    });

    it('returns correct label for unknown', () => {
      expect(getValidityLabel('unknown')).toBe('UNKNOWN');
    });
  });

  describe('formatTimestamp', () => {
    it('formats timestamp correctly', () => {
      const result = formatTimestamp('2026-01-15T10:30:00Z');
      expect(result).toContain('Jan');
      expect(result).toContain('2026');
      expect(result).toContain(':30');
    });
  });

  describe('getDocumentTypeLabel', () => {
    it('returns correct label for id_document', () => {
      expect(getDocumentTypeLabel('id_document')).toBe('ID Document');
    });

    it('returns correct label for employee_badge', () => {
      expect(getDocumentTypeLabel('employee_badge')).toBe('Employee Badge');
    });

    it('returns correct label for account_record', () => {
      expect(getDocumentTypeLabel('account_record')).toBe('Account Record');
    });

    it('returns original value for unknown type', () => {
      expect(getDocumentTypeLabel('registration')).toBe('Registration');
    });
  });

  describe('extractIdentityData', () => {
    it('extracts identity data from artifacts', () => {
      const artifacts = [
        createMockArtifact({
          documentType: 'id_document',
          metadata: {
            requesterName: 'John Doe',
            requesterRole: 'Manager',
            organization: 'Test Corp',
            contactEmail: 'john@test.com',
          },
        }),
      ];

      const result = extractIdentityData(artifacts);

      expect(result.requesterName).toBe('John Doe');
      expect(result.requesterRole).toBe('Manager');
      expect(result.organization).toBe('Test Corp');
      expect(result.contactEmail).toBe('john@test.com');
    });

    it('returns verified status when id document is valid', () => {
      const artifacts = [
        createMockArtifact({
          documentType: 'id_document',
          validityIndicator: 'valid',
          metadata: { requesterName: 'John' },
        }),
      ];

      const result = extractIdentityData(artifacts);

      expect(result.verificationStatus).toBe('verified');
    });

    it('returns flagged status when id document is invalid', () => {
      const artifacts = [
        createMockArtifact({
          documentType: 'id_document',
          validityIndicator: 'invalid',
          metadata: {
            requesterName: 'John',
            claimedName: 'John Doe',
            verifiedName: 'Jane Smith',
          },
        }),
      ];

      const result = extractIdentityData(artifacts);

      expect(result.verificationStatus).toBe('flagged');
      expect(result.discrepancies.length).toBeGreaterThan(0);
    });

    it('returns unverified status when no id document', () => {
      const result = extractIdentityData([]);

      expect(result.verificationStatus).toBe('unverified');
    });
  });

  describe('extractOwnershipData', () => {
    it('extracts ownership data from artifacts', () => {
      const artifacts = [
        createMockArtifact({
          documentType: 'account_record',
          metadata: {
            assetName: 'Server Alpha',
            assetType: 'Infrastructure',
            currentOwner: 'IT Department',
            custodian: 'John Smith',
          },
        }),
      ];

      const result = extractOwnershipData(artifacts);

      expect(result.assetName).toBe('Server Alpha');
      expect(result.assetType).toBe('Infrastructure');
      expect(result.currentOwner).toBe('IT Department');
      expect(result.custodian).toBe('John Smith');
    });

    it('extracts authorization chain', () => {
      const authChain = [
        {
          id: 'auth-1',
          authorizedBy: 'CEO',
          role: 'Manager',
          authorizedDate: '2025-01-01T00:00:00Z',
          scope: 'full',
        },
      ];

      const artifacts = [
        createMockArtifact({
          documentType: 'account_record',
          metadata: { authorizationChain: authChain },
        }),
      ];

      const result = extractOwnershipData(artifacts);

      expect(result.authorizationChain.length).toBe(1);
      expect(result.authorizationChain[0]?.authorizedBy).toBe('CEO');
    });

    it('extracts previous access history', () => {
      const accessHistory = [
        {
          id: 'access-1',
          accessor: 'Jane Doe',
          accessDate: '2025-12-01T00:00:00Z',
          action: 'read',
          result: 'approved' as const,
        },
      ];

      const artifacts = [
        createMockArtifact({
          documentType: 'account_record',
          metadata: { previousAccessHistory: accessHistory },
        }),
      ];

      const result = extractOwnershipData(artifacts);

      expect(result.previousAccessHistory.length).toBe(1);
      expect(result.previousAccessHistory[0]?.accessor).toBe('Jane Doe');
    });

    it('detects discrepancies when validity is suspicious', () => {
      const artifacts = [
        createMockArtifact({
          documentType: 'account_record',
          validityIndicator: 'suspicious',
          metadata: {
            claimedOwner: 'John Doe',
            verifiedOwner: 'Jane Smith',
          },
        }),
      ];

      const result = extractOwnershipData(artifacts);

      expect(result.discrepancies.length).toBeGreaterThan(0);
      expect(result.discrepancies[0]?.severity).toBe('medium');
    });
  });

  describe('extractChainOfCustodyData', () => {
    it('extracts timeline data', () => {
      const timeline = [
        {
          id: 'timeline-1',
          timestamp: '2025-12-15T10:00:00Z',
          event: 'Request submitted',
          actor: 'John Doe',
          details: 'Initial request',
        },
      ];

      const artifacts = [
        createMockArtifact({
          documentType: 'approval_chain',
          metadata: { timeline },
        }),
      ];

      const result = extractChainOfCustodyData(artifacts);

      expect(result.timeline.length).toBe(1);
      expect(result.timeline[0]?.event).toBe('Request submitted');
    });

    it('extracts approvers data', () => {
      const approvers = [
        {
          id: 'approver-1',
          name: 'Jane Smith',
          role: 'Manager',
          approvalDate: '2025-12-16T10:00:00Z',
          status: 'approved' as const,
        },
      ];

      const artifacts = [
        createMockArtifact({
          documentType: 'approval_chain',
          metadata: { approvers },
        }),
      ];

      const result = extractChainOfCustodyData(artifacts);

      expect(result.approvers.length).toBe(1);
      expect(result.approvers[0]?.name).toBe('Jane Smith');
      expect(result.approvers[0]?.status).toBe('approved');
    });

    it('extracts audit trail data', () => {
      const auditTrail = [
        {
          id: 'audit-1',
          timestamp: '2025-12-15T10:00:00Z',
          action: 'Created',
          performedBy: 'System',
          result: 'Success',
        },
      ];

      const artifacts = [
        createMockArtifact({
          documentType: 'approval_chain',
          metadata: { auditTrail },
        }),
      ];

      const result = extractChainOfCustodyData(artifacts);

      expect(result.auditTrail.length).toBe(1);
      expect(result.auditTrail[0]?.action).toBe('Created');
    });

    it('detects discrepancies in approval chain', () => {
      const artifacts = [
        createMockArtifact({
          documentType: 'approval_chain',
          validityIndicator: 'invalid',
        }),
      ];

      const result = extractChainOfCustodyData(artifacts);

      expect(result.discrepancies.length).toBeGreaterThan(0);
      expect(result.discrepancies[0]?.severity).toBe('high');
    });
  });
});
