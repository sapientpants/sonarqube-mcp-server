# Changelog

## 1.8.1

### Patch Changes

- [#291](https://github.com/sapientpants/sonarqube-mcp-server/pull/291) [`3e74093`](https://github.com/sapientpants/sonarqube-mcp-server/commit/3e74093b1348e9d6eca3daff4d78b87edf1f8b64) - chore: update dependencies
  - Update pino from 9.10.0 to 9.11.0 (production dependency - bug fixes and performance improvements)
  - Update @commitlint/cli from 19.8.1 to 20.0.0 (dev dependency - major version with improved TypeScript support)
  - Update @commitlint/config-conventional from 19.8.1 to 20.0.0 (dev dependency)
  - Update @cyclonedx/cdxgen from 11.7.0 to 11.8.0 (dev dependency - enhanced SBOM generation)
  - Update jsonc-eslint-parser from 2.4.0 to 2.4.1 (dev dependency - bug fixes)
  - Update vite from 7.1.5 to 7.1.7 (dev dependency - security fixes and improvements)

  All tests passing with 100% compatibility.

## 1.8.0

### Minor Changes

- [#284](https://github.com/sapientpants/sonarqube-mcp-server/pull/284) [`1796c4d`](https://github.com/sapientpants/sonarqube-mcp-server/commit/1796c4d2984fe2f00a3c458532efc0a24a38a7e2) - feat: integrate agentic-node-ts-starter toolchain and update dependencies

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

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.7.5] - 2025-08-18

### Changed

- Updated dependencies to latest versions:
  - @modelcontextprotocol/sdk: 1.17.2 → 1.17.3
  - @types/node: 24.2.1 → 24.3.0
  - @typescript-eslint/eslint-plugin: 8.39.0 → 8.39.1
  - @typescript-eslint/parser: 8.39.0 → 8.39.1
  - nock: 14.0.9 → 14.0.10

## [1.7.4] - 2025-08-11

### Changed

- Updated dependencies to latest versions:
  - @modelcontextprotocol/sdk: 1.17.0 → 1.17.2
  - @eslint/js: 9.32.0 → 9.33.0
  - @types/node: 24.1.0 → 24.2.1
  - @typescript-eslint/eslint-plugin: 8.38.0 → 8.39.0
  - @typescript-eslint/parser: 8.38.0 → 8.39.0
  - eslint: 9.32.0 → 9.33.0
  - eslint-plugin-prettier: 5.5.3 → 5.5.4
  - lint-staged: 16.1.2 → 16.1.5
  - nock: 14.0.7 → 14.0.9
  - ts-jest: 29.4.0 → 29.4.1
  - typescript: 5.8.3 → 5.9.2

## [1.7.3] - 2025-07-31

### Fixed

- Upgraded system health API from deprecated V1 to V2 to eliminate deprecation warnings
- Enhanced JSDoc documentation explaining V2 API response structure and transformation logic
- Extracted causes aggregation logic to private helper method for improved code readability and testability
- Maintained full backward compatibility while using modern SonarQube health API

### Changed

- System health endpoint now uses `/api/v2/system/health` instead of deprecated `/api/system/health`
- Improved error handling for clustered SonarQube setups with proper causes aggregation from all nodes

## [1.7.2] - 2025-07-31

### Changed

- Cleaned up remaining HTTP/SSE transport references in documentation and code comments
- Updated security documentation to reflect enterprise features handled by MCP gateways
- Removed obsolete API reference documentation that was specific to HTTP transport

### Removed

- Removed `docs/api-reference.md` as it contained HTTP-specific content no longer relevant for stdio-only server

## [1.7.1] - 2025-07-30

### Changed

- Updated README.md documentation for v1.7.0 release (#248)

## [1.7.0] - 2025-07-31

### Changed

- Simplified to stdio-only transport for MCP gateway deployment (#244)
- Removed HTTP transport and OAuth2 endpoints to focus on stdio transport
- Updated dependencies to latest versions:
  - @modelcontextprotocol/sdk: 1.16.0 → 1.17.0
  - @eslint/js: 9.31.0 → 9.32.0
  - eslint: 9.31.0 → 9.32.0
  - nock: 14.0.6 → 14.0.7

### Removed

- HTTP transport implementation
- OAuth2 metadata endpoints
- Built-in authorization server
- External IdP integration features

## [1.6.1] - 2025-07-27

### Fixed

- Resolved SonarQube issue S6551 in tracing.ts - replaced deprecated url.parse() with WHATWG URL API
- Fixed object stringification issues to prevent "[object Object]" in logs
- Improved error formatting in logger for better debugging
- Fixed externally-controlled format string security issue

### Changed

- Updated README.md documentation and organization

## [1.6.0] - 2025-07-24

### Added

- Kubernetes deployment support with Helm charts for easy deployment (#183)
- Comprehensive monitoring and observability features (#182)
- Built-in authorization server for standalone authentication (#181)
- External IdP integration support (OAuth2/OIDC) (#180)
- Comprehensive audit logging system (#179)
- Service account management system (#178)
- JSON string array support for MCP parameters

### Changed

- Updated dependencies to latest versions:
  - @modelcontextprotocol/sdk: 1.15.1 → 1.16.0
  - @jest/globals: 30.0.4 → 30.0.5
  - @types/bcrypt: 5.0.2 → 6.0.0
  - @types/node: 24.0.14 → 24.1.0
  - @typescript-eslint/eslint-plugin: 8.37.0 → 8.38.0
  - @typescript-eslint/parser: 8.37.0 → 8.38.0
  - eslint-config-prettier: 10.1.5 → 10.1.8
  - eslint-plugin-prettier: 5.5.1 → 5.5.3
  - jest: 30.0.4 → 30.0.5
  - nock: 14.0.5 → 14.0.6
  - supertest: 7.1.3 → 7.1.4

### Fixed

- Code duplication issues identified by SonarQube
- Various security and code quality improvements

## [1.5.1] - 2025-06-19

### Changed

- Updated README.md to properly document v1.5.0 release changes
- Moved v1.4.0 updates to "Previous Updates" section in README

## [1.5.0] - 2025-06-19

### Added

- New `components` action for searching and navigating SonarQube components
- Documentation section in README explaining permission requirements for different tools
- Examples in README showing how to list projects for both admin and non-admin users

### Changed

- Updated `projects` tool description to clarify admin permission requirement
- Enhanced error message for `projects` tool to suggest using `components` tool when permission is denied

## [1.4.1] - 2025-01-16

### Added

- Pull request template for better contribution guidelines
- SECURITY.md for security policy documentation
- Issue templates for bug reports and feature requests
- CODE_OF_CONDUCT.md for community guidelines

### Changed

- Updated dependencies to latest versions:
  - @modelcontextprotocol/sdk: 1.12.1 → 1.12.3
  - zod: 3.25.63 → 3.25.64
  - @eslint/js: 9.28.0 → 9.29.0
  - eslint: 9.28.0 → 9.29.0
  - lint-staged: 16.1.0 → 16.1.2

### Removed

- Removed .scannerwork directory

## [1.4.0] - Previous Release

For previous releases, see the [GitHub releases page](https://github.com/sapientpants/sonarqube-mcp-server/releases).
