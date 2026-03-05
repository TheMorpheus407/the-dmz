import type {
  EmailIntegration,
  CreateEmailIntegrationInput,
  UpdateEmailIntegrationInput,
} from '@the-dmz/shared/schemas';
import { EmailIntegrationStatus } from '@the-dmz/shared/schemas';

const emailIntegrations = new Map<string, EmailIntegration & { tenantId: string }>();

export const emailRepo = {
  async create(tenantId: string, input: CreateEmailIntegrationInput): Promise<EmailIntegration> {
    const id = crypto.randomUUID();
    const now = new Date();

    const integration: EmailIntegration & { tenantId: string } = {
      id,
      tenantId,
      name: input.name,
      providerType: input.providerType,
      config: input.config as EmailIntegration['config'],
      status: EmailIntegrationStatus.DRAFT,
      validationFailures: [],
      capabilities: {
        supportsTracking: input.capabilities?.supportsTracking ?? false,
        supportsTemplates: input.capabilities?.supportsTemplates ?? false,
        supportsWebhooks: input.capabilities?.supportsWebhooks ?? false,
        maxDailyVolume: input.capabilities?.maxDailyVolume,
      },
      tenantIsolationMetadata: {
        isolatedTenantId: tenantId,
      },
      createdAt: now,
      updatedAt: now,
    };

    emailIntegrations.set(id, integration);
    return integration;
  },

  async findById(id: string): Promise<(EmailIntegration & { tenantId: string }) | null> {
    return emailIntegrations.get(id) ?? null;
  },

  async findByTenantId(
    tenantId: string,
    options?: { limit?: number; cursor?: string },
  ): Promise<{
    integrations: (EmailIntegration & { tenantId: string })[];
    total: number;
    cursor?: string;
  }> {
    const all = Array.from(emailIntegrations.values()).filter(
      (integration) => integration.tenantId === tenantId,
    );

    const limit = options?.limit ?? 50;
    const startIndex = options?.cursor ? all.findIndex((i) => i.id === options.cursor) + 1 : 0;
    const items = all.slice(startIndex, startIndex + limit);
    const nextCursor = items.length === limit ? items[items.length - 1]?.id : undefined;

    const result: {
      integrations: (EmailIntegration & { tenantId: string })[];
      total: number;
      cursor?: string;
    } = {
      integrations: items,
      total: all.length,
    };
    if (nextCursor) {
      result.cursor = nextCursor;
    }
    return result;
  },

  async update(
    id: string,
    input: UpdateEmailIntegrationInput,
  ): Promise<(EmailIntegration & { tenantId: string }) | null> {
    const existing = emailIntegrations.get(id);
    if (!existing) return null;

    const updated: EmailIntegration & { tenantId: string } = {
      ...existing,
      name: input.name ?? existing.name,
      config: input.config ? (input.config as EmailIntegration['config']) : existing.config,
      status: input.status ?? existing.status,
      updatedAt: new Date(),
    };

    emailIntegrations.set(id, updated);
    return updated;
  },

  async delete(id: string): Promise<boolean> {
    return emailIntegrations.delete(id);
  },

  async setStatus(
    id: string,
    status: EmailIntegration['status'],
  ): Promise<(EmailIntegration & { tenantId: string }) | null> {
    const existing = emailIntegrations.get(id);
    if (!existing) return null;

    const updated: EmailIntegration & { tenantId: string } = {
      ...existing,
      status,
      updatedAt: new Date(),
    };

    emailIntegrations.set(id, updated);
    return updated;
  },

  async updateAuthenticationPosture(
    id: string,
    posture: EmailIntegration['authenticationPosture'],
  ): Promise<(EmailIntegration & { tenantId: string }) | null> {
    const existing = emailIntegrations.get(id);
    if (!existing) return null;

    const updated: EmailIntegration & { tenantId: string } = {
      ...existing,
      authenticationPosture: posture,
      lastValidatedAt: new Date(),
      updatedAt: new Date(),
    };

    emailIntegrations.set(id, updated);
    return updated;
  },
};
