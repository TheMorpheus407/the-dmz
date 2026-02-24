import { routeOutcomeMessages, RouteOutcome, RouteGroup } from '@the-dmz/shared/auth';

import type { CategorizedApiError, ApiErrorCategory } from './types.js';

export type RouteSurface = 'game' | 'admin' | 'auth' | 'public';

export interface ErrorCopy {
  title: string;
  message: string;
  retryLabel?: string;
  dismissLabel?: string;
}

const GAME_ERROR_COPY: Record<ApiErrorCategory, ErrorCopy> = {
  authentication: {
    title: 'AUTH_FAILURE',
    message: 'Session token invalid or expired. Re-authenticate to continue.',
    retryLabel: 'RETRY_AUTH',
    dismissLabel: 'DISMISS',
  },
  authorization: {
    title: 'ACCESS_DENIED',
    message: 'Insufficient privileges for this operation. Access denied.',
    retryLabel: 'RETRY',
    dismissLabel: 'DISMISS',
  },
  validation: {
    title: 'INPUT_REJECTED',
    message: 'Data validation failed. Check input fields and retry.',
    retryLabel: 'RETRY',
    dismissLabel: 'DISMISS',
  },
  rate_limiting: {
    title: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests. System throttling active. Wait and retry.',
    retryLabel: 'RETRY_AFTER_DELAY',
    dismissLabel: 'DISMISS',
  },
  server: {
    title: 'SYSTEM_ERROR',
    message: 'Internal system failure. Report to admin if persists.',
    retryLabel: 'RETRY',
    dismissLabel: 'DISMISS',
  },
  network: {
    title: 'NETWORK_FAILURE',
    message: 'Connection lost. Re-establish link to continue.',
    retryLabel: 'RECONNECT',
    dismissLabel: 'DISMISS',
  },
  not_found: {
    title: 'LINK_BROKEN',
    message: 'Connection path no longer exists. Return to secure location.',
    retryLabel: 'RETURN_TO_BASE',
    dismissLabel: 'DISMISS',
  },
  tenant_blocked: {
    title: 'TENANT_SUSPENDED',
    message: 'Tenant access suspended. Contact administrator for restoration.',
    retryLabel: 'CONTACT_ADMIN',
    dismissLabel: 'DISMISS',
  },
  abuse: {
    title: 'ABUSE_DETECTED',
    message: 'Abuse detected. Contact administrator for details.',
    retryLabel: 'CONTACT_ADMIN',
    dismissLabel: 'DISMISS',
  },
};

const ADMIN_ERROR_COPY: Record<ApiErrorCategory, ErrorCopy> = {
  authentication: {
    title: 'Authentication Failed',
    message: 'Your session has expired. Please sign in again to continue.',
    retryLabel: 'Sign In',
    dismissLabel: 'Dismiss',
  },
  authorization: {
    title: 'Access Denied',
    message: 'You do not have permission to perform this action.',
    retryLabel: 'Go Back',
    dismissLabel: 'Dismiss',
  },
  validation: {
    title: 'Validation Error',
    message: 'Please check your input and try again.',
    retryLabel: 'Try Again',
    dismissLabel: 'Dismiss',
  },
  rate_limiting: {
    title: 'Rate Limit Exceeded',
    message: 'Too many requests. Please wait a moment before retrying.',
    retryLabel: 'Retry',
    dismissLabel: 'Dismiss',
  },
  server: {
    title: 'Server Error',
    message: 'An unexpected error occurred. Please try again later.',
    retryLabel: 'Retry',
    dismissLabel: 'Dismiss',
  },
  network: {
    title: 'Network Error',
    message: 'Unable to connect to the server. Please check your connection.',
    retryLabel: 'Retry',
    dismissLabel: 'Dismiss',
  },
  not_found: {
    title: 'Resource Not Found',
    message: 'The requested resource does not exist or has been removed.',
    retryLabel: 'Go to Dashboard',
    dismissLabel: 'Dismiss',
  },
  tenant_blocked: {
    title: 'Tenant Suspended',
    message: 'This tenant is currently suspended. Please contact support.',
    retryLabel: 'Contact Support',
    dismissLabel: 'Dismiss',
  },
  abuse: {
    title: 'Abuse Detected',
    message: 'Abusive activity has been detected. Please contact support.',
    retryLabel: 'Contact Support',
    dismissLabel: 'Dismiss',
  },
};

const AUTH_ERROR_COPY: Record<ApiErrorCategory, ErrorCopy> = {
  authentication: {
    title: 'Sign In Failed',
    message: 'Invalid email or password. Please try again.',
    retryLabel: 'Try Again',
  },
  authorization: {
    title: 'Account Restricted',
    message: 'Your account does not have access to this resource.',
    retryLabel: 'Go to Home',
  },
  validation: {
    title: 'Check Your Input',
    message: 'Please correct the errors and try again.',
    retryLabel: 'Try Again',
  },
  rate_limiting: {
    title: 'Too Many Attempts',
    message: 'Please wait a moment before trying again.',
    retryLabel: 'Try Again',
  },
  server: {
    title: 'Something Went Wrong',
    message: 'Please try again in a few moments.',
    retryLabel: 'Try Again',
  },
  network: {
    title: 'Connection Issue',
    message: 'Please check your internet connection.',
    retryLabel: 'Try Again',
  },
  not_found: {
    title: 'Page Not Found',
    message: 'This page does not exist.',
    retryLabel: 'Go to Home',
  },
  tenant_blocked: {
    title: 'Account Suspended',
    message: 'Your account has been suspended. Please contact support.',
    retryLabel: 'Contact Support',
  },
  abuse: {
    title: 'Activity Restricted',
    message: 'Your activity has been flagged. Please contact support.',
    retryLabel: 'Contact Support',
  },
};

const PUBLIC_ERROR_COPY: Record<ApiErrorCategory, ErrorCopy> = {
  authentication: {
    title: 'Please Sign In',
    message: 'You need to be signed in to access this page.',
    retryLabel: 'Sign In',
  },
  authorization: {
    title: 'Access Restricted',
    message: 'You do not have permission to view this content.',
    retryLabel: 'Go Home',
  },
  validation: {
    title: 'Invalid Input',
    message: 'Please check your information and try again.',
    retryLabel: 'Try Again',
  },
  rate_limiting: {
    title: 'Please Wait',
    message: 'Please wait a moment before trying again.',
    retryLabel: 'Try Again',
  },
  server: {
    title: 'Server Unavailable',
    message: 'We are having trouble. Please try again later.',
    retryLabel: 'Try Again',
  },
  network: {
    title: 'No Connection',
    message: 'Please check your internet connection.',
    retryLabel: 'Try Again',
  },
  not_found: {
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.',
    retryLabel: 'Go Home',
  },
  tenant_blocked: {
    title: 'Service Unavailable',
    message: 'This service is currently unavailable.',
    retryLabel: 'Go Home',
  },
  abuse: {
    title: 'Activity Restricted',
    message: 'Your activity has been flagged.',
    retryLabel: 'Go Home',
  },
};

const SURFACE_COPY_MAP: Record<RouteSurface, Record<ApiErrorCategory, ErrorCopy>> = {
  game: GAME_ERROR_COPY,
  admin: ADMIN_ERROR_COPY,
  auth: AUTH_ERROR_COPY,
  public: PUBLIC_ERROR_COPY,
};

export function getErrorCopy(error: CategorizedApiError, surface: RouteSurface): ErrorCopy {
  const surfaceCopy = SURFACE_COPY_MAP[surface];
  const categoryCopy = surfaceCopy[error.category];

  if (error.details?.['field'] && (surface === 'game' || surface === 'admin')) {
    const fieldValue = error.details['field'];
    return {
      ...categoryCopy,
      message: `${categoryCopy.message} [Field: ${
        typeof fieldValue === 'string' ? fieldValue : JSON.stringify(fieldValue)
      }]`,
    };
  }

  if (error.requestId && surface === 'admin') {
    return {
      ...categoryCopy,
      message: `${categoryCopy.message} (Request ID: ${error.requestId})`,
    };
  }

  return categoryCopy;
}

export function getSurfaceFromPath(path: string): RouteSurface {
  if (path.startsWith('/game') || path.startsWith('/(game)')) {
    return 'game';
  }
  if (path.startsWith('/admin') || path.startsWith('/(admin)')) {
    return 'admin';
  }
  if (path.startsWith('/login') || path.startsWith('/register') || path.startsWith('/(auth)')) {
    return 'auth';
  }
  return 'public';
}

export function getSeverity(category: ApiErrorCategory): 'low' | 'medium' | 'high' {
  switch (category) {
    case 'authentication':
    case 'authorization':
    case 'abuse':
      return 'high';
    case 'rate_limiting':
    case 'server':
    case 'network':
    case 'tenant_blocked':
      return 'medium';
    case 'validation':
      return 'low';
    default:
      return 'medium';
  }
}

export function getAriaLivePriority(category: ApiErrorCategory): 'polite' | 'assertive' {
  const severity = getSeverity(category);
  return severity === 'high' ? 'assertive' : 'polite';
}

const routeGroupMap: Record<RouteSurface, RouteGroup> = {
  game: RouteGroup.GAME,
  admin: RouteGroup.ADMIN,
  auth: RouteGroup.AUTH,
  public: RouteGroup.PUBLIC,
};

export function getErrorCopyForOutcome(outcome: RouteOutcome, surface: RouteSurface): ErrorCopy {
  const routeGroup = routeGroupMap[surface];
  const outcomeCopy = routeOutcomeMessages[outcome][routeGroup];
  return {
    title: outcomeCopy.title,
    message: outcomeCopy.message,
    retryLabel: outcomeCopy.recoveryAction,
  };
}

export function getOutcomeFromStatus(status: number): RouteOutcome | null {
  switch (status) {
    case 401:
      return RouteOutcome.UNAUTHENTICATED;
    case 403:
      return RouteOutcome.FORBIDDEN;
    case 404:
      return RouteOutcome.NOT_FOUND;
    default:
      return null;
  }
}

export function mapStatusToErrorCategory(status: number): ApiErrorCategory {
  switch (status) {
    case 401:
      return 'authentication';
    case 403:
      return 'authorization';
    case 404:
      return 'not_found';
    default:
      return 'server';
  }
}
