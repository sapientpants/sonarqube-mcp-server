---
'sonarqube-mcp-server': patch
---

Fix race condition in artifact determination script

- Add retry logic with exponential backoff to determine-artifact.sh
- Wait up to 5 attempts with increasing delays (5s, 10s, 15s, 20s, 25s)
- Fixes race condition where Publish workflow starts before Main workflow is indexed by GitHub API
- Total retry window: ~75 seconds, giving GitHub's API time to index completed workflow runs
