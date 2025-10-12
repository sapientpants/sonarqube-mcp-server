# 27. Docker Image Publishing Strategy GHCR to Docker Hub

Date: 2025-10-11

## Status

Accepted

## Context

The SonarQube MCP Server needs a reliable Docker image distribution strategy that balances build efficiency, security, and user accessibility. The project has several requirements:

- **Multi-platform support**: Must support both linux/amd64 and linux/arm64 architectures
- **Public accessibility**: Images should be available on Docker Hub for easy discovery
- **Build efficiency**: Multi-platform builds are resource-intensive and time-consuming
- **Security scanning**: Images must be scanned for vulnerabilities before distribution
- **Single build principle**: Build once, deploy many (avoid rebuilding for each registry)
- **GitHub Actions integration**: Leverage native GitHub tooling and permissions
- **Supply chain security**: Provenance and attestations for all published images

Initial approach was direct publishing to Docker Hub, but this had limitations:

- Multi-platform builds required building twice (once for main, once for publish)
- Cannot use GitHub artifacts for Docker images (they require push to a registry)
- Security scanning happened too late (after publishing)
- No easy way to share multi-platform images between workflows

Publishing strategies considered:

1. **Build and push directly to Docker Hub**: Simple but requires separate builds, no GitHub integration
2. **Use GitHub's artifact system**: Not suitable for Docker images (requires registry)
3. **GHCR as intermediate registry**: Leverages GitHub's infrastructure, single build, then copy to Docker Hub
4. **Build in publish workflow**: Wastes CI time with duplicate builds, delays releases

## Decision

We will use a **two-stage publishing strategy** with **GitHub Container Registry (GHCR) as an intermediate registry**:

### Stage 1: Build and Push to GHCR (Main Workflow)

The main workflow (`.github/workflows/main.yml`) builds multi-platform Docker images and pushes to GHCR:

1. **Build Phase**:
   - Triggers on push to main branch
   - Uses Docker Buildx for multi-platform builds
   - Platforms: `linux/amd64,linux/arm64`
   - Caches layers in GitHub Actions cache

2. **Security Scanning**:
   - Trivy scans image for HIGH/CRITICAL vulnerabilities
   - Fails build if vulnerabilities found
   - Uploads SARIF results to GitHub Security tab

3. **Push to GHCR**:
   - Pushes to `ghcr.io/${{ github.repository_owner }}/sonarqube-mcp-server`
   - Tags: `latest`, version tag (e.g., `1.10.18`), major version, major.minor version
   - Includes SLSA provenance attestations

4. **GitHub Release**:
   - Creates GitHub release after build completes
   - Triggers the publish workflow

### Stage 2: Copy from GHCR to Docker Hub (Publish Workflow)

The publish workflow (`.github/workflows/publish.yml`) copies the pre-built image from GHCR to Docker Hub:

1. **Trigger**:
   - GitHub release published event
   - Manual workflow dispatch (for re-publishing)

2. **Copy Operation**:
   - Uses `docker buildx imagetools create` command
   - Preserves multi-platform manifest
   - No rebuild required (instant copy)
   - Validates source image exists before copying

3. **Tagging Strategy**:
   - Version tag: `1.10.18`
   - Latest tag: `latest`
   - Major version: `1`
   - Major.minor version: `1.10`

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Main Workflow                           │
│                     (on push to main)                           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│  1. Build Multi-Platform Image (linux/amd64, linux/arm64)      │
│     - Docker Buildx with QEMU emulation                         │
│     - Cache layers in GitHub Actions                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. Security Scan (Trivy)                                       │
│     - Scan for HIGH/CRITICAL vulnerabilities                    │
│     - Upload SARIF to GitHub Security tab                       │
│     - Fail if vulnerabilities found                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. Push to GHCR (ghcr.io/sapientpants/sonarqube-mcp-server)   │
│     - Multi-platform manifest                                   │
│     - Tags: latest, version, major, major.minor                 │
│     - SLSA provenance attestations                              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. Create GitHub Release                                       │
│     - Triggers publish workflow                                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Publish Workflow                           │
│                 (on release published)                          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│  1. Login to GHCR and Docker Hub                                │
│     - GHCR: GitHub token (automatic)                            │
│     - Docker Hub: DOCKERHUB_USERNAME, DOCKERHUB_TOKEN           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. Copy Image (docker buildx imagetools create)                │
│     - Source: ghcr.io/.../sonarqube-mcp-server:$VERSION         │
│     - Target: dockerhub.com/.../sonarqube-mcp-server:$VERSION   │
│     - Preserves multi-platform manifest                         │
│     - No rebuild (instant copy)                                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. Create Additional Tags                                      │
│     - latest, major version, major.minor version                │
└─────────────────────────────────────────────────────────────────┘
```

### Key Implementation Details

**Main Workflow - Build Job**:

```yaml
docker:
  name: Build Docker Image
  needs: [validate, security, build]
  if: vars.ENABLE_DOCKER_RELEASE == 'true' && needs.build.outputs.changed == 'true'
  uses: ./.github/workflows/reusable-docker.yml
  with:
    platforms: 'linux/amd64,linux/arm64'
    image-name: 'sonarqube-mcp-server'
    version: ${{ needs.build.outputs.version }}
```

**Publish Workflow - Docker Job**:

```yaml
- name: Copy image from GHCR to Docker Hub
  run: |
    SOURCE_IMAGE="ghcr.io/${{ github.repository_owner }}/sonarqube-mcp-server"
    TARGET_REPO="${{ secrets.DOCKERHUB_USERNAME }}/sonarqube-mcp-server"
    VERSION="${{ steps.version.outputs.version }}"

    # Copy multi-platform image (preserves manifest)
    docker buildx imagetools create \
      --tag $TARGET_REPO:$VERSION \
      $SOURCE_IMAGE:$VERSION

    # Create additional tags
    MAJOR=$(echo "$VERSION" | cut -d. -f1)
    MINOR=$(echo "$VERSION" | cut -d. -f2)

    docker buildx imagetools create --tag $TARGET_REPO:latest $TARGET_REPO:$VERSION
    docker buildx imagetools create --tag $TARGET_REPO:$MAJOR $TARGET_REPO:$VERSION
    docker buildx imagetools create --tag $TARGET_REPO:$MAJOR.$MINOR $TARGET_REPO:$VERSION
```

### Permissions Model

**Main Workflow** (`packages: write`):

- Requires `packages: write` to push to GHCR
- Fixed in PR #320 (was missing, causing authentication failures)

**Publish Workflow** (`packages: read`):

- Requires `packages: read` to pull from GHCR
- Requires Docker Hub credentials (secrets) for pushing

## Consequences

### Positive

- **Build Once, Deploy Many**: Multi-platform image built once, copied to Docker Hub
- **Faster Releases**: No rebuild in publish workflow (instant copy)
- **Security First**: Security scanning happens before any public distribution
- **GitHub Integration**: Leverages GHCR with native GitHub authentication
- **Multi-Platform Manifest**: `imagetools` correctly handles multi-architecture manifest lists
- **Cost Efficiency**: Uses GitHub's free GHCR for build artifacts
- **Rollback Capability**: Can re-publish from GHCR without rebuilding
- **Consistent Artifacts**: Exact same image tested and scanned is published
- **Supply Chain Security**: SLSA provenance attached to GHCR images
- **Public Accessibility**: Docker Hub provides better discoverability for users

### Negative

- **Two Registries**: Need to manage images in both GHCR and Docker Hub
- **GHCR Dependency**: Requires GHCR as intermediate step (cannot go directly to Docker Hub)
- **Secret Management**: Requires Docker Hub credentials as GitHub secrets
- **Workflow Complexity**: Two-stage process adds complexity to release pipeline
- **Network Dependency**: Copy operation requires network transfer between registries
- **GHCR Storage Costs**: Potential costs for GHCR storage (though minimal for public repos)
- **Delayed Docker Hub Publish**: Docker Hub gets image after GitHub release (delay of ~2-5 minutes)

### Neutral

- **Registry Choice**: Could swap Docker Hub for another registry easily
- **GHCR Visibility**: Images on GHCR are accessible but less discoverable
- **Tag Management**: Need to maintain consistent tagging across registries

## Implementation

### Prerequisites

1. **Enable Docker Release** (Repository Variables):

   ```
   Settings > Secrets and variables > Variables
   Name: ENABLE_DOCKER_RELEASE
   Value: true
   ```

2. **Configure Docker Hub Credentials** (Repository Secrets):

   ```
   Settings > Secrets and variables > Secrets
   Name: DOCKERHUB_USERNAME
   Value: your-dockerhub-username

   Name: DOCKERHUB_TOKEN
   Value: your-dockerhub-access-token
   ```

3. **GHCR Permissions** (automatic):
   - GHCR uses GitHub token automatically
   - Workflow must have `packages: write` permission (main workflow)
   - Workflow must have `packages: read` permission (publish workflow)

### Usage

**Developers**: No manual intervention required

- Merge PR to main → Automatic build and push to GHCR
- Create GitHub release → Automatic copy to Docker Hub

**Users** (pulling images):

```bash
# From Docker Hub (recommended for public consumption)
docker pull sapientpants/sonarqube-mcp-server:latest
docker pull sapientpants/sonarqube-mcp-server:1.10.18
docker pull sapientpants/sonarqube-mcp-server:1
docker pull sapientpants/sonarqube-mcp-server:1.10

# From GHCR (for GitHub users or testing)
docker pull ghcr.io/sapientpants/sonarqube-mcp-server:latest
docker pull ghcr.io/sapientpants/sonarqube-mcp-server:1.10.18
```

### Manual Re-publishing

If needed, re-publish a specific version without rebuilding:

```bash
# Via GitHub UI
1. Go to Actions tab
2. Select "Publish" workflow
3. Click "Run workflow"
4. Enter tag (e.g., v1.10.18)
5. Click "Run workflow"

# Via GitHub CLI
gh workflow run publish.yml -f tag=v1.10.18
```

### Troubleshooting

**Image not found on Docker Hub**:

1. Check if `ENABLE_DOCKER_RELEASE` variable is set to `true`
2. Verify Docker Hub credentials are configured
3. Check publish workflow logs for errors
4. Verify image exists on GHCR: `docker pull ghcr.io/sapientpants/sonarqube-mcp-server:$VERSION`

**Authentication failures**:

- Main workflow: Ensure `packages: write` permission in workflow
- Publish workflow: Ensure `packages: read` permission and Docker Hub secrets

**Multi-platform issues**:

- Verify both platforms are present: `docker buildx imagetools inspect ghcr.io/.../image:tag`
- Check for platform-specific failures in build logs

## Examples

### Example 1: Successful Release Flow

```
# Main workflow triggered by PR merge to main
1. Build multi-platform image → 5 minutes
2. Security scan with Trivy → 30 seconds
3. Push to GHCR with tags → 30 seconds
   ghcr.io/sapientpants/sonarqube-mcp-server:1.10.18
   ghcr.io/sapientpants/sonarqube-mcp-server:latest
   ghcr.io/sapientpants/sonarqube-mcp-server:1
   ghcr.io/sapientpants/sonarqube-mcp-server:1.10
4. Create GitHub release → triggers publish workflow

# Publish workflow triggered by release creation
1. Login to GHCR and Docker Hub → 5 seconds
2. Copy image from GHCR to Docker Hub → 30 seconds
   docker buildx imagetools create --tag sapientpants/sonarqube-mcp-server:1.10.18 \
     ghcr.io/sapientpants/sonarqube-mcp-server:1.10.18
3. Create additional tags (latest, 1, 1.10) → 15 seconds

Total time: ~6 minutes (vs ~10 minutes with rebuild)
```

### Example 2: Inspecting Multi-Platform Image

```bash
# Check platforms available on GHCR
docker buildx imagetools inspect ghcr.io/sapientpants/sonarqube-mcp-server:1.10.18

Output:
Name:      ghcr.io/sapientpants/sonarqube-mcp-server:1.10.18
MediaType: application/vnd.oci.image.index.v1+json
Digest:    sha256:abc123...

Manifests:
  Name:      ghcr.io/sapientpants/sonarqube-mcp-server:1.10.18@sha256:def456...
  MediaType: application/vnd.oci.image.manifest.v1+json
  Platform:  linux/amd64

  Name:      ghcr.io/sapientpants/sonarqube-mcp-server:1.10.18@sha256:ghi789...
  MediaType: application/vnd.oci.image.manifest.v1+json
  Platform:  linux/arm64

# Verify copy to Docker Hub preserves platforms
docker buildx imagetools inspect sapientpants/sonarqube-mcp-server:1.10.18
# Should show same platforms: linux/amd64, linux/arm64
```

### Example 3: Manual Copy Command

```bash
# Manually copy image from GHCR to Docker Hub (if workflow fails)
docker buildx imagetools create \
  --tag sapientpants/sonarqube-mcp-server:1.10.18 \
  ghcr.io/sapientpants/sonarqube-mcp-server:1.10.18

# Create additional tags
docker buildx imagetools create \
  --tag sapientpants/sonarqube-mcp-server:latest \
  sapientpants/sonarqube-mcp-server:1.10.18
```

## References

- Docker Buildx imagetools documentation: https://docs.docker.com/engine/reference/commandline/buildx_imagetools_create/
- GHCR documentation: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- Main Workflow: .github/workflows/main.yml
- Publish Workflow: .github/workflows/publish.yml
- Reusable Docker Workflow: .github/workflows/reusable-docker.yml
- PR #319: Initial GHCR-based publishing strategy
- PR #320: Fixed `packages:write` permission issue
- Related ADR: ADR-0011 (Docker Containerization)
- Related ADR: ADR-0024 (CI/CD Platform - GitHub Actions)
- Related ADR: ADR-0025 (Container and Security Scanning Strategy)
