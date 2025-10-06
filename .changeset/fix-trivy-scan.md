---
'sonarqube-mcp-server': patch
---

fix: improve Docker security scanning and fix OpenSSL vulnerabilities

- Upgraded OpenSSL packages to fix CVE-2025-9230, CVE-2025-9231, CVE-2025-9232
- Simplified Trivy scan workflow to always upload SARIF results before failing
- Configured Trivy to only report fixable vulnerabilities
- Enabled license scanner for comprehensive security scanning
- Added SARIF artifact upload for debugging scan results
