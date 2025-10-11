---
'sonarqube-mcp-server': patch
---

Fix cross-workflow artifact downloads by adding run-id parameter

The Publish workflow was unable to download artifacts from the Main workflow because the actions/download-artifact@v4 action defaults to only downloading artifacts from the current workflow run. Added the run-id and github-token parameters to all three download steps (NPM, GitHub Packages, and Docker) to enable cross-workflow artifact access.
