---
'sonarqube-mcp-server': patch
---

Fix Docker Hub publishing for multi-platform OCI images

- Extract OCI layout from tar archive
- Use `docker buildx imagetools create` with `oci-layout://` scheme
- Properly handles multi-platform manifest lists for linux/amd64 and linux/arm64
- Fixes "unknown flag: --tag" error from incorrect buildx imagetools import syntax
