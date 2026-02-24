-- Migration: 0007_password_reset_tokens
-- Description: Add password reset tokens table for secure password recovery

CREATE TABLE IF NOT EXISTS auth.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,
  user_id UUID NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_password_reset_tokens_token_hash_unique 
  ON auth.password_reset_tokens(token_hash);

CREATE INDEX IF NOT EXISTS auth_password_reset_tokens_user_expires_at_idx 
  ON auth.password_reset_tokens(user_id, expires_at);

ALTER TABLE auth.password_reset_tokens 
  ADD CONSTRAINT password_reset_tokens_tenant_user_fk 
  FOREIGN KEY (tenant_id, user_id) 
  REFERENCES public.users(tenant_id, user_id) 
  ON DELETE RESTRICT;
