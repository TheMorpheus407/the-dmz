import { apiClient } from './client.js';
import { createInvalidResponseError } from './errors.js';

import type { CategorizedApiError } from './types.js';

export interface SAMLProviderConfig {
  id: string;
  tenantId: string;
  name: string;
  provider: 'saml';
  metadataUrl: string;
  idpCertificate: string | null;
  spCertificate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SAMLProviderListResponse {
  providers: SAMLProviderConfig[];
}

export interface SAMLProviderResponse {
  id: string;
  tenantId: string;
  name: string;
  provider: 'saml';
  metadataUrl: string;
  idpCertificate: string | null;
  spCertificate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSAMLProviderRequest {
  name: string;
  metadataUrl: string;
  idpCertificate?: string;
  spPrivateKey?: string;
  spCertificate?: string;
}

export interface UpdateSAMLProviderRequest {
  name?: string;
  metadataUrl?: string;
  idpCertificate?: string | null;
  spPrivateKey?: string | null;
  spCertificate?: string | null;
  isActive?: boolean;
}

export interface SAMLTestConnectionResponse {
  success: boolean;
  message: string;
}

export async function getSAMLProviders(): Promise<{
  data?: SAMLProviderConfig[];
  error?: CategorizedApiError;
}> {
  const result = await apiClient.get<SAMLProviderListResponse>('/admin/saml/config');

  if (result.error) {
    return { error: result.error };
  }

  if (!result.data) {
    return { error: createInvalidResponseError() };
  }

  return { data: result.data.providers };
}

export async function getSAMLProvider(id: string): Promise<{
  data?: SAMLProviderConfig;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.get<SAMLProviderResponse>(`/admin/saml/config/${id}`);

  if (result.error) {
    return { error: result.error };
  }

  if (!result.data) {
    return { error: createInvalidResponseError() };
  }

  return { data: result.data };
}

export async function createSAMLProvider(provider: CreateSAMLProviderRequest): Promise<{
  data?: SAMLProviderConfig;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.post<SAMLProviderResponse>('/admin/saml/config', provider);

  if (result.error) {
    return { error: result.error };
  }

  if (!result.data) {
    return { error: createInvalidResponseError() };
  }

  return { data: result.data };
}

export async function updateSAMLProvider(
  id: string,
  provider: UpdateSAMLProviderRequest,
): Promise<{
  data?: SAMLProviderConfig;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.put<SAMLProviderResponse>(`/admin/saml/config/${id}`, provider);

  if (result.error) {
    return { error: result.error };
  }

  if (!result.data) {
    return { error: createInvalidResponseError() };
  }

  return { data: result.data };
}

export async function deleteSAMLProvider(id: string): Promise<{
  data?: boolean;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.delete<{ success: boolean }>(`/admin/saml/config/${id}`);

  if (result.error) {
    return { error: result.error };
  }

  if (!result.data) {
    return { error: createInvalidResponseError() };
  }

  return { data: result.data.success };
}

export async function testSAMLConnection(id: string): Promise<{
  data?: SAMLTestConnectionResponse;
  error?: CategorizedApiError;
}> {
  const result = await apiClient.post<SAMLTestConnectionResponse>(`/admin/saml/test/${id}`, {});

  if (result.error) {
    return { error: result.error };
  }

  if (!result.data) {
    return { error: createInvalidResponseError() };
  }

  return { data: result.data };
}
