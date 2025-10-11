---
'sonarqube-mcp-server': patch
---

Fix NPM and Docker publish failures

- NPM: Add --ignore-scripts flag to prevent husky from running during publish
- Docker: Use skopeo to load OCI format images from multi-platform builds instead of docker load
