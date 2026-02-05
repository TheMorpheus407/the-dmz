ACCEPTED

Summary:
- Scaffolds the Fastify 5 + TypeScript backend with the required DD-09 modular layout, entry points, config, and shared placeholders.
- Implements /health, /ready (503 when dependencies are unavailable), and /api/v1/ plus request logging, request IDs, and the specified error envelope.
- Adds Zod config validation and dev CORS allowlist; tests cover health, readiness, root version, and not-found error formatting.

Findings:
- None.

Tests:
- pnpm --filter api test
