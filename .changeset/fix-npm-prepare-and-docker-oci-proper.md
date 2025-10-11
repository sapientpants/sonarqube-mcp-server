---
'sonarqube-mcp-server': patch
---

Fix NPM prepare script and Docker OCI push issues

- NPM: Remove prepare script from package.json before publishing (--ignore-scripts doesn't skip prepare)
- Docker: Use skopeo to push OCI archive directly to Docker Hub instead of loading to docker-daemon
- Docker: Configure skopeo authentication with Docker Hub credentials
