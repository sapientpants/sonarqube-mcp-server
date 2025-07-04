#!/bin/bash
# Security scanning script for SonarQube MCP Server Kubernetes manifests
# Uses multiple tools to scan for security vulnerabilities and misconfigurations

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔒 SonarQube MCP Server - Security Scanning${NC}"
echo "============================================="

# Configuration
K8S_DIR="k8s"
HELM_DIR="helm/sonarqube-mcp"
DOCKER_IMAGE="${DOCKER_IMAGE:-mcp:local}"
TEMP_DIR="/tmp/security-scan-$$"

# Create temp directory
mkdir -p "$TEMP_DIR"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Track findings
CRITICAL_COUNT=0
HIGH_COUNT=0
MEDIUM_COUNT=0
LOW_COUNT=0

# Check prerequisites and install if possible
echo -e "\n${YELLOW}📋 Checking security scanning tools...${NC}"

# Check for kubesec
if command_exists kubesec; then
    echo -e "✅ kubesec is installed"
    KUBESEC_AVAILABLE=true
else
    echo -e "${YELLOW}⚠️  kubesec not installed. Attempting to download...${NC}"
    if curl -sSL https://github.com/controlplaneio/kubesec/releases/latest/download/kubesec_darwin_amd64.tar.gz | tar xz -C /tmp/ 2>/dev/null; then
        KUBESEC_CMD="/tmp/kubesec"
        KUBESEC_AVAILABLE=true
        echo -e "✅ kubesec downloaded temporarily"
    else
        KUBESEC_AVAILABLE=false
        echo -e "${YELLOW}⚠️  Could not download kubesec${NC}"
    fi
fi

# Check for trivy
if command_exists trivy; then
    echo -e "✅ trivy is installed"
    TRIVY_AVAILABLE=true
else
    echo -e "${YELLOW}⚠️  trivy not installed${NC}"
    echo "   Install: brew install trivy (macOS) or https://aquasecurity.github.io/trivy/"
    TRIVY_AVAILABLE=false
fi

# Check for polaris
if command_exists polaris; then
    echo -e "✅ polaris is installed"
    POLARIS_AVAILABLE=true
else
    echo -e "${YELLOW}⚠️  polaris not installed${NC}"
    echo "   Install: brew install FairwindsOps/tap/polaris (macOS)"
    POLARIS_AVAILABLE=false
fi

# Function to scan with kubesec
scan_with_kubesec() {
    local file=$1
    local scan_cmd="${KUBESEC_CMD:-kubesec}"
    
    echo -e "\n${BLUE}🔍 Kubesec scan: $(basename $file)${NC}"
    
    # Run kubesec scan
    result=$("$scan_cmd" scan "$file" 2>/dev/null | jq -r '.[0]' 2>/dev/null || echo '{}')
    
    if [ "$result" = "{}" ]; then
        echo -e "${YELLOW}  ⚠️  Could not scan file${NC}"
        return
    fi
    
    score=$(echo "$result" | jq -r '.score // 0')
    message=$(echo "$result" | jq -r '.message // "No message"')
    
    # Color code based on score
    if [ "$score" -ge 5 ]; then
        echo -e "  ${GREEN}✅ Score: $score - $message${NC}"
    elif [ "$score" -ge 0 ]; then
        echo -e "  ${YELLOW}⚠️  Score: $score - $message${NC}"
    else
        echo -e "  ${RED}❌ Score: $score - $message${NC}"
        ((CRITICAL_COUNT++))
    fi
    
    # Show critical issues
    echo "$result" | jq -r '.scoring.critical[]? | "  🔴 CRITICAL: \(.selector) - \(.reason)"' 2>/dev/null
    
    # Show passed checks summary
    passed=$(echo "$result" | jq -r '.scoring.passed[]? | .selector' 2>/dev/null | wc -l)
    if [ "$passed" -gt 0 ]; then
        echo -e "  ${GREEN}✓ Passed $passed security checks${NC}"
    fi
}

# Function to scan Docker image with trivy
scan_docker_with_trivy() {
    echo -e "\n${BLUE}🐳 Scanning Docker image with Trivy...${NC}"
    echo "Image: $DOCKER_IMAGE"
    
    # Check if image exists locally
    if ! docker images "$DOCKER_IMAGE" | grep -q "$DOCKER_IMAGE"; then
        echo -e "${YELLOW}  ⚠️  Docker image not found locally${NC}"
        return
    fi
    
    # Run trivy scan
    trivy image --severity CRITICAL,HIGH,MEDIUM --format json "$DOCKER_IMAGE" > "$TEMP_DIR/trivy-results.json" 2>/dev/null
    
    # Parse results
    vulnerabilities=$(jq -r '.Results[]?.Vulnerabilities[]?' "$TEMP_DIR/trivy-results.json" 2>/dev/null)
    
    if [ -z "$vulnerabilities" ]; then
        echo -e "  ${GREEN}✅ No vulnerabilities found!${NC}"
    else
        # Count by severity
        critical=$(jq -r '.Results[]?.Vulnerabilities[]? | select(.Severity=="CRITICAL") | .VulnerabilityID' "$TEMP_DIR/trivy-results.json" 2>/dev/null | wc -l)
        high=$(jq -r '.Results[]?.Vulnerabilities[]? | select(.Severity=="HIGH") | .VulnerabilityID' "$TEMP_DIR/trivy-results.json" 2>/dev/null | wc -l)
        medium=$(jq -r '.Results[]?.Vulnerabilities[]? | select(.Severity=="MEDIUM") | .VulnerabilityID' "$TEMP_DIR/trivy-results.json" 2>/dev/null | wc -l)
        
        ((CRITICAL_COUNT+=critical))
        ((HIGH_COUNT+=high))
        ((MEDIUM_COUNT+=medium))
        
        echo -e "  ${RED}🔴 Critical: $critical${NC}"
        echo -e "  ${YELLOW}🟡 High: $high${NC}"
        echo -e "  ${BLUE}🔵 Medium: $medium${NC}"
        
        # Show top vulnerabilities
        echo -e "\n  Top vulnerabilities:"
        jq -r '.Results[]?.Vulnerabilities[]? | "\(.Severity): \(.VulnerabilityID) in \(.PkgName)"' "$TEMP_DIR/trivy-results.json" 2>/dev/null | head -5
    fi
}

# Function to scan with Polaris
scan_with_polaris() {
    echo -e "\n${BLUE}🎯 Running Polaris audit...${NC}"
    
    # Create polaris config
    cat > "$TEMP_DIR/polaris-config.yaml" << 'EOF'
checks:
  # Security checks
  hostIPCSet: error
  hostNetworkSet: error
  hostPIDSet: error
  runAsRootAllowed: error
  runAsPrivileged: error
  notReadOnlyRootFilesystem: warning
  privilegeEscalationAllowed: error
  
  # Resource checks
  cpuRequestsMissing: warning
  cpuLimitsMissing: warning
  memoryRequestsMissing: warning
  memoryLimitsMissing: warning
  
  # Reliability checks
  livenessProbeMissing: warning
  readinessProbeMissing: warning
  pullPolicyNotAlways: ignore
  
  # Efficiency checks
  priorityClassNotSet: ignore
EOF
    
    # Run polaris audit
    if polaris audit --config "$TEMP_DIR/polaris-config.yaml" --audit-path "$K8S_DIR" --format json > "$TEMP_DIR/polaris-results.json" 2>/dev/null; then
        # Parse results
        score=$(jq -r '.score' "$TEMP_DIR/polaris-results.json" 2>/dev/null || echo "0")
        grade=$(jq -r '.grade' "$TEMP_DIR/polaris-results.json" 2>/dev/null || echo "F")
        
        echo -e "  Overall Score: $score/100 (Grade: $grade)"
        
        # Count issues by severity
        errors=$(jq -r '.Results | to_entries | map(.value.Results | to_entries | map(select(.value.Severity == "error"))) | flatten | length' "$TEMP_DIR/polaris-results.json" 2>/dev/null || echo "0")
        warnings=$(jq -r '.Results | to_entries | map(.value.Results | to_entries | map(select(.value.Severity == "warning"))) | flatten | length' "$TEMP_DIR/polaris-results.json" 2>/dev/null || echo "0")
        
        ((HIGH_COUNT+=errors))
        ((MEDIUM_COUNT+=warnings))
        
        echo -e "  ${RED}❌ Errors: $errors${NC}"
        echo -e "  ${YELLOW}⚠️  Warnings: $warnings${NC}"
        
        # Show specific issues
        if [ "$errors" -gt 0 ]; then
            echo -e "\n  Critical security issues:"
            jq -r '.Results | to_entries | map(.value.Results | to_entries | map(select(.value.Severity == "error") | "    - \(.key): \(.value.Message)")) | flatten | .[]' "$TEMP_DIR/polaris-results.json" 2>/dev/null | head -5
        fi
    else
        echo -e "  ${YELLOW}⚠️  Could not complete Polaris audit${NC}"
    fi
}

# Function to check for common security issues
check_common_security_issues() {
    echo -e "\n${BLUE}🔍 Checking for common security issues...${NC}"
    
    # Check for default passwords or tokens
    echo -n "  Checking for hardcoded secrets... "
    if grep -r -i -E "(password|secret|token|key)\s*[:=]\s*[\"'][^\"']+[\"']" "$K8S_DIR" "$HELM_DIR" 2>/dev/null | grep -v -E "(values\.yaml|example|template|{{)" > /dev/null; then
        echo -e "${RED}❌ Found potential hardcoded secrets${NC}"
        ((HIGH_COUNT++))
    else
        echo -e "${GREEN}✅ No hardcoded secrets found${NC}"
    fi
    
    # Check for latest image tags
    echo -n "  Checking for 'latest' image tags... "
    if grep -r "image:.*:latest" "$K8S_DIR" "$HELM_DIR" 2>/dev/null | grep -v -E "(values|example)" > /dev/null; then
        echo -e "${YELLOW}⚠️  Found 'latest' image tags${NC}"
        ((MEDIUM_COUNT++))
    else
        echo -e "${GREEN}✅ No 'latest' tags found${NC}"
    fi
    
    # Check for NodePort services
    echo -n "  Checking for NodePort services... "
    if grep -r "type:\s*NodePort" "$K8S_DIR" "$HELM_DIR" 2>/dev/null > /dev/null; then
        echo -e "${YELLOW}⚠️  Found NodePort services${NC}"
        ((MEDIUM_COUNT++))
    else
        echo -e "${GREEN}✅ No NodePort services${NC}"
    fi
    
    # Check for privileged containers
    echo -n "  Checking for privileged containers... "
    if grep -r "privileged:\s*true" "$K8S_DIR" "$HELM_DIR" 2>/dev/null > /dev/null; then
        echo -e "${RED}❌ Found privileged containers${NC}"
        ((CRITICAL_COUNT++))
    else
        echo -e "${GREEN}✅ No privileged containers${NC}"
    fi
    
    # Check for security contexts
    echo -n "  Checking for security contexts... "
    security_contexts=$(grep -r "securityContext:" "$K8S_DIR" "$HELM_DIR" 2>/dev/null | wc -l)
    if [ "$security_contexts" -gt 0 ]; then
        echo -e "${GREEN}✅ Security contexts defined${NC}"
    else
        echo -e "${YELLOW}⚠️  No security contexts found${NC}"
        ((MEDIUM_COUNT++))
    fi
}

# Function to generate security report
generate_security_report() {
    local report_file="$TEMP_DIR/security-report.md"
    
    cat > "$report_file" << EOF
# Security Scan Report

**Date:** $(date)
**Project:** SonarQube MCP Server

## Summary

- 🔴 **Critical Issues:** $CRITICAL_COUNT
- 🟠 **High Issues:** $HIGH_COUNT
- 🟡 **Medium Issues:** $MEDIUM_COUNT
- 🟢 **Low Issues:** $LOW_COUNT

## Recommendations

### Immediate Actions Required
EOF

    if [ "$CRITICAL_COUNT" -gt 0 ]; then
        cat >> "$report_file" << EOF

1. **Fix Critical Vulnerabilities**
   - Review and patch critical vulnerabilities in Docker image
   - Remove any privileged container configurations
   - Implement proper RBAC policies

EOF
    fi

    if [ "$HIGH_COUNT" -gt 0 ]; then
        cat >> "$report_file" << EOF

2. **Address High-Risk Issues**
   - Update vulnerable dependencies
   - Implement security contexts for all containers
   - Review and fix permission issues

EOF
    fi

    cat >> "$report_file" << EOF

### Best Practices

1. **Container Security**
   - Run containers as non-root user
   - Use read-only root filesystem where possible
   - Implement resource limits
   - Use specific image tags (not 'latest')

2. **Network Security**
   - Implement NetworkPolicies
   - Use TLS for all communications
   - Avoid NodePort services in production

3. **Access Control**
   - Implement RBAC policies
   - Use ServiceAccounts with minimal permissions
   - Enable audit logging

4. **Secret Management**
   - Use Kubernetes secrets properly
   - Consider external secret management (Vault, Sealed Secrets)
   - Rotate credentials regularly

## Tools Used

- Kubesec: Kubernetes manifest security scanner
- Trivy: Container vulnerability scanner
- Polaris: Kubernetes policy engine
- Custom security checks

EOF

    echo -e "\n${GREEN}📄 Security report generated: $report_file${NC}"
}

# Main execution
echo -e "\n${YELLOW}🚀 Starting security scans...${NC}"

# Scan Kubernetes manifests with kubesec
if [ "$KUBESEC_AVAILABLE" = true ]; then
    echo -e "\n${YELLOW}=== Kubesec Scans ===${NC}"
    
    # Scan base manifests
    for file in "$K8S_DIR/base"/*.yaml; do
        if [ -f "$file" ] && grep -q "kind:" "$file"; then
            scan_with_kubesec "$file"
        fi
    done
    
    # Scan Helm templates (render first)
    if command_exists helm; then
        echo -e "\n${BLUE}Rendering Helm templates for scanning...${NC}"
        helm template test-scan "$HELM_DIR" --set secrets.sonarqubeToken=dummy > "$TEMP_DIR/helm-rendered.yaml" 2>/dev/null
        
        # Split rendered file by document
        csplit -s -f "$TEMP_DIR/helm-doc-" "$TEMP_DIR/helm-rendered.yaml" '/^---$/' '{*}' 2>/dev/null || true
        
        for file in "$TEMP_DIR"/helm-doc-*; do
            if [ -s "$file" ] && grep -q "kind:" "$file"; then
                scan_with_kubesec "$file"
            fi
        done
    fi
fi

# Scan Docker image with trivy
if [ "$TRIVY_AVAILABLE" = true ]; then
    echo -e "\n${YELLOW}=== Trivy Container Scan ===${NC}"
    scan_docker_with_trivy
fi

# Run Polaris audit
if [ "$POLARIS_AVAILABLE" = true ]; then
    echo -e "\n${YELLOW}=== Polaris Audit ===${NC}"
    scan_with_polaris
fi

# Check common security issues
echo -e "\n${YELLOW}=== Common Security Checks ===${NC}"
check_common_security_issues

# Generate report
generate_security_report

# Cleanup
echo -e "\n${YELLOW}🧹 Cleaning up...${NC}"
rm -rf "$TEMP_DIR"

# Final summary
echo -e "\n============================================="
echo -e "${GREEN}📊 Security Scan Complete${NC}"
echo -e "\nIssue Summary:"
echo -e "  🔴 Critical: $CRITICAL_COUNT"
echo -e "  🟠 High: $HIGH_COUNT"
echo -e "  🟡 Medium: $MEDIUM_COUNT"
echo -e "  🟢 Low: $LOW_COUNT"

if [ "$CRITICAL_COUNT" -gt 0 ]; then
    echo -e "\n${RED}⚠️  CRITICAL ISSUES FOUND - Immediate action required!${NC}"
    exit 1
elif [ "$HIGH_COUNT" -gt 0 ]; then
    echo -e "\n${YELLOW}⚠️  High-risk issues found - Please review and fix${NC}"
    exit 1
else
    echo -e "\n${GREEN}✅ No critical or high-risk issues found${NC}"
fi