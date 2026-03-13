# Threat Modeling

This document outlines the threat model for The DMZ: Archive Gate application.

## Application Overview

The DMZ is a cybersecurity awareness training platform built as a data center management game. It consists of:

- **Frontend**: SvelteKit web application
- **Backend**: Node.js/Fastify API server
- **Database**: PostgreSQL with Row-Level Security
- **Cache**: Redis for sessions and caching
- **Queue**: BullMQ for async job processing

## Trust Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                        External Users                           │
│  (Players, Enterprise Admins, Content Generation AI)          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Public Internet                              │
│                    (Load Balancer / CDN)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Web Application                             │
│                   (SvelteKit - Port 3000)                       │
│  - CSRF protection                                             │
│  - CSP headers                                                 │
│  - Rate limiting                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API Gateway                                │
│                  (Fastify API - Port 3001)                      │
│  - JWT authentication                                         │
│  - Input validation (Zod)                                     │
│  - Tenant isolation (RLS)                                      │
│  - Rate limiting                                               │
│  - SSRF protection                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌─────────┐    ┌──────────┐    ┌──────────┐
        │PostgreSQL│    │  Redis   │    │  BullMQ  │
        │   RLS    │    │ Sessions │    │  Queue   │
        └─────────┘    └──────────┘    └──────────┘
```

## Threat Categories

### A01:2021 Broken Access Control

**Controls Implemented:**

- JWT token validation on all protected routes
- Role-Based Access Control (RBAC) with tenant isolation
- Row-Level Security (RLS) in PostgreSQL
- Tenant ID enforced on every table

**Mitigations:**

- All endpoints verify user roles before allowing access
- Tenant isolation prevents cross-tenant data access
- API keys are scoped to specific tenants

### A02:2021 Cryptographic Failures

**Controls Implemented:**

- TLS 1.3 for all external communication
- At-rest encryption for database fields containing sensitive data
- JWT tokens signed with HS256 (configurable to RS256)
- Encryption keys rotated via environment variables

**Requirements:**

- All secrets stored in environment variables, not in code
- Database SSL enabled in production
- Strong random generation for tokens

### A03:2021 Injection

**Controls Implemented:**

- Zod schema validation on all inputs
- Parameterized queries via Drizzle ORM
- SQL injection prevented through ORM
- XSS prevented through Svelte's auto-escaping

**Mitigations:**

- All user input validated against Zod schemas
- No raw SQL queries
- Content Security Policy prevents inline scripts

### A04:2021 Insecure Design

**Controls Implemented:**

- Game logic server-authoritative
- Input validation at every system boundary
- Rate limiting on all public endpoints

### A05:2021 Security Misconfiguration

**Controls Implemented:**

- Helmet.js for security headers
- Content Security Policy (CSP)
- HSTS (HTTP Strict Transport Security)
- CORS properly configured per environment

**Required Configurations:**

- `NODE_ENV=production` in production
- Debug mode disabled in production
- Verbose logging disabled in production

### A06:2021 Vulnerable and Outdated Components

**Controls Implemented:**

- npm audit in CI (fails on high+ vulnerabilities)
- OWASP Dependency-Check in CI
- Trivy container scanning in CI
- Weekly dependency vulnerability reports

**Requirements:**

- All dependencies must pass audit before merge
- Critical/High container vulnerabilities block deployment

### A07:2021 Identification and Authentication Failures

**Controls Implemented:**

- MFA/WebAuthn support for user accounts
- TOTP-based backup codes
- Rate-limited login attempts
- Secure session management via Redis

**Requirements:**

- MFA enforced for enterprise accounts
- Session timeout: 7 days (configurable)
- Failed login lockout after 5 attempts

### A08:2021 Software and Data Integrity Failures

**Controls Implemented:**

- Immutable Docker images
- Signed commits required
- Dependency lock files (pnpm-lock.yaml)
- CI/CD pipeline validation

### A09:2021 Security Logging and Monitoring Failures

**Controls Implemented:**

- Structured logging with Pino
- Security event logging (login, logout, privilege changes)
- Error codes registry for debugging
- Log redaction for PII fields

**Events Logged:**

- Authentication events (success/failure)
- Authorization failures
- Input validation failures
- Rate limit violations

### A10:2021 Server-Side Request Forgery (SSRF)

**Controls Implemented:**

- URL validation middleware
- Blocked private IP ranges
- Blocked cloud metadata endpoints
- Protocol allowlist (HTTP/HTTPS only)

## Risk Assessment Matrix

| Threat                | Likelihood | Impact | Risk Level | Mitigation          |
| --------------------- | ---------- | ------ | ---------- | ------------------- |
| Broken Access Control | Medium     | High   | High       | RBAC + RLS          |
| Injection             | Low        | High   | Medium     | Zod + ORM           |
| SSRF                  | Medium     | Medium | Medium     | URL validation      |
| Auth Failures         | Medium     | High   | High       | MFA + Rate limiting |
| Vulnerable Components | Medium     | High   | High       | Dependency scanning |

## Review Schedule

- **Quarterly**: Full threat model review
- **Monthly**: Dependency vulnerability review
- **Per-release**: Security-focused code review

## References

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- STRIDE methodology for threat modeling
- NIST Cybersecurity Framework
