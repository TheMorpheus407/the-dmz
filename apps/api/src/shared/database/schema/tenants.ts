import { sql } from 'drizzle-orm';
import { boolean, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const tenantTiers = ['starter', 'professional', 'enterprise', 'government'] as const;
export type TenantTier = (typeof tenantTiers)[number];

export const provisioningStatuses = ['pending', 'provisioning', 'ready', 'failed'] as const;
export type ProvisioningStatus = (typeof provisioningStatuses)[number];

export const onboardingSteps = [
  'not_started',
  'org_profile',
  'idp_config',
  'scim_token',
  'compliance',
  'complete',
] as const;
export type OnboardingStep = (typeof onboardingSteps)[number];

export interface ComplianceCoordinatorContact {
  name: string;
  email: string;
  phone?: string;
}

export type RegulatoryRegion =
  | 'us_federal'
  | 'us_state_local'
  | 'eu'
  | 'uk'
  | 'canada'
  | 'australia'
  | 'japan'
  | 'singapore'
  | 'other';

export interface OnboardingState {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  startedAt: string | null;
  completedAt: string | null;
  orgProfile?: OrgProfileData;
  idpConfig?: IdpConfigData;
  scimTokenId?: string;
  complianceFrameworks?: string[];
  regulatoryRegion: RegulatoryRegion | undefined;
  complianceCoordinatorContact: ComplianceCoordinatorContact | undefined;
}

export interface OrgProfileData {
  name: string;
  domain: string;
  industry: string;
  companySize: string;
}

export interface IdpConfigData {
  type: 'saml' | 'oidc';
  enabled: boolean;
  metadataUrl?: string;
  entityId?: string;
  ssoUrl?: string;
  certificate?: string;
  clientId?: string;
  clientSecret?: string;
  issuer?: string;
  scopes?: string[];
  authorizedDomains?: string[];
}

export const tenants = pgTable('tenants', {
  tenantId: uuid('tenant_id')
    .default(sql`uuid_generate_v7()`)
    .primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 63 }).notNull().unique(),
  domain: varchar('domain', { length: 255 }),
  contactEmail: varchar('contact_email', { length: 255 }),
  planId: varchar('plan_id', { length: 32 }).default('free'),
  tier: varchar('tier', { length: 20 }).default('starter'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  provisioningStatus: varchar('provisioning_status', { length: 20 }).notNull().default('pending'),
  settings: jsonb('settings')
    .notNull()
    .default(sql`'{}'::jsonb`),
  onboardingState: jsonb('onboarding_state').default(sql`'{}'::jsonb`),
  idpConfig: jsonb('idp_config').default(sql`'{}'::jsonb`),
  complianceFrameworks: jsonb('compliance_frameworks').default(sql`'{}'::jsonb`),
  dataRegion: varchar('data_region', { length: 16 }).default('eu'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
