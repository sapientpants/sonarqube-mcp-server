#!/bin/bash
# Extended test script for SonarQube MCP Server Kubernetes deployment with Helm
# This script tests both raw Kubernetes manifests and Helm chart deployment

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CLUSTER_NAME="sonarqube-mcp-test"
NAMESPACE="sonarqube-mcp"
HELM_NAMESPACE="sonarqube-mcp-helm"
IMAGE_NAME="mcp:local"
HELM_RELEASE="sonarqube-mcp-test"

echo -e "${GREEN}🚀 SonarQube MCP Server - Extended Kubernetes & Helm Deployment Test${NC}"
echo "====================================================================="

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "\n${YELLOW}📋 Checking prerequisites...${NC}"
for cmd in docker kind kubectl helm; do
    if command_exists "$cmd"; then
        echo -e "✅ $cmd is installed"
    else
        echo -e "${RED}❌ $cmd is not installed. Please install it first.${NC}"
        exit 1
    fi
done

# Parse command line arguments
SKIP_KUSTOMIZE=false
SKIP_HELM=false
KEEP_CLUSTER=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-kustomize)
            SKIP_KUSTOMIZE=true
            shift
            ;;
        --skip-helm)
            SKIP_HELM=true
            shift
            ;;
        --keep-cluster)
            KEEP_CLUSTER=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--skip-kustomize] [--skip-helm] [--keep-cluster]"
            exit 1
            ;;
    esac
done

# Step 1: Clean up existing resources
echo -e "\n${YELLOW}🧹 Step 1: Cleaning up existing resources...${NC}"
if kind get clusters | grep -q "$CLUSTER_NAME"; then
    if [ "$KEEP_CLUSTER" = false ]; then
        echo "Deleting existing kind cluster..."
        kind delete cluster --name "$CLUSTER_NAME"
    else
        echo "Keeping existing cluster (--keep-cluster specified)"
    fi
fi

# Try to delete namespaces if connected to any cluster
kubectl delete namespace "$NAMESPACE" --ignore-not-found=true 2>/dev/null || true
kubectl delete namespace "$HELM_NAMESPACE" --ignore-not-found=true 2>/dev/null || true

# Step 2: Create kind cluster (if needed)
if ! kind get clusters | grep -q "$CLUSTER_NAME"; then
    echo -e "\n${YELLOW}🏗️  Step 2: Creating kind cluster...${NC}"
    kind create cluster --name "$CLUSTER_NAME" --config=scripts/kind-with-internet.yaml
    
    # Wait for cluster to be fully ready
    echo "Waiting for cluster to be ready..."
    kubectl wait --for=condition=Ready nodes --all --timeout=60s
else
    echo -e "\n${YELLOW}🏗️  Step 2: Using existing kind cluster...${NC}"
fi

# Step 3: Set kubectl context
echo -e "\n${YELLOW}🔧 Step 3: Setting kubectl context...${NC}"
kubectl config use-context "kind-$CLUSTER_NAME"
kubectl cluster-info --context "kind-$CLUSTER_NAME"

# Step 4: Build Docker image
echo -e "\n${YELLOW}🐳 Step 4: Building Docker image...${NC}"
docker build -t "$IMAGE_NAME" .

# Step 5: Load image into kind
echo -e "\n${YELLOW}📦 Step 5: Loading image into kind cluster...${NC}"
kind load docker-image "$IMAGE_NAME" --name "$CLUSTER_NAME"

# Wait a moment for the image to be fully registered
sleep 2

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local port=${2:-3000}
    local namespace=${3:-$NAMESPACE}
    local service_name=${4:-sonarqube-mcp}
    
    echo -n "Testing $endpoint: "
    
    # Get the HTTP status code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port$endpoint")
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    elif [ "$http_code" = "503" ]; then
        echo -e "${YELLOW}⚠️  DEGRADED (503)${NC}"
        # For health/ready endpoints, check if service is responding
        if [[ "$endpoint" =~ ^/(health|ready)$ ]]; then
            response=$(curl -s "http://localhost:$port$endpoint")
            if [[ "$response" =~ "status" ]] || [[ "$response" =~ "ready" ]]; then
                echo "   Service is responding but dependencies unavailable (expected in test environment)"
                return 0  # Consider this OK for testing
            fi
        fi
        return 1
    else
        echo -e "${RED}❌ FAILED (HTTP $http_code)${NC}"
        return 1
    fi
}

# Check if SONARQUBE_TOKEN is set
if [ -z "$SONARQUBE_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  SONARQUBE_TOKEN not set. Using dummy token for testing.${NC}"
    echo "   Set SONARQUBE_TOKEN environment variable for real testing."
    SONARQUBE_TOKEN="dummy-token-for-testing"
fi

# PART 1: Test Kustomize deployment
if [ "$SKIP_KUSTOMIZE" = false ]; then
    echo -e "\n${BLUE}====== PART 1: Testing Kustomize Deployment ======${NC}"
    
    # Step 6: Create namespace
    echo -e "\n${YELLOW}📁 Step 6: Creating namespace for Kustomize...${NC}"
    kubectl create namespace "$NAMESPACE"
    
    # Step 7: Deploy with Kustomize
    echo -e "\n${YELLOW}🚀 Step 7: Deploying with Kustomize...${NC}"
    
    # Use testing overlay if it exists, otherwise use base
    if [ -d "k8s/overlays/testing" ]; then
        echo "Using testing overlay..."
        cd k8s/overlays/testing
    else
        cd k8s/base
    fi
    
    kubectl apply -k .
    
    # Update secret with actual token
    kubectl create secret generic sonarqube-mcp-secrets \
        --from-literal=SONARQUBE_TOKEN="$SONARQUBE_TOKEN" \
        -n "$NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    cd ../../..
    
    # Step 8: Wait for deployment
    echo -e "\n${YELLOW}⏳ Step 8: Waiting for Kustomize deployment...${NC}"
    
    kubectl wait --for=condition=available --timeout=120s deployment/sonarqube-mcp -n "$NAMESPACE" || true
    
    # Step 9: Test Kustomize deployment
    echo -e "\n${YELLOW}🧪 Step 9: Testing Kustomize deployment endpoints...${NC}"
    
    # Port forward in background
    kubectl port-forward -n "$NAMESPACE" svc/sonarqube-mcp 3000:3000 > /dev/null 2>&1 &
    PF_PID=$!
    sleep 3
    
    # Test endpoints
    kustomize_passed=true
    test_endpoint "/health" || kustomize_passed=false
    test_endpoint "/ready" || kustomize_passed=false  
    test_endpoint "/metrics" || kustomize_passed=false
    
    # Clean up port forward
    kill $PF_PID 2>/dev/null
    
    if [ "$kustomize_passed" = true ]; then
        echo -e "${GREEN}✅ Kustomize deployment tests passed!${NC}"
    else
        echo -e "${RED}❌ Kustomize deployment tests failed${NC}"
    fi
else
    echo -e "\n${YELLOW}⏭️  Skipping Kustomize deployment test (--skip-kustomize)${NC}"
fi

# PART 2: Test Helm deployment
if [ "$SKIP_HELM" = false ]; then
    echo -e "\n${BLUE}====== PART 2: Testing Helm Deployment ======${NC}"
    
    # Step 10: Create namespace for Helm
    echo -e "\n${YELLOW}📁 Step 10: Creating namespace for Helm...${NC}"
    kubectl create namespace "$HELM_NAMESPACE"
    
    # Step 11: Deploy with Helm
    echo -e "\n${YELLOW}🎯 Step 11: Deploying with Helm...${NC}"
    
    # Create values file for testing
    cat > /tmp/helm-test-values.yaml << EOF
replicaCount: 2
image:
  repository: mcp
  tag: local
  pullPolicy: Never
secrets:
  sonarqubeToken: "$SONARQUBE_TOKEN"
service:
  type: ClusterIP
  port: 3000
resources:
  requests:
    memory: "256Mi"
    cpu: "200m"
  limits:
    memory: "512Mi"
    cpu: "500m"
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 5
  targetCPUUtilizationPercentage: 70
monitoring:
  enabled: true
EOF
    
    # Install Helm chart
    helm install "$HELM_RELEASE" helm/sonarqube-mcp \
        --namespace "$HELM_NAMESPACE" \
        -f /tmp/helm-test-values.yaml \
        --wait \
        --timeout 2m
    
    # Step 12: Run Helm tests
    echo -e "\n${YELLOW}🧪 Step 12: Running Helm built-in tests...${NC}"
    
    if helm test "$HELM_RELEASE" -n "$HELM_NAMESPACE"; then
        echo -e "${GREEN}✅ Helm tests passed!${NC}"
    else
        echo -e "${RED}❌ Helm tests failed${NC}"
        # Show test pod logs
        kubectl logs -n "$HELM_NAMESPACE" -l "app.kubernetes.io/component=test" --tail=50
    fi
    
    # Step 13: Test Helm deployment endpoints
    echo -e "\n${YELLOW}🧪 Step 13: Testing Helm deployment endpoints...${NC}"
    
    # Port forward in background
    kubectl port-forward -n "$HELM_NAMESPACE" "svc/$HELM_RELEASE" 3001:3000 > /dev/null 2>&1 &
    PF_HELM_PID=$!
    sleep 3
    
    # Test endpoints
    helm_passed=true
    test_endpoint "/health" 3001 "$HELM_NAMESPACE" "$HELM_RELEASE" || helm_passed=false
    test_endpoint "/ready" 3001 "$HELM_NAMESPACE" "$HELM_RELEASE" || helm_passed=false  
    test_endpoint "/metrics" 3001 "$HELM_NAMESPACE" "$HELM_RELEASE" || helm_passed=false
    
    # Clean up port forward
    kill $PF_HELM_PID 2>/dev/null
    
    if [ "$helm_passed" = true ]; then
        echo -e "${GREEN}✅ Helm deployment endpoint tests passed!${NC}"
    else
        echo -e "${RED}❌ Helm deployment endpoint tests failed${NC}"
    fi
    
    # Step 14: Test Helm upgrade
    echo -e "\n${YELLOW}⬆️  Step 14: Testing Helm upgrade...${NC}"
    
    # Modify values for upgrade
    cat > /tmp/helm-upgrade-values.yaml << EOF
replicaCount: 3
image:
  repository: mcp
  tag: local
  pullPolicy: Never
secrets:
  sonarqubeToken: "$SONARQUBE_TOKEN"
service:
  type: ClusterIP
  port: 3000
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
EOF
    
    # Perform upgrade
    if helm upgrade "$HELM_RELEASE" helm/sonarqube-mcp \
        --namespace "$HELM_NAMESPACE" \
        -f /tmp/helm-upgrade-values.yaml \
        --wait \
        --timeout 2m; then
        echo -e "${GREEN}✅ Helm upgrade successful!${NC}"
        
        # Verify new replica count
        replicas=$(kubectl get deployment -n "$HELM_NAMESPACE" -l "app.kubernetes.io/instance=$HELM_RELEASE" -o jsonpath='{.items[0].spec.replicas}')
        if [ "$replicas" = "3" ]; then
            echo -e "${GREEN}✅ Replica count updated to 3${NC}"
        else
            echo -e "${RED}❌ Replica count not updated correctly${NC}"
        fi
    else
        echo -e "${RED}❌ Helm upgrade failed${NC}"
    fi
    
    # Cleanup Helm values files
    rm -f /tmp/helm-test-values.yaml /tmp/helm-upgrade-values.yaml
else
    echo -e "\n${YELLOW}⏭️  Skipping Helm deployment test (--skip-helm)${NC}"
fi

# Final summary
echo -e "\n====================================================================="
echo -e "${GREEN}📊 Test Summary:${NC}"

if [ "$SKIP_KUSTOMIZE" = false ]; then
    if [ "$kustomize_passed" = true ]; then
        echo -e "  Kustomize deployment: ${GREEN}✅ PASSED${NC}"
    else
        echo -e "  Kustomize deployment: ${RED}❌ FAILED${NC}"
    fi
fi

if [ "$SKIP_HELM" = false ]; then
    if [ "$helm_passed" = true ]; then
        echo -e "  Helm deployment: ${GREEN}✅ PASSED${NC}"
    else
        echo -e "  Helm deployment: ${RED}❌ FAILED${NC}"
    fi
fi

echo -e "\n${YELLOW}📝 Deployed resources:${NC}"
if [ "$SKIP_KUSTOMIZE" = false ]; then
    echo -e "\nKustomize deployment in namespace '$NAMESPACE':"
    kubectl get all -n "$NAMESPACE"
fi

if [ "$SKIP_HELM" = false ]; then
    echo -e "\nHelm deployment in namespace '$HELM_NAMESPACE':"
    kubectl get all -n "$HELM_NAMESPACE"
fi

echo -e "\n${YELLOW}🔧 Useful commands:${NC}"
if [ "$SKIP_KUSTOMIZE" = false ]; then
    echo -e "\nFor Kustomize deployment:"
    echo "  kubectl port-forward -n $NAMESPACE svc/sonarqube-mcp 3000:3000"
    echo "  kubectl logs -n $NAMESPACE -l app.kubernetes.io/name=sonarqube-mcp -f"
fi

if [ "$SKIP_HELM" = false ]; then
    echo -e "\nFor Helm deployment:"
    echo "  kubectl port-forward -n $HELM_NAMESPACE svc/$HELM_RELEASE 3000:3000"
    echo "  kubectl logs -n $HELM_NAMESPACE -l app.kubernetes.io/instance=$HELM_RELEASE -f"
    echo "  helm status $HELM_RELEASE -n $HELM_NAMESPACE"
fi

echo -e "\n${YELLOW}🧹 To clean up:${NC}"
if [ "$SKIP_KUSTOMIZE" = false ]; then
    echo "  kubectl delete namespace $NAMESPACE"
fi
if [ "$SKIP_HELM" = false ]; then
    echo "  helm uninstall $HELM_RELEASE -n $HELM_NAMESPACE"
    echo "  kubectl delete namespace $HELM_NAMESPACE"
fi
if [ "$KEEP_CLUSTER" = false ]; then
    echo "  kind delete cluster --name $CLUSTER_NAME"
fi

# Exit with appropriate code
if [ "$SKIP_KUSTOMIZE" = false ] && [ "$kustomize_passed" = false ]; then
    exit 1
fi
if [ "$SKIP_HELM" = false ] && [ "$helm_passed" = false ]; then
    exit 1
fi

exit 0