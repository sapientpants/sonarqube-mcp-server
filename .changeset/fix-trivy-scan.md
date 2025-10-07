---
'sonarqube-mcp-server': patch
---

fix: improve Docker security scanning and fix OpenSSL vulnerabilities

- Upgraded OpenSSL packages to fix CVE-2025-9230, CVE-2025-9231, CVE-2025-9232
- Simplified Trivy scan workflow to always upload SARIF results before failing
- Configured Trivy to only report fixable vulnerabilities
- Added license scanner with informational reporting (GPL/LGPL licenses documented in LICENSES.md)
- License findings don't fail the build; only vulnerabilities, secrets, and misconfigurations do
- Added SARIF artifact upload for debugging scan results
