import { z } from 'zod';

export const m1ApiContractManifestSchema = z.object({
  version: z.string(),
  endpoints: z.array(
    z.object({
      path: z.string(),
      method: z.enum(['GET', 'POST', 'PATCH', 'DELETE']),
      requiresAuth: z.boolean(),
      responseEnvelope: z.enum(['success', 'error', 'none']),
      responseSchemaRef: z.string().optional(),
      errorSchemaRef: z.string().optional(),
    }),
  ),
});

export type M1ApiContractManifest = z.infer<typeof m1ApiContractManifestSchema>;

export const m1ApiContractManifest = {
  version: '1.0.0',
  endpoints: [
    {
      path: '/api/v1/auth/register',
      method: 'POST' as const,
      requiresAuth: false,
      responseEnvelope: 'success' as const,
      responseSchemaRef: 'registerResponseSchema',
    },
    {
      path: '/api/v1/auth/login',
      method: 'POST' as const,
      requiresAuth: false,
      responseEnvelope: 'success' as const,
      responseSchemaRef: 'loginResponseSchema',
    },
    {
      path: '/api/v1/auth/refresh',
      method: 'POST' as const,
      requiresAuth: false,
      responseEnvelope: 'success' as const,
      responseSchemaRef: 'refreshResponseSchema',
    },
    {
      path: '/api/v1/auth/logout',
      method: 'DELETE' as const,
      requiresAuth: true,
      responseEnvelope: 'success' as const,
      responseSchemaRef: 'logoutResponseSchema',
    },
    {
      path: '/api/v1/auth/me',
      method: 'GET' as const,
      requiresAuth: true,
      responseEnvelope: 'success' as const,
      responseSchemaRef: 'meResponseSchema',
    },
    {
      path: '/api/v1/auth/profile',
      method: 'PATCH' as const,
      requiresAuth: true,
      responseEnvelope: 'success' as const,
      responseSchemaRef: 'profileResponseSchema',
    },
    {
      path: '/api/v1/health/authenticated',
      method: 'GET' as const,
      requiresAuth: true,
      responseEnvelope: 'success' as const,
      responseSchemaRef: 'authenticatedHealthResponseSchema',
    },
    {
      path: '/health',
      method: 'GET' as const,
      requiresAuth: false,
      responseEnvelope: 'success' as const,
    },
    {
      path: '/ready',
      method: 'GET' as const,
      requiresAuth: false,
      responseEnvelope: 'success' as const,
    },
  ],
} as const;

export const m1AuthEndpoints = m1ApiContractManifest.endpoints.filter((e) =>
  e.path.startsWith('/api/v1/auth'),
);

export const m1ProtectedEndpoints = m1ApiContractManifest.endpoints.filter((e) => e.requiresAuth);

export const m1PublicEndpoints = m1ApiContractManifest.endpoints.filter((e) => !e.requiresAuth);
