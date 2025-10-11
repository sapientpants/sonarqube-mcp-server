---
'sonarqube-mcp-server': patch
---

Refactor Docker Hub publishing to use GHCR as intermediate storage

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
