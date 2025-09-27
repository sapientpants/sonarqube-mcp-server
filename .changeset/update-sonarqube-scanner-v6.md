---
'sonarqube-mcp-server': patch
---

security: update SonarQube Scanner GitHub Action to v6

Update SonarSource/sonarqube-scan-action from v5 to v6 to address security vulnerability. The v5 action is no longer supported and contains known security issues.

**Security Improvements:**

- Resolves security vulnerability in SonarQube Scanner GitHub Action
- Updates to latest supported version with security patches
- Maintains all existing functionality while improving security posture

**References:**

- Security advisory: https://community.sonarsource.com/gha-v6-update
- Updated action: sonarsource/sonarqube-scan-action@v6
