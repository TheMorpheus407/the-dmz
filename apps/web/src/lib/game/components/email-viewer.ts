import type { EmailInstance } from '@the-dmz/shared';

export type AuthResult = 'pass' | 'fail' | 'softfail' | 'none';

export interface AuthResultInfo {
  label: string;
  color: string;
}

export const AUTH_COLORS: Record<AuthResult, string> = {
  pass: 'var(--color-safe)',
  fail: 'var(--color-danger)',
  softfail: 'var(--color-warning)',
  none: 'var(--color-archived)',
};

export const AUTH_LABELS: Record<AuthResult, string> = {
  pass: 'PASS',
  fail: 'FAIL',
  softfail: 'SOFTFAIL',
  none: 'NONE',
};

export function getAuthResultInfo(result: AuthResult): AuthResultInfo {
  return {
    label: AUTH_LABELS[result],
    color: AUTH_COLORS[result],
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function extractDomain(emailAddress: string): string {
  const atIndex = emailAddress.indexOf('@');
  if (atIndex === -1) return emailAddress;
  return emailAddress.substring(atIndex + 1);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  };
  return date.toLocaleString('en-US', options);
}

export function truncateHash(hash: string, maxLength = 12): string {
  if (hash.length <= maxLength) return hash;
  return `${hash.substring(0, maxLength - 3)}...`;
}

export interface EmailViewerProps {
  email: EmailInstance | null;
  isLoading?: boolean;
  error?: string | null;
  onAttachmentClick?: (attachmentId: string) => void;
  onLinkClick?: (url: string) => void;
}

export function isEmailValid(email: EmailInstance | null): email is EmailInstance {
  if (!email) return false;
  if (!email.emailId) return false;
  if (!email.sender?.emailAddress) return false;
  return true;
}
