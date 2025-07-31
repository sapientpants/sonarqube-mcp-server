# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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