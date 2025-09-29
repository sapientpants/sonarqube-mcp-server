---
'sonarqube-mcp-server': patch
---

fix: resolve artifact SHA mismatch in publish workflow

- The release tag points to the version commit, but artifacts are built with the parent commit
- Update determine-artifact.sh to look for parent commit's workflow run
- Use parent SHA for artifact name matching since that's what created them
- This fixes the publish workflow failing to find artifacts after release
