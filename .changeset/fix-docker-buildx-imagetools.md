---
'sonarqube-mcp-server': patch
---

Fix multi-platform Docker image publishing using buildx imagetools

- Replace skopeo with docker buildx imagetools for OCI archive handling
- The imagetools command properly imports multi-platform manifest lists from OCI archives
- Fixes error: "more than one image in oci, choose an image"
- Ensures both linux/amd64 and linux/arm64 images are pushed correctly to Docker Hub
