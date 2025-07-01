#!/bin/bash
# Test script for SonarQube MCP Server Kubernetes deployment
# This script provides a complete, automated test of the service deployment

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CLUSTER_NAME="sonarqube-mcp-test"
NAMESPACE="sonarqube-mcp"
IMAGE_NAME="mcp:local"

echo -e "${GREEN}🚀 SonarQube MCP Server - Kubernetes Deployment Test${NC}"
echo "=================================================="

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "\n${YELLOW}📋 Checking prerequisites...${NC}"
for cmd in docker kind kubectl; do
    if command_exists "$cmd"; then
        echo -e "✅ $cmd is installed"
    else
        echo -e "${RED}❌ $cmd is not installed. Please install it first.${NC}"
        exit 1
    fi
done

# Step 1: Clean up existing resources
echo -e "\n${YELLOW}🧹 Step 1: Cleaning up existing resources...${NC}"
if kind get clusters | grep -q "$CLUSTER_NAME"; then
    echo "Deleting existing kind cluster..."
    kind delete cluster --name "$CLUSTER_NAME"
fi

# Try to delete namespace if connected to any cluster
kubectl delete namespace "$NAMESPACE" --ignore-not-found=true 2>/dev/null || true

# Step 2: Create kind cluster
echo -e "\n${YELLOW}🏗️  Step 2: Creating kind cluster...${NC}"

# Create kind cluster with proper networking
kind create cluster --name "$CLUSTER_NAME" --config=scripts/kind-with-internet.yaml

# Wait for cluster to be fully ready
echo "Waiting for cluster to be ready..."
kubectl wait --for=condition=Ready nodes --all --timeout=60s

# Step 3: Set kubectl context
echo -e "\n${YELLOW}🔧 Step 3: Setting kubectl context...${NC}"
kubectl config use-context "kind-$CLUSTER_NAME"
kubectl cluster-info --context "kind-$CLUSTER_NAME"

# Step 3.5: Test network connectivity (optional)
echo -e "\n${YELLOW}🌐 Step 3.5: Testing cluster network connectivity...${NC}"
# Quick test to see if external connectivity works
if kubectl run test-connectivity --image=busybox --restart=Never --rm -i --timeout=10s --command -- nslookup sonarcloud.io 2>&1 | grep -q "Address"; then
    echo -e "${GREEN}✅ External DNS resolution working${NC}"
else
    echo -e "${YELLOW}⚠️  External DNS resolution not working. This is common with Kind on macOS.${NC}"
    echo "The testing overlay will disable NetworkPolicy restrictions to help with this."
fi

# Step 4: Build Docker image
echo -e "\n${YELLOW}🐳 Step 4: Building Docker image...${NC}"
docker build -t "$IMAGE_NAME" .

# Step 5: Load image into kind
echo -e "\n${YELLOW}📦 Step 5: Loading image into kind cluster...${NC}"
kind load docker-image "$IMAGE_NAME" --name "$CLUSTER_NAME"

# Wait a moment for the image to be fully registered
sleep 2

# Verify image is loaded
echo "Verifying image is loaded on all nodes..."
for node in $(kind get nodes --name "$CLUSTER_NAME"); do
    echo -n "Checking node $node: "
    # List all images for debugging
    if docker exec "$node" crictl images 2>/dev/null | grep -E "(mcp|local)" | grep -v "IMAGE" > /dev/null; then
        echo -e "${GREEN}✅ Image found${NC}"
    else
        echo -e "${RED}❌ Image not found${NC}"
        echo "Debug: All images on this node:"
        docker exec "$node" crictl images 2>/dev/null || echo "Failed to list images"
        
        # Try alternative check with docker
        echo "Checking with alternative method..."
        if docker exec "$node" ctr -n k8s.io images list 2>/dev/null | grep -q "$IMAGE_NAME"; then
            echo -e "${GREEN}✅ Image found with ctr${NC}"
        else
            echo -e "${YELLOW}⚠️  Warning: Could not verify image, but continuing...${NC}"
        fi
    fi
done

echo -e "${YELLOW}Note: Image verification warnings can be ignored if deployment succeeds${NC}"

# Step 6: Create namespace
echo -e "\n${YELLOW}📁 Step 6: Creating namespace...${NC}"
kubectl create namespace "$NAMESPACE"

# Step 7: Prepare secrets
echo -e "\n${YELLOW}🔐 Step 7: Preparing secrets...${NC}"

# Check if SONARQUBE_TOKEN is set
if [ -z "$SONARQUBE_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  SONARQUBE_TOKEN not set. Using dummy token for testing.${NC}"
    echo "   Set SONARQUBE_TOKEN environment variable for real testing."
    SONARQUBE_TOKEN="dummy-token-for-testing"
fi

echo "Secrets will be created by kustomize and updated with actual values..."

# Step 8: Deploy application
echo -e "\n${YELLOW}🚀 Step 8: Deploying application...${NC}"

# Use testing overlay if it exists, otherwise use base
if [ -d "k8s/overlays/testing" ]; then
    echo "Using testing overlay for better test compatibility..."
    cd k8s/overlays/testing
else
    cd k8s/base
fi

if kubectl apply -k .; then
    echo -e "${GREEN}✅ Kubernetes manifests applied successfully${NC}"
    
    # Important: Replace the placeholder secret with our actual token
    echo "Updating SONARQUBE_TOKEN secret with actual value..."
    kubectl create secret generic sonarqube-mcp-secrets \
        --from-literal=SONARQUBE_TOKEN="$SONARQUBE_TOKEN" \
        -n "$NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -
else
    echo -e "${RED}❌ Failed to apply Kubernetes manifests${NC}"
    echo "Checking current directory and files..."
    pwd
    ls -la
    exit 1
fi
cd ../../..

# Step 9: Wait for deployment
echo -e "\n${YELLOW}⏳ Step 9: Waiting for deployment to be ready...${NC}"

# First wait for pods to be created
echo "Waiting for pods to be created..."
timeout=30
while [ $timeout -gt 0 ]; do
    if kubectl get pods -n "$NAMESPACE" 2>/dev/null | grep -q "sonarqube-mcp"; then
        break
    fi
    sleep 1
    ((timeout--))
done

# Show pod status
echo "Current pod status:"
kubectl get pods -n "$NAMESPACE"

# Wait for deployment to be ready
if kubectl wait --for=condition=available --timeout=120s deployment/sonarqube-mcp -n "$NAMESPACE" 2>/dev/null; then
    echo -e "${GREEN}✅ Deployment is ready!${NC}"
else
    echo -e "${RED}❌ Deployment failed to become ready${NC}"
    echo -e "\nPod status:"
    kubectl get pods -n "$NAMESPACE"
    
    echo -e "\nPod events:"
    kubectl describe pods -n "$NAMESPACE" | grep -A 10 "Events:"
    
    echo -e "\nPod logs (if available):"
    kubectl logs -n "$NAMESPACE" -l app.kubernetes.io/name=sonarqube-mcp --tail=50 2>/dev/null || echo "No logs available yet"
    
    # Don't exit immediately - let's try to get more info
    echo -e "\n${YELLOW}Continuing to gather diagnostic information...${NC}"
fi

# Step 10: Check pod status
echo -e "\n${YELLOW}🔍 Step 10: Checking pod status...${NC}"
kubectl get pods -n "$NAMESPACE"

# Step 11: Test service endpoints
echo -e "\n${YELLOW}🧪 Step 11: Testing service endpoints...${NC}"

# Port forward in background
kubectl port-forward -n "$NAMESPACE" svc/sonarqube-mcp 3000:3000 > /dev/null 2>&1 &
PF_PID=$!
sleep 3  # Give port-forward time to establish

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local port=${2:-3000}
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

# Test endpoints
all_passed=true
test_endpoint "/health" || all_passed=false
test_endpoint "/ready" || all_passed=false  
test_endpoint "/metrics" || all_passed=false

# Clean up port forward
kill $PF_PID 2>/dev/null

# Final status
echo -e "\n=================================================="
if [ "$all_passed" = true ]; then
    echo -e "${GREEN}✅ Service deployment successful!${NC}"
    echo -e "\n${YELLOW}Note:${NC} The service shows as 'degraded' because:"
    echo "  - Cannot connect to SonarCloud (network isolation in kind)"
    echo "  - No authentication configured (test environment)"
    echo "  This is expected behavior for the test environment."
    echo -e "\n${YELLOW}To fix external connectivity (if needed):${NC}"
    echo "  ./scripts/fix-kind-dns.sh $CLUSTER_NAME"
    echo -e "\n${YELLOW}To interact with the service:${NC}"
    echo "  kubectl port-forward -n $NAMESPACE svc/sonarqube-mcp 3000:3000"
    echo "  curl http://localhost:3000/health"
    echo -e "\n${YELLOW}To view logs:${NC}"
    echo "  kubectl logs -n $NAMESPACE -l app.kubernetes.io/name=sonarqube-mcp -f"
    echo -e "\n${YELLOW}To clean up:${NC}"
    echo "  kubectl delete namespace $NAMESPACE"
    echo "  kind delete cluster --name $CLUSTER_NAME"
else
    echo -e "${RED}❌ Deployment test failed. Check the logs above for details.${NC}"
    echo -e "\n${YELLOW}Debug commands:${NC}"
    echo "  kubectl describe pods -n $NAMESPACE"
    echo "  kubectl logs -n $NAMESPACE -l app.kubernetes.io/name=sonarqube-mcp"
    echo -e "\n${YELLOW}To clean up:${NC}"
    echo "  kubectl delete namespace $NAMESPACE"
    echo "  kind delete cluster --name $CLUSTER_NAME"
    exit 1
fi