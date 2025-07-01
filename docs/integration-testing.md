# Integration Testing and Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying and testing the SonarQube MCP Server, covering Docker deployment, Kubernetes orchestration, and end-to-end validation in both development and production environments.

> **For Kubernetes configuration details and customization options, see [k8s/README.md](../k8s/README.md)**

## Prerequisites

- Docker installed and running
- Kubernetes cluster (kind, minikube, or cloud provider)
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
  -e MCP_TRANSPORT="stdio" \
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

## 2. Kubernetes Deployment

### Quick Start

```bash
# 1. Create namespace
kubectl create namespace sonarqube-mcp

# 2. Create secret with your SonarQube token
kubectl create secret generic sonarqube-mcp-secrets \
  --from-literal=SONARQUBE_TOKEN="your-token-here" \
  -n sonarqube-mcp

# 3. Deploy the application
kubectl apply -k k8s/base/

# 4. Verify deployment
kubectl get pods -n sonarqube-mcp
```

### 2.1 Local Kubernetes Setup (kind/minikube)

#### Setup
```bash
# For kind
kind create cluster --name mcp-test
kind load docker-image mcp:local --name mcp-test

# For minikube
minikube start
minikube image load mcp:local
```

#### Deploy with Local Image
```bash
# Use the local image you built
cd k8s/base
kustomize edit set image sapientpants/sonarqube-mcp-server=mcp:local
kubectl apply -k .

# Or use kubectl set image after deployment
kubectl set image deployment/sonarqube-mcp \
  sonarqube-mcp=mcp:local \
  -n sonarqube-mcp
```

#### Verify Deployment
```bash
# Check pods are running
kubectl get pods -n sonarqube-mcp

# Check logs
kubectl logs -n sonarqube-mcp -l app.kubernetes.io/name=sonarqube-mcp

# Check service
kubectl get svc -n sonarqube-mcp

# Port forward to test locally
kubectl port-forward -n sonarqube-mcp svc/sonarqube-mcp 3000:3000
```

### 2.2 Production Deployment

For production deployments, use the production overlay which includes:
- Higher replica count (5 instead of 3)
- Production-specific configuration
- Namespace separation

```bash
# Create production namespace
kubectl create namespace sonarqube-mcp-prod

# Create secret (typically done by CI/CD)
kubectl create secret generic prod-sonarqube-mcp-secrets \
  --from-literal=SONARQUBE_TOKEN="${SONARQUBE_TOKEN}" \
  -n sonarqube-mcp-prod

# Deploy with production overlay
kubectl apply -k k8s/overlays/production/
```

#### Customizing for Your Environment

1. **Override SonarQube URL** (if not using SonarCloud):
   ```bash
   cd k8s/overlays/production
   kustomize edit set configmap sonarqube-mcp-config \
     --from-literal=SONARQUBE_URL=https://your-sonarqube.com
   ```

2. **Use Your Container Registry**:
   ```bash
   kustomize edit set image \
     sapientpants/sonarqube-mcp-server=your-registry.com/sonarqube-mcp:v1.0.0
   ```

3. **Apply Changes**:
   ```bash
   kubectl apply -k .
   ```

> **Note**: See [k8s/README.md](../k8s/README.md) for more customization options and integration with Helm, ArgoCD, or Flux.

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

# Delete production namespace
kubectl delete namespace sonarqube-mcp-prod

# Remove kind cluster
kind delete cluster --name mcp-test

# Stop minikube
minikube stop
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