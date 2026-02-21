import {
  logoutResponseSchema,
  meResponseSchema,
  type LoginInput,
  type RegisterInput,
  type RefreshTokenInput,
  type LogoutResponse,
  type MeResponse,
} from '@the-dmz/shared/schemas';

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
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
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
          message: 'Invalid login response from server',
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

export async function refresh(
  tokens: RefreshTokenInput,
): Promise<{ data?: RefreshResponse; error?: CategorizedApiError }> {
  const result = await apiClient.post<RefreshResponse, RefreshTokenInput>('/auth/refresh', tokens);

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
  const result = await apiClient.delete<LogoutResponse>('/auth/logout');

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
