# Kubernetes Production Deployment Guide

This directory contains Kustomize configurations for deploying the SonarQube MCP Server to production environments.

> **For development and testing instructions, see [docs/integration-testing.md](../docs/integration-testing.md)**

## Structure

```
k8s/
├── base/                  # Base configuration
│   ├── configmap.yaml     # Non-sensitive configuration
│   ├── deployment.yaml    # Main deployment
│   ├── secret.yaml        # Secret template (placeholder values)
│   └── ...               # Other k8s resources
└── overlays/
    └── production/        # Production-specific overrides
        └── kustomization.yaml
```

## Configuration Values

### Required Environment Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `SONARQUBE_URL` | ConfigMap | `https://sonarcloud.io` | SonarQube instance URL |
| `SONARQUBE_TOKEN` | Secret | None (required) | SonarQube API token |

### Optional Configuration

See [configmap.yaml](base/configmap.yaml) for all available configuration options including:
- MCP transport settings
- OAuth configuration
- Service account management
- Performance tuning
- Monitoring and metrics

## Production Deployment

### Using Production Overlay

The production overlay provides:
- Higher replica count (5 instead of 3)
- Production-specific namespace
- Production configuration overrides

```bash
# 1. Create production namespace
kubectl create namespace sonarqube-mcp-prod

# 2. Create secret (typically done by CI/CD)
kubectl create secret generic prod-sonarqube-mcp-secrets \
  --from-literal=SONARQUBE_TOKEN="${SONARQUBE_TOKEN}" \
  -n sonarqube-mcp-prod

# 3. Deploy with production overlay
kubectl apply -k k8s/overlays/production/
```

### Customizing for Your Environment

1. **Override SonarQube URL** (if not using SonarCloud):
   ```yaml
   # k8s/overlays/production/kustomization.yaml
   configMapGenerator:
     - name: sonarqube-mcp-config
       behavior: merge
       literals:
         - SONARQUBE_URL=https://your-sonarqube.com
   ```

2. **Use Your Container Registry**:
   ```yaml
   images:
     - name: sapientpants/sonarqube-mcp-server
       newName: your-registry.com/sonarqube-mcp
       newTag: v1.0.0
   ```

3. **Adjust Replica Count**:
   ```yaml
   replicas:
     - name: sonarqube-mcp
       count: 10  # Scale as needed
   ```

## Integration with Deployment Tools

### Helm Chart Structure

```yaml
# values.yaml
sonarqube:
  url: https://sonarqube.company.com
  token: ""  # Injected by CI/CD

image:
  repository: sapientpants/sonarqube-mcp-server
  tag: v1.9.0
  pullPolicy: IfNotPresent

resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "2Gi"
    cpu: "2000m"

replicas: 3

ingress:
  enabled: true
  host: mcp.example.com
```

### GitOps Integration

<details>
<summary>ArgoCD Example</summary>

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: sonarqube-mcp
spec:
  source:
    repoURL: https://github.com/yourorg/sonarqube-mcp-server
    path: k8s/overlays/production
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: sonarqube-mcp-prod
```
</details>

<details>
<summary>Flux Example</summary>

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: sonarqube-mcp
spec:
  interval: 10m
  path: "./k8s/overlays/production"
  sourceRef:
    kind: GitRepository
    name: sonarqube-mcp
  postBuild:
    substituteFrom:
    - kind: Secret
      name: sonarqube-credentials
```
</details>

## Production Best Practices

### High Availability

1. **Multi-Zone Deployment**
   ```yaml
   # Ensure pods are spread across zones
   topologySpreadConstraints:
     - maxSkew: 1
       topologyKey: topology.kubernetes.io/zone
       whenUnsatisfiable: DoNotSchedule
   ```

2. **Pod Disruption Budget**
   - Already configured in `base/pdb.yaml`
   - Ensures minimum 2 pods during updates

3. **Horizontal Pod Autoscaler**
   - Configured in `base/hpa.yaml`
   - Scales between 3-10 replicas based on CPU/memory

### Security Hardening

1. **Network Policies**
   - Configured in `base/networkpolicy.yaml`
   - Restricts traffic to necessary ports only

2. **Security Context**
   - Runs as non-root user (UID 1001)
   - Read-only root filesystem
   - No privilege escalation

3. **Resource Limits**
   - CPU and memory limits enforced
   - Ephemeral storage limits set

## Secrets Management

**Never store tokens in Git.** Use one of these approaches:

1. **External Secrets Operator**
   ```yaml
   apiVersion: external-secrets.io/v1beta1
   kind: ExternalSecret
   metadata:
     name: sonarqube-mcp-secrets
   spec:
     secretStoreRef:
       name: vault-backend
     target:
       name: sonarqube-mcp-secrets
     data:
     - secretKey: SONARQUBE_TOKEN
       remoteRef:
         key: sonarqube/token
   ```

2. **Sealed Secrets**
   ```bash
   echo -n "your-token" | kubectl create secret generic sonarqube-mcp-secrets \
     --dry-run=client --from-literal=SONARQUBE_TOKEN=/dev/stdin -o yaml | \
     kubeseal -o yaml > sealed-secret.yaml
   ```

3. **CI/CD Pipeline**
   ```bash
   # In your pipeline (GitHub Actions, GitLab CI, etc.)
   kubectl create secret generic sonarqube-mcp-secrets \
     --from-literal=SONARQUBE_TOKEN="${{ secrets.SONARQUBE_TOKEN }}" \
     --dry-run=client -o yaml | kubectl apply -f -
   ```

## Resource Requirements

### Minimum Requirements (per pod)
- Memory: 512Mi
- CPU: 250m
- Ephemeral Storage: 1Gi

### Recommended Production Settings
- Replicas: 5 (production overlay default)
- Memory: 1-2Gi per pod
- CPU: 500m-2000m per pod
- HPA enabled (scales 3-10 replicas)
- PodDisruptionBudget configured (min 2 available)

### Monitoring and Observability

1. **Prometheus Metrics**
   - Exposed on port 9090 at `/metrics`
   - Annotations already configured for autodiscovery

2. **Health Endpoints**
   - `/health` - Liveness probe
   - `/ready` - Readiness probe
   - `/metrics` - Prometheus metrics

3. **OpenTelemetry**
   - Configure `OTEL_EXPORTER_OTLP_ENDPOINT` in ConfigMap
   - Traces and metrics exported automatically

## Customization

### Using Kustomize Overlays

The `overlays/production` directory demonstrates how to:
- Override resource limits
- Set replica count
- Configure ingress
- Update image tags
- Merge ConfigMaps

### Common Customizations

1. **Change Image Registry**
   ```yaml
   images:
   - name: sapientpants/sonarqube-mcp-server
     newName: your-registry.com/sonarqube-mcp
     newTag: v1.0.0
   ```

2. **Add Labels/Annotations**
   ```yaml
   commonLabels:
     team: platform
     cost-center: engineering
   ```

3. **Configure Network Policies**
   - See [networkpolicy.yaml](base/networkpolicy.yaml)
   - Adjust ingress/egress rules as needed

## Production Deployment Checklist

- [ ] **Secrets configured** via External Secrets Operator or CI/CD
- [ ] **TLS certificates** created for HTTPS (or disable with `MCP_HTTP_HTTPS_ENABLED=false`)
- [ ] **OAuth public key** configured if using OAuth authentication
- [ ] **Container registry** accessible from cluster
- [ ] **Resource limits** appropriate for workload
- [ ] **Monitoring** configured (Prometheus, OpenTelemetry)
- [ ] **Network policies** reviewed and adjusted
- [ ] **Ingress** configured with proper domain and TLS
- [ ] **Backup strategy** for audit logs
- [ ] **RBAC** permissions verified