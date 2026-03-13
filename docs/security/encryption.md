# Encryption and Key Management

This document outlines the encryption practices and key management for The DMZ: Archive Gate.

## Encryption at Rest

### Database

- **PostgreSQL**: TLS enabled in production (`DATABASE_SSL=true`)
- **Sensitive Fields**: Application-level encryption for:
  - User credentials (hashed with bcrypt)
  - API keys (encrypted with AES-256-GCM)
  - JWT signing keys
  - TOTP secrets

### Redis

- TLS recommended for production (`REDIS_URL=rediss://...`)
- Session data encrypted at application level for sensitive operations

## Encryption in Transit

### External Communication

- **TLS 1.3** enforced via HSTS headers
- **Certificate Management**: Let's Encrypt (auto-renewal)
- **Internal Communication**: mTLS between microservices (future)

### Internal Communication

- API to PostgreSQL: TLS 1.2+ required in production
- API to Redis: TLS recommended in production

## Key Management

### Environment Variables

All cryptographic keys are stored in environment variables:

| Key                              | Purpose                | Minimum Length |
| -------------------------------- | ---------------------- | -------------- |
| `JWT_SECRET`                     | JWT signing            | 32 characters  |
| `TOKEN_HASH_SALT`                | Token hashing          | 32 characters  |
| `JWT_PRIVATE_KEY_ENCRYPTION_KEY` | Private key encryption | 32 characters  |
| `DATABASE_URL`                   | DB connection          | N/A            |

### Production Requirements

Keys in production **must**:

1. Not be the default values (enforced by validation)
2. Be at least 32 characters
3. Be randomly generated (use `openssl rand -hex 32`)
4. Be rotated annually or immediately after a breach

### Key Rotation

- **JWT Secret**: Rotatable via environment variable, requires logout
- **Database SSL**: Annual rotation via certificate renewal
- **API Keys**: User-rotatable via UI

## Cryptographic Algorithms

### Password Hashing

- **Algorithm**: bcrypt
- **Cost Factor**: 12 (production)
- **Validation**: Server-side only

### JWT

- **Algorithm**: HS256 (default), RS256 (configurable)
- **Expiration**: 7 days (default), configurable
- **Refresh**: Token refresh endpoint

### API Key Encryption

- **Algorithm**: AES-256-GCM
- **Key Derivation**: PBKDF2 with SHA-256

### TOTP

- **Algorithm**: SHA-1 (RFC 6238 compliant)
- **Period**: 30 seconds
- **Digits**: 6 (configurable)

## Data Classification

### Public

- Game content (questions, scenarios)
- Public leaderboard data
- Marketing materials

### Internal

- User-generated content (game progress)
- Session data
- Analytics (anonymized)

### Confidential

- User credentials
- API keys
- Personal identifiers
- Enterprise tenant data

### Restricted

- Master encryption keys
- Internal system credentials

## Compliance

### Healthcare (HIPAA)

- PHI encrypted at rest and in transit
- Audit logging for all data access
- Access controls enforced

### Financial (PCI-DSS)

- Cardholder data not stored
- Secure transmission only

### General (GDPR)

- Data minimization
- Pseudonymization where possible
- Right to deletion (encryption keys included)

## Key Derivation

```typescript
import { createCipheriv, randomBytes, createHash } from 'node:crypto';

function deriveKey(password: string, salt: Buffer): Buffer {
  return createHash('sha256')
    .update(password + salt)
    .digest();
}

function encrypt(plaintext: string, key: Buffer): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}
```

## Secrets Management (Future)

Planned improvements:

- HashiCorp Vault integration for key storage
- AWS Secrets Manager / GCP Secret Manager support
- Automated key rotation
- Audit logging for key access
