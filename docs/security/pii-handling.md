# PII Handling

This document outlines how The DMZ: Archive Gate handles Personally Identifiable Information (PII).

## Data Collection

### Minimal Collection Principle

We collect only the minimum data necessary for our services:

| Data Type        | Purpose                               | Legal Basis          |
| ---------------- | ------------------------------------- | -------------------- |
| Email            | Account identification, communication | Consent              |
| Username         | Display in game                       | Consent              |
| Game progress    | Game functionality                    | Legitimate interest  |
| TOTP secret      | MFA authentication                    | Security requirement |
| IP address       | Rate limiting, fraud prevention       | Legitimate interest  |
| Browser metadata | Analytics, troubleshooting            | Consent              |

## PII Categories

### Level 1: Directly Identifiable

- Email address
- Username
- Real name (if provided)

**Storage**: Encrypted at rest, hashed for logging

### Level 2: Indirectly Identifiable

- IP address
- Session tokens
- API keys

**Storage**: Hashed or encrypted, retained for 90 days

### Level 3: Anonymized

- Game performance data
- Learning assessment results
- Aggregate analytics

**Storage**: Anonymized, no expiration

## Privacy by Design

### Pseudonymization

- User IDs are randomly generated UUIDs
- No correlation between user IDs and email in logs
- Session tokens are opaque tokens

### Data Minimization

- Only collect data necessary for functionality
- Delete data when no longer needed
- Anonymize where possible

### Retention Policy

| Data Type      | Retention        | Deletion Method |
| -------------- | ---------------- | --------------- |
| Active session | Until logout     | Secure wipe     |
| Login history  | 1 year           | Automated purge |
| Game progress  | Account lifetime | Manual request  |
| IP logs        | 90 days          | Automated purge |
| Audit logs     | 2 years          | Automated purge |

## Data Subject Rights

### Right to Access

Users can request a copy of all their data via the API or UI.

### Right to Rectification

Users can update their profile data via the UI.

### Right to Erasure

Users can request deletion of their account and all associated data.

**Process:**

1. User requests deletion via UI/API
2. System verifies identity
3. Data marked for deletion
4. Background job removes all data within 30 days

### Right to Data Portability

Users can export their data in JSON format via the API.

## Encryption and Protection

### In Transit

- TLS 1.3 for all connections
- HSTS enabled

### At Rest

- AES-256-GCM for sensitive fields
- Database encryption in production

### Processing

- No PII in logs (redaction enabled)
- Secure memory handling for sensitive operations

## Handling in Code

### Logging

All PII must be redacted in logs:

```typescript
const sensitiveFields = ['email', 'password', 'token', 'secret'];

function redactPII(obj: Record<string, unknown>): Record<string, unknown> {
  const redacted = { ...obj };
  for (const field of sensitiveFields) {
    if (field in redacted) {
      redacted[field] = '[REDACTED]';
    }
  }
  return redacted;
}
```

### Database

- PII stored in encrypted columns
- RLS policies prevent unauthorized access
- Queries never log PII

### API Responses

- No PII in error messages
- Email masked (j\*\*\*@example.com)
- Sensitive fields excluded from responses

## Compliance

### GDPR (Europe)

- Lawful basis for processing documented
- Data Protection Impact Assessment completed
- DPO appointed
- 72-hour breach notification capability

### CCPA (California)

- No sale of personal data
- Do Not Track respected
- Privacy policy available

### HIPAA (Healthcare - Future)

- BAA with cloud providers
- PHI access logging
- Minimum necessary access

## Incident Response

### Breach Detection

- Automated monitoring for unusual access
- Failed login alerts
- Anomaly detection

### Breach Notification

- 72-hour notification to users (GDPR)
- Regulatory notification as required
- Public disclosure within 30 days

### Remediation

- Affected data identified
- Root cause analysis
- Process improvements

## Third-Party Processors

| Processor | Purpose               | Data Shared             |
| --------- | --------------------- | ----------------------- |
| Anthropic | AI content generation | Anonymized prompts only |
| SendGrid  | Email delivery        | Email address only      |
| AWS       | Infrastructure        | Hosted data only        |

All third parties have data processing agreements.

## Contact

For PII-related requests:

- Email: privacy@thdmz.example.com
- API: `/api/v1/users/me/data`
- UI: Settings > Privacy

## References

- GDPR: https://gdpr.eu/
- CCPA: https://oag.ca.gov/privacy/ccpa
- NIST PII Guide: https://nvd.nist.gov/800-53
