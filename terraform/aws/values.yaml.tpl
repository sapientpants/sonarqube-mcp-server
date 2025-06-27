replicaCount: 3

serviceAccount:
  create: false
  name: ${service_account_name}

config:
  sonarqube:
    baseUrl: ${sonarqube_base_url}
  
  oauth:
    issuer: ${oauth_issuer}
    audience: ${oauth_audience}
  
  monitoring:
    metrics: ${enable_monitoring}
    tracing: ${enable_monitoring}
  
  audit:
    enabled: ${enable_audit}

ingress:
  enabled: false  # Using ALB ingress instead

persistence:
  enabled: true
  storageClass: gp3

resources:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    cpu: 2000m
    memory: 4Gi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
              - key: app.kubernetes.io/name
                operator: In
                values:
                  - sonarqube-mcp
          topologyKey: topology.kubernetes.io/zone