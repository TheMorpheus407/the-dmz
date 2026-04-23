import {
  coopSessionBootstrapSchema,
  coopDecisionProposalSchema,
  type CoopSessionBootstrap,
  type CoopDecisionProposal,
  type CoopProposalAction,
  type CoopRole,
  type ConflictReason,
} from '@the-dmz/shared/schemas';

import { apiClient } from './client.js';
import { createInvalidResponseError } from './errors.js';

import type { CategorizedApiError } from './types.js';

export type CoopSessionResponse = {
  data: CoopSessionBootstrap;
};

export type CoopProposalResponse = {
  data: CoopDecisionProposal;
};

export type SubmitProposalRequest = {
  emailId: string;
  action: CoopProposalAction;
};

export type ConfirmProposalRequest = {
  proposalId: string;
};

export type OverrideProposalRequest = {
  proposalId: string;
  conflictReason: ConflictReason;
};

export async function getCoopSession(
  sessionId: string,
): Promise<{ data?: CoopSessionBootstrap; error?: CategorizedApiError }> {
  const result = await apiClient.get<CoopSessionResponse>(`/coop/sessions/${sessionId}`);

  if (result.error) {
    return { error: result.error };
  }

  if (result.data) {
    const validation = coopSessionBootstrapSchema.safeParse(result.data.data);
    if (!validation.success) {
      return { error: createInvalidResponseError('Invalid co-op session response from server') };
    }
    return { data: result.data.data };
  }

  return { error: createInvalidResponseError('No data received from server') };
}

export async function createCoopSession(): Promise<{
  data?: CoopSessionBootstrap;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.post<CoopSessionResponse>('/coop/sessions', undefined);

  if (result.error) {
    return { error: result.error };
  }

  if (result.data) {
    const validation = coopSessionBootstrapSchema.safeParse(result.data.data);
    if (!validation.success) {
      return {
        error: createInvalidResponseError('Invalid co-op session creation response from server'),
      };
    }
    return { data: result.data.data };
  }

  return { error: createInvalidResponseError('No data received from server') };
}

export async function assignCoopRoles(
  sessionId: string,
  roles: Array<{ playerId: string; role: CoopRole }>,
): Promise<{ data?: CoopSessionBootstrap; error?: CategorizedApiError }> {
  const result = await apiClient.post<CoopSessionResponse>(`/coop/sessions/${sessionId}/roles`, {
    roles,
  });

  if (result.error) {
    return { error: result.error };
  }

  if (result.data) {
    const validation = coopSessionBootstrapSchema.safeParse(result.data.data);
    if (!validation.success) {
      return {
        error: createInvalidResponseError('Invalid co-op role assignment response from server'),
      };
    }
    return { data: result.data.data };
  }

  return { error: createInvalidResponseError('No data received from server') };
}

export async function submitProposal(
  sessionId: string,
  request: SubmitProposalRequest,
): Promise<{ data?: CoopDecisionProposal; error?: CategorizedApiError }> {
  const result = await apiClient.post<CoopProposalResponse>(
    `/coop/sessions/${sessionId}/proposals`,
    request,
  );

  if (result.error) {
    return { error: result.error };
  }

  if (result.data) {
    const validation = coopDecisionProposalSchema.safeParse(result.data.data);
    if (!validation.success) {
      return { error: createInvalidResponseError('Invalid proposal response from server') };
    }
    return { data: result.data.data };
  }

  return { error: createInvalidResponseError('No data received from server') };
}

export async function confirmProposal(
  sessionId: string,
  request: ConfirmProposalRequest,
): Promise<{ data?: CoopDecisionProposal; error?: CategorizedApiError }> {
  const result = await apiClient.post<CoopProposalResponse>(
    `/coop/sessions/${sessionId}/confirm`,
    request,
  );

  if (result.error) {
    return { error: result.error };
  }

  if (result.data) {
    const validation = coopDecisionProposalSchema.safeParse(result.data.data);
    if (!validation.success) {
      return { error: createInvalidResponseError('Invalid confirm response from server') };
    }
    return { data: result.data.data };
  }

  return { error: createInvalidResponseError('No data received from server') };
}

export async function overrideProposal(
  sessionId: string,
  request: OverrideProposalRequest,
): Promise<{ data?: CoopDecisionProposal; error?: CategorizedApiError }> {
  const result = await apiClient.post<CoopProposalResponse>(
    `/coop/sessions/${sessionId}/override`,
    request,
  );

  if (result.error) {
    return { error: result.error };
  }

  if (result.data) {
    const validation = coopDecisionProposalSchema.safeParse(result.data.data);
    if (!validation.success) {
      return { error: createInvalidResponseError('Invalid override response from server') };
    }
    return { data: result.data.data };
  }

  return { error: createInvalidResponseError('No data received from server') };
}

export async function advanceCoopDay(
  sessionId: string,
): Promise<{ data?: CoopSessionBootstrap; error?: CategorizedApiError }> {
  const result = await apiClient.post<CoopSessionResponse>(
    `/coop/sessions/${sessionId}/advance-day`,
    undefined,
  );

  if (result.error) {
    return { error: result.error };
  }

  if (result.data) {
    const validation = coopSessionBootstrapSchema.safeParse(result.data.data);
    if (!validation.success) {
      return { error: createInvalidResponseError('Invalid advance day response from server') };
    }
    return { data: result.data.data };
  }

  return { error: createInvalidResponseError('No data received from server') };
}

export async function endCoopSession(sessionId: string): Promise<{ error?: CategorizedApiError }> {
  const result = await apiClient.post(`/coop/sessions/${sessionId}/end`, undefined);

  if (result.error) {
    return { error: result.error };
  }

  return {};
}

export async function abandonCoopSession(
  sessionId: string,
): Promise<{ error?: CategorizedApiError }> {
  const result = await apiClient.delete(`/coop/sessions/${sessionId}`);

  if (result.error) {
    return { error: result.error };
  }

  return {};
}

export async function rotateAuthority(
  sessionId: string,
  newAuthorityPlayerId: string,
): Promise<{ data?: CoopSessionBootstrap; error?: CategorizedApiError }> {
  const result = await apiClient.put<CoopSessionResponse>(`/coop/sessions/${sessionId}/authority`, {
    newAuthorityPlayerId,
  });

  if (result.error) {
    return { error: result.error };
  }

  if (result.data) {
    const validation = coopSessionBootstrapSchema.safeParse(result.data.data);
    if (!validation.success) {
      return {
        error: createInvalidResponseError('Invalid authority rotation response from server'),
      };
    }
    return { data: result.data.data };
  }

  return { error: createInvalidResponseError('No data received from server') };
}
