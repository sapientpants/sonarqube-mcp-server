---
'sonarqube-mcp-server': patch
---

Fix artifact name resolution in publish workflow by using full commit SHA

The determine-artifact.sh script was incorrectly shortening the parent commit SHA to 7 characters when searching for artifacts, but the main workflow creates artifacts with the full SHA. This mismatch caused the publish workflow to fail when trying to locate Docker and NPM artifacts for publishing.
