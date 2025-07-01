# Integration Testing Guide

## Overview

This guide provides comprehensive testing procedures for the SonarQube MCP Server in development and test environments. It covers local Docker testing, Kubernetes deployment for testing, and validation procedures.

> **For production deployment instructions, see [k8s/README.md](../k8s/README.md)**

## Important: Testing with Local Images

**Always use your locally built Docker image (`mcp:local`) for testing.** This ensures you're testing your actual code changes, not an outdated published image. The published images should only be used in production deployments.

## Prerequisites

- Docker installed and running
- kind (Kubernetes in Docker) installed (install with: `brew install kind` on macOS)
- kubectl configured
- SonarQube/SonarCloud token (optional for testing)
- SonarQube instance URL (defaults to https://sonarcloud.io)

## 1. Local Docker Build

### 1.1 Build Docker Image
```bash
# Build the Docker image locally
docker build -t mcp:local .

# Verify the image was created
docker images | grep mcp
```

Expected: Image `mcp:local` should be listed

### 1.2 Test Docker Image Locally
```bash
# Run the container with required environment variables
docker run --rm \
  -e SONARQUBE_TOKEN="your-token-here" \
  -e SONARQUBE_URL="https://sonarcloud.io" \
  mcp:local

# Test with HTTP transport
docker run --rm \
  -p 3000:3000 \
  -e SONARQUBE_TOKEN="your-token-here" \
  -e SONARQUBE_URL="https://sonarcloud.io" \
  -e MCP_TRANSPORT="http" \
  -e MCP_HTTP_PORT="3000" \
  mcp:local
```

## 2. Kubernetes Testing Deployment

### Automated Testing (Recommended)

For the quickest way to test the deployment, use our automated test script:

```bash
# Set your SonarQube token (optional, will use dummy token if not set)
export SONARQUBE_TOKEN="your-sonarcloud-token-here"

# Run the automated test
./scripts/test-k8s-deployment.sh
```

This script will:
1. Create a kind cluster with 3 nodes
2. Build and load your local Docker image
3. Deploy the service with testing-friendly settings
4. Validate all endpoints are working
5. Provide clear success/failure feedback

### Manual Testing Steps

If you prefer to run the steps manually or need to debug issues, follow these steps in order:

```bash
# Step 1: Clean up any existing setup (start fresh)
# Check if cluster exists and delete it
kind get clusters | grep sonarqube-mcp-test && kind delete cluster --name sonarqube-mcp-test
# Delete namespace if it exists from a previous cluster
kubectl delete namespace sonarqube-mcp --ignore-not-found=true

# Step 2: Create the kind cluster with proper configuration
cat <<EOF | kind create cluster --name sonarqube-mcp-test --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
    protocol: TCP
  - containerPort: 443
    hostPort: 443
    protocol: TCP
- role: worker
- role: worker
EOF

# Step 3: Set kubectl context (important!)
kubectl config use-context kind-sonarqube-mcp-test

# Step 4: Build the Docker image
docker build -t mcp:local .

# Step 5: Load the image into ALL kind nodes
kind load docker-image mcp:local --name sonarqube-mcp-test

# Verify image is loaded (should show mcp:local on all nodes)
for node in $(kind get nodes --name sonarqube-mcp-test); do
  echo "Checking node: $node"
  docker exec $node crictl images | grep mcp || echo "WARNING: Image not found on $node"
done

# Step 6: Create namespace
kubectl create namespace sonarqube-mcp

# Step 7: Create the required token secret
# Replace 'your-sonarcloud-token-here' with an actual token or use 'dummy-token' for testing
kubectl create secret generic sonarqube-mcp-secrets \
  --from-literal=SONARQUBE_TOKEN="your-sonarcloud-token-here" \
  -n sonarqube-mcp

# Note: TLS and OAuth secrets are automatically created by Kustomize from k8s/base/secret.yaml

# Step 8: Deploy the application
# Use the testing overlay for better compatibility
cd k8s/overlays/testing
kubectl apply -k .
# Or use base if you need production-like settings
# cd k8s/base && kubectl apply -k .

# Step 9: Wait for deployment to be ready (with timeout)
echo "Waiting for deployment to be ready..."
kubectl wait --for=condition=available --timeout=120s \
  deployment/sonarqube-mcp -n sonarqube-mcp || {
    echo "Deployment not ready, checking pod status..."
    kubectl get pods -n sonarqube-mcp
    kubectl describe pods -n sonarqube-mcp | grep -A 10 "Events:"
}

# Step 10: Check pod status
kubectl get pods -n sonarqube-mcp
# If pods are not running, check logs:
# kubectl describe pods -n sonarqube-mcp
# kubectl logs -n sonarqube-mcp -l app.kubernetes.io/name=sonarqube-mcp

# Step 11: Port forward to access the service
kubectl port-forward -n sonarqube-mcp svc/sonarqube-mcp 3000:3000 &
PF_PID=$!
sleep 2  # Give port-forward time to establish

# Step 12: Test the service endpoints
echo "Testing health endpoint..."
curl -f http://localhost:3000/health || echo "Health check failed!"

echo "Testing ready endpoint..."
curl -f http://localhost:3000/ready || echo "Ready check failed!"

echo "Testing metrics endpoint..."
curl -f http://localhost:9090/metrics > /dev/null && echo "Metrics endpoint OK" || echo "Metrics failed!"

# Step 13: Clean up port forward
kill $PF_PID 2>/dev/null

echo "
✅ Testing complete! 

To interact with the service:
- Port forward: kubectl port-forward -n sonarqube-mcp svc/sonarqube-mcp 3000:3000
- View logs: kubectl logs -n sonarqube-mcp -l app.kubernetes.io/name=sonarqube-mcp -f
- Check pods: kubectl get pods -n sonarqube-mcp -w

To clean up everything:
- kubectl delete namespace sonarqube-mcp
- kind delete cluster --name sonarqube-mcp-test
"
```

### Quick Verification Script

Save this as `test-deployment.sh` for repeated testing:

```bash
#!/bin/bash
set -e

echo "🔍 Checking deployment status..."
kubectl get all -n sonarqube-mcp

echo "🔍 Checking pod logs for errors..."
kubectl logs -n sonarqube-mcp -l app.kubernetes.io/name=sonarqube-mcp --tail=20

echo "🔍 Testing service endpoints..."
kubectl port-forward -n sonarqube-mcp svc/sonarqube-mcp 3000:3000 &
PF_PID=$!
sleep 2

# Test endpoints
for endpoint in health ready; do
  echo -n "Testing /$endpoint: "
  curl -sf http://localhost:3000/$endpoint > /dev/null && echo "✅ OK" || echo "❌ FAILED"
done

kill $PF_PID 2>/dev/null

echo "🎉 Verification complete!"
```

### 2.1 Testing Different Configurations

#### Using the Testing Overlay

The testing overlay (`k8s/overlays/testing/`) provides:
- Disabled service account health checks (no valid token required)
- HTTP-only mode (no TLS required)
- Reduced replica count (2 instead of 3)
- Relaxed topology constraints

```bash
# Deploy with testing settings
cd k8s/overlays/testing
kubectl apply -k .
```

#### Test with Custom SonarQube URL
```bash
# Create a patch for custom URL
cat <<EOF > custom-url-patch.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sonarqube-mcp-config
  namespace: sonarqube-mcp
data:
  SONARQUBE_URL: "https://your-test-sonarqube.com"
EOF

kubectl apply -f custom-url-patch.yaml
```

#### Test with Minimal Resources
```bash
# For resource-constrained environments
kubectl patch deployment sonarqube-mcp -n sonarqube-mcp --type='json' -p='[
  {"op": "replace", "path": "/spec/template/spec/containers/0/resources/requests/memory", "value": "256Mi"},
  {"op": "replace", "path": "/spec/template/spec/containers/0/resources/requests/cpu", "value": "100m"}
]'
```

#### Access the Service
```bash
# Port forward for local testing
kubectl port-forward -n sonarqube-mcp svc/sonarqube-mcp 3000:3000 &

# Test endpoints
curl http://localhost:3000/health
curl http://localhost:3000/ready
curl http://localhost:9090/metrics  # Note: metrics are on port 9090
```

### 2.2 Troubleshooting Deployment Issues

#### Pod Not Starting
```bash
# Check pod status
kubectl get pods -n sonarqube-mcp

# Check pod events
kubectl describe pod <pod-name> -n sonarqube-mcp

# Check logs
kubectl logs <pod-name> -n sonarqube-mcp
```

#### Common Issues:

1. **ImagePullBackOff**: Local image not loaded
   ```bash
   # Load the image into kind cluster
   kind load docker-image mcp:local --name sonarqube-mcp-test
   
   # Verify image is loaded on all nodes
   for node in $(kind get nodes --name sonarqube-mcp-test); do
     echo "Checking node: $node"
     docker exec $node crictl images | grep mcp
   done
   ```

2. **Pod Stuck in Pending**: Topology constraints issue
   ```bash
   # Check pod events
   kubectl describe pods -n sonarqube-mcp | grep -i "topology"
   
   # Solution: Use the testing overlay which has relaxed constraints
   cd k8s/overlays/testing && kubectl apply -k .
   ```

3. **Health Check Failures**: Service account or token issues
   ```bash
   # Check logs for specific error
   kubectl logs -n sonarqube-mcp -l app.kubernetes.io/name=sonarqube-mcp | grep -i "error"
   
   # If "No default service account configured", use testing overlay
   # If token invalid, update the secret:
   kubectl create secret generic sonarqube-mcp-secrets \
     --from-literal=SONARQUBE_TOKEN="new-token" \
     -n sonarqube-mcp --dry-run=client -o yaml | kubectl apply -f -
   ```

4. **Secret Type Conflicts**: Immutable field errors
   ```bash
   # Delete the conflicting secret and let Kustomize recreate it
   kubectl delete secret sonarqube-mcp-tls -n sonarqube-mcp
   kubectl delete secret sonarqube-mcp-oauth -n sonarqube-mcp
   
   # Reapply the configuration
   cd k8s/overlays/testing && kubectl apply -k .
   ```

## 3. Functional Testing

### 3.1 Health Checks
```bash
# Test liveness probe
curl http://localhost:3000/health

# Test readiness probe
curl http://localhost:3000/ready

# Test metrics endpoint
curl http://localhost:9090/metrics
```

Expected responses:
- `/health`: HTTP 200 with health status
- `/ready`: HTTP 200 when ready
- `/metrics`: Prometheus-formatted metrics

### 3.2 MCP Tool Testing

#### List Available Tools
```bash
# Using MCP inspector
npx @modelcontextprotocol/inspector http://localhost:3000
```

#### Test Core Tools
1. **List Projects**
   - Verify connection to SonarQube
   - Should return list of accessible projects

2. **Search Issues**
   - Test with various filters (severity, status, tags)
   - Verify pagination works

3. **Get Metrics**
   - Request code coverage, bugs, vulnerabilities
   - Verify data accuracy

### 3.3 Authentication Testing

#### Environment Variable Authentication
```bash
# Verify SONARQUBE_TOKEN is being used
kubectl exec -n sonarqube-mcp deployment/sonarqube-mcp -- env | grep SONARQUBE
```

#### OAuth Testing (if configured)
```bash
# Test with OAuth token
curl -H "Authorization: Bearer ${OAUTH_TOKEN}" \
  http://localhost:3000/health
```

## 4. Performance Testing

### 4.1 Load Testing
```bash
# Simple load test with curl
for i in {1..100}; do
  curl -s http://localhost:3000/health &
done
wait

# Check metrics for response times
curl http://localhost:9090/metrics | grep http_request_duration
```

### 4.2 Resource Monitoring
```bash
# Monitor pod resources
kubectl top pods -n sonarqube-mcp

# Check HPA status
kubectl get hpa -n sonarqube-mcp
```

## 5. Security Testing

### 5.1 Secret Validation
```bash
# Ensure secrets are not exposed in logs
kubectl logs -n sonarqube-mcp deployment/sonarqube-mcp | grep -i token

# Check environment variables don't leak
kubectl describe pods -n sonarqube-mcp | grep -i token
```

### 5.2 Network Policies
```bash
# Test network isolation
kubectl run test-pod --image=curlimages/curl -it --rm -- \
  curl http://sonarqube-mcp.sonarqube-mcp:3000/health
```

## 6. Failure Scenarios

### 6.1 Invalid Token
```bash
# Update secret with invalid token
kubectl create secret generic sonarqube-mcp-secrets \
  --from-literal=SONARQUBE_TOKEN="invalid-token" \
  -n sonarqube-mcp \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart pods
kubectl rollout restart deployment/sonarqube-mcp -n sonarqube-mcp

# Check error handling in logs
kubectl logs -n sonarqube-mcp -l app.kubernetes.io/name=sonarqube-mcp
```

### 6.2 Circuit Breaker Testing
```bash
# Simulate SonarQube unavailability
# Update SONARQUBE_URL to invalid endpoint
kubectl set env deployment/sonarqube-mcp \
  SONARQUBE_URL=https://invalid.sonarqube.com \
  -n sonarqube-mcp

# Monitor circuit breaker metrics
curl http://localhost:9090/metrics | grep circuit_breaker
```

## 7. Cleanup

```bash
# Delete test namespace
kubectl delete namespace sonarqube-mcp

# Remove kind cluster
kind delete cluster --name sonarqube-mcp-test
```

## Test Checklist

- [ ] Docker image builds successfully
- [ ] Container runs with stdio transport
- [ ] Container runs with HTTP transport
- [ ] Kind cluster created with 3 nodes
- [ ] Image loaded into all kind nodes
- [ ] Namespace created (sonarqube-mcp)
- [ ] Secrets created successfully
- [ ] Kubernetes deployment succeeds
- [ ] Pods reach Running state (2-3 pods)
- [ ] Health endpoint responds (/health)
- [ ] Ready endpoint responds (/ready)
- [ ] Metrics endpoint responds (/metrics on port 9090)
- [ ] No errors in pod logs
- [ ] Circuit breaker activates on failure
- [ ] Logs show no sensitive data

## Quick Reference

### Namespaces
- All resources use namespace: `sonarqube-mcp`
- Test cluster name: `sonarqube-mcp-test`

### Key Commands
```bash
# Run automated test
./scripts/test-k8s-deployment.sh

# Check deployment status
kubectl get all -n sonarqube-mcp

# View logs
kubectl logs -n sonarqube-mcp -l app.kubernetes.io/name=sonarqube-mcp -f

# Port forward for testing
kubectl port-forward -n sonarqube-mcp svc/sonarqube-mcp 3000:3000

# Clean up
kubectl delete namespace sonarqube-mcp
kind delete cluster --name sonarqube-mcp-test
```

## Notes

- Default SONARQUBE_URL is https://sonarcloud.io
- Testing overlay disables service account health checks for easier testing
- Use testing overlay (`k8s/overlays/testing`) for local testing
- Use base configuration (`k8s/base`) for production-like testing
- The automated test script handles all setup complexity

### Known Issues

**Network Connectivity in Kind**: Kind clusters may not have external network connectivity on some systems (especially macOS with Docker Desktop). This prevents the service from connecting to SonarCloud. 

#### Root Cause:

The primary issue is the NetworkPolicy in the base configuration restricts egress traffic to specific ports and namespaces. External traffic doesn't belong to any Kubernetes namespace, so the policy blocks it.

#### Solution (Implemented):

The testing overlay now includes:

1. **NetworkPolicy Override**: Patches the NetworkPolicy to allow all egress traffic (`egress: [{}]`)
2. **DNS Policy**: Uses `dnsPolicy: "Default"` to inherit host DNS settings

This combination allows pods to:
- Resolve external domains (like sonarcloud.io)
- Make outbound HTTPS connections
- Access any external service needed for testing

#### Additional Troubleshooting:

If connectivity still fails:

1. **Docker Desktop on macOS**:
   - Restart Docker Desktop
   - Check Docker Desktop > Preferences > Resources > Network
   - Ensure your Mac has working DNS: `nslookup google.com`

2. **Corporate Networks**:
   - VPN may interfere with Docker networking
   - Proxy settings might be needed
   - Corporate firewalls may block certain traffic

3. **Alternative Testing**:
   - Use minikube instead of kind: `minikube start --driver=docker`
   - Deploy to a real Kubernetes cluster
   - Set up a local mock SonarQube instance

The service will show as "unhealthy" if it cannot reach SonarCloud, but this doesn't indicate a deployment failure - just a lack of external connectivity.