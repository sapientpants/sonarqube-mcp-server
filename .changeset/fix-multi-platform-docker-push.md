---
'sonarqube-mcp-server': patch
---

Fix multi-platform Docker image publishing to Docker Hub

- Change skopeo `--all` flag to `--multi-arch all` for proper OCI manifest list handling
- Ensures both linux/amd64 and linux/arm64 images are pushed correctly
- Fixes error: "more than one image in oci, choose an image"
