# 11. Docker containerization for deployment

Date: 2025-06-13
Updated: 2025-10-11 (Added multi-platform, GHCR, security scanning)

## Status

Accepted

## Context

The SonarQube MCP server needs to be easily deployable across different environments with consistent behavior. Users require a simple deployment method that:

- Eliminates dependency management issues (Node.js version, npm packages)
- Ensures consistent runtime environments across different systems
- Simplifies the deployment process for non-technical users
- Supports various MCP transport mechanisms (stdio, SSE)
- Enables easy updates and version management
- Works on multiple CPU architectures (Intel/AMD x64, Apple Silicon ARM64)
- Provides security guarantees through vulnerability scanning

## Decision

We will provide Docker containerization as the recommended deployment option for the SonarQube MCP server. This includes:

- Maintaining a Dockerfile in the repository that packages the server with all dependencies
- Publishing Docker images to both GitHub Container Registry (GHCR) and Docker Hub
- Documenting Docker usage in the README as a primary deployment method
- Supporting stdio transport within the containerized environment (SSE removed as of ADR-0019)

### Modern Implementation (as of 2025-10-11)

The Docker implementation has evolved significantly beyond the initial decision:

#### Multi-Platform Support

- **Platforms**: Builds for both `linux/amd64` and `linux/arm64`
- **Tooling**: Uses Docker Buildx with QEMU emulation for ARM64 builds
- **Distribution**: Multi-platform manifest lists allow Docker to automatically select the correct architecture
- **References**: See ADR-0027 for publishing strategy details

#### Two-Registry Strategy

1. **GitHub Container Registry (GHCR)** - Primary build target:
   - Built and pushed in main workflow
   - Security scanned before any public distribution
   - Used as intermediate registry for Docker Hub
   - Registry: `ghcr.io/sapientpants/sonarqube-mcp-server`

2. **Docker Hub** - Public distribution:
   - Images copied from GHCR in publish workflow
   - Better discoverability for end users
   - Registry: `sapientpants/sonarqube-mcp-server`
   - References\*\*: See ADR-0027 (Docker Image Publishing Strategy)

#### Security Scanning

- **Tool**: Trivy vulnerability scanner
- **Severity**: Blocks on HIGH and CRITICAL vulnerabilities
- **Integration**: Automatic in CI/CD pipeline before publishing
- **SARIF Upload**: Results uploaded to GitHub Security tab
- **References**: See ADR-0025 (Container and Security Scanning Strategy)

#### Supply Chain Security

- **SLSA Provenance**: Build attestations attached to all images
- **SBOM**: Software Bill of Materials (CycloneDX format) generated and attached
- **Verification**: Users can verify image provenance using GitHub attestation API

#### Base Image and Configuration

The Dockerfile:

- Uses `node:22-alpine` as base image for minimal size
- Installs pnpm@10.17.0 for dependency management
- Multi-stage build for optimal layer caching
- Non-root user (`node`) for security
- Proper signal handling for graceful shutdown
- Health check endpoint for container orchestration

#### Tagging Strategy

Each release creates four tags:

- Full semantic version: `1.10.18`
- Major.minor version: `1.10`
- Major version: `1`
- Latest: `latest`

## Consequences

### Positive

- **Simplified deployment**: Users can run the server with a single `docker run` command
- **Dependency isolation**: All Node.js and npm dependencies are packaged within the container
- **Version consistency**: Specific server versions can be deployed using Docker tags
- **Cross-platform compatibility**: Works identically on Linux, macOS, and Windows with Docker
- **Easy updates**: Users can update by pulling new image versions
- **Multi-Architecture**: Native support for both Intel/AMD and ARM64 (Apple Silicon, AWS Graviton)
- **Security First**: Images are scanned for vulnerabilities before distribution
- **Supply Chain Security**: SLSA provenance and SBOM provide transparency
- **Dual Registry**: GHCR for GitHub users, Docker Hub for broader community
- **Efficient Publishing**: Build once, copy to Docker Hub (no rebuild required)

### Negative

- **Additional maintenance**: Requires maintaining Dockerfile and multi-registry releases
- **Image size**: Docker images are larger than source distributions (includes Node.js runtime)
  - Current size: ~150MB compressed (Alpine-based)
- **Docker requirement**: Users must have Docker installed and running
- **Resource overhead**: Containers have slight performance overhead compared to native execution
- **Multi-Platform Build Time**: ARM64 emulation adds 2-3 minutes to build time
- **Registry Costs**: Potential GHCR storage costs (minimal for public repos)
- **Two Registry Sync**: Need to maintain consistency between GHCR and Docker Hub

### Neutral

- Docker deployment is the recommended approach but not mandatory - users can still install from source
- Docker image tags align with npm package versions for consistency
- Multi-platform manifest lists handled transparently by Docker (users don't need to specify platform)
- GHCR acts as intermediate storage (invisible to most users)

## References

- Dockerfile: `Dockerfile` (in repository root)
- ADR-0019: Simplify to stdio-only transport (removed SSE support)
- ADR-0024: CI/CD Platform - GitHub Actions (workflow automation)
- ADR-0025: Container and Security Scanning Strategy (Trivy, SLSA, SBOM)
- ADR-0027: Docker Image Publishing Strategy - GHCR to Docker Hub (two-registry approach)
- GitHub Container Registry: https://ghcr.io/sapientpants/sonarqube-mcp-server
- Docker Hub: https://hub.docker.com/r/sapientpants/sonarqube-mcp-server
