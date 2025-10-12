# 24. CI CD Platform GitHub Actions

Date: 2025-10-11

## Status

Accepted

## Context

The SonarQube MCP Server requires a robust CI/CD platform to automate testing, building, security scanning, and releasing. The platform must:

- Provide fast feedback on pull requests (< 5 minutes for validation)
- Run comprehensive quality checks before merging
- Automate semantic versioning and releases
- Support multi-platform Docker image builds
- Publish to multiple registries (NPM, GitHub Packages, Docker Hub, GHCR)
- Integrate with security scanning tools
- Generate supply chain security attestations (SLSA provenance)
- Prevent concurrent releases (avoid race conditions)
- Support reusable workflows to reduce duplication

Platform options considered:

- **GitHub Actions**: Native GitHub integration, generous free tier for open source, mature ecosystem
- **CircleCI**: Good parallelization but costs for private repos, less GitHub integration
- **Travis CI**: Declining support, slower builds
- **Jenkins**: Self-hosted, more complex setup and maintenance
- **GitLab CI**: Requires GitLab hosting, less integration with GitHub ecosystem

## Decision

We will use **GitHub Actions** as the exclusive CI/CD platform for this project.

### Workflow Architecture

The CI/CD pipeline consists of 7 workflow files organized into 3 categories:

#### 1. Primary Workflows (User-Facing)

**`.github/workflows/main.yml`** - Main Branch Release Pipeline

- **Trigger**: Push to `main` branch
- **Purpose**: Automated releases after merge
- **Jobs**:
  1. `validate`: Run all quality checks (reusable workflow)
  2. `security`: Run security scans (reusable workflow)
  3. `build`: Build TypeScript, version bump, create tag
  4. `docker`: Build multi-platform Docker image to GHCR
  5. `npm`: Package NPM tarball with attestations
  6. `create-release`: Create GitHub release with artifacts
- **Concurrency**: `cancel-in-progress: false` (ensures releases complete)
- **Permissions**: Elevated (write to releases, packages, security events)

**`.github/workflows/pr.yml`** - Pull Request Validation

- **Trigger**: Pull request open/sync to any branch
- **Purpose**: Fast feedback on code quality
- **Jobs**:
  1. `validate`: Run all quality checks (reusable workflow)
  2. `security`: Run security scans (reusable workflow)
- **Concurrency**: `cancel-in-progress: true` (cancel outdated runs on new push)
- **Permissions**: Read-only (security)

**`.github/workflows/publish.yml`** - Multi-Registry Publishing

- **Trigger**: GitHub release created
- **Purpose**: Publish artifacts to public registries
- **Jobs**:
  1. `npm`: Publish to NPM with provenance
  2. `github-packages`: Publish to GitHub Packages
  3. `docker`: Copy GHCR image to Docker Hub (multi-platform manifest)
- **Concurrency**: `cancel-in-progress: false` (ensures publish completes)
- **Permissions**: Read-only (uses secrets for publishing)

**`.github/workflows/codeql.yml`** - CodeQL Security Analysis

- **Trigger**: Push to `main`, pull requests, schedule (weekly)
- **Purpose**: SAST (Static Application Security Testing)
- **Language**: JavaScript/TypeScript
- **Permissions**: Security events write

#### 2. Reusable Workflows (Composable Building Blocks)

**`.github/workflows/reusable-validate.yml`** - Quality Validation Suite

- **Inputs**: `pnpm-version` (default: 10.17.0)
- **Secrets**: `SONAR_TOKEN` (for SonarCloud)
- **Jobs**: Runs in parallel:
  1. Dependency audit (critical vulnerabilities only)
  2. Type checking (`pnpm typecheck`)
  3. Linting (`pnpm lint`, workflows, markdown, YAML)
  4. Format checking (`pnpm format`)
  5. Tests with coverage (`pnpm test`, 80% threshold)
  6. SonarCloud analysis
- **Strategy**: Fail-fast disabled (shows all errors)

**`.github/workflows/reusable-security.yml`** - Security Scanning Suite

- **Inputs**: `pnpm-version` (default: 10.17.0)
- **Jobs**: Runs in parallel:
  1. CodeQL analysis (JavaScript/TypeScript SAST)
  2. OSV-Scanner (vulnerability detection)
  3. Build validation (ensures code compiles)
- **Permissions**: Security events write

**`.github/workflows/reusable-docker.yml`** - Multi-Platform Docker Build

- **Inputs**:
  - `platforms`: Target platforms (default: `linux/amd64,linux/arm64`)
  - `save-artifact`: Save image as artifact (true/false)
  - `artifact-name`: Name for saved artifact
  - `image-name`: Docker image name
  - `version`: Image version tag
  - `tag_sha`: Git commit SHA for tagging
  - `build_artifact`: Build artifact name to download
- **Outputs**: Image tags and digests
- **Features**:
  - Uses Docker Buildx for multi-platform builds
  - QEMU for ARM64 emulation
  - Caches layers in GitHub Actions cache
  - Generates SBOM and SLSA attestations
  - Pushes to GHCR with multiple tags

### Key Architectural Patterns

#### 1. Reusable Workflow Pattern

Benefits:

- **DRY Principle**: Define once, use in multiple workflows
- **Consistency**: Same validation in PR and main workflows
- **Maintainability**: Update validation logic in one place
- **Testability**: Can test reusable workflows in isolation

Example usage:

```yaml
jobs:
  validate:
    uses: ./.github/workflows/reusable-validate.yml
    secrets:
      SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

#### 2. Parallel Execution Strategy

All quality checks run in parallel to minimize CI time:

- Type checking, linting, testing run concurrently
- Security scans run in parallel with validation
- Total validation time: ~3-4 minutes (vs ~10-15 sequential)

#### 3. Unified Build Artifact

The main workflow builds once and shares artifacts:

```yaml
build:
  outputs:
    artifact-name: dist-${{ github.sha }}
  steps:
    - name: Build TypeScript
      run: pnpm build
    - name: Upload build artifact
      uses: actions/upload-artifact@v4

docker:
  needs: [build]
  steps:
    - name: Download build artifact
      uses: actions/download-artifact@v4
      with:
        name: ${{ needs.build.outputs.artifact-name }}
```

Benefits:

- Consistent artifacts across jobs
- Faster pipeline (build once, use multiple times)
- Reduced risk of build inconsistencies

#### 4. Supply Chain Security

Every release includes:

- **SLSA Build Provenance**: Attestations for all artifacts
- **SBOM**: Software Bill of Materials (CycloneDX format)
- **Signature Verification**: GitHub attestations for provenance

```yaml
- name: Generate attestations
  uses: actions/attest-build-provenance@v2
  with:
    subject-path: |
      dist/**/*.js
      sbom.cdx.json
      *.tgz
```

#### 5. Permission Model

**Principle of Least Privilege**:

- PR workflows: Read-only (security events only)
- Main workflow: Write permissions for releases and packages
- Publish workflow: No write to GitHub, uses external secrets

Example:

```yaml
permissions:
  contents: write # Create releases and tags
  id-token: write # Generate SLSA attestations
  attestations: write # Attach attestations
  security-events: write # Upload security scan results
  actions: read # Access workflow artifacts
  packages: write # Push Docker images to GHCR
```

#### 6. Concurrency Control

**Main workflow** (`cancel-in-progress: false`):

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: false # Let releases complete
```

**PR workflow** (`cancel-in-progress: true`):

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.head_ref }}
  cancel-in-progress: true # Cancel outdated validations
```

This prevents:

- Race conditions during version bumps and releases
- Wasted CI time on outdated PR pushes
- Conflicting Git commits to main branch

#### 7. Workflow Skipping

Version bump commits include `[skip actions]` to prevent recursion:

```yaml
git commit -m "chore(release): v$VERSION [skip actions]"
```

This prevents the main workflow from re-running after version commits.

## Consequences

### Positive

- **Native GitHub Integration**: Seamless integration with GitHub features (releases, packages, security)
- **Free for Open Source**: No cost for public repositories
- **Parallel Execution**: 3-4 minute validation vs 10-15 sequential
- **Reusable Workflows**: DRY principle applied to CI/CD
- **Supply Chain Security**: Built-in attestation and SBOM generation
- **Multi-Platform Builds**: Docker Buildx support for ARM64 and AMD64
- **Artifact Sharing**: Build once, use in multiple jobs
- **Concurrency Control**: Prevents race conditions and wasted runs
- **Security Scanning**: Integrated CodeQL, OSV-Scanner, Trivy
- **Rich Ecosystem**: Large marketplace of actions
- **Matrix Builds**: Support for testing multiple versions (if needed)

### Negative

- **Vendor Lock-in**: Heavily tied to GitHub platform
- **Learning Curve**: YAML syntax and workflow composition can be complex
- **Debugging Difficulty**: Cannot run workflows locally (need act or similar)
- **Rate Limits**: API rate limits for artifacts and packages
- **Build Time**: Slower than some alternatives (CircleCI, Buildkite)
- **Secret Management**: Limited secret organization (no folders/namespaces)
- **Workflow File Size**: Large workflows can be hard to navigate
- **Action Versioning**: Need to maintain action versions across workflows

### Neutral

- **YAML Configuration**: Human-readable but verbose
- **Marketplace Quality**: Third-party actions vary in quality and maintenance
- **Caching Strategy**: Need to carefully design cache keys
- **Artifact Retention**: Default 90 days, costs for long-term storage

## Implementation

### Setup Requirements

1. **Repository Secrets** (Settings → Secrets → Actions):
   - `RELEASE_TOKEN`: Personal Access Token with repo write
   - `SONAR_TOKEN`: SonarCloud authentication token
   - `NPM_TOKEN`: NPM registry publish token
   - `DOCKERHUB_USERNAME`: Docker Hub username
   - `DOCKERHUB_TOKEN`: Docker Hub access token

2. **Repository Variables** (Settings → Variables → Actions):
   - `ENABLE_DOCKER_RELEASE`: Set to 'true' to enable Docker releases
   - `ENABLE_NPM_RELEASE`: Set to 'true' to enable NPM releases

3. **Branch Protection Rules** (Settings → Branches → main):
   - Require status checks: `validate`, `security`
   - Require branches to be up to date before merging
   - Require linear history

### Common Workflow Patterns

**Installing pnpm consistently**:

```yaml
- name: Install pnpm
  uses: pnpm/action-setup@v4
  with:
    version: 10.17.0
    run_install: false
    standalone: true

- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: pnpm

- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

**Running validation checks**:

```yaml
- name: Audit dependencies
  run: pnpm audit --audit-level critical

- name: Type check
  run: pnpm typecheck

- name: Lint
  run: pnpm lint

- name: Test
  run: pnpm test
```

**Conditional job execution**:

```yaml
docker:
  needs: [build]
  if: vars.ENABLE_DOCKER_RELEASE == 'true' && needs.build.outputs.changed == 'true'
```

### Workflow Validation

Lint workflow files locally:

```bash
pnpm lint:workflows  # Uses actionlint
```

### Monitoring and Debugging

**Check workflow status**:

```bash
gh run list --limit 10
gh run view <run-id>
gh run watch <run-id>
```

**View logs**:

```bash
gh run view <run-id> --log
gh run view <run-id> --log-failed  # Only failed steps
```

**Re-run workflow**:

```bash
gh run rerun <run-id>
gh run rerun <run-id> --failed  # Only failed jobs
```

## Examples

### Example 1: Pull Request Flow

Developer opens PR:

```
PR opened → pr.yml triggers
├─ validate job (reusable-validate.yml)
│  ├─ audit (parallel)
│  ├─ typecheck (parallel)
│  ├─ lint (parallel)
│  ├─ format (parallel)
│  ├─ test (parallel)
│  └─ sonarcloud (parallel)
└─ security job (reusable-security.yml)
   ├─ codeql (parallel)
   ├─ osv-scanner (parallel)
   └─ build-check (parallel)

Total time: ~3-4 minutes
Status: ✅ All checks passed
```

### Example 2: Main Branch Release Flow

PR merged to main:

```
Push to main → main.yml triggers
├─ validate job (reusable) → ✅
├─ security job (reusable) → ✅
├─ build job
│  ├─ Version packages (changeset)
│  ├─ Commit version bump [skip actions]
│  ├─ Create tag v1.11.0
│  ├─ Build TypeScript
│  └─ Upload artifact dist-abc1234
├─ docker job (needs: build)
│  ├─ Download artifact dist-abc1234
│  ├─ Build linux/amd64,linux/arm64
│  └─ Push to ghcr.io with attestations
├─ npm job (needs: build)
│  ├─ Download artifact dist-abc1234
│  ├─ Create NPM package tarball
│  └─ Upload artifact with attestations
└─ create-release job (needs: build, docker, npm)
   ├─ Generate SBOM
   ├─ Create tar.gz and zip archives
   ├─ Generate attestations for all artifacts
   └─ Create GitHub release v1.11.0

Release created → publish.yml triggers
├─ npm job → Publish to NPM ✅
├─ github-packages job → Publish to GitHub Packages ✅
└─ docker job → Copy GHCR to Docker Hub ✅

Total time: ~10-12 minutes
Result: Version 1.11.0 published to all registries
```

### Example 3: Security Scanning

Push triggers security scanning:

```
reusable-security.yml
├─ CodeQL
│  ├─ Initialize CodeQL database
│  ├─ Autobuild TypeScript
│  ├─ Analyze for security vulnerabilities
│  └─ Upload results to Security tab
├─ OSV-Scanner
│  ├─ Scan pnpm-lock.yaml for vulnerabilities
│  ├─ Generate SARIF report
│  └─ Upload to Security tab
└─ Build Check
   ├─ Install dependencies
   ├─ Build TypeScript
   └─ Verify no build errors

Results visible in: Security → Code scanning alerts
```

## Workflow Diagram

```
Pull Request         Main Branch                Release Created
     │                   │                            │
     ├─→ pr.yml         ├─→ main.yml                ├─→ publish.yml
     │   │               │   │                        │   │
     │   ├─ validate     │   ├─ validate             │   ├─ npm → NPM
     │   └─ security     │   ├─ security             │   ├─ github-packages
     │                   │   ├─ build                │   └─ docker → Docker Hub
     │                   │   │  ├─ version           │
     │                   │   │  ├─ build             │
     │                   │   │  └─ tag               │
     │                   │   ├─ docker → GHCR        │
     │                   │   ├─ npm                  │
     │                   │   └─ create-release       │
     │                   │       └─ trigger ─────────┘
     │                   │
     ↓                   ↓
Status checks      GitHub Release
on PR             with artifacts
```

## References

- GitHub Actions Documentation: https://docs.github.com/en/actions
- Reusable Workflows: https://docs.github.com/en/actions/using-workflows/reusing-workflows
- SLSA Attestations: https://slsa.dev/
- Docker Buildx: https://docs.docker.com/buildx/
- Workflow Files: `.github/workflows/`
- Workflow Linting: `pnpm lint:workflows` (actionlint)
- SonarCloud: https://sonarcloud.io/project/overview?id=sonarqube-mcp-server
