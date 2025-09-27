---
'sonarqube-mcp-server': minor
---

feat: integrate agentic-node-ts-starter toolchain and update dependencies

## Toolchain Integration

- Integrated full agentic-node-ts-starter toolchain with strict TypeScript configuration
- Migrated test framework from Jest to Vitest for improved performance
- Added changesets for release management
- Enhanced GitHub Actions workflows with reusable components
- Added strict TypeScript settings (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`)
- Configured comprehensive linting for markdown, YAML, and workflows

## Dependency Updates

- Updated pnpm from 10.7.1 to 10.17.0 across all configuration files
- Updated Node.js requirement from 20 to 22 in documentation and Docker
- Ensures compatibility with latest toolchain versions

## Code Quality Improvements

- Fixed all TypeScript compilation errors (416 → 0)
- Resolved all ESLint errors (244 → 0) with proper error handling patterns
- Fixed all markdown linting issues (31 → 0)
- Fixed all test failures (42 → 0, now 909 tests passing)
- Created MCPError class for MCP SDK-compatible error handling
- Updated error throwing to comply with ESLint's only-throw-error rule

## Breaking Changes

None - This maintains backward compatibility while improving internal tooling.
