#!/bin/bash
# Master test runner for SonarQube MCP Server
# Runs all validation and test scripts in the correct order

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${MAGENTA}🚀 SonarQube MCP Server - Comprehensive Test Suite${NC}"
echo "==================================================="
echo "This script runs all tests for the deployment artifacts"
echo ""

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SKIP_CLEANUP=false
TESTS_TO_RUN="all"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-cleanup)
            SKIP_CLEANUP=true
            shift
            ;;
        --only)
            TESTS_TO_RUN="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-cleanup     Don't clean up test resources after completion"
            echo "  --only <test>      Run only specific test suite:"
            echo "                     docs, terraform, helm, k8s, security, monitoring, load"
            echo "  --help             Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Run '$0 --help' for usage information"
            exit 1
            ;;
    esac
done

# Track test results
declare -A TEST_RESULTS
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test suite
run_test_suite() {
    local suite_name=$1
    local script_path=$2
    local description=$3
    
    ((TOTAL_TESTS++))
    
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🧪 Test Suite: $suite_name${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "Description: $description"
    echo "Script: $script_path"
    echo ""
    
    if [ ! -f "$script_path" ]; then
        echo -e "${RED}❌ Test script not found!${NC}"
        TEST_RESULTS[$suite_name]="NOT_FOUND"
        ((FAILED_TESTS++))
        return 1
    fi
    
    if [ ! -x "$script_path" ]; then
        echo -e "${YELLOW}⚠️  Making script executable...${NC}"
        chmod +x "$script_path"
    fi
    
    # Run the test
    if "$script_path"; then
        echo -e "\n${GREEN}✅ $suite_name tests PASSED${NC}"
        TEST_RESULTS[$suite_name]="PASSED"
        ((PASSED_TESTS++))
        return 0
    else
        echo -e "\n${RED}❌ $suite_name tests FAILED${NC}"
        TEST_RESULTS[$suite_name]="FAILED"
        ((FAILED_TESTS++))
        return 1
    fi
}

# Function to check if we should run a test
should_run_test() {
    local test_name=$1
    
    if [ "$TESTS_TO_RUN" = "all" ]; then
        return 0
    elif [ "$TESTS_TO_RUN" = "$test_name" ]; then
        return 0
    else
        return 1
    fi
}

# Change to project root
cd "$PROJECT_ROOT"

echo -e "${YELLOW}📋 Pre-flight checks...${NC}"

# Check if required directories exist
if [ ! -d "docs" ]; then
    echo -e "${YELLOW}⚠️  Documentation directory not found${NC}"
fi

if [ ! -d "helm/sonarqube-mcp" ]; then
    echo -e "${YELLOW}⚠️  Helm chart directory not found${NC}"
fi

if [ ! -d "terraform" ]; then
    echo -e "${YELLOW}⚠️  Terraform directory not found${NC}"
fi

if [ ! -d "k8s" ]; then
    echo -e "${YELLOW}⚠️  Kubernetes manifests directory not found${NC}"
fi

# Start test execution
echo -e "\n${GREEN}🚀 Starting test execution...${NC}"
START_TIME=$(date +%s)

# 1. Documentation Validation
if should_run_test "docs"; then
    run_test_suite "Documentation" \
        "$SCRIPT_DIR/validate-docs.sh" \
        "Validates all documentation for broken links and code examples" || true
fi

# 2. Terraform Validation
if should_run_test "terraform"; then
    run_test_suite "Terraform" \
        "$SCRIPT_DIR/validate-terraform.sh" \
        "Validates all Terraform modules and configurations" || true
fi

# 3. Helm Chart Validation
if should_run_test "helm"; then
    run_test_suite "Helm Values" \
        "$SCRIPT_DIR/test-helm-values.sh" \
        "Tests Helm chart with various values configurations" || true
fi

# 4. Security Scanning
if should_run_test "security"; then
    run_test_suite "Security" \
        "$SCRIPT_DIR/security-scan.sh" \
        "Scans for security vulnerabilities and misconfigurations" || true
fi

# 5. Monitoring Integration Tests (requires running service)
if should_run_test "monitoring"; then
    echo -e "\n${YELLOW}📊 Monitoring tests require a running service${NC}"
    echo "Checking if service is available locally..."
    
    if curl -s -o /dev/null http://localhost:3000/health 2>/dev/null; then
        run_test_suite "Monitoring Integration" \
            "$SCRIPT_DIR/test-monitoring-integration.sh" \
            "Tests monitoring endpoints and metrics collection" || true
    else
        echo -e "${YELLOW}⚠️  Service not running locally, skipping monitoring tests${NC}"
        echo "   To run: npm run dev"
    fi
fi

# 6. Kubernetes Deployment Tests (optional - requires kind)
if should_run_test "k8s"; then
    echo -e "\n${YELLOW}☸️  Kubernetes tests require Docker and kind${NC}"
    echo -n "Do you want to run Kubernetes deployment tests? (y/N): "
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        run_test_suite "Kubernetes Deployment" \
            "$SCRIPT_DIR/test-k8s-helm-deployment.sh" \
            "Tests both Kustomize and Helm deployments in kind cluster" || true
    else
        echo "Skipping Kubernetes tests"
    fi
fi

# 7. Load Testing (optional - requires deployed service)
if should_run_test "load"; then
    echo -e "\n${YELLOW}⚡ Load tests require a deployed service with HPA${NC}"
    echo -n "Do you want to run load tests? (y/N): "
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo -n "Enter namespace (default: sonarqube-mcp): "
        read -r namespace
        export NAMESPACE="${namespace:-sonarqube-mcp}"
        
        run_test_suite "Load Testing" \
            "$SCRIPT_DIR/load-test.sh" \
            "Tests auto-scaling behavior under load" || true
    else
        echo "Skipping load tests"
    fi
fi

# Calculate execution time
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Generate summary report
echo -e "\n${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}📊 Test Execution Summary${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\nTest Results:"
for test_name in "${!TEST_RESULTS[@]}"; do
    result="${TEST_RESULTS[$test_name]}"
    case "$result" in
        PASSED)
            echo -e "  ${GREEN}✅ $test_name${NC}"
            ;;
        FAILED)
            echo -e "  ${RED}❌ $test_name${NC}"
            ;;
        NOT_FOUND)
            echo -e "  ${YELLOW}⚠️  $test_name (script not found)${NC}"
            ;;
    esac
done

echo -e "\nStatistics:"
echo "  Total test suites: $TOTAL_TESTS"
echo -e "  ${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "  ${RED}Failed: $FAILED_TESTS${NC}"
echo "  Execution time: ${DURATION}s"

# Provide recommendations
if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "\n${YELLOW}📋 Recommendations:${NC}"
    
    if [[ "${TEST_RESULTS[Documentation]}" == "FAILED" ]]; then
        echo "  - Fix documentation issues (broken links, invalid code examples)"
    fi
    
    if [[ "${TEST_RESULTS[Terraform]}" == "FAILED" ]]; then
        echo "  - Review and fix Terraform configuration issues"
    fi
    
    if [[ "${TEST_RESULTS[Security]}" == "FAILED" ]]; then
        echo "  - Address security vulnerabilities and misconfigurations"
    fi
    
    echo -e "\n${RED}⚠️  Please fix the failing tests before deployment${NC}"
    exit 1
else
    echo -e "\n${GREEN}🎉 All tests passed successfully!${NC}"
    echo -e "\nThe deployment artifacts are ready for:"
    echo "  - Production deployment"
    echo "  - CI/CD pipeline integration"
    echo "  - Security review"
    echo "  - Performance testing"
    
    echo -e "\n${YELLOW}Next steps:${NC}"
    echo "  1. Review the changes with: git diff"
    echo "  2. Commit the test scripts"
    echo "  3. Run tests in CI/CD pipeline"
    echo "  4. Deploy to staging environment"
fi

# Cleanup reminder
if [ "$SKIP_CLEANUP" = false ]; then
    echo -e "\n${YELLOW}💡 Tip:${NC} Use --skip-cleanup to preserve test resources for debugging"
fi

exit 0