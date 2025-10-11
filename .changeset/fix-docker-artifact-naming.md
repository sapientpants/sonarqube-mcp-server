---
'sonarqube-mcp-server': patch
---

Fix Docker artifact naming to match NPM pattern for consistent artifact resolution

Changed Docker artifact naming from `docker-image-{SHA}` to `docker-image-{VERSION}` to match the NPM artifact pattern. This ensures the determine-artifact.sh script can find Docker artifacts using the same logic as NPM artifacts, eliminating the need for conditional logic based on artifact type.
