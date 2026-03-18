export interface CreateLtiPlatformInput {
  name: string;
  platformUrl: string;
  clientId: string;
  deploymentId?: string;
  publicKeysetUrl: string;
  authTokenUrl: string;
  authLoginUrl: string;
  toolUrl?: string;
}

export interface UpdateLtiPlatformInput {
  name?: string;
  platformUrl?: string;
  clientId?: string;
  deploymentId?: string;
  publicKeysetUrl?: string;
  authTokenUrl?: string;
  authLoginUrl?: string;
  toolUrl?: string;
  isActive?: boolean;
}

export interface CreateLtiLineItemInput {
  platformId: string;
  resourceLinkId?: string;
  label: string;
  scoreMaximum?: number;
  resourceId?: string;
  tag?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateLtiLineItemInput {
  label?: string;
  scoreMaximum?: number;
  resourceId?: string;
  tag?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateLtiScoreInput {
  lineItemId: string;
  userId: string;
  scoreGiven?: number;
  scoreMaximum?: number;
  activityProgress?: string;
  gradingProgress?: string;
  timestamp?: string;
}

export interface CreateLtiDeepLinkContentInput {
  platformId: string;
  contentType: string;
  title: string;
  url?: string;
  lineItemId?: string;
  customParams?: Record<string, unknown>;
  available?: boolean;
}

export interface UpdateLtiDeepLinkContentInput {
  contentType?: string;
  title?: string;
  url?: string;
  lineItemId?: string;
  customParams?: Record<string, unknown>;
  available?: boolean;
}

export interface LtiOidcLoginParams {
  iss: string;
  loginHint: string;
  targetLinkUri: string;
  ltiMessageHint?: string;
}

export interface LtiOidcInitResponse {
  url: string;
  state: string;
  nonce: string;
}

export interface LtiLaunchData {
  platformId: string;
  deploymentId: string;
  userId: string;
  roles: string[];
  resourceLinkId: string;
  contextId?: string;
  contextTitle?: string;
  lineItemUrl?: string;
  membershipUrl?: string;
  customParams?: Record<string, string>;
}

export const LTI_ROLES = {
  LEARNER: 'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner',
  INSTRUCTOR: 'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor',
  ADMIN: 'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator',
} as const;

export const ACTIVITY_PROGRESS = {
  INITIALIZED: 'initialized',
  STARTED: 'started',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  COMPLETED: 'completed',
} as const;

export const GRADING_PROGRESS = {
  PENDING: 'pending',
  FULLY_GRADED: 'FullyGraded',
  PENDING_MIGRATION: 'PendingMigration',
  FAILED: 'Failed',
} as const;
