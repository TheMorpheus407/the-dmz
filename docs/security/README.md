# Security Documentation

This directory contains security-related documentation for The DMZ: Archive Gate project.

## Table of Contents

- [Threat Modeling](./threat-modeling.md)
- [Encryption and Key Management](./encryption.md)
- [PII Handling](./pii-handling.md)

## Security Principles

All security-related development must follow these principles:

1. **Defense in Depth** - Multiple layers of security controls
2. **Least Privilege** - Minimum necessary permissions
3. **Fail Securely** - Default to secure state on errors
4. **Privacy by Design** - Data minimization and pseudonymization
5. **OWASP Awareness** - Consider OWASP Top 10 in all code decisions

## Related Documents

- `SOUL.md` - Security Principles section
- `apps/api/src/shared/plugins/` - Security middleware
- `.github/workflows/security.yml` - Security scanning CI
