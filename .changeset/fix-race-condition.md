---
'sonarqube-mcp-server': patch
---

Fix race condition by generating attestations before creating release to ensure Main workflow completes before Publish workflow starts
