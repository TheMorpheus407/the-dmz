import {
  logoutResponseSchema,
  meResponseSchema,
  type LoginInput,
  type RegisterInput,
  type LogoutResponse,
  type MeResponse,
  type MfaStatusResponse,
  type WebauthnChallengeResponse,
  type WebauthnRegistrationResponse,
  type WebauthnVerificationResponse,
  type WebauthnCredentialsListResponse,
} from '@the-dmz/shared/schemas';
import type { ThemeName, EffectState } from '$lib/stores/theme';

import { apiClient } from './client.js';

import type { CategorizedApiError } from './types.js';

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
    tenantId: string;
    role: string;
    isActive: boolean;
  };
  accessToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export async function login(
  credentials: LoginInput,
): Promise<{ data?: AuthResponse; error?: CategorizedApiError }> {
  const result = await apiClient.post<AuthResponse, LoginInput>('/auth/login', credentials);

  if (result.error) {
    return { error: result.error };
  }

  if (result.data) {
    if (!result.data.user || !result.data.accessToken) {
      return {
        error: {
          category: 'server',
          code: 'INVALID_RESPONSE',
          message: 'No data received from server',
          status: 500,
          retryable: false,
        },
      };
    }

    return { data: result.data };
  }

  return {
    error: {
      category: 'server',
      code: 'INVALID_RESPONSE',
      message: 'No data received from server',
      status: 500,
      retryable: false,
    },
  };
}

export interface UpdatePreferencesInput {
  themePreferences?: {
    theme?: ThemeName;
    enableTerminalEffects?: boolean;
    effects?: EffectState;
    fontSize?: number;
  };
  accessibilityPreferences?: {
    reducedMotion?: boolean;
    highContrast?: boolean;
    fontSize?: number;
  };
}

export async function updatePreferences(
  preferences: UpdatePreferencesInput,
): Promise<{ data?: Record<string, unknown>; error?: CategorizedApiError }> {
  const result = await apiClient.patch<Record<string, unknown>, UpdatePreferencesInput>(
    '/auth/profile',
    preferences,
  );

  if (result.error) {
    return { error: result.error };
  }

  if (result.data) {
    return { data: result.data };
  }

  return {
    error: {
      category: 'server',
      code: 'INVALID_RESPONSE',
      message: 'No data received from server',
      status: 500,
      retryable: false,
    },
  };
}

export async function register(
  credentials: RegisterInput,
): Promise<{ data?: AuthResponse; error?: CategorizedApiError }> {
  const result = await apiClient.post<AuthResponse, RegisterInput>('/auth/register', credentials);

  if (result.error) {
    return { error: result.error };
  }

  if (result.data) {
    if (!result.data.user || !result.data.accessToken) {
      return {
        error: {
          category: 'server',
          code: 'INVALID_RESPONSE',
          message: 'Invalid register response from server',
          status: 500,
          retryable: false,
        },
      };
    }
    return { data: result.data };
  }

  return {
    error: {
      category: 'server',
      code: 'INVALID_RESPONSE',
      message: 'No data received from server',
      status: 500,
      retryable: false,
    },
  };
}

export async function refresh(): Promise<{ data?: RefreshResponse; error?: CategorizedApiError }> {
  const csrfToken = apiClient.getCsrfToken();

  const result = await apiClient.post<RefreshResponse>('/auth/refresh', undefined, {
    headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
  });

  if (result.error) {
    return { error: result.error };
  }

  if (result.data) {
    if (!result.data.accessToken) {
      return {
        error: {
          category: 'server',
          code: 'INVALID_RESPONSE',
          message: 'Invalid refresh response from server',
          status: 500,
          retryable: false,
        },
      };
    }
    return { data: result.data };
  }

  return {
    error: {
      category: 'server',
      code: 'INVALID_RESPONSE',
      message: 'No data received from server',
      status: 500,
      retryable: false,
    },
  };
}

export async function logout(): Promise<{ data?: LogoutResponse; error?: CategorizedApiError }> {
  const csrfToken = apiClient.getCsrfToken();

  const result = await apiClient.delete<LogoutResponse>('/auth/logout', {
    headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
  });

  if (result.error) {
    return { error: result.error };
  }

  if (result.data) {
    const validation = logoutResponseSchema.safeParse(result.data);
    if (!validation.success) {
      return {
        error: {
          category: 'server',
          code: 'INVALID_RESPONSE',
          message: 'Invalid logout response from server',
          status: 500,
          retryable: false,
        },
      };
    }
    return { data: result.data };
  }

  return {
    error: {
      category: 'server',
      code: 'INVALID_RESPONSE',
      message: 'No data received from server',
      status: 500,
      retryable: false,
    },
  };
}

export async function getCurrentUser(): Promise<{
  data?: MeResponse;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.get<MeResponse>('/auth/me');

  if (result.error) {
    return { error: result.error };
  }

  if (result.data) {
    const validation = meResponseSchema.safeParse(result.data);
    if (!validation.success) {
      return {
        error: {
          category: 'server',
          code: 'INVALID_RESPONSE',
          message: 'Invalid me response from server',
          status: 500,
          retryable: false,
        },
      };
    }
    return { data: result.data };
  }

  return {
    error: {
      category: 'server',
      code: 'INVALID_RESPONSE',
      message: 'No data received from server',
      status: 500,
      retryable: false,
    },
  };
}

export type WebauthnChallengeRequest = {
  challengeType: 'registration' | 'verification';
};

export async function getMfaStatus(): Promise<{
  data?: MfaStatusResponse;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.get<MfaStatusResponse>('/auth/mfa/status');

  if (result.error) {
    return { error: result.error };
  }

  if (result.data) {
    return { data: result.data };
  }

  return {
    error: {
      category: 'server',
      code: 'INVALID_RESPONSE',
      message: 'No data received from server',
      status: 500,
      retryable: false,
    },
  };
}

export async function createWebauthnChallenge(request: WebauthnChallengeRequest): Promise<{
  data?: WebauthnChallengeResponse;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.post<WebauthnChallengeResponse, WebauthnChallengeRequest>(
    '/auth/mfa/webauthn/challenge',
    request,
  );

  if (result.error) {
    return { error: result.error };
  }

  if (result.data) {
    return { data: result.data };
  }

  return {
    error: {
      category: 'server',
      code: 'INVALID_RESPONSE',
      message: 'No data received from server',
      status: 500,
      retryable: false,
    },
  };
}

export type WebauthnRegistrationRequest = {
  credential: {
    id: string;
    rawId: string;
    type: 'public-key';
    response: {
      clientDataJSON: string;
      attestationObject: string;
      transports?: string[];
    };
    clientExtensionResults?: Record<string, unknown>;
  };
  challengeId: string;
};

export async function registerWebauthnCredential(request: WebauthnRegistrationRequest): Promise<{
  data?: WebauthnRegistrationResponse;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.post<WebauthnRegistrationResponse, WebauthnRegistrationRequest>(
    '/auth/mfa/webauthn/register',
    request,
  );

  if (result.error) {
    return { error: result.error };
  }

  if (result.data) {
    return { data: result.data };
  }

  return {
    error: {
      category: 'server',
      code: 'INVALID_RESPONSE',
      message: 'No data received from server',
      status: 500,
      retryable: false,
    },
  };
}

export type WebauthnVerificationRequest = {
  credential: {
    id: string;
    rawId: string;
    type: 'public-key';
    response: {
      clientDataJSON: string;
      authenticatorData: string;
      signature: string;
      userHandle?: string;
    };
    clientExtensionResults?: Record<string, unknown>;
  };
  challengeId: string;
};

export async function verifyWebauthnAssertion(request: WebauthnVerificationRequest): Promise<{
  data?: WebauthnVerificationResponse;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.post<WebauthnVerificationResponse, WebauthnVerificationRequest>(
    '/auth/mfa/webauthn/verify',
    request,
  );

  if (result.error) {
    return { error: result.error };
  }

  if (result.data) {
    return { data: result.data };
  }

  return {
    error: {
      category: 'server',
      code: 'INVALID_RESPONSE',
      message: 'No data received from server',
      status: 500,
      retryable: false,
    },
  };
}

export async function listWebauthnCredentials(): Promise<{
  data?: WebauthnCredentialsListResponse;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.get<WebauthnCredentialsListResponse>(
    '/auth/mfa/webauthn/credentials',
  );

  if (result.error) {
    return { error: result.error };
  }

  if (result.data) {
    return { data: result.data };
  }

  return {
    error: {
      category: 'server',
      code: 'INVALID_RESPONSE',
      message: 'No data received from server',
      status: 500,
      retryable: false,
    },
  };
}

export async function deleteWebauthnCredential(
  credentialId: string,
): Promise<{ error?: CategorizedApiError }> {
  const result = await apiClient.delete<void>(`/auth/mfa/webauthn/credentials/${credentialId}`);

  if (result.error) {
    return { error: result.error };
  }

  return {};
}
