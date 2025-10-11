---
'sonarqube-mcp-server': patch
---

Remove fallback to build from source in publish workflow

The NPM and GitHub Packages publish jobs now fail explicitly if pre-built artifacts are not found, instead of falling back to building from source. This ensures we always publish exactly what was tested and validated in the Main workflow, maintaining supply chain integrity.
