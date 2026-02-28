-- Migration: 0009_idempotency_records
-- Description: Add idempotency records table for POST mutation idempotency enforcement

CREATE SCHEMA IF NOT EXISTS idempotency;

CREATE TABLE IF NOT EXISTS idempotency.records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,
  actor_id UUID,
  route VARCHAR(256) NOT NULL,
  method VARCHAR(8) NOT NULL,
  key_hash VARCHAR(64) NOT NULL,
  key_value VARCHAR(64) NOT NULL,
  fingerprint VARCHAR(128) NOT NULL,
  status VARCHAR(16) NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idempotency_tenant_key_hash_unique 
  ON idempotency.records(tenant_id, key_hash);

CREATE INDEX IF NOT EXISTS idempotency_tenant_id_idx 
  ON idempotency.records(tenant_id);

CREATE INDEX IF NOT EXISTS idempotency_tenant_key_idx 
  ON idempotency.records(tenant_id, key_hash);

CREATE INDEX IF NOT EXISTS idempotency_expires_at_idx 
  ON idempotency.records(expires_at);

CREATE INDEX IF NOT EXISTS idempotency_status_idx 
  ON idempotency.records(status);

CREATE INDEX IF NOT EXISTS idempotency_created_at_idx 
  ON idempotency.records(created_at);
