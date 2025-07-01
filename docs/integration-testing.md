# Integration Testing Guide

## Overview

This guide provides comprehensive testing procedures for the SonarQube MCP Server in development and test environments. It covers local Docker testing, Kubernetes deployment for testing, and validation procedures.

> **For production deployment instructions, see [k8s/README.md](../k8s/README.md)**

## Important: Testing with Local Images

**Always use your locally built Docker image (`mcp:local`) for testing.** This ensures you're testing your actual code changes, not an outdated published image. The published images should only be used in production deployments.

## Prerequisites

- Docker installed and running
- kind (Kubernetes in Docker) installed
- kubectl configured
- Valid SonarQube/SonarCloud token
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

This script will handle all the steps below automatically and report any issues.

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

# Step 7: Create the required secrets
# Replace 'your-sonarcloud-token-here' with an actual token
kubectl create secret generic sonarqube-mcp-secrets \
  --from-literal=SONARQUBE_TOKEN="your-sonarcloud-token-here" \
  -n sonarqube-mcp

# Create placeholder TLS secret (required by deployment)
kubectl create secret tls sonarqube-mcp-tls \
  --cert=/dev/null --key=/dev/null \
  -n sonarqube-mcp --dry-run=client -o yaml | \
  kubectl apply -f -

# Create placeholder OAuth secret (required by deployment)
kubectl create secret generic sonarqube-mcp-oauth \
  --from-literal=public.pem="" \
  -n sonarqube-mcp

# Step 8: Deploy the application
cd k8s/base
kubectl apply -k .

# Step 9: Wait for deployment to be ready (with timeout)
echo "Waiting for deployment to be ready..."
kubectl wait --for=condition=available --timeout=120s \
  deployment/sonarqube-mcp -n sonarqube-mcp

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

#### Test with Custom SonarQube URL
```bash
# Override the default SonarCloud URL for testing
kubectl create configmap sonarqube-mcp-config \
  --from-literal=SONARQUBE_URL=https://your-test-sonarqube.com \
  --from-literal=MCP_TRANSPORT=http \
  --from-literal=MCP_HTTP_PORT=3000 \
  -n sonarqube-mcp \
  --dry-run=client -o yaml | kubectl apply -f -
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
   
   # Verify image is loaded
   docker exec -it sonarqube-mcp-test-control-plane crictl images | grep mcp
   ```

2. **CrashLoopBackOff**: Check if transport is set correctly
   ```bash
   kubectl get configmap sonarqube-mcp-config -n sonarqube-mcp -o yaml | grep MCP_TRANSPORT
   # Should show: MCP_TRANSPORT: http
   ```

3. **Health Check Failures**: Verify token is set
   ```bash
   kubectl get secret sonarqube-mcp-secrets -n sonarqube-mcp -o jsonpath='{.data.SONARQUBE_TOKEN}' | base64 -d
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
- [ ] Kubernetes deployment succeeds
- [ ] Pods reach Running state
- [ ] Health checks pass
- [ ] Can connect to SonarQube/SonarCloud
- [ ] MCP tools are accessible
- [ ] Metrics are exposed
- [ ] Secrets are secure
- [ ] Circuit breaker activates on failure
- [ ] HPA scales based on load
- [ ] Logs show no sensitive data

## Notes

- Default SONARQUBE_URL is now https://sonarcloud.io
- Secrets must be created externally (not stored in Git)
- Use deploy.sh script for consistent deployments
- Monitor audit logs at /app/logs/audit/