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
      return 'high';
    case 'rate_limiting':
    case 'server':
    case 'network':
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
