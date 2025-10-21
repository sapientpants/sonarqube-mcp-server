# Changelog

## 1.10.21

### Patch Changes

- [#336](https://github.com/sapientpants/sonarqube-mcp-server/pull/336) [`2383f4d`](https://github.com/sapientpants/sonarqube-mcp-server/commit/2383f4d6e79b3d4b2f96c495bbe229e0dc3aa047) - refactor: improve code quality by addressing SonarQube code smells

  Improved code readability and maintainability by addressing 7 code smell issues:
  - Use `String#replaceAll()` instead of `replace()` with global regex for better clarity
  - Convert `forEach()` to `for...of` loop for improved performance and readability
  - Use `String.raw` template literal to avoid unnecessary escaping in regex patterns

  These changes follow modern JavaScript/TypeScript best practices and reduce technical debt by 30 minutes. No functional changes or breaking changes introduced.

## 1.10.20

### Patch Changes

- [#327](https://github.com/sapientpants/sonarqube-mcp-server/pull/327) [`cd17f93`](https://github.com/sapientpants/sonarqube-mcp-server/commit/cd17f9352afff73043fbc1b1db278a7a95fa2876) - chore: update dependencies to latest versions

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

## 1.10.19

### Patch Changes

- [#325](https://github.com/sapientpants/sonarqube-mcp-server/pull/325) [`75e683f`](https://github.com/sapientpants/sonarqube-mcp-server/commit/75e683f36570572777c439aa11973dc9c927a8e0) - Update production dependencies to latest versions:
  - pino: 9.12.0 → 10.0.0 (major version update with improved performance)
  - pino-roll: 3.1.0 → 4.0.0 (compatible with Pino 10)
  - @types/node: 24.7.1 → 24.7.2 (minor type definition updates)
  - zod: kept at 3.25.76 (maintained for compatibility)

  All tests passing with no breaking changes identified.

## 1.10.18

### Patch Changes

- [#320](https://github.com/sapientpants/sonarqube-mcp-server/pull/320) [`105d75e`](https://github.com/sapientpants/sonarqube-mcp-server/commit/105d75e1343e910878aa5798ca82a6a7bf89e494) - Fix Docker image publishing by adding packages:write permission to workflows

  The v1.10.17 build failed when attempting to push multi-platform Docker images to GitHub Container Registry (GHCR) with error: "denied: installation not allowed to Create organization package"

  Root cause: The reusable-docker.yml workflow was missing the `packages: write` permission needed to push images to GHCR. While the main workflow had this permission, reusable workflows require explicit permissions and do not inherit from their callers.

  Additionally, the PR workflow calls reusable-docker.yml, so it must also grant the permission even though PR builds don't use it (they use single-platform without push).

  This fix adds `packages: write` to:
  - `.github/workflows/reusable-docker.yml` - Required to push multi-platform images to GHCR
  - `.github/workflows/pr.yml` - Required to call reusable-docker.yml (permission not used in practice)

  The permission is only exercised when the workflow actually pushes to GHCR (multi-platform builds with save-artifact=true). PR builds continue to use single-platform without pushing to GHCR.

## 1.10.17

### Patch Changes

- [#319](https://github.com/sapientpants/sonarqube-mcp-server/pull/319) [`185a1d5`](https://github.com/sapientpants/sonarqube-mcp-server/commit/185a1d5c3711a159da87972715b45691fe4d9003) - Refactor Docker Hub publishing to use GHCR as intermediate storage

  Previously attempted to publish multi-platform Docker images by extracting OCI tar archives and using `docker buildx imagetools create` with `oci-layout://` scheme, which is not supported.

  Now multi-platform images are pushed to GitHub Container Registry (GHCR) during the build phase, then copied to Docker Hub using `docker buildx imagetools create` for registry-to-registry transfer. This approach:
  - Uses Docker's native buildx imagetools tooling (no third-party dependencies)
  - Preserves multi-platform manifest lists correctly
  - Maintains "build once, publish everywhere" model
  - Leverages GHCR's free hosting for public repositories
  - Simplifies the publish workflow by eliminating artifact extraction logic

  Changes:
  - Modified `.github/workflows/reusable-docker.yml` to push multi-platform builds to GHCR
  - Updated `.github/workflows/main.yml` with `packages: write` permission for GHCR
  - Refactored `.github/workflows/publish.yml` to copy images from GHCR to Docker Hub

## 1.10.16

### Patch Changes

- [#318](https://github.com/sapientpants/sonarqube-mcp-server/pull/318) [`08ef441`](https://github.com/sapientpants/sonarqube-mcp-server/commit/08ef441fcfa44083be92de09e5ab3e2787f37939) - Fix race condition in artifact determination script
  - Add retry logic with exponential backoff to determine-artifact.sh
  - Wait up to 5 attempts with increasing delays (5s, 10s, 15s, 20s, 25s)
  - Fixes race condition where Publish workflow starts before Main workflow is indexed by GitHub API
  - Total retry window: ~75 seconds, giving GitHub's API time to index completed workflow runs

- [#318](https://github.com/sapientpants/sonarqube-mcp-server/pull/318) [`08ef441`](https://github.com/sapientpants/sonarqube-mcp-server/commit/08ef441fcfa44083be92de09e5ab3e2787f37939) - Fix Docker Hub publishing for multi-platform OCI images
  - Extract OCI layout from tar archive
  - Use `docker buildx imagetools create` with `oci-layout://` scheme
  - Properly handles multi-platform manifest lists for linux/amd64 and linux/arm64
  - Fixes "unknown flag: --tag" error from incorrect buildx imagetools import syntax

## 1.10.15

### Patch Changes

- [#317](https://github.com/sapientpants/sonarqube-mcp-server/pull/317) [`b813a93`](https://github.com/sapientpants/sonarqube-mcp-server/commit/b813a937e72f980a2be2c2e93ceb9f5487456e39) - Fix race condition in artifact determination script
  - Add retry logic with exponential backoff to determine-artifact.sh
  - Wait up to 5 attempts with increasing delays (5s, 10s, 15s, 20s, 25s)
  - Fixes race condition where Publish workflow starts before Main workflow is indexed by GitHub API
  - Total retry window: ~75 seconds, giving GitHub's API time to index completed workflow runs

## 1.10.14

### Patch Changes

- [#316](https://github.com/sapientpants/sonarqube-mcp-server/pull/316) [`8a104e2`](https://github.com/sapientpants/sonarqube-mcp-server/commit/8a104e228917f62b364e384a82f78abfaaa7e6ed) - Fix multi-platform Docker image publishing using buildx imagetools
  - Replace skopeo with docker buildx imagetools for OCI archive handling
  - The imagetools command properly imports multi-platform manifest lists from OCI archives
  - Fixes error: "more than one image in oci, choose an image"
  - Ensures both linux/amd64 and linux/arm64 images are pushed correctly to Docker Hub

## 1.10.13

### Patch Changes

- [#315](https://github.com/sapientpants/sonarqube-mcp-server/pull/315) [`ac06fbe`](https://github.com/sapientpants/sonarqube-mcp-server/commit/ac06fbe87af4500cdc6548b709b5a837cb3dba5e) - Fix multi-platform Docker image publishing to Docker Hub
  - Change skopeo `--all` flag to `--multi-arch all` for proper OCI manifest list handling
  - Ensures both linux/amd64 and linux/arm64 images are pushed correctly
  - Fixes error: "more than one image in oci, choose an image"

## 1.10.12

### Patch Changes

- [#314](https://github.com/sapientpants/sonarqube-mcp-server/pull/314) [`2a31f70`](https://github.com/sapientpants/sonarqube-mcp-server/commit/2a31f70fcbb02753adb387df77bd4476917bf380) - Fix NPM prepare script and Docker OCI push issues
  - NPM: Remove prepare script from package.json before publishing (--ignore-scripts doesn't skip prepare)
  - Docker: Use skopeo to push OCI archive directly to Docker Hub instead of loading to docker-daemon
  - Docker: Configure skopeo authentication with Docker Hub credentials

## 1.10.11

### Patch Changes

- [#313](https://github.com/sapientpants/sonarqube-mcp-server/pull/313) [`e17faac`](https://github.com/sapientpants/sonarqube-mcp-server/commit/e17faac04b3bea217c8d712edc911f3c75ea139e) - Fix NPM and Docker publish failures
  - NPM: Add --ignore-scripts flag to prevent husky from running during publish
  - Docker: Use skopeo to load OCI format images from multi-platform builds instead of docker load

## 1.10.10

### Patch Changes

- [#312](https://github.com/sapientpants/sonarqube-mcp-server/pull/312) [`62516b5`](https://github.com/sapientpants/sonarqube-mcp-server/commit/62516b56bdba7ab4020c54e0d06c3a0d503ad07e) - Remove fallback to build from source in publish workflow

  The NPM and GitHub Packages publish jobs now fail explicitly if pre-built artifacts are not found, instead of falling back to building from source. This ensures we always publish exactly what was tested and validated in the Main workflow, maintaining supply chain integrity.

## 1.10.9

### Patch Changes

- [`ac24e63`](https://github.com/sapientpants/sonarqube-mcp-server/commit/ac24e634b8f5cee77a141c468f72d1e628d33e9f) - Fix cross-workflow artifact downloads by adding run-id parameter

  The Publish workflow was unable to download artifacts from the Main workflow because the actions/download-artifact@v4 action defaults to only downloading artifacts from the current workflow run. Added the run-id and github-token parameters to all three download steps (NPM, GitHub Packages, and Docker) to enable cross-workflow artifact access.

## 1.10.8

### Patch Changes

- [#311](https://github.com/sapientpants/sonarqube-mcp-server/pull/311) [`323854c`](https://github.com/sapientpants/sonarqube-mcp-server/commit/323854c49f372ed422052e687ec6bbaaa409a0bb) - Fix Docker artifact naming to match NPM pattern for consistent artifact resolution

  Changed Docker artifact naming from `docker-image-{SHA}` to `docker-image-{VERSION}` to match the NPM artifact pattern. This ensures the determine-artifact.sh script can find Docker artifacts using the same logic as NPM artifacts, eliminating the need for conditional logic based on artifact type.

## 1.10.7

### Patch Changes

- [#310](https://github.com/sapientpants/sonarqube-mcp-server/pull/310) [`e166a4e`](https://github.com/sapientpants/sonarqube-mcp-server/commit/e166a4e6ec82755c10df7e8c81d1e63ddfa8f544) - Update lint-staged from 16.2.3 to 16.2.4

  This is a dev dependency update for the pre-commit hook tooling. No changes to production code or user-facing functionality.

- [#310](https://github.com/sapientpants/sonarqube-mcp-server/pull/310) [`e166a4e`](https://github.com/sapientpants/sonarqube-mcp-server/commit/e166a4e6ec82755c10df7e8c81d1e63ddfa8f544) - Fix artifact name resolution in publish workflow by using full commit SHA

  The determine-artifact.sh script was incorrectly shortening the parent commit SHA to 7 characters when searching for artifacts, but the main workflow creates artifacts with the full SHA. This mismatch caused the publish workflow to fail when trying to locate Docker and NPM artifacts for publishing.

## 1.10.6

### Patch Changes

- [`b3befb7`](https://github.com/sapientpants/sonarqube-mcp-server/commit/b3befb7844802604a56dfb3aca7cc7ed054b3817) - Fix race condition by generating attestations before creating release to ensure Main workflow completes before Publish workflow starts

## 1.10.5

### Patch Changes

- [`8050985`](https://github.com/sapientpants/sonarqube-mcp-server/commit/805098501a19ba6a5430403238ca0077139aa20f) - Fix artifact naming to use github.sha for consistency with publish workflow

## 1.10.4

### Patch Changes

- [`0a14753`](https://github.com/sapientpants/sonarqube-mcp-server/commit/0a14753b460aad978d9008b96d7c96d15e179f3d) - Fix production install in release workflow by skipping prepare script that requires husky

## 1.10.3

### Patch Changes

- [#308](https://github.com/sapientpants/sonarqube-mcp-server/pull/308) [`dd1b5ae`](https://github.com/sapientpants/sonarqube-mcp-server/commit/dd1b5aed45d1a31268004cb91a9ab25fe2ec57bb) - Update dependencies to latest versions:
  - @modelcontextprotocol/sdk 1.18.2 → 1.20.0
  - Update 15 dev dependencies (TypeScript 5.9.3, ESLint 9.37.0, Jest 30.2.0, and others)
  - Remove deprecated @types/uuid package
  - Keep zod at 3.x for compatibility with MCP SDK requirements

## 1.10.2

### Patch Changes

- [`04cb352`](https://github.com/sapientpants/sonarqube-mcp-server/commit/04cb3522380a11806df2070742c4522453926c87) - fix: update pino to 9.12.0 to resolve CVE-2025-57319
  - Updated pino from 9.11.0 to 9.12.0
  - Pino 9.12.0 replaces fast-redact with slow-redact
  - Resolves prototype pollution vulnerability in fast-redact@3.5.0 (CVE-2025-57319, low severity)

- [#303](https://github.com/sapientpants/sonarqube-mcp-server/pull/303) [`0f578c2`](https://github.com/sapientpants/sonarqube-mcp-server/commit/0f578c25bfdfb52b23a065b63b78cfc941cb0856) - fix: improve Docker security scanning and fix OpenSSL vulnerabilities
  - Upgraded OpenSSL packages to fix CVE-2025-9230, CVE-2025-9231, CVE-2025-9232
  - Simplified Trivy scan workflow to always upload SARIF results before failing
  - Configured Trivy to only report fixable vulnerabilities
  - Added license scanner with informational reporting (GPL/LGPL licenses documented in LICENSES.md)
  - License findings don't fail the build; only vulnerabilities, secrets, and misconfigurations do
  - Added SARIF artifact upload for debugging scan results

## 1.10.1

### Patch Changes

- [#296](https://github.com/sapientpants/sonarqube-mcp-server/pull/296) [`2b46244`](https://github.com/sapientpants/sonarqube-mcp-server/commit/2b462449bfd1eb03191ae3929ae2fa61cc5a9851) - Fix Docker build workflow ordering to ensure artifacts exist before release
  - Split version determination from release creation in main workflow
  - Build Docker image BEFORE creating GitHub release
  - Ensures Docker artifact exists when publish workflow is triggered
  - Prevents race condition where publish workflow can't find Docker artifacts

- [`4ceaf1f`](https://github.com/sapientpants/sonarqube-mcp-server/commit/4ceaf1f71e0ac3d42493ce6f4e9114bd3a380cf8) - test: verify workflow fixes are working correctly

  Testing the prepare-release-assets workflow after refactoring

## 1.10.0

### Minor Changes

- [#295](https://github.com/sapientpants/sonarqube-mcp-server/pull/295) [`4ea3a14`](https://github.com/sapientpants/sonarqube-mcp-server/commit/4ea3a14cec8555e481a2e73e5c7c954674c23a30) - feat: add Docker build and Trivy security scanning to CI/CD pipeline
  - Add Docker image building and vulnerability scanning to PR workflow for shift-left security
  - Build multi-platform Docker images in main workflow and store as artifacts
  - Refactor publish workflow to use pre-built images from main for deterministic deployments
  - Create reusable Docker workflow for consistent build and scan process
  - Add Trivy container scanning with results uploaded to GitHub Security tab
  - Control Docker features via single `ENABLE_DOCKER_RELEASE` repository variable
  - Add .dockerignore to optimize build context
  - Support for linux/amd64 and linux/arm64 platforms

## 1.9.0

### Minor Changes

- [#294](https://github.com/sapientpants/sonarqube-mcp-server/pull/294) [`49fdac0`](https://github.com/sapientpants/sonarqube-mcp-server/commit/49fdac0e43aea73444721d06fb8343bf3a9c4bba) - feat: add HTTP transport support for MCP server

  Implements Streamable HTTP transport as an alternative to stdio, enabling:
  - Web service deployments and programmatic access via HTTP/REST
  - Session management with automatic lifecycle control
  - RESTful API endpoints for MCP operations
  - Server-sent events for real-time notifications
  - Security features including DNS rebinding protection and CORS configuration

  This change maintains full backward compatibility with the default stdio transport.

## 1.8.3

### Patch Changes

- [#293](https://github.com/sapientpants/sonarqube-mcp-server/pull/293) [`dee7a7f`](https://github.com/sapientpants/sonarqube-mcp-server/commit/dee7a7fd713d00aeccd76091b34fd8f9fd4b227f) - fix: add missing tsconfig.build.json to Docker build

  Fix Docker build failure by copying tsconfig.build.json to the container. The build script requires tsconfig.build.json but it was not being copied during the Docker build process, causing the build to fail with error TS5058.

  **Changes:**
  - Update Dockerfile to copy both tsconfig.json and tsconfig.build.json
  - Ensures TypeScript build process has access to the production build configuration
  - Resolves Docker build failure: "error TS5058: The specified path does not exist: 'tsconfig.build.json'"

  **Testing:**
  - Verified local build works correctly
  - Confirmed Docker build completes successfully
  - No changes to build output or functionality

## 1.8.2

### Patch Changes

- [#292](https://github.com/sapientpants/sonarqube-mcp-server/pull/292) [`e697099`](https://github.com/sapientpants/sonarqube-mcp-server/commit/e697099868c164124677a2dea6b018e63fe00a6d) - security: update SonarQube Scanner GitHub Action to v6

  Update SonarSource/sonarqube-scan-action from v5 to v6 to address security vulnerability. The v5 action is no longer supported and contains known security issues.

  **Security Improvements:**
  - Resolves security vulnerability in SonarQube Scanner GitHub Action
  - Updates to latest supported version with security patches
  - Maintains all existing functionality while improving security posture

  **References:**
  - Security advisory: https://community.sonarsource.com/gha-v6-update
  - Updated action: sonarsource/sonarqube-scan-action@v6

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
