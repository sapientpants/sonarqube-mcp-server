---
'sonarqube-mcp-server': patch
---

Update production dependencies to latest versions:

- pino: 9.12.0 → 10.0.0 (major version update with improved performance)
- pino-roll: 3.1.0 → 4.0.0 (compatible with Pino 10)
- @types/node: 24.7.1 → 24.7.2 (minor type definition updates)
- zod: kept at 3.25.76 (maintained for compatibility)

All tests passing with no breaking changes identified.
