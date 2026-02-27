-- Migration: 0008_oauth_clients
-- Description: Add OAuth 2.0 client credentials table for API authentication

CREATE TABLE IF NOT EXISTS auth.oauth_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  client_id UUID NOT NULL DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  secret_hash VARCHAR(255) NOT NULL,
  previous_secret_hash VARCHAR(255),
  scopes TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_oauth_clients_client_id_unique 
  ON auth.oauth_clients(client_id);

CREATE INDEX IF NOT EXISTS auth_oauth_clients_tenant_id_idx 
  ON auth.oauth_clients(tenant_id);

CREATE INDEX IF NOT EXISTS auth_oauth_clients_tenant_client_idx 
  ON auth.oauth_clients(tenant_id, client_id);

CREATE UNIQUE INDEX IF NOT EXISTS auth_oauth_clients_tenant_client_unique 
  ON auth.oauth_clients(tenant_id, client_id);

CREATE INDEX IF NOT EXISTS auth_oauth_clients_tenant_name_idx 
  ON auth.oauth_clients(tenant_id, name);

CREATE INDEX IF NOT EXISTS auth_oauth_clients_revoked_at_idx 
  ON auth.oauth_clients(revoked_at);

CREATE INDEX IF NOT EXISTS auth_oauth_clients_expires_at_idx 
  ON auth.oauth_clients(expires_at);
