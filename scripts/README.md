# SonarQube MCP Server Test Scripts

This directory contains comprehensive test scripts for validating the SonarQube MCP Server deployment artifacts, including Kubernetes manifests, Helm charts, Terraform modules, and documentation.

## Overview

The test suite ensures that all deployment artifacts are:

- Syntactically correct
- Follow security best practices
- Work as expected in different configurations
- Scale properly under load
- Integrate correctly with monitoring systems

## Test Scripts

### 🚀 Master Test Runner

**Script:** `run-all-tests.sh`

Orchestrates all test suites in the correct order.

```bash
# Run all tests
./scripts/run-all-tests.sh

# Run specific test suite
./scripts/run-all-tests.sh --only helm

# Skip cleanup for debugging
./scripts/run-all-tests.sh --skip-cleanup
```

### 📚 Documentation Validation

**Script:** `validate-docs.sh`

Validates documentation for:

- Broken internal links
- Invalid code examples
- Missing required sections
- Orphaned images
- TODO markers

```bash
./scripts/validate-docs.sh
```

### 🔧 Terraform Validation

**Script:** `validate-terraform.sh`

Tests Terraform modules for:

- Syntax validation
- Formatting standards
- Security issues (hardcoded secrets)
- Required variables
- Plan generation

```bash
./scripts/validate-terraform.sh
```

### 🎯 Helm Chart Testing

**Script:** `test-helm-values.sh`

Tests Helm chart with various configurations:

- Minimal deployment
- Production settings
- High availability
- Monitoring enabled
- Ingress with TLS

```bash
./scripts/test-helm-values.sh
```

### ☸️ Kubernetes Deployment Testing

**Script:** `test-k8s-deployment.sh`

Basic Kubernetes deployment test using kind cluster.

```bash
export SONARQUBE_TOKEN="your-token"
./scripts/test-k8s-deployment.sh
```

**Script:** `test-k8s-helm-deployment.sh`

Extended test that validates both Kustomize and Helm deployments.

```bash
# Test both Kustomize and Helm
./scripts/test-k8s-helm-deployment.sh

# Test only Helm
./scripts/test-k8s-helm-deployment.sh --skip-kustomize

# Keep cluster for debugging
./scripts/test-k8s-helm-deployment.sh --keep-cluster
```

### 🔒 Security Scanning

**Script:** `security-scan.sh`

Comprehensive security scanning using:

- Kubesec for Kubernetes manifests
- Trivy for container vulnerabilities
- Polaris for policy violations
- Custom security checks

```bash
./scripts/security-scan.sh
```

### 📊 Monitoring Integration Tests

**Script:** `test-monitoring-integration.sh`

Tests monitoring endpoints and integration:

- Health and readiness checks
- Prometheus metrics format
- Circuit breaker functionality
- OpenTelemetry support
- Performance metrics

```bash
# Requires running service
npm run dev

# In another terminal
./scripts/test-monitoring-integration.sh
```

### ⚡ Load Testing

**Script:** `load-test.sh`

Tests auto-scaling behavior under load using k6 or Apache Bench.

```bash
# Default configuration
./scripts/load-test.sh

# Custom parameters
CONCURRENT_USERS=100 DURATION=600 ./scripts/load-test.sh
```

### 🌐 Network Fixes

**Script:** `fix-kind-dns.sh`

Fixes DNS resolution issues in kind clusters (common on macOS).

```bash
./scripts/fix-kind-dns.sh cluster-name
```

## Helm Test Hooks

Located in `helm/sonarqube-mcp/templates/tests/`:

- `deployment-test.yaml` - Tests deployment readiness
- `service-test.yaml` - Tests service connectivity
- `config-test.yaml` - Tests configuration validity

Run with:

```bash
helm test release-name -n namespace
```

## Prerequisites

### Required Tools

- Docker
- kubectl
- Helm 3+

### Optional Tools

- kind (for Kubernetes tests)
- Terraform (for Terraform validation)
- k6 or Apache Bench (for load testing)
- trivy (for container scanning)
- Node.js (for documentation validation)

### Tool Installation

```bash
# macOS with Homebrew
brew install kubectl helm kind terraform k6 trivy

# Install Polaris
brew install FairwindsOps/tap/polaris

# Install kubesec (downloaded automatically if not present)
```

## CI/CD Integration

These scripts are designed to be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run all tests
  run: ./scripts/run-all-tests.sh

# Example GitLab CI
test:
  script:
    - ./scripts/validate-docs.sh
    - ./scripts/validate-terraform.sh
    - ./scripts/test-helm-values.sh
    - ./scripts/security-scan.sh
```

## Troubleshooting

### Common Issues

1. **Script not executable**

   ```bash
   chmod +x scripts/*.sh
   ```

2. **Kind cluster issues**

   ```bash
   kind delete cluster --name sonarqube-mcp-test
   ./scripts/test-k8s-deployment.sh
   ```

3. **DNS resolution in kind**

   ```bash
   ./scripts/fix-kind-dns.sh sonarqube-mcp-test
   ```

4. **Missing tools**
   Check prerequisites and install required tools.

## Best Practices

1. **Run tests before commits**

   ```bash
   ./scripts/run-all-tests.sh --only docs,helm,security
   ```

2. **Use in CI/CD**
   Integrate appropriate tests in your pipeline.

3. **Regular security scans**

   ```bash
   ./scripts/security-scan.sh
   ```

4. **Test configuration changes**
   Always test Helm values changes:
   ```bash
   ./scripts/test-helm-values.sh
   ```

## Contributing

When adding new deployment artifacts:

1. Update relevant test scripts
2. Add new test cases if needed
3. Document in this README
4. Ensure tests pass before PR
