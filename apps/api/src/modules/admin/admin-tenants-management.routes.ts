import { type FastifyInstance } from 'fastify';

export const registerAdminTenantManagementRoutes = async (
  _fastify: FastifyInstance,
): Promise<void> => {
  // Future management routes:
  // PATCH /admin/tenants/:id - Update tenant settings
  // DELETE /admin/tenants/:id - Deactivate/delete tenant
};
