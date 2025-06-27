# Troubleshooting Guide

## Overview

This guide helps diagnose and resolve common issues with the SonarQube MCP Server. It covers authentication problems, connection issues, performance concerns, and provides debugging techniques.

## Quick Diagnostics

### Health Check

First, verify the server is running properly:

```bash
# Check basic health
curl http://localhost:3000/health

# Check detailed readiness
curl http://localhost:3000/ready
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.9.0",
  "transport": "http",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Enable Debug Logging

```bash
# Set environment variables
export LOG_LEVEL=debug
export DEBUG=mcp:*

# Or in your .env file
LOG_LEVEL=debug
DEBUG=mcp:*
```

## Common Issues

### 1. Authentication Failures

#### Symptom: 401 Unauthorized

**Issue**: Token validation failing

**Diagnostics**:
```bash
# Check audit logs
tail -f logs/audit/audit-*.log | grep AUTH_FAILED

# Decode your JWT token
echo $TOKEN | cut -d. -f2 | base64 -d | jq
```

**Common Causes & Solutions**:

1. **Invalid Token Signature**
   ```bash
   # Verify public key format
   openssl rsa -pubin -in /config/public.pem -text -noout
   
   # Should show key details without errors
   ```

2. **Audience Mismatch**
   ```json
   // Token must include configured audience
   {
     "aud": ["sonarqube-mcp"],  // Must match MCP_HTTP_OAUTH_AUDIENCE
     "iss": "https://auth.company.com"
   }
   ```

3. **Expired Token**
   ```bash
   # Check token expiration
   echo $TOKEN | cut -d. -f2 | base64 -d | jq '.exp' | xargs -I {} date -d @{}
   ```

4. **Wrong Issuer**
   ```bash
   # Verify issuer matches configuration
   echo "Expected: $MCP_HTTP_OAUTH_ISSUER"
   echo $TOKEN | cut -d. -f2 | base64 -d | jq '.iss'
   ```

#### Symptom: 403 Forbidden

**Issue**: User authenticated but lacks permissions

**Diagnostics**:
```bash
# Check permission evaluation
tail -f logs/audit/audit-*.log | grep PERMISSION_DENIED

# View user's resolved permissions
grep "permission_evaluation" logs/audit/audit-*.log | tail -20 | jq
```

**Solutions**:

1. **Check Group Membership**
   ```bash
   # Verify groups in token
   echo $TOKEN | cut -d. -f2 | base64 -d | jq '.groups'
   ```

2. **Review Permission Rules**
   ```json
   // Ensure user's groups have access
   {
     "groups": ["developers"],
     "permissions": {
       "projects": [".*"],
       "tools": {
         "allow": ["*"]
       }
     }
   }
   ```

### 2. Connection Issues

#### Symptom: Cannot Connect to SonarQube

**Diagnostics**:
```bash
# Test SonarQube connectivity
curl -H "Authorization: Bearer $SONARQUBE_TOKEN" \
  $SONARQUBE_BASE_URL/api/system/health

# Check DNS resolution
nslookup $(echo $SONARQUBE_BASE_URL | sed 's|https\?://||' | cut -d/ -f1)

# Test network path
traceroute $(echo $SONARQUBE_BASE_URL | sed 's|https\?://||' | cut -d/ -f1)
```

**Common Solutions**:

1. **Proxy Configuration**
   ```bash
   # If behind corporate proxy
   export HTTP_PROXY=http://proxy.company.com:8080
   export HTTPS_PROXY=http://proxy.company.com:8080
   export NO_PROXY=localhost,127.0.0.1
   ```

2. **TLS Certificate Issues**
   ```bash
   # For self-signed certificates
   export NODE_TLS_REJECT_UNAUTHORIZED=0
   
   # Or provide CA certificate
   export NODE_EXTRA_CA_CERTS=/path/to/ca.crt
   ```

3. **Firewall Rules**
   ```bash
   # Test specific port
   nc -zv sonarqube.company.com 443
   ```

#### Symptom: Service Account Health Check Failures

**Diagnostics**:
```bash
# Check service account health
grep "SERVICE_ACCOUNT_HEALTH" logs/audit/audit-*.log | tail -20

# Test specific service account
curl -H "Authorization: Bearer $SERVICE_ACCOUNT_SA1_TOKEN" \
  $SONARQUBE_BASE_URL/api/authentication/validate
```

**Solutions**:

1. **Token Expiration**
   - Rotate service account tokens in SonarQube
   - Update environment variables

2. **Account Permissions**
   - Verify service account has necessary SonarQube permissions
   - Check project visibility settings

### 3. Performance Issues

#### Symptom: Slow Response Times

**Diagnostics**:
```bash
# Check metrics endpoint
curl http://localhost:9090/metrics | grep -E "(http_request_duration|circuit_breaker)"

# Monitor resource usage
docker stats sonarqube-mcp

# Check connection pool
netstat -an | grep ESTABLISHED | grep 443 | wc -l
```

**Solutions**:

1. **Increase Connection Pool**
   ```bash
   HTTP_AGENT_MAX_SOCKETS=100
   HTTP_AGENT_MAX_FREE_SOCKETS=10
   ```

2. **Enable Circuit Breaker**
   ```bash
   CIRCUIT_BREAKER_ENABLED=true
   CIRCUIT_BREAKER_TIMEOUT=5000
   CIRCUIT_BREAKER_THRESHOLD=50
   ```

3. **Optimize Memory**
   ```bash
   # Increase Node.js heap
   NODE_OPTIONS="--max-old-space-size=1024"
   ```

#### Symptom: Memory Leaks

**Diagnostics**:
```bash
# Generate heap snapshot
kill -USR2 $PID

# Monitor memory growth
while true; do
  ps aux | grep node | grep -v grep | awk '{print $6}'
  sleep 60
done
```

**Solutions**:

1. **Tune Garbage Collection**
   ```bash
   NODE_OPTIONS="--max-old-space-size=1024 --expose-gc"
   ```

2. **Limit Cache Sizes**
   ```bash
   PERMISSION_CACHE_MAX_SIZE=1000
   TOKEN_CACHE_MAX_SIZE=500
   ```

### 4. Transport Issues

#### Symptom: MCP Protocol Errors

**Diagnostics**:
```bash
# Enable MCP protocol debugging
DEBUG=mcp:transport:*

# Check for protocol version mismatch
grep "protocol_version" logs/*.log
```

**Solutions**:

1. **Update MCP SDK**
   ```bash
   npm update @modelcontextprotocol/sdk
   ```

2. **Check Transport Configuration**
   ```bash
   # Ensure transport matches client expectations
   echo "Transport: $MCP_TRANSPORT"
   ```

### 5. OAuth/IdP Issues

#### Symptom: JWKS Fetch Failures

**Diagnostics**:
```bash
# Test JWKS endpoint
curl $MCP_HTTP_OAUTH_JWKS_URI

# Check for rate limiting
curl -I $MCP_HTTP_OAUTH_JWKS_URI
```

**Solutions**:

1. **Use Static Public Key**
   ```bash
   # Download and save public key
   MCP_HTTP_OAUTH_PUBLIC_KEY_PATH=/config/public.pem
   ```

2. **Implement Caching**
   ```bash
   JWKS_CACHE_TTL=3600000  # 1 hour
   ```

## Debugging Techniques

### 1. Audit Log Analysis

```bash
# Find all unique error types
grep ERROR logs/audit/audit-*.log | jq -r '.error.type' | sort | uniq -c

# Track specific user activity
grep "user@company.com" logs/audit/audit-*.log | jq

# Analyze permission denials
grep PERMISSION_DENIED logs/audit/audit-*.log | \
  jq -r '[.timestamp, .auth.subject, .error.message] | @csv'
```

### 2. Performance Profiling

```bash
# Enable CPU profiling
NODE_OPTIONS="--inspect=0.0.0.0:9229"

# Connect Chrome DevTools to node:9229

# Or use clinic.js
npx clinic doctor -- node dist/index.js
```

### 3. Network Debugging

```bash
# Capture HTTP traffic
tcpdump -i any -w capture.pcap host sonarqube.company.com

# Use mitmproxy for HTTPS
mitmdump -s log_requests.py --mode upstream:http://proxy:8080
```

### 4. Container Debugging

```bash
# Access container shell
docker exec -it sonarqube-mcp sh

# Check environment variables
docker exec sonarqube-mcp env | grep -E "(MCP|SONAR)" | sort

# View container logs
docker logs -f --tail 100 sonarqube-mcp
```

## Error Reference

### Authentication Errors

| Error Code | Message | Solution |
|------------|---------|----------|
| AUTH_001 | Invalid token format | Check Authorization header format: `Bearer <token>` |
| AUTH_002 | Token signature verification failed | Verify public key configuration |
| AUTH_003 | Token expired | Refresh token or extend lifetime |
| AUTH_004 | Invalid audience | Ensure token includes correct audience |
| AUTH_005 | Invalid issuer | Check MCP_HTTP_OAUTH_ISSUER configuration |

### Permission Errors

| Error Code | Message | Solution |
|------------|---------|----------|
| PERM_001 | No matching permission rules | Add permission rule for user's groups |
| PERM_002 | Project access denied | Check project regex patterns |
| PERM_003 | Tool access denied | Verify tool allow/deny lists |
| PERM_004 | Write operation denied | Grant write permission in rules |

### Service Account Errors

| Error Code | Message | Solution |
|------------|---------|----------|
| SA_001 | No service account mapped | Configure service account mappings |
| SA_002 | Service account unhealthy | Check account credentials |
| SA_003 | All accounts failed | Verify SonarQube connectivity |
| SA_004 | Mapping conflict | Adjust mapping priorities |

### Connection Errors

| Error Code | Message | Solution |
|------------|---------|----------|
| CONN_001 | ECONNREFUSED | Check SonarQube URL and port |
| CONN_002 | ETIMEDOUT | Verify network path, check firewall |
| CONN_003 | ENOTFOUND | Check DNS resolution |
| CONN_004 | CERT_HAS_EXPIRED | Update certificates |

## Health Monitoring

### Prometheus Queries

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# Response time (95th percentile)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Service account failures
increase(service_account_health_check_failures_total[1h])

# Circuit breaker state
circuit_breaker_state{name="sonarqube"}
```

### Grafana Alerts

```json
{
  "alert": "High Error Rate",
  "expr": "rate(http_requests_total{status=~\"5..\"}[5m]) > 0.05",
  "for": "5m",
  "annotations": {
    "summary": "Error rate above 5%"
  }
}
```

## Recovery Procedures

### 1. Service Account Rotation

```bash
# 1. Generate new token in SonarQube
# 2. Update environment
export SERVICE_ACCOUNT_SA1_TOKEN=new_token
# 3. Restart service
docker restart sonarqube-mcp
# 4. Verify health
curl http://localhost:3000/health
```

### 2. Clear Caches

```bash
# Restart to clear all in-memory caches
docker restart sonarqube-mcp

# Or send signal to clear specific cache
kill -SIGUSR1 $PID  # Custom signal handler needed
```

### 3. Emergency Fallback

```bash
# Disable OAuth temporarily
MCP_HTTP_ALLOW_NO_AUTH=true  # DEVELOPMENT ONLY!

# Use basic service account
unset SERVICE_ACCOUNT_ENABLE
export SONARQUBE_TOKEN=emergency_token
```

## Logging Best Practices

### 1. Structured Logging

```bash
# Parse JSON logs
tail -f logs/audit/audit-*.log | jq -c '{
  time: .timestamp,
  level: .level,
  event: .event,
  user: .auth.subject,
  error: .error.message
}'
```

### 2. Log Aggregation

```yaml
# Fluentd configuration
<source>
  @type tail
  path /logs/audit/*.log
  pos_file /var/log/fluentd/audit.pos
  tag sonarqube.mcp.audit
  <parse>
    @type json
  </parse>
</source>
```

### 3. Log Retention

```bash
# Rotate logs daily
find logs/audit -name "*.log" -mtime +30 -delete

# Compress old logs
find logs/audit -name "*.log" -mtime +7 -exec gzip {} \;
```

## Getting Help

### 1. Collect Diagnostics

```bash
# Generate diagnostic bundle
cat > collect-diagnostics.sh << 'EOF'
#!/bin/bash
DIAG_DIR="diagnostics-$(date +%Y%m%d-%H%M%S)"
mkdir -p $DIAG_DIR

# Environment (sanitized)
env | grep -E "(MCP|SONAR)" | sed 's/TOKEN=.*/TOKEN=REDACTED/' > $DIAG_DIR/environment.txt

# Health check
curl -s http://localhost:3000/health > $DIAG_DIR/health.json
curl -s http://localhost:3000/ready > $DIAG_DIR/ready.json

# Recent logs
tail -n 1000 logs/audit/audit-*.log > $DIAG_DIR/recent-audit.log
tail -n 1000 logs/*.log > $DIAG_DIR/recent-app.log

# Metrics
curl -s http://localhost:9090/metrics > $DIAG_DIR/metrics.txt

# System info
uname -a > $DIAG_DIR/system.txt
docker version >> $DIAG_DIR/system.txt

tar czf $DIAG_DIR.tar.gz $DIAG_DIR
echo "Diagnostics collected: $DIAG_DIR.tar.gz"
EOF

chmod +x collect-diagnostics.sh
./collect-diagnostics.sh
```

### 2. Report Issues

When reporting issues, include:

1. Diagnostic bundle
2. Steps to reproduce
3. Expected vs actual behavior
4. Environment details
5. Recent changes

### 3. Support Channels

- GitHub Issues: https://github.com/sapientpants/sonarqube-mcp-server/issues
- Email: support@sonarqube-mcp.io
- Documentation: https://docs.sonarqube-mcp.io

## Prevention

### 1. Monitoring Setup

```yaml
# Kubernetes liveness probe
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 30
  timeoutSeconds: 10
  failureThreshold: 3
```

### 2. Regular Maintenance

- Weekly: Review audit logs for anomalies
- Monthly: Rotate service account tokens
- Quarterly: Update dependencies
- Yearly: Security audit

### 3. Disaster Recovery Testing

- Test backup restoration
- Verify failover procedures
- Update runbooks
- Train operations team