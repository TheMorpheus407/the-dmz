-- Migration: 0006_jwt_signing_keys
-- Description: Add JWT signing keys table for RS256/ES256 key rotation support

CREATE TABLE IF NOT EXISTS auth.signing_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_type VARCHAR(16) NOT NULL CHECK (key_type IN ('RSA', 'EC')),
  algorithm VARCHAR(16) NOT NULL,
  public_key_pem TEXT NOT NULL,
  private_key_encrypted_pem TEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'rotating', 'revoked', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  rotated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS auth_signing_keys_status_idx ON auth.signing_keys(status);
CREATE INDEX IF NOT EXISTS auth_signing_keys_expires_at_idx ON auth.signing_keys(expires_at);
