---
'sonarqube-mcp-server': patch
---

Fix Docker build workflow ordering to ensure artifacts exist before release

- Split version determination from release creation in main workflow
- Build Docker image BEFORE creating GitHub release
- Ensures Docker artifact exists when publish workflow is triggered
- Prevents race condition where publish workflow can't find Docker artifacts
