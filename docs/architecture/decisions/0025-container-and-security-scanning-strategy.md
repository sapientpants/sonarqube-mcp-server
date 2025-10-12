# 25. Container and Security Scanning Strategy

Date: 2025-10-11

## Status

Accepted

## Context

The SonarQube MCP Server requires comprehensive security scanning to identify vulnerabilities before they reach production. As a tool that integrates with SonarQube (a security-focused platform), this project must maintain exemplary security practices. The project needs:

- Container vulnerability scanning for Docker images
- Source code static analysis (SAST) for security issues
- Dependency vulnerability scanning for npm packages
- Integration with GitHub Security tab for centralized visibility
- Fail-fast approach to prevent insecure releases
- SARIF format output for GitHub Advanced Security
- Supply chain security attestations (SLSA provenance)
- License compliance checking

Multiple scanning tools exist with different strengths:

- **Trivy**: Fast, comprehensive, supports multiple formats, excellent container scanning
- **Snyk**: Good UI, expensive for private repos, requires account
- **Grype**: Fast but fewer vulnerability sources
- **Clair**: More complex setup, primarily for registries
- **CodeQL**: GitHub's native SAST tool, excellent for code analysis
- **OSV-Scanner**: Google's vulnerability scanner, good for dependencies

## Decision

We will implement a **multi-layered security scanning strategy** using multiple complementary tools:

### 1. Trivy for Container Scanning

**Purpose**: Scan Docker images for OS and application vulnerabilities

**Configuration**:

- Severity threshold: `HIGH,CRITICAL` (blocks release)
- Formats: Table (local), SARIF (CI/CD)
- Scan targets: Built Docker images before publishing
- License scanning: GPL, LGPL, MPL allowed (configured exceptions)

**Integration points**:

- Local development: `pnpm scan:container` script
- CI/CD: Integrated in reusable-docker.yml workflow
- SARIF upload: GitHub Security tab for visibility

**Script**: `scripts/scan-container.sh`

```bash
# Local container scanning with flexible options
./scripts/scan-container.sh --severity HIGH,CRITICAL
```

**Trivy configuration** (`.trivyignore`):

- Minimal ignores (only false positives)
- Each exclusion documented with reason
- Regular review of ignored CVEs

### 2. CodeQL for Static Application Security Testing (SAST)

**Purpose**: Analyze TypeScript/JavaScript source code for security vulnerabilities

**Configuration**:

- Language: JavaScript/TypeScript
- Queries: Default CodeQL security queries
- Schedule: Weekly scans + on every PR
- Auto-fix: Enabled for supported issues

**Detects**:

- SQL injection risks
- Cross-site scripting (XSS)
- Command injection
- Path traversal
- Cryptographic issues
- Insecure deserialization
- Server-side request forgery (SSRF)

**Workflow**: `.github/workflows/codeql.yml`

### 3. OSV-Scanner for Dependency Vulnerabilities

**Purpose**: Scan npm dependencies for known vulnerabilities

**Configuration**:

- Target: `pnpm-lock.yaml`
- Format: SARIF for GitHub integration
- Fail threshold: Any HIGH or CRITICAL vulnerability
- Auto-remediation: Dependabot PRs

**Coverage**:

- NPM packages (production and dev dependencies)
- Transitive dependencies
- OSV (Open Source Vulnerabilities) database
- GitHub Advisory Database
- NVD (National Vulnerability Database)

**Workflow**: Integrated in `.github/workflows/reusable-security.yml`

### 4. SonarCloud for Code Quality and Security

**Purpose**: Continuous code quality and security analysis

**Configuration**:

- Project key: `sonarqube-mcp-server`
- Quality gate: Must pass before merge
- Coverage requirement: 80% minimum

**Security analysis**:

- Security hotspots identification
- OWASP Top 10 coverage
- CWE/SANS Top 25 detection
- Code smells with security impact

**Integration**: Integrated in `.github/workflows/reusable-validate.yml`

### 5. NPM Audit for Dependency Vulnerabilities

**Purpose**: Quick vulnerability check for npm dependencies

**Configuration**:

- Audit level: `critical` only (blocks pre-commit)
- Run frequency: Every commit, every CI run
- Automatic fixes: Manual review required

**Command**: `pnpm audit --audit-level critical`

### Supply Chain Security

**SLSA Provenance Attestations**:

- Generated for all release artifacts
- Includes Docker images, NPM packages, dist files
- Verifiable with GitHub attestation API
- Build provenance includes:
  - Build environment details
  - Builder identity
  - Source repository and commit
  - Build steps and inputs

**SBOM (Software Bill of Materials)**:

- Format: CycloneDX JSON
- Generated with: `@cyclonedx/cdxgen`
- Includes: All dependencies with versions and licenses
- Attached to every GitHub release

**Command**: `pnpm sbom` → generates `sbom.cdx.json`

## Consequences

### Positive

- **Multi-Layered Defense**: Multiple tools catch different vulnerability types
- **Container Security**: Trivy catches OS and application vulnerabilities
- **Source Code Security**: CodeQL detects code-level security issues
- **Dependency Security**: OSV-Scanner and npm audit protect against vulnerable dependencies
- **GitHub Integration**: SARIF uploads centralize findings in Security tab
- **Fail-Fast**: High/critical vulnerabilities block releases
- **Supply Chain Security**: SLSA provenance and SBOM provide transparency
- **License Compliance**: Trivy checks for license violations
- **Local Development**: Developers can run scans locally before commit
- **Comprehensive Coverage**: Covers OS packages, npm dependencies, source code
- **Automated Remediation**: Dependabot creates PRs for fixable vulnerabilities
- **Weekly Scans**: Scheduled CodeQL scans catch new vulnerabilities

### Negative

- **False Positives**: Multiple tools may report false positives requiring triage
- **Scan Time**: Security scans add 2-3 minutes to CI/CD pipeline
- **Maintenance Overhead**: Need to maintain `.trivyignore` and exclusion lists
- **Tool Updates**: Security tools require regular updates to stay current
- **Noise**: Low-severity findings can create noise (mitigated with thresholds)
- **Complex Triage**: Multiple tools require checking multiple interfaces
- **Breaking Changes**: Tool updates may introduce new findings that break builds

### Neutral

- **GitHub Dependency**: Heavily relies on GitHub Security features
- **Learning Curve**: Team needs to understand output from multiple tools
- **Update Frequency**: Vulnerability databases update frequently, findings change
- **Scanner Differences**: Different tools may disagree on severity ratings

## Implementation

### Local Development Setup

**Install Trivy**:

```bash
# macOS
brew install aquasecurity/trivy/trivy

# Linux (Ubuntu/Debian)
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
sudo apt-get update && sudo apt-get install trivy

# Docker
alias trivy='docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasecurity/trivy:latest'
```

**Run local scans**:

```bash
# Quick scan (HIGH and CRITICAL only)
pnpm scan:container

# Full scan (all severities)
./scripts/scan-container.sh --severity UNKNOWN,LOW,MEDIUM,HIGH,CRITICAL

# Scan and generate SARIF report
pnpm scan:container:sarif

# Scan specific image
./scripts/scan-container.sh --image myimage:tag --skip-build

# Ignore unfixed vulnerabilities
./scripts/scan-container.sh --ignore-unfixed
```

### CI/CD Integration

**Security workflow** (`.github/workflows/reusable-security.yml`):

```yaml
jobs:
  codeql:
    name: CodeQL Analysis
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript

      - name: Autobuild
        uses: github/codeql-action/autobuild@v3

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          upload: true

  osv-scanner:
    name: OSV Vulnerability Scan
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - name: Run OSV-Scanner
        uses: google/osv-scanner-action@v1
        with:
          scan-args: --lockfile=pnpm-lock.yaml --format=sarif --output=osv-results.sarif

      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: osv-results.sarif
```

**Docker workflow** (`.github/workflows/reusable-docker.yml`):

```yaml
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.IMAGE_TAG }}
    format: 'sarif'
    output: 'trivy-results.sarif'
    severity: 'HIGH,CRITICAL'

- name: Upload Trivy results to GitHub Security
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: 'trivy-results.sarif'
```

### Trivy Configuration

**License exceptions** (`.trivy.yaml` - if created):

```yaml
vulnerability:
  severity:
    - HIGH
    - CRITICAL

license:
  # Allow these open-source licenses
  allowed:
    - MIT
    - Apache-2.0
    - BSD-2-Clause
    - BSD-3-Clause
    - ISC
    - GPL-3.0 # Allowed for this project
    - LGPL-3.0
    - MPL-2.0
```

**Ignore file** (`.trivyignore`):

```
# Format: CVE-ID [exp:YYYY-MM-DD] [# comment]

# Example: False positive in dev dependency
# CVE-2024-12345 exp:2025-12-31 # False positive, only affects test environment

# No exceptions currently - keep this file minimal!
```

### Remediation Workflow

When security vulnerabilities are found:

1. **Triage**:
   - Check severity (HIGH/CRITICAL = immediate fix)
   - Verify it's not a false positive
   - Check if fix is available

2. **Fix**:

   ```bash
   # Update base image
   # In Dockerfile: FROM node:22-alpine -> node:22-alpine@sha256:...

   # Update dependencies
   pnpm update <package>

   # Or update all
   pnpm update --latest
   ```

3. **Verify**:

   ```bash
   # Run local scan
   pnpm scan:container

   # Check if vulnerability is resolved
   trivy image --severity HIGH,CRITICAL myimage:tag
   ```

4. **Document** (if no fix available):
   - Add to `.trivyignore` with expiration date
   - Add comment explaining why it's ignored
   - Create issue to track fix availability

### Monitoring Security Findings

**GitHub Security tab**:

- Navigate to: Repository → Security → Code scanning
- View all findings from CodeQL, OSV-Scanner, Trivy
- Filter by severity, tool, status
- Dismiss false positives with reason

**Check CLI**:

```bash
# View security alerts
gh api /repos/sapientpants/sonarqube-mcp-server/code-scanning/alerts

# View specific alert
gh api /repos/sapientpants/sonarqube-mcp-server/code-scanning/alerts/1
```

## Examples

### Example 1: Container Scan Output

**No vulnerabilities**:

```
✅ Container security scan passed!
No vulnerabilities found matching severity threshold: HIGH,CRITICAL

Scan results:
- Total vulnerabilities: 5
  - LOW: 3
  - MEDIUM: 2
  - HIGH: 0
  - CRITICAL: 0
```

**Vulnerabilities found**:

```
❌ Container security scan failed!
Vulnerabilities found matching severity threshold: HIGH,CRITICAL

myimage:latest (alpine 3.18.0)
==================================
Total: 2 (HIGH: 1, CRITICAL: 1)

+----------------+------------------+----------+-------------------+
| LIBRARY        | VULNERABILITY ID | SEVERITY | FIXED VERSION     |
+----------------+------------------+----------+-------------------+
| libcrypto3     | CVE-2024-12345   | CRITICAL | 3.0.10-r2         |
| libssl3        | CVE-2024-67890   | HIGH     | 3.0.10-r2         |
+----------------+------------------+----------+-------------------+

Remediation Tips:
1. Update base image to latest version
2. Update dependencies in package.json
3. Check for security advisories
```

### Example 2: CodeQL Findings

GitHub Security tab shows:

```
Code scanning alert: SQL Injection
Severity: High
Tool: CodeQL
Location: src/database/query.ts:45

Description:
This query contains unsanitized user input, which could lead to SQL injection.

Recommendation:
Use parameterized queries or an ORM to prevent SQL injection.
```

### Example 3: SBOM Content

**sbom.cdx.json** (excerpt):

```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.4",
  "serialNumber": "urn:uuid:...",
  "version": 1,
  "metadata": {
    "component": {
      "name": "sonarqube-mcp-server",
      "version": "1.10.18",
      "type": "application"
    }
  },
  "components": [
    {
      "name": "@modelcontextprotocol/sdk",
      "version": "1.20.0",
      "purl": "pkg:npm/%40modelcontextprotocol/sdk@1.20.0",
      "type": "library",
      "licenses": [{ "license": { "id": "MIT" } }]
    }
  ]
}
```

## Security Scanning Matrix

| Tool        | Target         | Purpose                    | Frequency      | Fail Threshold |
| ----------- | -------------- | -------------------------- | -------------- | -------------- |
| Trivy       | Docker images  | Container vulnerabilities  | Every build    | HIGH, CRITICAL |
| CodeQL      | Source code    | SAST (code security)       | PR + Weekly    | Any finding    |
| OSV-Scanner | pnpm-lock.yaml | Dependency vulnerabilities | Every PR, push | HIGH, CRITICAL |
| npm audit   | package.json   | Quick dependency check     | Pre-commit, CI | CRITICAL       |
| SonarCloud  | Source code    | Quality + security         | Every PR, push | Quality gate   |

## References

- Trivy Documentation: https://aquasecurity.github.io/trivy/
- CodeQL Documentation: https://codeql.github.com/docs/
- OSV-Scanner: https://google.github.io/osv-scanner/
- SLSA Provenance: https://slsa.dev/
- CycloneDX SBOM: https://cyclonedx.org/
- Container Scan Script: scripts/scan-container.sh
- Security Workflows: .github/workflows/reusable-security.yml
- Trivy Ignore File: .trivyignore
- GitHub Security Tab: https://github.com/sapientpants/sonarqube-mcp-server/security
