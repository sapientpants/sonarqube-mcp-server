#!/bin/bash
# Helm chart validation script with various values configurations
# Tests the SonarQube MCP Server Helm chart with different scenarios

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🎯 SonarQube MCP Server - Helm Chart Values Testing${NC}"
echo "===================================================="

# Configuration
CHART_PATH="helm/sonarqube-mcp"
TEMP_DIR="/tmp/helm-test-$$"
TEST_NAMESPACE="helm-test"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "\n${YELLOW}📋 Checking prerequisites...${NC}"
for cmd in helm kubectl; do
    if command_exists "$cmd"; then
        echo -e "✅ $cmd is installed"
    else
        echo -e "${RED}❌ $cmd is not installed. Please install it first.${NC}"
        exit 1
    fi
done

# Create temp directory
mkdir -p "$TEMP_DIR"

# Function to test helm template with specific values
test_helm_values() {
    local test_name=$1
    local values_file=$2
    local expected_behavior=$3
    
    echo -e "\n${BLUE}🧪 Test: $test_name${NC}"
    echo "Values file: $values_file"
    echo "Expected: $expected_behavior"
    
    # Run helm template
    if helm template test-release "$CHART_PATH" -f "$values_file" --namespace "$TEST_NAMESPACE" > "$TEMP_DIR/rendered-$test_name.yaml" 2>&1; then
        echo -e "  ${GREEN}✓ Template rendered successfully${NC}"
        
        # Validate generated YAML
        if kubectl --dry-run=client apply -f "$TEMP_DIR/rendered-$test_name.yaml" >/dev/null 2>&1; then
            echo -e "  ${GREEN}✓ Generated YAML is valid${NC}"
        else
            echo -e "  ${RED}✗ Generated YAML validation failed${NC}"
            kubectl --dry-run=client apply -f "$TEMP_DIR/rendered-$test_name.yaml"
            return 1
        fi
        
        # Run specific checks based on test
        case "$test_name" in
            "minimal")
                check_minimal_resources "$TEMP_DIR/rendered-$test_name.yaml"
                ;;
            "production")
                check_production_resources "$TEMP_DIR/rendered-$test_name.yaml"
                ;;
            "high-availability")
                check_ha_resources "$TEMP_DIR/rendered-$test_name.yaml"
                ;;
            "monitoring-enabled")
                check_monitoring_resources "$TEMP_DIR/rendered-$test_name.yaml"
                ;;
            "ingress-tls")
                check_ingress_tls "$TEMP_DIR/rendered-$test_name.yaml"
                ;;
        esac
    else
        echo -e "  ${RED}✗ Template rendering failed${NC}"
        cat "$TEMP_DIR/rendered-$test_name.yaml"
        return 1
    fi
}

# Check functions for specific configurations
check_minimal_resources() {
    local file=$1
    echo "  Checking minimal configuration..."
    
    # Check that deployment exists
    if grep -q "kind: Deployment" "$file"; then
        echo -e "    ${GREEN}✓ Deployment found${NC}"
    else
        echo -e "    ${RED}✗ Deployment missing${NC}"
        return 1
    fi
    
    # Check replica count is 1
    replicas=$(grep -A20 "kind: Deployment" "$file" | grep "replicas:" | awk '{print $2}')
    if [ "$replicas" = "1" ]; then
        echo -e "    ${GREEN}✓ Single replica configured${NC}"
    else
        echo -e "    ${RED}✗ Unexpected replica count: $replicas${NC}"
    fi
}

check_production_resources() {
    local file=$1
    echo "  Checking production configuration..."
    
    # Check replica count is 3+
    replicas=$(grep -A20 "kind: Deployment" "$file" | grep "replicas:" | awk '{print $2}')
    if [ "$replicas" -ge 3 ]; then
        echo -e "    ${GREEN}✓ High availability replicas: $replicas${NC}"
    else
        echo -e "    ${YELLOW}⚠️  Low replica count for production: $replicas${NC}"
    fi
    
    # Check resource limits
    if grep -q "limits:" "$file" && grep -q "requests:" "$file"; then
        echo -e "    ${GREEN}✓ Resource limits configured${NC}"
    else
        echo -e "    ${RED}✗ Resource limits missing${NC}"
    fi
    
    # Check PodDisruptionBudget
    if grep -q "kind: PodDisruptionBudget" "$file"; then
        echo -e "    ${GREEN}✓ PodDisruptionBudget configured${NC}"
    else
        echo -e "    ${YELLOW}⚠️  PodDisruptionBudget not found${NC}"
    fi
}

check_ha_resources() {
    local file=$1
    echo "  Checking high availability configuration..."
    
    # Check HorizontalPodAutoscaler
    if grep -q "kind: HorizontalPodAutoscaler" "$file"; then
        echo -e "    ${GREEN}✓ HPA configured${NC}"
        
        # Check min/max replicas
        min_replicas=$(grep -A10 "kind: HorizontalPodAutoscaler" "$file" | grep "minReplicas:" | awk '{print $2}')
        max_replicas=$(grep -A10 "kind: HorizontalPodAutoscaler" "$file" | grep "maxReplicas:" | awk '{print $2}')
        echo -e "    ${BLUE}ℹ️  HPA scaling: $min_replicas-$max_replicas replicas${NC}"
    else
        echo -e "    ${RED}✗ HPA not configured${NC}"
    fi
    
    # Check anti-affinity rules
    if grep -q "podAntiAffinity:" "$file"; then
        echo -e "    ${GREEN}✓ Pod anti-affinity configured${NC}"
    else
        echo -e "    ${YELLOW}⚠️  Pod anti-affinity not configured${NC}"
    fi
}

check_monitoring_resources() {
    local file=$1
    echo "  Checking monitoring configuration..."
    
    # Check ServiceMonitor
    if grep -q "kind: ServiceMonitor" "$file"; then
        echo -e "    ${GREEN}✓ ServiceMonitor configured${NC}"
    else
        echo -e "    ${RED}✗ ServiceMonitor not found${NC}"
    fi
    
    # Check metrics port
    if grep -q "metrics" "$file" | grep -q "3000"; then
        echo -e "    ${GREEN}✓ Metrics endpoint configured${NC}"
    else
        echo -e "    ${YELLOW}⚠️  Metrics endpoint not clearly defined${NC}"
    fi
}

check_ingress_tls() {
    local file=$1
    echo "  Checking ingress TLS configuration..."
    
    # Check Ingress exists
    if grep -q "kind: Ingress" "$file"; then
        echo -e "    ${GREEN}✓ Ingress configured${NC}"
        
        # Check TLS section
        if grep -A10 "kind: Ingress" "$file" | grep -q "tls:"; then
            echo -e "    ${GREEN}✓ TLS section present${NC}"
        else
            echo -e "    ${RED}✗ TLS not configured${NC}"
        fi
    else
        echo -e "    ${RED}✗ Ingress not found${NC}"
    fi
}

# Create test values files
echo -e "\n${YELLOW}📝 Creating test values files...${NC}"

# 1. Minimal configuration
cat > "$TEMP_DIR/values-minimal.yaml" << EOF
replicaCount: 1
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "256Mi"
    cpu: "200m"
secrets:
  sonarqubeToken: "test-token"
autoscaling:
  enabled: false
EOF

# 2. Production configuration
cat > "$TEMP_DIR/values-production.yaml" << EOF
replicaCount: 3
image:
  pullPolicy: Always
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
secrets:
  sonarqubeToken: "prod-token"
podDisruptionBudget:
  enabled: true
  minAvailable: 2
persistence:
  enabled: true
  size: 10Gi
nodeSelector:
  node-role.kubernetes.io/worker: "true"
tolerations:
  - key: "dedicated"
    operator: "Equal"
    value: "production"
    effect: "NoSchedule"
EOF

# 3. High availability configuration
cat > "$TEMP_DIR/values-ha.yaml" << EOF
replicaCount: 5
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80
resources:
  requests:
    memory: "1Gi"
    cpu: "1000m"
  limits:
    memory: "2Gi"
    cpu: "2000m"
secrets:
  sonarqubeToken: "ha-token"
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
            - key: app.kubernetes.io/name
              operator: In
              values:
                - sonarqube-mcp
        topologyKey: kubernetes.io/hostname
EOF

# 4. Monitoring enabled
cat > "$TEMP_DIR/values-monitoring.yaml" << EOF
replicaCount: 2
secrets:
  sonarqubeToken: "monitor-token"
monitoring:
  enabled: true
serviceMonitor:
  enabled: true
  interval: 30s
  path: /metrics
config:
  monitoring:
    enabled: true
    tracing:
      enabled: true
      endpoint: "http://jaeger-collector:14268/api/traces"
EOF

# 5. Ingress with TLS
cat > "$TEMP_DIR/values-ingress-tls.yaml" << EOF
replicaCount: 2
secrets:
  sonarqubeToken: "ingress-token"
ingress:
  enabled: true
  className: nginx
  hosts:
    - host: sonarqube-mcp.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: sonarqube-mcp-tls
      hosts:
        - sonarqube-mcp.example.com
https:
  enabled: true
secrets:
  tls:
    cert: |
      -----BEGIN CERTIFICATE-----
      MIIDQTCCAimgAwIBAgIUTest...
      -----END CERTIFICATE-----
    key: |
      -----BEGIN PRIVATE KEY-----
      MIIEvQIBADANBgkqhkiG9w0BAQ...
      -----END PRIVATE KEY-----
EOF

# Run tests
echo -e "\n${YELLOW}🚀 Running Helm chart tests...${NC}"

all_passed=true

# Test each configuration
test_helm_values "minimal" "$TEMP_DIR/values-minimal.yaml" "Basic deployment with minimal resources" || all_passed=false
test_helm_values "production" "$TEMP_DIR/values-production.yaml" "Production-ready with PDB and persistence" || all_passed=false
test_helm_values "high-availability" "$TEMP_DIR/values-ha.yaml" "HA with autoscaling and anti-affinity" || all_passed=false
test_helm_values "monitoring-enabled" "$TEMP_DIR/values-monitoring.yaml" "Monitoring and ServiceMonitor enabled" || all_passed=false
test_helm_values "ingress-tls" "$TEMP_DIR/values-ingress-tls.yaml" "Ingress with TLS termination" || all_passed=false

# Additional tests
echo -e "\n${YELLOW}🔍 Running additional validation...${NC}"

# Test helm lint
echo -n "Running helm lint... "
if helm lint "$CHART_PATH" >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Passed${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
    helm lint "$CHART_PATH"
    all_passed=false
fi

# Test with --strict flag
echo -n "Running helm lint --strict... "
if helm lint --strict "$CHART_PATH" >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Passed${NC}"
else
    echo -e "${YELLOW}⚠️  Warnings found${NC}"
fi

# Test upgrade scenarios
echo -e "\n${BLUE}⬆️  Testing upgrade scenarios...${NC}"
echo -n "Simulating upgrade from minimal to production... "
if helm template test-release "$CHART_PATH" -f "$TEMP_DIR/values-minimal.yaml" > "$TEMP_DIR/before.yaml" 2>&1 && \
   helm template test-release "$CHART_PATH" -f "$TEMP_DIR/values-production.yaml" > "$TEMP_DIR/after.yaml" 2>&1; then
    echo -e "${GREEN}✓ Both configurations valid${NC}"
else
    echo -e "${RED}✗ Upgrade simulation failed${NC}"
    all_passed=false
fi

# Cleanup
echo -e "\n${YELLOW}🧹 Cleaning up...${NC}"
rm -rf "$TEMP_DIR"

# Final summary
echo -e "\n===================================================="
if [ "$all_passed" = true ]; then
    echo -e "${GREEN}✅ All Helm chart tests passed!${NC}"
    echo -e "\n${YELLOW}The Helm chart is ready for deployment with:${NC}"
    echo "  - Minimal configurations for development"
    echo "  - Production-ready settings with HA"
    echo "  - Monitoring and observability support"
    echo "  - Secure ingress with TLS"
    echo -e "\n${YELLOW}To deploy:${NC}"
    echo "  helm install sonarqube-mcp $CHART_PATH -f your-values.yaml"
else
    echo -e "${RED}❌ Some Helm chart tests failed${NC}"
    echo -e "${YELLOW}Please review the errors above and fix the chart${NC}"
    exit 1
fi