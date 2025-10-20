---
'sonarqube-mcp-server': patch
---

chore: update dependencies to latest versions

Updated production dependencies:

- @modelcontextprotocol/sdk: 1.20.0 → 1.20.1
- pino: 10.0.0 → 10.1.0
- sonarqube-web-api-client: 0.11.1 → 1.0.1 (major update with stricter typing)

Updated dev dependencies:

- vite: 7.1.10 → 7.1.11
- @cyclonedx/cdxgen: 11.9.0 → 11.10.0
- @eslint/js: 9.37.0 → 9.38.0
- @types/node: 24.7.2 → 24.8.1
- eslint: 9.37.0 → 9.38.0

Note: zod remains pinned to 3.25.76 to match @modelcontextprotocol/sdk dependency
