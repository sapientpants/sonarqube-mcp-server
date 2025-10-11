---
'sonarqube-mcp-server': patch
---

Fix Docker image publishing by adding packages:write permission to workflows

The v1.10.17 build failed when attempting to push multi-platform Docker images to GitHub Container Registry (GHCR) with error: "denied: installation not allowed to Create organization package"

Root cause: The reusable-docker.yml workflow was missing the `packages: write` permission needed to push images to GHCR. While the main workflow had this permission, reusable workflows require explicit permissions and do not inherit from their callers.

Additionally, the PR workflow calls reusable-docker.yml, so it must also grant the permission even though PR builds don't use it (they use single-platform without push).

This fix adds `packages: write` to:

- `.github/workflows/reusable-docker.yml` - Required to push multi-platform images to GHCR
- `.github/workflows/pr.yml` - Required to call reusable-docker.yml (permission not used in practice)

The permission is only exercised when the workflow actually pushes to GHCR (multi-platform builds with save-artifact=true). PR builds continue to use single-platform without pushing to GHCR.
