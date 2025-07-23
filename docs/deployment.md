# Enterprise Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the SonarQube MCP Server in enterprise production environments. It covers Docker, Kubernetes, cloud deployments, and best practices for high availability and scalability.

## Prerequisites

- Docker 20.10+ or compatible container runtime
- Kubernetes 1.24+ (for K8s deployments)
- SonarQube 9.9 LTS or 10.x
- Valid SonarQube authentication credentials
- (Optional) OAuth 2.0 Identity Provider

## Quick Start

### Docker Deployment

```bash
# Pull the latest image
docker pull sapientpants/sonarqube-mcp-server:latest

# Run with basic configuration
docker run -d \
  --name sonarqube-mcp \
  -p 3000:3000 \
  -e SONARQUBE_BASE_URL=https://sonarqube.company.com \
  -e SONARQUBE_TOKEN=your-token \
  -e MCP_TRANSPORT=http \
  sapientpants/sonarqube-mcp-server:latest
```

## Production Docker Deployment

### 1. Create Configuration

Create a `.env` file with your configuration:

```bash
# SonarQube Configuration
SONARQUBE_BASE_URL=https://sonarqube.company.com
SONARQUBE_TOKEN=squ_xxxxxxxxxxxxx

# MCP Configuration
MCP_TRANSPORT=http
MCP_HTTP_PORT=3000
MCP_HTTP_HTTPS_ENABLED=true
MCP_HTTP_HTTPS_CERT=/certs/tls.crt
MCP_HTTP_HTTPS_KEY=/certs/tls.key

# OAuth Configuration
MCP_HTTP_OAUTH_ISSUER=https://auth.company.com
MCP_HTTP_OAUTH_AUDIENCE=sonarqube-mcp
MCP_HTTP_OAUTH_PUBLIC_KEY_PATH=/config/oauth-public.pem

# Service Accounts
SERVICE_ACCOUNT_ENABLE=true
SERVICE_ACCOUNT_SA1_USERNAME=team-alpha
SERVICE_ACCOUNT_SA1_TOKEN=squ_team_alpha_token
SERVICE_ACCOUNT_SA2_USERNAME=team-beta
SERVICE_ACCOUNT_SA2_TOKEN=squ_team_beta_token

# Monitoring
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
METRICS_ENABLED=true

# Audit Logging
AUDIT_LOG_ENABLED=true
AUDIT_LOG_PII_REDACTION=true
```

### 2. Docker Compose

```yaml
version: '3.8'

services:
  sonarqube-mcp:
    image: sapientpants/sonarqube-mcp-server:latest
    container_name: sonarqube-mcp
    ports:
      - "3000:3000"
      - "9090:9090"  # Metrics port
    env_file:
      - .env
    volumes:
      - ./certs:/certs:ro
      - ./config:/config:ro
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped
    networks:
      - mcp-network

  # Optional: Prometheus for metrics
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    ports:
      - "9091:9090"
    networks:
      - mcp-network

networks:
  mcp-network:
    driver: bridge

volumes:
  prometheus-data:
```

### 3. Prometheus Configuration

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'sonarqube-mcp'
    static_configs:
      - targets: ['sonarqube-mcp:9090']
```

## Kubernetes Deployment

### 1. Namespace and ConfigMap

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: sonarqube-mcp
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: sonarqube-mcp-config
  namespace: sonarqube-mcp
data:
  SONARQUBE_BASE_URL: "https://sonarqube.company.com"
  MCP_TRANSPORT: "http"
  MCP_HTTP_PORT: "3000"
  MCP_HTTP_HTTPS_ENABLED: "true"
  MCP_HTTP_OAUTH_ISSUER: "https://auth.company.com"
  MCP_HTTP_OAUTH_AUDIENCE: "sonarqube-mcp"
  SERVICE_ACCOUNT_ENABLE: "true"
  METRICS_ENABLED: "true"
  AUDIT_LOG_ENABLED: "true"
  AUDIT_LOG_PII_REDACTION: "true"
```

### 2. Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: sonarqube-mcp-secrets
  namespace: sonarqube-mcp
type: Opaque
stringData:
  SONARQUBE_TOKEN: "squ_xxxxxxxxxxxxx"
  SERVICE_ACCOUNT_SA1_TOKEN: "squ_team_alpha_token"
  SERVICE_ACCOUNT_SA2_TOKEN: "squ_team_beta_token"
---
apiVersion: v1
kind: Secret
metadata:
  name: sonarqube-mcp-tls
  namespace: sonarqube-mcp
type: kubernetes.io/tls
data:
  tls.crt: # base64 encoded certificate
  tls.key: # base64 encoded private key
---
apiVersion: v1
kind: Secret
metadata:
  name: oauth-public-key
  namespace: sonarqube-mcp
type: Opaque
data:
  public.pem: # base64 encoded public key
```

### 3. Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sonarqube-mcp
  namespace: sonarqube-mcp
  labels:
    app: sonarqube-mcp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sonarqube-mcp
  template:
    metadata:
      labels:
        app: sonarqube-mcp
    spec:
      serviceAccountName: sonarqube-mcp
      containers:
      - name: sonarqube-mcp
        image: sapientpants/sonarqube-mcp-server:latest
        ports:
        - containerPort: 3000
          name: http
        - containerPort: 9090
          name: metrics
        envFrom:
        - configMapRef:
            name: sonarqube-mcp-config
        - secretRef:
            name: sonarqube-mcp-secrets
        env:
        - name: MCP_HTTP_HTTPS_CERT
          value: /tls/tls.crt
        - name: MCP_HTTP_HTTPS_KEY
          value: /tls/tls.key
        - name: MCP_HTTP_OAUTH_PUBLIC_KEY_PATH
          value: /oauth/public.pem
        volumeMounts:
        - name: tls
          mountPath: /tls
          readOnly: true
        - name: oauth-key
          mountPath: /oauth
          readOnly: true
        - name: logs
          mountPath: /app/logs
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: http
          initialDelaySeconds: 10
          periodSeconds: 10
        securityContext:
          runAsNonRoot: true
          runAsUser: 1000
          readOnlyRootFilesystem: true
          allowPrivilegeEscalation: false
      volumes:
      - name: tls
        secret:
          secretName: sonarqube-mcp-tls
      - name: oauth-key
        secret:
          secretName: oauth-public-key
      - name: logs
        emptyDir: {}
```

### 4. Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: sonarqube-mcp
  namespace: sonarqube-mcp
  labels:
    app: sonarqube-mcp
spec:
  type: ClusterIP
  ports:
  - port: 3000
    targetPort: 3000
    protocol: TCP
    name: http
  - port: 9090
    targetPort: 9090
    protocol: TCP
    name: metrics
  selector:
    app: sonarqube-mcp
```

### 5. Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sonarqube-mcp
  namespace: sonarqube-mcp
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - mcp.company.com
    secretName: sonarqube-mcp-tls-ingress
  rules:
  - host: mcp.company.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: sonarqube-mcp
            port:
              number: 3000
```

### 6. HorizontalPodAutoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: sonarqube-mcp
  namespace: sonarqube-mcp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: sonarqube-mcp
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 7. PodDisruptionBudget

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: sonarqube-mcp
  namespace: sonarqube-mcp
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: sonarqube-mcp
```

### 8. NetworkPolicy

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: sonarqube-mcp
  namespace: sonarqube-mcp
spec:
  podSelector:
    matchLabels:
      app: sonarqube-mcp
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
    ports:
    - protocol: TCP
      port: 9090
  egress:
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 443  # HTTPS for SonarQube API
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 53   # DNS
    - protocol: UDP
      port: 53
```

### 9. ServiceAccount and RBAC

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: sonarqube-mcp
  namespace: sonarqube-mcp
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: sonarqube-mcp
  namespace: sonarqube-mcp
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: sonarqube-mcp
  namespace: sonarqube-mcp
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: sonarqube-mcp
subjects:
- kind: ServiceAccount
  name: sonarqube-mcp
  namespace: sonarqube-mcp
```

## Helm Chart Deployment

### 1. Install Helm Chart

```bash
# Add the repository
helm repo add sonarqube-mcp https://charts.sonarqube-mcp.io
helm repo update

# Install with custom values
helm install sonarqube-mcp sonarqube-mcp/sonarqube-mcp \
  --namespace sonarqube-mcp \
  --create-namespace \
  -f values.yaml
```

### 2. Custom Values File (values.yaml)

```yaml
replicaCount: 3

image:
  repository: sapientpants/sonarqube-mcp-server
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 3000
  metricsPort: 9090

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: mcp.company.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: sonarqube-mcp-tls
      hosts:
        - mcp.company.com

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 256Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

config:
  sonarqube:
    baseUrl: https://sonarqube.company.com
  transport: http
  oauth:
    issuer: https://auth.company.com
    audience: sonarqube-mcp
  serviceAccounts:
    enabled: true
  monitoring:
    metrics: true
    tracing: true
  audit:
    enabled: true
    piiRedaction: true

secrets:
  sonarqubeToken: ""  # Set via --set or sealed secrets
  serviceAccounts: {}

persistence:
  enabled: true
  storageClass: fast-ssd
  size: 10Gi

podDisruptionBudget:
  enabled: true
  minAvailable: 2

networkPolicy:
  enabled: true

serviceAccount:
  create: true
  name: sonarqube-mcp

securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
```

## Cloud-Specific Deployments

### AWS EKS

1. **IAM Service Account**:
```bash
eksctl create iamserviceaccount \
  --name sonarqube-mcp \
  --namespace sonarqube-mcp \
  --cluster my-cluster \
  --attach-policy-arn arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy \
  --approve
```

2. **AWS Load Balancer Controller Annotations**:
```yaml
metadata:
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-ssl-cert: "arn:aws:acm:..."
```

### Azure AKS

1. **Azure AD Workload Identity**:
```bash
az identity create --name sonarqube-mcp --resource-group myRG
```

2. **Application Gateway Ingress**:
```yaml
metadata:
  annotations:
    kubernetes.io/ingress.class: azure/application-gateway
```

### Google GKE

1. **Workload Identity**:
```bash
kubectl annotate serviceaccount sonarqube-mcp \
  iam.gke.io/gcp-service-account=sonarqube-mcp@project.iam.gserviceaccount.com
```

2. **GKE Ingress**:
```yaml
metadata:
  annotations:
    kubernetes.io/ingress.class: "gce"
    kubernetes.io/ingress.global-static-ip-name: "sonarqube-mcp-ip"
```

## Monitoring & Observability

### Prometheus Integration

```yaml
apiVersion: v1
kind: ServiceMonitor
metadata:
  name: sonarqube-mcp
  namespace: sonarqube-mcp
spec:
  selector:
    matchLabels:
      app: sonarqube-mcp
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

### Grafana Dashboard

Import the provided Grafana dashboard (ID: 12345) for comprehensive monitoring.

## Backup & Disaster Recovery

### Audit Log Backup

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: audit-log-backup
  namespace: sonarqube-mcp
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: amazon/aws-cli:latest
            command:
            - /bin/sh
            - -c
            - |
              aws s3 sync /logs/audit s3://backup-bucket/audit-logs/$(date +%Y-%m-%d)/
            volumeMounts:
            - name: logs
              mountPath: /logs
          volumes:
          - name: logs
            persistentVolumeClaim:
              claimName: sonarqube-mcp-logs
          restartPolicy: OnFailure
```

## Performance Tuning

### Node.js Optimization

```dockerfile
ENV NODE_OPTIONS="--max-old-space-size=512"
ENV UV_THREADPOOL_SIZE=8
```

### Connection Pool Tuning

```bash
# Environment variables
HTTP_AGENT_MAX_SOCKETS=100
HTTP_AGENT_MAX_FREE_SOCKETS=10
HTTP_AGENT_TIMEOUT=60000
```

## Troubleshooting

### Common Issues

1. **Health Check Failures**
   - Check SonarQube connectivity
   - Verify service account credentials
   - Review audit logs

2. **High Memory Usage**
   - Enable memory profiling
   - Adjust Node.js heap size
   - Review connection pool settings

3. **Authentication Failures**
   - Verify OAuth public key
   - Check token expiration
   - Review JWKS endpoint accessibility

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug
DEBUG=mcp:*
```

## Security Hardening

### Pod Security Standards

```yaml
apiVersion: v1
kind: Pod
metadata:
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### Network Segmentation

- Deploy in isolated namespace
- Use NetworkPolicies for traffic control
- Enable mTLS with service mesh (Istio/Linkerd)

## Maintenance

### Rolling Updates

```bash
# Update deployment
kubectl set image deployment/sonarqube-mcp \
  sonarqube-mcp=sapientpants/sonarqube-mcp-server:v1.10.0 \
  -n sonarqube-mcp

# Monitor rollout
kubectl rollout status deployment/sonarqube-mcp -n sonarqube-mcp
```

### Scaling

```bash
# Manual scaling
kubectl scale deployment/sonarqube-mcp --replicas=5 -n sonarqube-mcp

# Update HPA
kubectl patch hpa sonarqube-mcp -n sonarqube-mcp \
  --patch '{"spec":{"maxReplicas":15}}'
```

## Support

For enterprise support, contact: support@sonarqube-mcp.io